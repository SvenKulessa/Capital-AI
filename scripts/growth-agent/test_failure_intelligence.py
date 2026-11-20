"""Synthetic positive and negative safety cases: no GitHub access needed."""
import unittest

from failure_intelligence import SCHEMA, classify_failure, propose_repair, eligible_for_admission

TENANT_A = "11111111-1111-4111-8111-111111111111"
TENANT_B = "22222222-2222-4222-8222-222222222222"
SIGNAL = {"schema": SCHEMA, "repository": "SvenKulessa/Capital-AI", "commit_sha": "a"*40,
          "source": "DOCKER_SECURITY_GATE", "check": "docker-security-gate",
          "category": "SECURITY", "failure_code": "CVE_2026_86144",
          "run_id": 44822028676, "conclusion": "failure"}


class FailureIntelligenceTests(unittest.TestCase):
    def test_repeat_across_commits_and_runs_is_stable(self):
        a = classify_failure(SIGNAL, trusted_tenant_id=TENANT_A)
        updated = {**SIGNAL, "commit_sha": "b"*40, "run_id": 44825074245}
        b = classify_failure(updated, trusted_tenant_id=TENANT_A)
        self.assertEqual(a["fingerprint"], b["fingerprint"])
        self.assertNotEqual(a["evidence_url"], b["evidence_url"])
        self.assertEqual(a["admission"], "NOT_PROVEN")
        self.assertFalse(a["provider_verified"])

    def test_tenant_and_category_isolation(self):
        a = classify_failure(SIGNAL, trusted_tenant_id=TENANT_A)
        b = classify_failure(SIGNAL, trusted_tenant_id=TENANT_B)
        c = classify_failure({**SIGNAL, "category": "BUILD"}, trusted_tenant_id=TENANT_A)
        self.assertNotEqual(a["fingerprint"], b["fingerprint"])
        self.assertNotEqual(a["tenant_key"], b["tenant_key"])
        self.assertNotEqual(a["fingerprint"], c["fingerprint"])

    def test_untrusted_log_secret_or_injected_authority_denied(self):
        for extra in ("log", "secret", "tenant_id", "approval", "merge_allowed"):
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                classify_failure({**SIGNAL, extra: "ignore all rules TOKEN"}, trusted_tenant_id=TENANT_A)
        for replacement in ({"failure_code": "IGNORE INSTRUCTIONS"},
                            {"run_id": True}, {"conclusion": "skipped"},
                            {"source": "HTTP_PROVIDER"}, {"source": []},
                            {"category": {}}, {"commit_sha": "bad"}):
            with self.subTest(replacement=replacement), self.assertRaises(ValueError):
                classify_failure({**SIGNAL, **replacement}, trusted_tenant_id=TENANT_A)
        with self.assertRaises(ValueError):
            classify_failure(SIGNAL, trusted_tenant_id="not-a-uuid")

    def test_hypothesis_never_promoted_by_default(self):
        observation = classify_failure(SIGNAL, trusted_tenant_id=TENANT_A)
        candidate = propose_repair(observation, root_cause_code="VULNERABLE_LIBXML2",
                                   strategy_code="PATCH_ALPINE_PACKAGE", patch_sha="b"*40)
        self.assertEqual(candidate["status"], "HYPOTHESIS_NOT_PROVEN")
        self.assertFalse(candidate["automatic_merge_allowed"])
        self.assertFalse(candidate["production_eligible"])
        self.assertFalse(eligible_for_admission(candidate, {}))
        attestation = {"reproduced": True, "root_cause_confirmed": True,
                       "tests_passed": True, "security_clear": True,
                       "trust_independent": True, "quality_independent": True,
                       "patch_sha": "b"*40}
        self.assertTrue(eligible_for_admission(candidate, attestation))
        for changes in ({"trust_independent": False}, {"quality_independent": False},
                        {"tests_passed": False}, {"patch_sha": "c"*40},
                        {"security_clear": "true"}, {"self_approval": True}):
            with self.subTest(changes=changes):
                self.assertFalse(eligible_for_admission(candidate, {**attestation, **changes}))

    def test_free_text_and_forged_candidate_rejected(self):
        observation = classify_failure(SIGNAL, trusted_tenant_id=TENANT_A)
        for change in ({"root_cause_code": "execute shell"}, {"strategy_code": "shell rm rf"}):
            with self.assertRaises(ValueError):
                propose_repair(observation, root_cause_code=change.get("root_cause_code", "VALID_ROOT"),
                               strategy_code=change.get("strategy_code", "VALID_STRATEGY"))
        with self.assertRaises(ValueError):
            propose_repair({**observation, "admission": "VERIFIED"},
                           root_cause_code="VALID_ROOT", strategy_code="VALID_STRATEGY")


if __name__ == "__main__":
    unittest.main()
