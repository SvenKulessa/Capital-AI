#!/usr/bin/env python3
"""Offline contract tests of exact pinned private ACOPY v6 bytes; no live bridge."""
import argparse
import contextlib
import io
import os
from pathlib import Path
import re
import runpy
import sys
import types
import unittest
from unittest.mock import patch

M = None

class ClipboardContract(unittest.TestCase):
    def invoke(self, program, tty=True, env=None):
        out = io.TextIOWrapper(io.BytesIO(), encoding='utf-8')
        err = io.StringIO()
        settings = {'TERM': 'xterm', 'ACOPY_EXPECTED_EXITS': '0,7'}
        settings.update(env or {})
        with patch.dict(os.environ, settings, clear=True), patch.object(out, 'isatty', return_value=tty), \
                patch.object(M, 'copy_out', return_value='NATIVE_READBACK_OK') as copy, \
                patch.object(M, 'handoff') as handoff, contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            rc = M.run([sys.executable, '-I', '-B', '-c', program])
            handoff.assert_not_called()
            return rc, [c.args[0] for c in copy.call_args_list], out.buffer.getvalue(), err.getvalue()

    def test_order_utf8_blank_indent_stderr(self):
        writes = [(1, 'LINE_01\n'), (2, 'STDERR_02\n'), (1, '\n  Grüße – 世界\n'), (2, '\tLINE_05\n')]
        rc, copies, terminal, _ = self.invoke('import os; w=' + repr(writes) + '; [os.write(fd,s.encode("utf-8")) for fd,s in w]')
        expected = ''.join(s for _, s in writes).encode('utf-8')
        self.assertEqual((rc, copies, terminal), (0, [expected + b'\nACOPY_COMMAND_EXIT=0\n'], expected))

    def test_ansi_and_default_colors(self):
        plain = b'INTEGRITY=VERIFIED\nSECURITY=BLOCKED\nREVIEW=NOT_PROVEN\nPROCESS=IN_PROGRESS\n'
        raw = plain + b'\x1b[35mEXTERNAL\x1b[0m\r\n'
        rc, copies, terminal, err = self.invoke('import os; os.write(1,' + repr(raw) + '); raise SystemExit(7)')
        self.assertEqual(rc, 7)
        self.assertEqual(copies, [plain + b'EXTERNAL\n\nACOPY_COMMAND_EXIT=7\n'])
        for code, line in zip((32,31,33,36), plain.splitlines()):
            self.assertIn(b'\x1b[' + str(code).encode() + b'm' + line + b'\x1b[0m', terminal)
        self.assertIn('ACOPY_CLIPBOARD_STATUS=READBACK_VERIFIED', err)

    def test_color_disable_options(self):
        for tty, env in [(True, {'NO_COLOR': ''}), (True, {'ACOPY_LOCAL_COLOR': '0'}), (True, {'TERM': 'dumb'}), (False, {})]:
            with self.subTest(tty=tty, env=env):
                _, copies, terminal, _ = self.invoke('print("SCAN=VERIFIED")', tty, env)
                self.assertEqual(terminal, b'SCAN=VERIFIED\n')
                self.assertEqual(copies, [b'SCAN=VERIFIED\n\nACOPY_COMMAND_EXIT=0\n'])

    def test_partial_last_line(self):
        rc, copies, terminal, _ = self.invoke('import os; os.write(1,b"a\\n\\n  b")')
        self.assertEqual((rc, copies, terminal), (0, [b'a\n\n  b\nACOPY_COMMAND_EXIT=0\n'], b'a\n\n  b'))

    def test_one_copy_and_no_previous_output(self):
        for value in ('FIRST', 'SECOND'):
            rc, copies, _, _ = self.invoke('print(' + repr(value) + ')')
            self.assertEqual((rc, copies), (0, [(value + '\n\nACOPY_COMMAND_EXIT=0\n').encode()]))

    def test_empty_output_exit(self):
        rc, copies, _, err = self.invoke('raise SystemExit(7)')
        self.assertEqual((rc, copies), (7, []))
        self.assertIn('ACOPY_CLIPBOARD=EMPTY_NO_COPY', err)

    def test_security_filters(self):
        for payload, reason in [(b'password=synthetic_only\n', 'POSSIBLE_SECRET'), (b'bad\x00data', 'CONTROL_CHARACTERS'), (b'\xff', 'BINARY_OUTPUT')]:
            with self.subTest(reason=reason):
                rc, copies, _, err = self.invoke('import os; os.write(1,' + repr(payload) + ')')
                self.assertEqual((rc, copies), (0, []))
                self.assertIn('ACOPY_CLIPBOARD=' + reason + '_NO_COPY', err)

    def test_oversize_no_partial_copy(self):
        rc, copies, _, err = self.invoke('import os; os.write(1,b"x"*48001)')
        self.assertEqual((rc, copies), (0, []))
        self.assertIn('ACOPY_CLIPBOARD=OUTPUT_TOO_LARGE_NO_COPY', err)

    def test_non_tty_real_gate(self):
        with patch.object(sys.stdout, 'isatty', return_value=False), patch.object(M, 'private_root') as root, patch.dict(os.environ, {}, clear=True):
            self.assertEqual(M.copy_out(b'plain'), 'NO_FOREGROUND_TTY')
            root.assert_not_called()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path, help='private v6 candidate or installed wrapper')
    args = parser.parse_args()
    installer = runpy.run_path(str(Path(__file__).with_name('acopy-color-v6-upgrade.py')))
    raw = installer['read'](args.source)
    digest = installer['sha'](raw)
    if digest == installer['SOURCE_SHA']:
        raw = installer['candidate'](args.source)
    elif digest != installer['NEW_SHA']:
        raise SystemExit('BLOCKED: unknown wrapper SHA')
    M = types.ModuleType('acopy_pinned_v6')
    exec(compile(raw, '<pinned-private-wrapper>', 'exec'), M.__dict__)
    unittest.main(argv=[sys.argv[0]], verbosity=2)
