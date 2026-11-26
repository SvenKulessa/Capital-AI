"""Host CI: real Node producer and pinned Python LangGraph consumer. No provider credentials."""
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest

class GrowthStreamingE2ETests(unittest.TestCase):
    def run_stream(self, producer):
        root = Path(__file__).resolve().parents[2]
        env = {"PATH": os.environ.get("PATH", ""), "LANGSMITH_TRACING": "false",
               "LANGCHAIN_TRACING_V2": "false"}
        with subprocess.Popen(producer, cwd=root, env=env, stdout=subprocess.PIPE,
                              stderr=subprocess.DEVNULL) as node:
            try:
                consumer = subprocess.run(
                    [sys.executable, "scripts/growth-agent/product_opportunity_graph.py", "--growth-data", "-"],
                    cwd=root, env=env, stdin=node.stdout, capture_output=True, timeout=35, check=False)
                node.stdout.close()
                self.assertEqual(node.wait(timeout=10), 0)
                self.assertEqual(consumer.returncode, 0, "Graph subprocess failed")
                return json.loads(consumer.stdout)
            finally:
                if node.poll() is None:
                    node.kill()
                    node.wait()

    def test_real_node_cli_to_python_langgraph_without_provider_credentials(self):
        report = self.run_stream(["node", "server/growth-provider-read.mjs", "--graph-handoff"])
        self.assertEqual(report["quality"], "PASS_WITH_GAPS")
        self.assertEqual(len(report["sources"]), 4)
        self.assertTrue(all(s["transport"] == "DISABLED" and s["evidenceSha256"] is None
                            for s in report["sources"]))
        self.assertFalse(report["eligibleForDraftReview"])
        self.assertFalse(report["publicationAllowed"])

    def test_real_node_projection_to_python_graph_with_synthetic_partial_read(self):
        js = """
import {collectGrowthProviderData} from './server/growth-provider-read.mjs';
const asOf='2026-11-24T12:00:00.000Z';
const report=await collectGrowthProviderData({
 env:{GROWTH_GA4_READ_ENABLED:'true',GOOGLE_ANALYTICS_PROPERTY_NUMBER:'123',
 GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON:'synthetic',GOOGLE_ANALYTICS_CLOUD_PROJECT:'synthetic',
 GROWTH_GSC_READ_ENABLED:'true'},now:()=>Date.parse(asOf),
 readGa4:async()=>({status:'PROVIDER_READ_VERIFIED',source:'GA4_DATA_API',observedAt:asOf,
 property:{resourceName:'properties/123'},period:{start:'7daysAgo',end:'yesterday',timeZone:'Europe/Berlin'},
 metrics:{sessions:4,engagedSessions:2}}),
 fetchImpl:()=>{throw Error('unexpected network call')}
});
process.stdout.write(JSON.stringify(report));
"""
        report = self.run_stream(["node", "--input-type=module", "-e", js])
        sources = {s["source"]: s for s in report["sources"]}
        self.assertEqual(sources["GA4"]["status"], "SOURCE_RECORDED_NOT_AUTHENTICATED")
        self.assertRegex(sources["GA4"]["evidenceSha256"], r"^[0-9a-f]{64}$")
        self.assertEqual(sources["GSC"]["transport"], "AUTH_REQUIRED")
        self.assertTrue(report["eligibleForDraftReview"])
        self.assertEqual(report["providerAuthentication"], "NOT_PROVEN_BY_GRAPH")
        self.assertFalse(report["costActivationAllowed"])
        self.assertFalse(report["automaticChanges"])
        self.assertEqual(report["attributionEvents"], [])


if __name__ == "__main__":
    unittest.main()
