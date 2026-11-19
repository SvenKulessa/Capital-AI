"""Offline, no-network adversarial tests for bounded provider metadata adapters."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
for name in ("credential_lifecycle", "provider_metadata"):
    if name not in sys.modules:
        spec = importlib.util.spec_from_file_location(name, ROOT / (name + ".py"))
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)

lifecycle = sys.modules["credential_lifecycle"]
provider = sys.modules["provider_metadata"]
NOW = datetime(2026, 11, 16, 0, 30, tzinfo=timezone.utc)
STAMP = "2026-11-16T00:00:00Z"
INVENTORY = {"schema": lifecycle.SCHEMA, "credentials": [
    {"id": ident, "provider": "Google", "consumer": "social_media", "kind": "oauth_access",
     "rotation_mode": "provider_refresh", "source_ref": "repo:render.yaml",
     "expires_at": None, "review_due_at": None} for ident in ("x_owner_oauth", "youtube_owner_oauth")
]}


def readback(name, records):
    return {"provider": name, "scope": provider.BINDINGS[name][0],
            "method": provider.BINDINGS[name][1], "observed_at": STAMP, "records": records}


def readbacks(*items):
    return {"schema": provider.SCHEMA, "readbacks": list(items)}


class ProviderMetadataTests(unittest.TestCase):
    def adapt(self, *items):
        return provider.adapt_provider_readbacks(readbacks(*items), INVENTORY, NOW)

    def test_all_five_provider_adapters_accept_only_bounded_metadata(self):
        observations, checks = self.adapt(
            readback("supabase", [{"platform": "youtube", "status": "connected", "account_count": 1, "owner_bound": True,
                                   "nearest_expiry": "2026-11-07T16:34:20Z"}]),
            readback("render", [{"service_id": "srv-dau1rp893c1s73cdhm1g",
                                 "registry_credential_present": True, "registry_updated_at": "2026-10-01T00:00:00Z"}]),
            readback("stripe", [{"endpoint_id": "we_1UPracPKr4joNbEc4xqcYEFF",
                                 "livemode": True, "status": "enabled", "created_at": STAMP}]),
            readback("google", [{"service_account": "capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com",
                                 "disabled": False, "user_managed_key_valid_before": ["2027-01-01T00:00:00Z"]}]),
            readback("github", [{"secret_name": "RENDER_API_KEY_TEST", "updated_at": STAMP}]),
        )
        self.assertEqual(len(observations["observations"]), 1)
        self.assertEqual(observations["observations"][0]["id"], "youtube_owner_oauth")
        self.assertEqual(len(checks), 5)
        self.assertEqual(checks[3]["metadata_status"], "UNBOUND_KEY_EXPIRY")
        self.assertTrue(all(c["provenance_status"] == "INPUT_VALIDATED_NOT_ATTESTED" for c in checks))
        report = lifecycle.evaluate_offline(INVENTORY, observations, NOW)
        self.assertEqual(report["status"], "BLOCKED")
        self.assertEqual(report["credentials"][1]["verdict"], "EXPIRED")
        self.assertEqual(report["credentials"][1]["evidence_status"], "OBSERVATION_UNVERIFIED")

    def test_current_date_not_promoted_to_verified(self):
        observations, checks = self.adapt(readback("supabase", [
            {"platform": "x", "status": "connected", "account_count": 1, "owner_bound": True,
             "nearest_expiry": "2027-02-01T00:00:00Z"}]))
        report = lifecycle.evaluate_offline(INVENTORY, observations, NOW)
        self.assertEqual(report["status"], "NOT_PROVEN")
        self.assertEqual(report["credentials"][0]["verdict"], "CURRENT")
        self.assertEqual(report["credentials"][0]["evidence_status"], "OBSERVATION_UNVERIFIED")

    def test_supabase_multiple_users_cannot_bind_earliest_to_owner(self):
        obs, checks = self.adapt(readback("supabase", [
            {"platform": "x", "status": "connected", "account_count": 2, "owner_bound": True,
             "nearest_expiry": "2026-11-01T00:00:00Z"}]))
        self.assertFalse(obs["observations"])
        self.assertEqual(checks[0]["metadata_status"], "EXPIRY_NOT_PROVEN")

    def test_global_count_is_not_an_owner_binding(self):
        row = {"platform": "x", "status": "connected", "account_count": 1,
               "nearest_expiry": "2026-11-01T00:00:00Z", "owner_bound": False}
        observations, checks = self.adapt(readback("supabase", [row]))
        self.assertEqual(observations["observations"], [])
        self.assertEqual(checks[0]["metadata_status"], "EXPIRY_NOT_PROVEN")
        with self.assertRaises(ValueError):
            self.adapt(readback("supabase", [{**row, "owner_bound": "true"}]))

    def test_supabase_unknown_account_and_duplicate_channel_rejected(self):
        good = {"platform": "x", "status": "connected", "account_count": 1, "owner_bound": True,
                "nearest_expiry": "2026-11-01T00:00:00Z"}
        for data in ([good, good], [{**good, "platform": "other"}],
                     [{**good, "account_count": 0}], [{**good, "account_count": True}]):
            with self.subTest(data=data), self.assertRaises(ValueError):
                self.adapt(readback("supabase", data))

    def test_source_scope_spoofing_and_duplicate_provider_rejected(self):
        entry = readback("supabase", [])
        for bad in ({**entry, "scope": "project:attacker"},
                    {**entry, "method": "select_all_tokens"},
                    {**entry, "provider": "other"}):
            with self.subTest(bad=bad["scope"]), self.assertRaises(ValueError):
                self.adapt(bad)
        with self.assertRaises(ValueError):
            self.adapt(entry, entry)

    def test_future_provider_event_timestamps_fail_closed(self):
        # A timestamp may be earlier than NOW but still postdate the
        # provider readback. It must not be accepted as provenance.
        future_event = "2026-11-16T00:10:00Z"
        cases = (
            readback("render", [{"service_id": "srv-dau1rp893c1s73cdhm1g",
                                  "registry_credential_present": True,
                                  "registry_updated_at": future_event}]),
            readback("stripe", [{"endpoint_id": "we_1UPracPKr4joNbEc4xqcYEFF",
                                  "livemode": True, "status": "enabled",
                                  "created_at": future_event}]),
            readback("github", [{"secret_name": "RENDER_API_KEY_TEST",
                                  "updated_at": future_event}]),
        )
        for entry in cases:
            with self.subTest(provider=entry["provider"]), self.assertRaisesRegex(
                ValueError, "future provider event timestamp"
            ):
                self.adapt(entry)

    def test_stale_and_future_timestamps_are_not_fresh_evidence(self):
        entry = readback("render", [{"service_id": "srv-dau1rp893c1s73cdhm1g",
                                     "registry_credential_present": False, "registry_updated_at": None}])
        for t in ("2026-11-14T00:00:00Z", "2026-11-17T00:00:00Z", "2026-11-16T01:00:00+01:00"):
            with self.subTest(t=t), self.assertRaises(ValueError):
                self.adapt({**entry, "observed_at": t})

    def test_unknown_fields_are_rejected_before_content_or_error_echo(self):
        cases = [
            readback("supabase", [{"platform": "x", "status": "connected", "account_count": 1, "owner_bound": True,
                                   "nearest_expiry": STAMP, "access_token_encrypted": "top-secret"}]),
            readback("render", [{"service_id": "srv-dau1rp893c1s73cdhm1g",
                                 "registry_credential_present": True, "registry_updated_at": STAMP,
                                 "api_key": "top-secret"}]),
            readback("stripe", [{"endpoint_id": "we_1UPracPKr4joNbEc4xqcYEFF", "livemode": True,
                                 "status": "enabled", "created_at": STAMP, "secret": "top-secret"}]),
            readback("google", [{"service_account": "capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com",
                                 "disabled": False, "user_managed_key_valid_before": [], "privateKeyData": "top-secret"}]),
            readback("github", [{"secret_name": "RENDER_API_KEY_TEST", "updated_at": STAMP,
                                 "value": "top-secret"}]),
        ]
        for entry in cases:
            with self.subTest(provider=entry["provider"]):
                with self.assertRaises(ValueError) as caught:
                    self.adapt(entry)
                self.assertNotIn("top-secret", str(caught.exception))

    def test_misbound_render_service_and_google_service_account(self):
        with self.assertRaises(ValueError):
            self.adapt(readback("render", [{"service_id": "srv-other", "registry_credential_present": True,
                                            "registry_updated_at": STAMP}]))
        with self.assertRaises(ValueError):
            self.adapt(readback("google", [{"service_account": "someone@elsewhere.iam.gserviceaccount.com",
                                            "disabled": False, "user_managed_key_valid_before": []}]))

    def test_github_secret_and_stripe_signing_expiry_not_inferred(self):
        obs, checks = self.adapt(
            readback("github", [{"secret_name": "YOUTUBE_OAUTH_CLIENT_SECRET", "updated_at": STAMP}]),
            readback("stripe", [{"endpoint_id": "we_1UPracPKr4joNbEc4xqcYEFF",
                                 "livemode": True, "status": "enabled", "created_at": STAMP}]),
        )
        self.assertEqual(obs["observations"], [])
        self.assertTrue(all(c["metadata_status"] == "EXPIRY_NOT_EXPOSED" for c in checks))

    def test_duplicate_secret_webhook_and_unsafe_name_rejected(self):
        gh = {"secret_name": "RENDER_API_KEY_TEST", "updated_at": STAMP}
        stripe = {"endpoint_id": "we_1UPracPKr4joNbEc4xqcYEFF", "livemode": True,
                  "status": "enabled", "created_at": STAMP}
        for provider_name, rows in (("github", [gh, gh]), ("github", [{**gh, "secret_name": "token=exfiltrate"}]),
                                    ("stripe", [stripe, stripe]), ("stripe", [{**stripe, "endpoint_id": "https://attacker"}])):
            with self.subTest(provider=provider_name), self.assertRaises(ValueError):
                self.adapt(readback(provider_name, rows))

    def test_google_unbound_key_expiry_does_not_override_inventory(self):
        obs, checks = self.adapt(readback("google", [
            {"service_account": "capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com",
             "disabled": False, "user_managed_key_valid_before": ["2026-11-01T00:00:00Z"]}]))
        self.assertEqual(obs["observations"], [])
        self.assertEqual(checks[0]["metadata_status"], "UNBOUND_KEY_EXPIRY")

    def test_no_network_or_secret_store_in_provider_adapter(self):
        source = (ROOT / "provider_metadata.py").read_text(encoding="utf-8")
        for disallowed in ("requests.get(", "urlopen(", "urllib.request", "os.environ", "subprocess.", "execute_sql(", "open("):
            self.assertNotIn(disallowed, source)
        self.assertEqual(set(provider.BINDINGS), {"supabase", "render", "stripe", "google", "github"})

    def test_invalid_cardinality_provider_and_inventory_mismatch_rejected(self):
        with self.assertRaises(ValueError):
            self.adapt(readback("google", []))
        with self.assertRaises(ValueError):
            provider.adapt_provider_readbacks(readbacks(readback("supabase", [
                {"platform": "youtube", "status": "connected", "account_count": 1, "owner_bound": True,
                 "nearest_expiry": STAMP}])), {"schema": lifecycle.SCHEMA, "credentials": []}, NOW)

    def test_bounded_report_never_contains_provider_raw_data(self):
        obs, checks = self.adapt(readback("github", [{"secret_name": "RENDER_API_KEY_TEST", "updated_at": STAMP}]))
        result = lifecycle.evaluate_offline(INVENTORY, obs, NOW)
        serialized = json.dumps({"report": result, "checks": checks})
        self.assertNotIn("RENDER_API_KEY_TEST", serialized)
        self.assertNotIn("we_", serialized)
        self.assertNotIn("privateKeyData", serialized)
        self.assertNotIn("access_token", serialized)

    def test_cli_rejects_secret_in_provider_readback_without_echo(self):
        try:
            import langgraph  # noqa:F401
        except ImportError:
            self.skipTest("pinned LangGraph dependencies installed in CI")
        import contextlib
        import io
        import provider_metadata_cli as cli
        with tempfile.TemporaryDirectory() as tmp:
            inv = Path(tmp) / "inventory.json"
            data = Path(tmp) / "readback.json"
            inv.write_text(json.dumps(INVENTORY), encoding="utf-8")
            data.write_text(json.dumps(readbacks(readback("render", [{
                "service_id": "srv-dau1rp893c1s73cdhm1g", "registry_credential_present": True,
                "registry_updated_at": STAMP, "secret": "TOP_SECRET"}]))), encoding="utf-8")
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = cli.main(["--inventory", str(inv), "--readbacks", str(data), "--at", "2026-11-16T00:30:00Z"])
            self.assertEqual(code, 2)
            self.assertNotIn("TOP_SECRET", out.getvalue())


if __name__ == "__main__":
    unittest.main()