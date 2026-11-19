"""Synthetic APK database license metadata tests."""
from pathlib import Path
import tempfile
import unittest

from worker_os_licenses import parse_apk_installed, inspect


class WorkerOSLicenseTests(unittest.TestCase):
    def test_parse_two_installed_records(self):
        payload = b"P:python3\nV:3.14\nL:PSF-2.0\nO:python3\n\nP:glibc\nV:2.40\nL:LGPL-2.1-or-later\n\n"
        packages = parse_apk_installed(payload)
        self.assertEqual(len(packages), 2)
        self.assertEqual(packages[0]["name"], "glibc")
        self.assertEqual(packages[0]["license"], "LGPL-2.1-or-later")

    def test_missing_database_is_not_empty_license_approval(self):
        with tempfile.TemporaryDirectory() as temp:
            result = inspect((Path(temp) / "missing",))
            self.assertEqual(result["status"], "APK_METADATA_NOT_PROVEN")
            self.assertEqual(result["packages"], [])

    def test_no_duplicate_package_identity(self):
        with self.assertRaises(ValueError):
            parse_apk_installed(b"P:libc\nV:1\nL:MIT\n\nP:libc\nV:1\nL:MIT\n")

    def test_missing_version_rejected(self):
        with self.assertRaises(ValueError):
            parse_apk_installed(b"P:libc\nL:MIT\n")

    def test_symlinked_apk_index_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp) / "index"
            target.write_bytes(b"P:libc\nV:1\nL:MIT\n")
            alias = Path(temp) / "alias"
            alias.symlink_to(target)
            with self.assertRaises(ValueError):
                inspect((alias,))


if __name__ == "__main__":
    unittest.main()
