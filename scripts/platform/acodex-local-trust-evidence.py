#!/usr/bin/env python3
"""Offline metadata audit and opt-in private runner preparation. No credential reads."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import ssl
import stat
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

CA = Path('/etc/ssl/certs/ca-certificates.crt')
SHARED = ('/public', '/sdcard', '/storage', '/mnt/media_rw')
SAFE_PATH = '/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin'
DIR_FLAGS = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
RUNNER_DIRS = ('home', 'work', 'tmp', 'config', 'cache')


def absolute(value):
    p = Path(value)
    if not p.is_absolute() or '..' in p.parts or p.anchor != '/':
        raise ValueError('INVALID_ABSOLUTE_PATH')
    return p


def shared_path(p):
    return any(p == Path(s) or Path(s) in p.parents for s in SHARED)


def metadata(p, kind, private=True, system=False):
    """No traversal through symlinks; only inspect metadata, never file contents."""
    try:
        p = absolute(p)
        if private and shared_path(p):
            return 'BLOCKED_SHARED_PATH'
        if private and p == Path('/'):
            return 'BLOCKED_ROOT_PATH'
        uid = os.geteuid()
        for parent in reversed(p.parents):
            st = parent.lstat()
            if not stat.S_ISDIR(st.st_mode):
                return 'BLOCKED_ANCESTOR_TYPE'
            if st.st_uid not in ({0} if system else {0, uid}) or st.st_mode & 0o022:
                return 'BLOCKED_ANCESTOR_PERMISSIONS'
        st = p.lstat()
        if not (stat.S_ISDIR(st.st_mode) if kind == 'dir' else stat.S_ISREG(st.st_mode)):
            return 'BLOCKED_TYPE_OR_SYMLINK'
        if st.st_uid != (0 if system else uid):
            return 'BLOCKED_OWNER'
        if st.st_mode & (0o077 if private else 0o022):
            return 'BLOCKED_PERMISSIONS'
        if kind == 'file' and private and st.st_nlink != 1:
            return 'BLOCKED_HARDLINK'
        return 'VERIFIED_METADATA'
    except FileNotFoundError:
        return 'ABSENT'
    except (OSError, ValueError):
        return 'NOT_PROVEN'


def credentials(home, env):
    paths = {'ssh_dir': (home / '.ssh', 'dir'),
             'git_credentials': (home / '.git-credentials', 'file'),
             'netrc': (home / '.netrc', 'file'),
             'aws_dir': (home / '.aws', 'dir'),
             'aws_credentials': (home / '.aws/credentials', 'file'),
             'kube_config': (home / '.kube/config', 'file')}
    config = absolute(env.get('XDG_CONFIG_HOME') or home / '.config')
    paths.update(gh_config=(config / 'gh', 'dir'),
                 gh_hosts=(config / 'gh/hosts.yml', 'file'),
                 rclone_config=(config / 'rclone/rclone.conf', 'file'),
                 gcloud_config=(config / 'gcloud', 'dir'),
                 gcloud_adc=(config / 'gcloud/application_default_credentials.json', 'file'))
    for name, label, kind in [('GH_CONFIG_DIR', 'gh_override', 'dir'),
                              ('RCLONE_CONFIG', 'rclone_override', 'file'),
                              ('CLOUDSDK_CONFIG', 'gcloud_override', 'dir'),
                              ('GOOGLE_APPLICATION_CREDENTIALS', 'google_adc_override', 'file'),
                              ('AWS_SHARED_CREDENTIALS_FILE', 'aws_override', 'file')]:
        if env.get(name):
            paths[label] = (env[name], kind)
    # An override directory can be private while its credential file is not.
    for name, label, filenames in (
            ('GH_CONFIG_DIR', 'gh', ('hosts.yml',)),
            ('CLOUDSDK_CONFIG', 'gcloud', ('application_default_credentials.json',
                                        'credentials.db', 'access_tokens.db'))):
        if env.get(name):
            directory = absolute(env[name])
            for i, filename in enumerate(filenames):
                paths[f'{label}_override_file_{i}'] = (directory / filename, 'file')
    paths.update(gcloud_credentials_db=(config / 'gcloud/credentials.db', 'file'),
                 gcloud_access_tokens_db=(config / 'gcloud/access_tokens.db', 'file'),
                 aws_config=(home / '.aws/config', 'file'),
                 git_config=(config / 'git/credentials', 'file'))
    overflow = False
    if env.get('KUBECONFIG'):
        entries = [v for v in env['KUBECONFIG'].split(os.pathsep) if v]
        overflow = len(entries) > 16
        paths.update({f'kube_override_{i}': (v, 'file') for i, v in
                      enumerate(entries[:16])})
    result = {label: metadata(path, kind) for label, (path, kind) in paths.items()}
    if overflow:
        result['kube_override_coverage'] = 'BLOCKED_PATH_LIMIT'
    return result


def ca_audit(path, expected=None):
    result = {'metadata': metadata(path, 'file', private=False, system=True),
              'baseline': 'NOT_PROVEN', 'tls_context': 'NOT_PROVEN'}
    if result['metadata'] != 'VERIFIED_METADATA':
        return result
    try:
        before = path.lstat()
        with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK), 'rb') as f:
            opened = os.fstat(f.fileno())
            if (not stat.S_ISREG(opened.st_mode) or opened.st_uid != 0 or
                    opened.st_mode & 0o022 or (opened.st_dev, opened.st_ino) !=
                    (before.st_dev, before.st_ino)):
                raise ValueError('CA_CHANGED')
            data = f.read(8 * 1024 * 1024 + 1)
            after = os.fstat(f.fileno())
        if not data or len(data) > 8 * 1024 * 1024 or (opened.st_size, opened.st_mtime_ns,
                opened.st_ctime_ns) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            raise ValueError('CA_UNSTABLE_OR_SIZE')
        digest = hashlib.sha256(data).hexdigest()
        result['sha256'] = digest
        if expected:
            result['baseline'] = 'VERIFIED' if digest == expected.lower() else 'BLOCKED_HASH_MISMATCH'
            if result['baseline'] != 'VERIFIED':
                return result
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.load_verify_locations(cadata=data.decode('ascii'))
        if (context.keylog_filename is not None or not context.check_hostname or
                context.verify_mode != ssl.CERT_REQUIRED or not context.cert_store_stats()['x509_ca']):
            raise ValueError('TLS_POLICY')
        result['tls_context'] = 'VERIFIED'
        result['ca_count'] = context.cert_store_stats()['x509_ca']
    except (OSError, ValueError):
        result['tls_context'] = 'BLOCKED_CA_LOAD'
    return result


def private_child(parent_fd, name):
    try:
        os.mkdir(name, mode=0o700, dir_fd=parent_fd)
    except FileExistsError:
        pass
    fd = os.open(name, DIR_FLAGS, dir_fd=parent_fd)
    st = os.fstat(fd)
    if st.st_uid != os.geteuid() or stat.S_IMODE(st.st_mode) != 0o700:
        os.close(fd)
        raise ValueError('RUNNER_DIR_NOT_PRIVATE')
    return fd


def runner_environment(root):
    return {'PATH': SAFE_PATH, 'LC_ALL': 'C', 'HOME': str(root / 'home'),
            'TMPDIR': str(root / 'tmp'), 'XDG_CONFIG_HOME': str(root / 'config'),
            'XDG_CACHE_HOME': str(root / 'cache')}


def prepare_runner(home):
    if metadata(home, 'dir') != 'VERIFIED_METADATA':
        return 'BLOCKED_HOME_NOT_PRIVATE'
    root = home / '.acodex-runner'
    try:
        home_fd = os.open(home, DIR_FLAGS)
        try:
            st = os.fstat(home_fd)
            if st.st_uid != os.geteuid() or st.st_mode & 0o077:
                return 'BLOCKED_HOME_CHANGED'
            root_fd = private_child(home_fd, '.acodex-runner')
            try:
                for name in RUNNER_DIRS:
                    os.close(private_child(root_fd, name))
            finally:
                os.close(root_fd)
        finally:
            os.close(home_fd)
        env = runner_environment(root)
        probe = ('import os,json; print(json.dumps({"keys":sorted(os.environ),'
                 '"uid_match":os.geteuid()==os.getuid()}))')
        p = subprocess.run([sys.executable, '-I', '-B', '-S', '-c', probe], env=env,
                           cwd=root / 'work', stdin=subprocess.DEVNULL, capture_output=True,
                           text=True, timeout=15, close_fds=True, start_new_session=True)
        if p.returncode != 0 or json.loads(p.stdout) != {'keys': sorted(env), 'uid_match': True}:
            return 'BLOCKED_CHILD_PROBE'
        return 'VERIFIED_PRIVATE_DIRS_AND_ENV_PROBE'
    except (OSError, ValueError, subprocess.SubprocessError):
        return 'BLOCKED_RUNNER_PREPARATION'


def selftest():
    from unittest.mock import patch
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        fd = os.open(base, DIR_FLAGS)
        try:
            os.close(private_child(fd, 'good'))
            (base / 'bad').mkdir(mode=0o755)
            (base / 'bad').chmod(0o755)  # Deliberate unsafe synthetic fixture.
            (base / 'link').symlink_to(base / 'good', target_is_directory=True)
            for name in ('bad', 'link'):
                try:
                    os.close(private_child(fd, name))
                except (OSError, ValueError):
                    continue
                raise AssertionError('UNSAFE_DIR_ACCEPTED')
        finally:
            os.close(fd)
        assert not set(runner_environment(base)) & {'GH_TOKEN', 'SSLKEYLOGFILE', 'LD_PRELOAD'}
        assert metadata(Path('/public/example'), 'dir') == 'BLOCKED_SHARED_PATH'
        assert metadata(Path('relative'), 'file') == 'NOT_PROVEN'
        with patch(__name__ + '.metadata', return_value='BLOCKED_PERMISSIONS'):
            assert prepare_runner(base) == 'BLOCKED_HOME_NOT_PRIVATE'
        with patch(__name__ + '.metadata', return_value='VERIFIED_METADATA'):
            assert prepare_runner(base) == 'VERIFIED_PRIVATE_DIRS_AND_ENV_PROBE'
        assert stat.S_IMODE((base / '.acodex-runner/home').stat().st_mode) == 0o700
    def fake_metadata(path, kind):
        return ('BLOCKED_PERMISSIONS' if Path(path).name in
                ('hosts.yml', 'credentials.db') and 'override' in Path(path).parts
                else 'ABSENT')
    with patch(__name__ + '.metadata', side_effect=fake_metadata):
        findings = credentials(Path('/private/home'), {
            'GH_CONFIG_DIR': '/private/override/gh',
            'CLOUDSDK_CONFIG': '/private/override/gcloud',
            'KUBECONFIG': os.pathsep.join('/private/kube' + str(i) for i in range(17))})
        assert findings['gh_override_file_0'] == 'BLOCKED_PERMISSIONS'
        assert findings['gcloud_override_file_1'] == 'BLOCKED_PERMISSIONS'
        assert findings['kube_override_coverage'] == 'BLOCKED_PATH_LIMIT'
        assert 'kube_override_15' in findings and 'kube_override_16' not in findings
        assert 'gcloud_credentials_db' in findings and 'git_config' in findings
    print('SELFTEST=PASS')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--prepare-runner', action='store_true', help='create private runner dirs and run synthetic child only')
    parser.add_argument('--ca-sha256', help='independently trusted SHA-256 of CA bundle')
    args = parser.parse_args()
    os.umask(0o077)
    if args.self_test:
        selftest()
        return 0
    if args.ca_sha256 and not re.fullmatch('[0-9a-fA-F]{64}', args.ca_sha256):
        parser.error('invalid SHA-256')
    try:
        home = absolute(os.environ.get('HOME', ''))
        h = metadata(home, 'dir')
        try:
            creds = credentials(home, os.environ)
        except ValueError:
            creds = {'config_override': 'BLOCKED_INVALID_PATH'}
        ca = ca_audit(CA, args.ca_sha256)
        runner = prepare_runner(home) if args.prepare_runner else 'NOT_REQUESTED'
        report = {'schema': 'ACODEX_LOCAL_TRUST_V3', 'utc': datetime.now(timezone.utc).isoformat(),
                  'scope': 'LOCAL_METADATA_CA_AND_OPTIONAL_SYNTHETIC_RUNNER',
                  'home': h, 'credentials': creds, 'ca': ca, 'runner': runner,
                  'effective_root': os.geteuid() == 0, 'kernel_sandbox': 'NOT_PROVEN',
                  'device_identity': 'NOT_PROVEN', 'network': 'NOT_USED',
                  'credential_contents': 'NOT_READ'}
        outcomes = [h, *creds.values(), ca['metadata'], ca['baseline'], ca['tls_context'], runner]
        blocked = any(s.startswith('BLOCKED') for s in outcomes)
        report['status'] = 'BLOCKED' if blocked else 'REVIEW_REQUIRED'
        print(json.dumps(report, sort_keys=True, indent=2))
        return 2 if blocked else 0
    except (OSError, ValueError):
        print('LOCAL_TRUST=NOT_PROVEN')
        return 1


if __name__ == '__main__':
    sys.exit(main())
