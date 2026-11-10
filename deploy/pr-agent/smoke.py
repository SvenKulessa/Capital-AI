"""Offline compatibility check; no model or git-hosting request."""
def oauthlib_device_code_regression():
    """CVE-2026-49272: missing/unknown codes cannot authorize device grants."""
    from oauthlib.common import Request
    from oauthlib.oauth2 import RequestValidator
    from oauthlib.oauth2.rfc6749 import errors
    from oauthlib.oauth2.rfc8628.grant_types.device_code import DeviceCodeGrant

    class UnknownDeviceValidator(RequestValidator):
        def validate_device_code(self, client_id, code, request):
            return None

    grant = DeviceCodeGrant(UnknownDeviceValidator())
    for body, expected in (
        ('client_id=offline-test', errors.InvalidRequestError),
        ('client_id=offline-test&device_code=unknown-offline-code', errors.InvalidGrantError),
    ):
        request = Request('https://oauth.invalid/token', http_method='POST', body=body)
        try:
            grant.validate_device_code(request)
        except expected:
            pass
        else:
            raise AssertionError('Missing or unknown device code was accepted')
    print('OAuthLib device-code fail-closed regression: PASS')


oauthlib_device_code_regression()

from pr_agent.config_loader import get_settings, _find_repository_root
from pr_agent.git_providers.plain_diff_provider import PlainDiffGitProvider
from pr_agent.cli import run

assert _find_repository_root() is None, 'Reviewer must run outside a repository'
assert callable(run), 'Full CLI import must succeed offline'
settings = get_settings()
settings.set('plain_diff.content', 'diff --git a/sample.py b/sample.py\n--- a/sample.py\n+++ b/sample.py\n@@ -1 +1 @@\n-before\n+after\n')
provider = PlainDiffGitProvider()
files = provider.get_diff_files()
assert len(files) == 1 and files[0].filename == 'sample.py'
assert provider.get_files() == ['sample.py']
print('PR-Agent plain-diff offline smoke: PASS')
