"""Offline security regression and negative tests: no provider credentials needed."""
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from datetime import datetime, timezone

spec = importlib.util.spec_from_file_location("credential_lifecycle", Path(__file__).with_name("credential_lifecycle.py"))
subject = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = subject
spec.loader.exec_module(subject)
NOW = datetime(2026, 11, 15, 21, 0, tzinfo=timezone.utc)


def item(**updates):
    value = {"id": "youtube_owner", "provider": "Google", "consumer": "social_media",
             "kind": "oauth_access", "rotation_mode": "provider_refresh",
             "source_ref": "repo:server/social-media/youtube-token-resolver.mjs",
             "expires_at": None, "review_due_at": None}
    value.update(updates)
    return value


def doc(*items):
    return {"schema": subject.SCHEMA, "credentials": list(items) or [item()]}


def observation(when, **updates):
    value = {"id": "youtube_owner", "expires_at": when,
             "observed_at": "2026-11-15T20:59:00Z", "evidence_ref": "provider:audit-001"}
    value.update(updates)
    return {"schema": subject.SCHEMA, "observations": [value]}


class LifecycleTests(unittest.TestCase):
    def verdict(self, record, obs=None):
        return subject.evaluate_offline(doc(record), obs, NOW)["credentials"][0]["verdict"]

    def test_unknown_without_readback_remains_not_proven(self):
        self.assertEqual(self.verdict(item()), "NOT_PROVEN")
        self.assertEqual(subject.evaluate_offline(doc(item()), at=NOW)["status"], "NOT_PROVEN")

    def test_expired_access_token_fails_closed(self):
        result = subject.evaluate_offline(doc(item()), observation("2026-11-07T16:34:20Z"), NOW)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(result["credentials"][0]["verdict"], "EXPIRED")

    def test_warning_boundaries(self):
        for days, name in ((30, "DUE_30D"), (14, "DUE_14D"), (7, "DUE_7D"),
                           (3, "DUE_3D"), (1, "DUE_1D")):
            from datetime import timedelta
            expiry = subject.iso_utc(NOW + timedelta(days=days))
            with self.subTest(days=days):
                self.assertEqual(self.verdict(item(), observation(expiry)), name)
        self.assertEqual(self.verdict(item(), observation("2027-02-01T00:00:00Z")), "CURRENT")

    def test_keyless_does_not_require_stored_secret(self):
        record = item(kind="workload_identity", rotation_mode="keyless")
        self.assertEqual(self.verdict(record), "KEYLESS")

    def test_review_due_without_fixed_expiry(self):
        record = item(kind="api_key", rotation_mode="owner_manual", review_due_at="2026-11-01T00:00:00Z")
        self.assertEqual(self.verdict(record), "REVIEW_DUE")

    def test_secret_field_rejected_without_echo(self):
        for malicious in ({**item(), "secret": "sk_live_DO_NOT_LOG"},
                          {**item(), "token": "abc123"}):
            with self.subTest(malicious=tuple(malicious)):
                with self.assertRaisesRegex(ValueError, "unsupported inventory fields") as context:
                    subject.evaluate_offline(doc(malicious), at=NOW)
                self.assertNotIn("sk_live", str(context.exception))

    def test_observation_additional_fields_rejected(self):
        raw = observation("2026-12-01T00:00:00Z", access_token="should_never_persist")
        with self.assertRaisesRegex(ValueError, "unsupported observation fields"):
            subject.evaluate_offline(doc(item()), raw, NOW)

    def test_future_stale_and_untrusted_evidence_fail_closed(self):
        for overrides in ({"observed_at": "2026-11-16T00:00:00Z"},
                          {"observed_at": "2026-11-13T00:00:00Z"},
                          {"evidence_ref": "https://attacker.example/?token=abc"}):
            with self.subTest(overrides=overrides):
                with self.assertRaises(ValueError):
                    subject.evaluate_offline(doc(item()), observation("2026-12-01T00:00:00Z", **overrides), NOW)

    def test_unknown_duplicate_and_malformed_ids_fail_closed(self):
        for d, obs in ((doc(item(), item()), None),
                       (doc(item(id="TOKEN=abc")), None),
                       (doc(item()), observation("2026-12-01T00:00:00Z", id="other_id"))):
            with self.assertRaises(ValueError):
                subject.evaluate_offline(d, obs, NOW)

    def test_reject_non_utc_and_invalid_dates(self):
        for t in ("2026-11-15T21:00:00+01:00", "2026-99-99T00:00:00Z", "tomorrow"):
            with self.assertRaises(ValueError):
                subject.evaluate_offline(doc(item(expires_at=t)), at=NOW)

    def test_report_contains_only_allowlisted_keys(self):
        report = subject.evaluate_offline(doc(item()), at=NOW)
        self.assertEqual(set(report), {"schema", "generated_at", "status", "counts", "credentials", "scope"})
        self.assertEqual(set(report["credentials"][0]), {"id", "provider", "verdict", "action", "days_remaining", "evidence_status"})
        self.assertNotIn("token", json.dumps(report).lower())

    def test_graph_nodes_and_bounded_terminal_evidence(self):
        try:
            import langgraph  # noqa: F401
        except ImportError:
            self.skipTest("pinned LangGraph dependency not installed in this environment")
        result = subject.build_graph(doc(item()), at=NOW).invoke({})
        self.assertEqual(result["phase"], "EVIDENCED")
        self.assertEqual(result["history"], ["INVENTORIED", "EVALUATED", "NOT_PROVEN", "EVIDENCED"])
        self.assertEqual(result["report"]["status"], "NOT_PROVEN")


if __name__ == "__main__":
    unittest.main()