"""Offline positive/negative cases for the existing LangGraph pilot adapter."""
import unittest
from agent_operations_pilot import preview

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


if __name__ == "__main__":
    unittest.main()
