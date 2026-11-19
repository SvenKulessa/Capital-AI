"""Offline positive/negative cases for the existing LangGraph pilot adapter."""
import unittest
import tempfile
import os
from pathlib import Path
from agent_operations_pilot import preview, preview_durable

SHA = "a" * 40
CI = {
    "repository": "SvenKulessa/Capital-AI", "commitSha": SHA,
    "checks": {"dockerSecurityGate": "success", "domainGovernance": "success"},
}
CREDENTIALS = {"entries": [{"provider": "github", "daysToExpiry": 14}]}
RIGHTS = {"assets": [{
    "id": "hero-orbit", "commercialRights": "ALLOWED",
    "sourceVerified": True, "attributionComplete": True,
}]}


class PilotGraphTests(unittest.TestCase):
    def test_all_three_valid_read_only_graph_flows(self):
        for name, sample in (("ci-evidence", CI), ("credential-expiry", CREDENTIALS), ("media-rights", RIGHTS)):
            with self.subTest(name=name):
                result = preview(name, sample)
                self.assertEqual(result["status"], "READ_ONLY_COMPLETE")
                self.assertEqual(result["calls"], ["analyze", "evidence"])
                self.assertFalse(result["productionEligible"])
                self.assertEqual(result["externalProviderCalls"], 0)
                self.assertNotIn("merge", result["history"])
                self.assertNotIn("implement", result["history"])

    def test_green_claim_is_only_synthetic(self):
        state = preview("ci-evidence", CI)
        self.assertEqual(state["assessment"][0], "SYNTHETIC_READY_FOR_REVIEW")
        self.assertFalse(state["assessment"][1]["providerVerified"])

    def test_invalid_inputs_are_blocked_without_credentials_leaking(self):
        cases = [
            ("unknown", CI),
            ("ci-evidence", {**CI, "tenantId": "other-user"}),
            ("ci-evidence", {**CI, "apiKey": "SENSITIVE_123"}),
            ("ci-evidence", {**CI, "commitSha": "invalid"}),
            ("credential-expiry", {"entries": [{"provider": "github", "daysToExpiry": 3, "secret": "SENSITIVE_123"}]}),
            ("credential-expiry", {"entries": [{"provider": "github", "daysToExpiry": True}]}),
            ("media-rights", {"assets": [{"id": "x", "commercialRights": "ALLOWED", "sourceVerified": True,
                                          "attributionComplete": True, "secret": "SENSITIVE_123"}]}),
        ]
        for workflow, payload in cases:
            with self.subTest(workflow=workflow, payload=payload):
                result = preview(workflow, payload)
                self.assertEqual(result["status"], "BLOCKED")
                self.assertNotIn("SENSITIVE_123", str(result))
                self.assertNotIn("merge", result["calls"])

    def test_durable_sqlite_checkpoint_replay_is_tenant_scoped(self):
        with tempfile.TemporaryDirectory() as folder:
            os.chmod(folder, 0o700)
            db_path = str(Path(folder) / "agent-pilot.sqlite3")
            opts = {"idempotency_key": "restart_key_0001", "db_path": db_path}
            alice = "11111111-1111-4111-8111-111111111111"
            bob = "22222222-2222-4222-8222-222222222222"
            first = preview_durable("ci-evidence", CI, tenant_id=alice, **opts)
            self.assertEqual(first["status"], "READ_ONLY_COMPLETE")
            self.assertEqual(first["calls"], ["analyze", "evidence"])
            self.assertFalse(first["replayedCheckpoint"])
            second = preview_durable("ci-evidence", CI, tenant_id=alice, **opts)
            self.assertEqual(second["status"], "READ_ONLY_COMPLETE")
            self.assertEqual(second["calls"], [])
            self.assertTrue(second["replayedCheckpoint"])
            other = preview_durable("ci-evidence", CI, tenant_id=bob, **opts)
            self.assertEqual(other["calls"], ["analyze", "evidence"])
            self.assertFalse(other["replayedCheckpoint"])

    def test_durable_checkpoint_denies_invalid_identity_or_permissive_mount(self):
        with tempfile.TemporaryDirectory() as folder:
            db_path = str(Path(folder) / "agent-pilot.sqlite3")
            opts = {"idempotency_key": "restart_key_0002", "db_path": db_path}
            invalid = preview_durable("ci-evidence", CI, tenant_id="not-a-uuid", **opts)
            self.assertEqual(invalid["status"], "BLOCKED")
            self.assertFalse(Path(db_path).exists())
            invalid_key = preview_durable("ci-evidence", CI,
                tenant_id="11111111-1111-4111-8111-111111111111",
                idempotency_key="x", db_path=db_path)
            self.assertEqual(invalid_key["status"], "BLOCKED")
            os.chmod(folder, 0o755)
            with self.assertRaises(ValueError):
                preview_durable("ci-evidence", CI,
                    tenant_id="11111111-1111-4111-8111-111111111111", **opts)


if __name__ == "__main__":
    unittest.main()
