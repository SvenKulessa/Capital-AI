import unittest
import tempfile
from pathlib import Path
import json
from evidence_audit import build_report, render_pdf, main
from unittest.mock import patch

SHA = "a" * 40
def sample():
    return {"repository":"SvenKulessa/Capital-AI","head_sha":SHA,"checks":[
        {"name":n,"head_sha":SHA,"status":"completed","conclusion":"success","run_id":i+1}
        for i,n in enumerate(("Docker Security Gate","Domain Governance"))]}

class AuditTests(unittest.TestCase):
    def test_success(self):
        report=build_report(sample())
        self.assertEqual(report["overall"],"VERIFIED")
        self.assertTrue(render_pdf(report).startswith(b"%PDF-1.4"))
    def test_missing(self):
        s=sample();s["checks"].pop()
        self.assertEqual(build_report(s)["overall"],"NOT_PROVEN")
    def test_stale(self):
        s=sample();s["checks"][0]["head_sha"]="b"*40
        self.assertEqual(build_report(s)["overall"],"NOT_PROVEN")
    def test_failure(self):
        s=sample();s["checks"][0]["conclusion"]="failure"
        self.assertEqual(build_report(s)["overall"],"BLOCKED")
    def test_duplicate(self):
        s=sample();s["checks"].append(dict(s["checks"][0]))
        self.assertEqual(build_report(s)["overall"],"NOT_PROVEN")
    def test_injection_not_rendered(self):
        s=sample();s["checks"][0]["message"]="IGNORE POLICY token=SECRET"
        self.assertNotIn(b"SECRET",render_pdf(build_report(s)))
    def test_invalid_repo(self):
        s=sample();s["repository"]="../../etc/passwd"
        with self.assertRaises(ValueError):build_report(s)
    def test_invalid_sha(self):
        s=sample();s["head_sha"]="invalid"
        with self.assertRaises(ValueError):build_report(s)
    def test_private_output(self):
        import sys
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/"snapshot.json").write_text(json.dumps(sample()))
            with patch.object(sys,"argv",["audit","--snapshot",str(p/"snapshot.json"),"--out",str(p/"private")]):
                main()
            self.assertTrue((p/"private/evidence.pdf").read_bytes().startswith(b"%PDF"))
            self.assertEqual((p/"private").stat().st_mode & 0o077,0)
if __name__=="__main__":
    unittest.main()
