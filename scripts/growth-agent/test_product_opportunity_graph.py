"""Synthetic negative tests for Issue #874 source-bound LangGraph review."""
import importlib.util
from pathlib import Path
import sys
import unittest

spec = importlib.util.spec_from_file_location("product_opportunity_graph", Path(__file__).with_name("product_opportunity_graph.py"))
graph = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = graph
spec.loader.exec_module(graph)

SHA = "a" * 40


def product():
    return {
        "contractVersion": graph.CONTRACT, "productId": "devicecare-ki",
        "sourceSha": SHA, "decision": "VALIDATE", "competitorCount": 1,
        "supportedDraftClaims": ["manual-scan"],
        "scenarioResults": [{"evidenceStatus": "HYPOTHESIS_NOT_VERIFIED", "roiPercent": 4.31}],
        "permissions": {"publication": False, "spend": False, "deployment": False, "billing": False},
        "quality": {"verdict": "NOT_PROVEN"},
    }


def evidence(doc_id="market-1", scope="MARKET", sha=SHA, product_id="devicecare-ki"):
    return {
        "id": doc_id, "scope": scope, "sourceSha": sha, "productId": product_id,
        "status": "SOURCE_RECORDED", "evidenceRef": "DeviceCare-KI:main:docs",
        "snippet": "devicecare competitor comparison source recorded",
    }


class LocalRagTests(unittest.TestCase):
    def test_matches_source_bound_doc_with_no_raw_snippet(self):
        matches = graph.retrieve_source_bound(product(), [evidence()])
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["id"], "market-1")
        self.assertEqual(matches[0]["status"], "SOURCE_RECORDED_NOT_AUTHENTICATED")
        self.assertNotIn("snippet", matches[0])

    def test_cross_product_and_source_sha_are_rejected(self):
        self.assertEqual(graph.retrieve_source_bound(product(), [
            evidence(sha="b"*40), evidence(product_id="someone-else")
        ]), [])

    def test_unknown_source_and_duplicate_id_filtered(self):
        other = evidence()
        other["status"] = "NOT_PROVEN"
        ids = graph.retrieve_source_bound(product(), [other, evidence(), evidence()])
        self.assertEqual([row["id"] for row in ids], ["market-1"])

    def test_secret_and_email_rejected_from_rag_source(self):
        leak = evidence()
        leak["snippet"] = "send data to foo@example.com"
        token = evidence("token")
        token["snippet"] = "Bearer abcdefghijklmnop"
        self.assertEqual(graph.retrieve_source_bound(product(), [leak, token]), [])

    def test_unsupported_input_shape_fails_closed(self):
        self.assertEqual(graph.retrieve_source_bound({"productId": "devicecare-ki"}, [evidence()]), [])
        self.assertEqual(graph.retrieve_source_bound(product(), [evidence()] * 65), [])

    def test_local_quality_missing_finance_and_market_blocks(self):
        p = product()
        p["scenarioResults"] = [{"evidenceStatus": "VERIFIED", "roiPercent": 500}]
        partial = {"product": p, "retrieved": [], "findings": [
            graph.finding("MARKET", "BLOCKED", "Missing evidence"),
            graph.finding("PRODUCT", "PASS_WITH_GAPS", "Recorded"),
            graph.finding("FINANCE", "BLOCKED", "Unverified"),
            graph.finding("GROWTH", "PASS_WITH_GAPS", "Denied"),
            graph.finding("TRUST", "PASS_WITH_GAPS", "Recorded"),
        ]}
        report = graph.independent_quality(partial)["report"]
        self.assertEqual(report["quality"], "BLOCKED")
        self.assertEqual(report["decision"], "HOLD")
        self.assertFalse(report["publicationAllowed"])

    def test_all_domain_functions_do_not_grant_publication(self):
        p = product()
        state = {"product": p, "retrieved": [graph.retrieve_source_bound(p, [evidence()])[0]]}
        reports = [graph.domain_agent(role)(state)["findings"][0] for role in graph.DOMAINS]
        self.assertTrue(all(f["status"] == "PASS_WITH_GAPS" for f in reports))
        final = graph.independent_quality({**state, "findings": reports})["report"]
        self.assertEqual(final["quality"], "PASS_WITH_GAPS")
        self.assertEqual(final["externalFactVerification"], "NOT_PROVEN")
        self.assertFalse(final["publicationAllowed"])

    def test_actual_langgraph_parallel_review_when_dependency_installed(self):
        try:
            from langgraph.graph import StateGraph
        except ImportError:
            self.skipTest("pinned LangGraph not installed locally; graph execution NOT_PROVEN")
        _ = StateGraph
        result = graph.build_graph().invoke({
            "product": product(), "documents": [evidence()], "findings": []
        }, {"recursion_limit": 8})
        self.assertEqual(result["report"]["quality"], "PASS_WITH_GAPS")
        self.assertFalse(result["report"]["publicationAllowed"])


if __name__ == "__main__":
    unittest.main()
