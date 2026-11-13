"""Offline compatibility check; no model or git-hosting request."""
def traceparent_regression():
    """CVE-2026-126360: reject oversized/newline carriers, retain valid tracing."""
    from importlib.metadata import version
    from opentelemetry import trace
    from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

    assert version('opentelemetry-api') == version('opentelemetry-sdk') == '1.45.2'
    propagator = TraceContextTextMapPropagator()
    valid = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
    span = trace.get_current_span(propagator.extract({'traceparent': valid}))
    assert span.get_span_context().is_valid
    for malformed in (valid + ' ' * 100000 + '\n!', valid + '\r\n', 'x' * 513):
        span = trace.get_current_span(propagator.extract({'traceparent': malformed}))
        assert not span.get_span_context().is_valid, 'Malformed trace context accepted'
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as HttpExporter
    assert callable(HttpExporter)
    print('OpenTelemetry traceparent fail-closed regression: PASS')


traceparent_regression()


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
