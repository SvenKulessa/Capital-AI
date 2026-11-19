"""Negative tests for trusted GitHub/Render provider boundaries."""
import importlib.util
from pathlib import Path
import sys
import unittest

folder = Path(__file__).parent
for name in ("auto_loop", "provider_actions"):
    spec = importlib.util.spec_from_file_location(name, folder / (name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)

from auto_loop import Authority
from provider_actions import Scope, TrustedProviderActions

A, B, C = "a"*40, "b"*40, "c"*40


class Fake:
    def __init__(self):
        self.writes = []
        self.head = B
        self.main = A
        self.green = True
        self.mergeable = True
        self.deploy = False

    def github(self, method, path, payload=None):
        if method == "PUT":
            self.writes.append((path, payload))
            return {"merged": True, "sha": C}
        if "/pulls/7" in path:
            return {"state":"open","draft":False,"mergeable":self.mergeable,
                    "mergeable_state":"clean","base":{"ref":"main","sha":A},
                    "head":{"sha":self.head,"repo":{"full_name":"SvenKulessa/Capital-AI"}}}
        if "/branches/main" in path:
            return {"commit":{"sha":self.main}}
        if "/check-runs" in path:
            return {"total_count":2,"check_runs":[
                {"name":name,"status":"completed","conclusion":"success" if self.green else "failure","id":i}
                for i,name in enumerate(("Docker Security Gate","Domain Governance"),1)]}
        raise AssertionError(path)

    def render(self, method, path):
        return [{"status":"live","commit":{"id":C}}] if self.deploy else []


class ProviderTests(unittest.TestCase):
    def setUp(self):
        self.f = Fake()
        self.authority = Authority(allow_changes=True, allow_merge=True, observe_existing_deploy=True)
        self.a = TrustedProviderActions(Scope("SvenKulessa/Capital-AI",7,"srv-abc123"),
                                        self.authority,self.f.github,self.f.render,
                                        implement=lambda _: True,test=lambda _: True,
                                        risk_approved=True,scope_complete=True,no_active_hold=True)

    def test_evidence_and_sha_locked_merge(self):
        ev = self.a.evidence({})
        self.assertTrue(ev["applicable_checks_green"])
        self.assertEqual(self.a.merge({"evidence":ev})["sha"], C)
        self.assertEqual(self.f.writes[0][1],{"merge_method":"squash","sha":B})

    def test_stale_head_or_main_denied(self):
        ev = self.a.evidence({})
        self.f.head = "d"*40
        self.assertEqual(self.a.merge({"evidence":ev}),{})
        self.assertFalse(self.f.writes)
        self.f.head = B
        self.f.main = "e"*40
        self.assertEqual(self.a.merge({"evidence":ev}),{})
        self.assertFalse(self.f.writes)

    def test_red_ci_and_unknown_risk_denied(self):
        ev = self.a.evidence({})
        self.f.green = False
        self.assertEqual(self.a.merge({"evidence":ev}),{})
        other = TrustedProviderActions(self.a.scope,self.authority,self.f.github,self.f.render)
        self.assertFalse(other.evidence({})["trust_boundaries_clear"])

    def test_readonly_never_writes(self):
        a = TrustedProviderActions(self.a.scope,Authority(read_only=True,allow_merge=True),
                                   self.f.github,self.f.render,risk_approved=True,
                                   scope_complete=True,no_active_hold=True)
        self.assertEqual(a.merge({"evidence":self.a.evidence({})}),{})
        self.assertFalse(self.f.writes)

    def test_no_manual_deploy_and_no_unverified_runtime(self):
        self.f.deploy = True
        self.assertTrue(self.a.observe_deployment({"merge_sha":C})["deployed"])
        self.assertFalse(self.a.verify_runtime({"merge_sha":C})["verified"])

    def test_scope_rejects_untrusted_coordinates(self):
        for kwargs in [{"repository":"https://evil.invalid","pr_number":7,"render_service_id":"srv-abc123"},
                       {"repository":"SvenKulessa/Capital-AI","pr_number":0,"render_service_id":"srv-abc123"},
                       {"repository":"SvenKulessa/Capital-AI","pr_number":7,"render_service_id":"https://evil"}]:
            with self.assertRaises(ValueError):
                Scope(**kwargs)

if __name__ == "__main__":
    unittest.main()
