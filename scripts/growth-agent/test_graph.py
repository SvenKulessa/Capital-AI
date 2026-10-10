import importlib.util
import json
from pathlib import Path
import tempfile
import sys
import unittest

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

    def test_missing_sources_fail_to_not_proven(self):
        with tempfile.TemporaryDirectory() as root:
            self.assertTrue(all(f["status"] == "NOT_PROVEN" for f in graph.seo_agent({"repo_root": root})["findings"]))

if __name__ == "__main__":
    unittest.main()
