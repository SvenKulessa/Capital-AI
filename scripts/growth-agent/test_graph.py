import importlib.util
import json
from pathlib import Path
import tempfile
import sys
import unittest
from unittest.mock import patch
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("capital_growth_graph", Path(__file__).with_name("graph.py"))
graph = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = graph
spec.loader.exec_module(graph)

class GrowthGraphTests(unittest.TestCase):
    def test_parallel_graph_joins_all_workers_with_no_paid_calls_or_mutations(self):
        with tempfile.TemporaryDirectory() as root:
            result = graph.build_graph().invoke({"repo_root": root, "google_reads": False, "findings": []})
        plan = result["plan"]
        self.assertEqual(plan["engine"], "langgraph")
        self.assertEqual({f["agent"] for f in plan["findings"]}, {"seo", "privacy", "google", "marketing"})
        self.assertFalse(plan["execution"]["automaticWrites"])
        self.assertEqual(plan["budget"]["paidProviderCalls"], 0)
        self.assertTrue(any(f["agent"] == "google" and f["status"] == "NOT_PROVEN" for f in plan["findings"]))
        self.assertNotIn("ACCESS_TOKEN", json.dumps(plan))

    def test_disabled_tracking_is_a_source_observation_not_a_live_google_claim(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "src/utils/analytics.ts"
            path.parent.mkdir(parents=True)
            path.write_text("export const GA_MEASUREMENT_ID = '';\nexport function initGoogleAnalytics() {}")
            findings = graph.privacy_agent({"repo_root": root})["findings"]
            self.assertEqual(findings[0]["status"], "SOURCE_OBSERVED")
            self.assertIn("disabled", findings[0]["detail"])

    def test_seo_origin_requires_exact_source_declaration(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "shared/seo-metadata.mjs"
            path.parent.mkdir(parents=True)
            variants = [
                ("export const SEO_SITE_ORIGIN = 'https://capital-ai.online';\n", "SOURCE_OBSERVED"),
                ("export const SEO_SITE_ORIGIN = 'https://capital-ai.online.evil.test';\n", "NOT_PROVEN"),
                ("export const SEO_SITE_ORIGIN = 'https://evil.test/https://capital-ai.online';\n", "NOT_PROVEN"),
                ("// export const SEO_SITE_ORIGIN = 'https://capital-ai.online';\n", "NOT_PROVEN"),
                ("export const SEO_SITE_ORIGIN = 'https://capital-ai.online'; // unverified trailing code\n", "NOT_PROVEN"),
            ]
            for contents, expected in variants:
                with self.subTest(contents=contents):
                    path.write_text(contents, encoding="utf-8")
                    findings = graph.seo_agent({"repo_root": root})["findings"]
                    self.assertEqual(findings[1]["status"], expected)

    def test_missing_sources_fail_to_not_proven(self):
        with tempfile.TemporaryDirectory() as root:
            self.assertTrue(all(f["status"] == "NOT_PROVEN" for f in graph.seo_agent({"repo_root": root})["findings"]))

    def test_local_checks_report_failures_without_leaking_subprocess_output(self):
        with tempfile.TemporaryDirectory() as root:
            Path(root, "contract.mjs").write_text("")
            for code in [0, 1]:
                with patch.object(graph.subprocess, "run", return_value=SimpleNamespace(returncode=code, stdout="sentinel-private", stderr="sentinel-private")) as runner:
                    result = graph.local_checks(root, "privacy", ["contract.mjs"])
                    self.assertEqual(result["status"], "LOCAL_TEST_PASSED" if code == 0 else "LOCAL_TEST_FAILED")
                    self.assertNotIn("sentinel-private", json.dumps(result))
                    self.assertEqual(runner.call_args.kwargs["cwd"], root)

    def test_source_observation_never_attests_to_browser_consent(self):
        with tempfile.TemporaryDirectory() as root:
            findings = graph.privacy_agent({"repo_root": root})["findings"]
            self.assertTrue(any(f["status"] == "NOT_PROVEN" and "accept/reject/withdrawal" in f["detail"] for f in findings))

    def test_google_reads_reject_malformed_or_failed_worker_results(self):
        for output in ["null", "[]", '{"result":null}', "bad json",
                       '{"result":{"isError":true,"secret":"sentinel-private"}}',
                       '{"result":{"isError":false,"structuredContent":null}}']:
            with self.subTest(output=output), patch.object(graph.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout=output)):
                findings = graph.google_agent({"repo_root": "/tmp", "google_reads": True})["findings"]
                self.assertEqual(len(findings), 5)
                self.assertNotIn("sentinel-private", json.dumps(findings))
                self.assertEqual(findings[1]["status"], "NOT_PROVEN")

    def test_google_reads_require_verified_stream_domain_and_redact_payloads(self):
        for bound in [False, True]:
            payload = {"result": {"isError": False, "structuredContent": {"streams": [{"associatedDomainVerified": bound}], "secret": "sentinel-private"}}}
            with self.subTest(bound=bound), patch.object(graph.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout=json.dumps(payload))):
                findings = graph.google_agent({"repo_root": "/tmp", "google_reads": True})["findings"]
                self.assertEqual(findings[1]["status"], "VERIFIED" if bound else "NOT_PROVEN")
                self.assertTrue(all(item["status"] == "VERIFIED" for index, item in enumerate(findings) if index != 1))
                self.assertNotIn("sentinel-private", json.dumps(findings))

if __name__ == "__main__":
    unittest.main()
