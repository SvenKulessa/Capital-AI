import contextlib
import importlib.util
import io
import pathlib
import unittest
import urllib.error

path = pathlib.Path(__file__).with_name("2026-11-28_PLATFORM_CHATGPT_ADSENSE_READBACK_v1.py")
spec = importlib.util.spec_from_file_location("adsense_readback", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class ReadbackTests(unittest.TestCase):
    def test_target_only_and_no_private_inventory(self):
        calls = []
        def get(path, params):
            calls.append(path)
            if path == "accounts":
                return {"accounts": [{"name": "accounts/pub-1234567890123456", "state": "READY", "displayName": "PRIVATE_NAME"}]}
            return {"sites": [{"domain": "other.example", "state": "READY"}, {"domain": "capital-ai.online", "state": "READY", "autoAdsEnabled": False}]}
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(mod.diagnose(get), 0)
        self.assertIn("ADSENSE_SITE_STATE=READY", output.getvalue())
        self.assertIn("ca-pub-1234567890123456", output.getvalue())
        self.assertNotIn("PRIVATE_NAME", output.getvalue())
        self.assertNotIn("other.example", output.getvalue())
        self.assertEqual(calls, ["accounts", "accounts/pub-1234567890123456/sites"])

    def test_missing_target_does_not_select_unrelated_account(self):
        with self.assertRaisesRegex(mod.Blocked, "TARGET_SITE_NOT_FOUND"):
            mod.diagnose(lambda path, params: {})

    def test_pagination_is_complete_or_blocked(self):
        with self.assertRaisesRegex(mod.Blocked, "PAGINATION_INVALID"):
            mod.listing(lambda path, params: {"accounts": [], "nextPageToken": "same"}, "accounts", "accounts")

    def test_no_provider_path_injection(self):
        with self.assertRaisesRegex(mod.Blocked, "ACCOUNT_RESOURCE_INVALID"):
            mod.diagnose(lambda path, params: {"accounts": [{"name": "https://evil.invalid"}]})

    def test_scope_error_redacts_provider_body_and_token(self):
        class Opener:
            def open(self, request, timeout):
                assert request.method == "GET"
                assert request.full_url.startswith("https://adsense.googleapis.com/v2/accounts?")
                raise urllib.error.HTTPError(request.full_url, 403, "PRIVATE_ERROR", {}, io.BytesIO(b'{"error":{"message":"SECRET","details":[{"reason":"ACCESS_TOKEN_SCOPE_INSUFFICIENT"}]}}'))
        with self.assertRaisesRegex(mod.Blocked, "^ACCESS_TOKEN_SCOPE_INSUFFICIENT$"):
            mod.http_get(Opener(), "synthetic-token", "accounts", {})


if __name__ == "__main__":
    unittest.main()
