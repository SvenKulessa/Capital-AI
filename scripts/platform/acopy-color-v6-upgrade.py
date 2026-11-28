#!/usr/bin/env python3
"""Local pinned ACOPY upgrade; no network, startup edits or clipboard mutations."""
import argparse
import fcntl
import hashlib
import os
from pathlib import Path
import stat
import subprocess
import tempfile

TARGET = Path('/usr/local/bin/acopy')
SOURCE = Path('/public/CAPITAL-AI-ACODE-CHATGPT-EXCHANGE/shared/Fix-ACOPYColor-ACX-v6.py')
SOURCE_SHA = '01b3cf066828a4682549316f57f3d461fc0e466b6606fe21885d755bb6344075'
NEW_SHA = 'ea7b128613fd43ebbea2050fbb313eb3dd3b424c15aad055081340bff5efb576'
OLD = frozenset((SOURCE_SHA,
    '63750984663f442550495190d0f96944f7e6067c5cbd4f78d44174b542f17bfb',
    '63894b098431df603ad2b164fd9b4198e6a5d0a9c20a7ad182e3abbe31d4089f',
    'cc1ba076005eb48f89ce3d30a7c93995a4c7c7e6c1817ab682ae848d9caefa60',
    'a1ab4c7d46432eeb48270b4e9bcf0f6526ca72ede614fb2754dab3e43d254641'))

def sha(data):
    return hashlib.sha256(data).hexdigest()

def read(path, mode=None):
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ValueError('SYMLINK')
    with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK), 'rb') as f:
        st = os.fstat(f.fileno())
        if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1 or st.st_size > 131072:
            raise ValueError('UNSAFE_FILE')
        if mode is not None and (st.st_uid != os.geteuid() or stat.S_IMODE(st.st_mode) != mode):
            raise ValueError('UNSAFE_METADATA')
        data = f.read(131073)
        if len(data) > 131072:
            raise ValueError('SIZE_LIMIT')
        return data

def candidate(source):
    raw = read(source)
    if sha(raw) != SOURCE_SHA:
        raise ValueError('SOURCE_SHA_MISMATCH')
    old = b"os.environ.get('ACOPY_LOCAL_COLOR')=='1'"
    new = b"os.environ.get('ACOPY_LOCAL_COLOR','1')=='1'"
    if raw.count(old) != 1:
        raise ValueError('PATCH_CONTEXT')
    result = raw.replace(old, new)
    if sha(result) != NEW_SHA:
        raise ValueError('RESULT_SHA_MISMATCH')
    compile(result, '<pinned-wrapper>', 'exec')
    return result

def replace(target, before, after):
    fd, name = tempfile.mkstemp(prefix='.acopy-upgrade-', dir=target.parent)
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(after); f.flush(); os.fchmod(f.fileno(), 0o755); os.fsync(f.fileno())
        if read(target, 0o755) != before:
            raise ValueError('TARGET_CHANGED')
        os.replace(name, target)
        if read(target, 0o755) != after:
            raise ValueError('TARGET_READBACK_MISMATCH')
    finally:
        if os.path.exists(name):
            os.unlink(name)

def upgrade(target, source, action, rollback_sha=None):
    for p in (target.parent, *target.parent.parents):
        s = p.lstat()
        if not stat.S_ISDIR(s.st_mode) or s.st_uid != os.geteuid() or s.st_mode & 0o022:
            raise ValueError('UNSAFE_TARGET_DIRECTORY')
    lock = target.with_name('.acopy-upgrade.lock')
    with os.fdopen(os.open(lock, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600), 'rb') as f:
        s = os.fstat(f.fileno())
        if not stat.S_ISREG(s.st_mode) or s.st_nlink != 1 or s.st_uid != os.geteuid() or stat.S_IMODE(s.st_mode) != 0o600:
            raise ValueError('UNSAFE_LOCK')
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        before = read(target, 0o755); digest = sha(before)
        print('ACTIVE_SHA256=' + digest, flush=True)
        if action == 'rollback':
            if rollback_sha not in OLD or digest != NEW_SHA:
                raise ValueError('ROLLBACK_PIN_MISMATCH')
            backup = target.with_name('.acopy-pre-v6-' + rollback_sha + '.bak')
            after = read(backup, 0o600)
            if sha(after) != rollback_sha:
                raise ValueError('BACKUP_SHA_MISMATCH')
            replace(target, before, after)
            print('ROLLBACK=VERIFIED'); return
        after = candidate(source)
        if digest == NEW_SHA:
            print('UPGRADE=ALREADY_INSTALLED'); return
        if digest not in OLD:
            raise ValueError('UNKNOWN_ACTIVE_SHA')
        if action == 'check':
            print('UPGRADE_READY=VERIFIED'); return
        backup = target.with_name('.acopy-pre-v6-' + digest + '.bak')
        if not os.path.lexists(backup):
            with os.fdopen(os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600), 'wb') as out:
                out.write(before); out.flush(); os.fsync(out.fileno())
        if read(backup, 0o600) != before:
            raise ValueError('BACKUP_SHA_MISMATCH')
        print('ROLLBACK_SHA256=' + digest, flush=True)
        replace(target, before, after)
        try:
            config = subprocess.check_output(['/usr/bin/python3', '-I', '-B', str(target), '--config'], timeout=10)
            if b'ACOPY_WRAPPER_REVISION=6\n' not in config or b'ACOPY_REMOTE_TRANSFER=DISABLED\n' not in config:
                raise ValueError('CONFIG_READBACK')
        except (OSError, ValueError, subprocess.SubprocessError):
            replace(target, after, before)
            print('AUTO_ROLLBACK=VERIFIED'); raise
        print('INSTALLED_SHA256=' + NEW_SHA)
        print('UPGRADE=VERIFIED')
        print('DEVICE_CLIPBOARD_AND_COLOR_RETEST=REQUIRED')

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument('--check', action='store_true'); g.add_argument('--apply', action='store_true'); g.add_argument('--rollback', metavar='OLD_SHA256')
    a = p.parse_args()
    try:
        upgrade(TARGET, SOURCE, 'rollback' if a.rollback else 'apply' if a.apply else 'check', a.rollback)
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        print('UPGRADE=BLOCKED'); print('ERROR_TYPE=' + type(exc).__name__)
        if isinstance(exc, ValueError): print('REASON=' + str(exc))
        raise SystemExit(2)
