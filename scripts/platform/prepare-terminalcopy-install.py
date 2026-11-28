"""Verify and stage the private TerminalCopy RC for Acode's native installer."""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile

PUBLIC = Path('/public')
SHARED = PUBLIC / 'CAPITAL-AI-ACODE-CHATGPT-EXCHANGE/shared'
PULL = PUBLIC / '.config/acode-audit/drive-pull.sh'
PULL_SHA = 'c01dddb9f1b77e959996c66aa73eebf766155d311cfacdc89bca4a15a213b5cc'
NAME = '2026-11-28_PLATFORM_CHATGPT_ACODE_TERMINALCOPY_PRIVATE_RC_v1.zip'
ZIP_SHA = '4a6e1b9dfd03570f4a21303788fdc5f1f233bf3ea7b5ec4cb98ccf9b28c12c79'
STAGE = PUBLIC / 'TerminalCopy-Install-v1.3.4'


def read_regular(path, limit):
    if any(p.is_symlink() for p in (path, *path.parents)) or not path.is_file():
        raise ValueError('UNSAFE_PATH')
    with path.open('rb') as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError('FILE_TOO_LARGE')
    return data


def check(data, sha):
    if hashlib.sha256(data).hexdigest() != sha:
        raise ValueError('SHA_MISMATCH')


def manifest(data):
    check(data, ZIP_SHA)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        raw = archive.read('plugin.json')
        meta = json.loads(raw)
    if (meta.get('id'), meta.get('version'), meta.get('name'), meta.get('license'), meta.get('price')) != (
        'online.capitalai.acopybridge', '1.3.4', 'CAPITAL-AI TerminalCopy', 'UNLICENSED', 0
    ):
        raise ValueError('MANIFEST_MISMATCH')
    return raw


def stage(data, target):
    raw = manifest(data)
    if any(p.is_symlink() for p in (target, *target.parents)):
        raise ValueError('UNSAFE_STAGE')
    target.mkdir(mode=0o700, exist_ok=True)
    expected = {'TerminalCopy-1.3.4.zip': data, 'plugin.json': raw}
    if set(p.name for p in target.iterdir()) - expected.keys():
        raise ValueError('UNEXPECTED_STAGE_CONTENT')
    for name, contents in expected.items():
        path = target / name
        if path.exists() or path.is_symlink():
            if read_regular(path, 1048576) != contents:
                raise ValueError('STAGE_CONFLICT')
        else:
            with path.open('xb') as stream:
                stream.write(contents)
    for name, contents in expected.items():
        if read_regular(target / name, 1048576) != contents:
            raise ValueError('STAGE_READBACK_MISMATCH')
    return target


def main():
    if sys.argv[1:] not in ([], ['--prepare-only']):
        raise ValueError('ARGUMENT_INVALID')
    check(read_regular(PULL, 1048576), PULL_SHA)
    print('DRIVE_PULL_PIN=VERIFIED', flush=True)
    subprocess.run(['/bin/sh', str(PULL)], check=True, timeout=600)
    data = read_regular(SHARED / NAME, 1048576)
    path = stage(data, STAGE)
    print('PLUGIN_SHA256=VERIFIED')
    print('PLUGIN_MANIFEST=VERIFIED')
    print('INSTALL_STAGE=VERIFIED')
    print('INSTALL_PATH=' + str(path))
    cli = shutil.which('acode')
    if cli and not sys.argv[1:]:
        try:
            result = subprocess.run([cli, str(path)], timeout=20)
            print('ACODE_FOLDER_OPEN_EXIT=' + str(result.returncode))
        except (OSError, subprocess.TimeoutExpired):
            print('ACODE_FOLDER_OPEN=NOT_PROVEN')
    else:
        print('ACODE_FOLDER_OPEN=MANUAL')
    print('NEXT=Long press TerminalCopy-1.3.4.zip; Install as Plugin')
    print('PLUGIN_INSTALL=USER_ACTION_REQUIRED')
    return 2


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, subprocess.SubprocessError, zipfile.BadZipFile) as exc:
        print('INSTALL_PREPARATION=BLOCKED')
        print('ERROR_TYPE=' + type(exc).__name__)
        if isinstance(exc, ValueError):
            print('REASON=' + str(exc))
        sys.exit(1)
