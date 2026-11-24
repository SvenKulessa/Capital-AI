"""Synthetic negative tests for Issue #874 source-bound LangGraph review.

Keep this suite Python-only for the unactivated offline worker image.
Cross-language subprocess coverage belongs to host CI in test_growth_streaming_e2e.py.
"""
import importlib.util
import io
import json
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

    def test_untrusted_product_fields_fail_closed_without_exceptions(self):
        p = product()
        docs = graph.retrieve_source_bound(p, [evidence()])
        cases = [
            ("competitorCount", "1", "MARKET"),
            ("competitorCount", True, "MARKET"),
            ("supportedDraftClaims", "manual-scan", "PRODUCT"),
            ("scenarioResults", [{"evidenceStatus": "HYPOTHESIS_NOT_VERIFIED",
                                  "roiPercent": True}], "FINANCE"),
            ("scenarioResults", [{"evidenceStatus": "HYPOTHESIS_NOT_VERIFIED",
                                  "roiPercent": float("nan")}], "FINANCE"),
            ("scenarioResults", [{"evidenceStatus": "HYPOTHESIS_NOT_VERIFIED",
                                  "roiPercent": 10**400}], "FINANCE"),
            ("quality", None, "TRUST"),
        ]
        for field, invalid, role in cases:
            with self.subTest(field=field, role=role, value=repr(invalid)):
                bad = {**p, field: invalid}
                result = graph.domain_agent(role)({"product": bad, "retrieved": docs})
                self.assertEqual(result["findings"][0]["status"], "BLOCKED")

    def test_independent_quality_rejects_forged_go_and_invalid_findings(self):
        p = product()
        p["decision"] = "GO"
        findings = [graph.finding(domain, "PASS_WITH_GAPS", "Synthetic") for domain in graph.DOMAINS]
        decision = graph.independent_quality({"product": p, "findings": findings})["report"]
        self.assertEqual(decision["decision"], "HOLD")
        self.assertFalse(decision["publicationAllowed"])
        malformed = graph.independent_quality({"product": p, "findings": None})["report"]
        self.assertEqual(malformed["quality"], "BLOCKED")
        self.assertEqual(malformed["decision"], "HOLD")

    def test_actual_graph_malformed_trust_field_denies_without_crashing(self):
        try:
            from langgraph.graph import StateGraph
        except ImportError:
            self.skipTest("pinned LangGraph not installed locally; graph execution NOT_PROVEN")
        _ = StateGraph
        bad = product()
        bad["quality"] = None
        report = graph.build_graph().invoke({
            "product": bad, "documents": [evidence()], "findings": []
        }, {"recursion_limit": 8})["report"]
        self.assertEqual(report["quality"], "BLOCKED")
        self.assertEqual(report["decision"], "HOLD")
        self.assertFalse(report["publicationAllowed"])

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


def growth_payload():
    sources = [{"source": source, "status": "NOT_PROVEN_NO_READBACK",
                "metrics": None, "evidenceSha256": None} for source in graph.GROWTH_SOURCE_METRICS]
    sources[0] = {"source": "GA4", "identity": "properties/123", "startDate": "2026-11-17",
                  "endDate": "2026-11-23", "observedAt": "2026-11-24T04:00:00.000Z",
                  "metrics": {"sessions": 9, "engagedSessions": 3}, "status": graph.GROWTH_RECORDED,
                  "evidenceSha256": "a" * 64}
    transport = [{"source": s["source"], "status": "READ_RESPONSE_RECEIVED" if i == 0 else "AUTH_REQUIRED"}
                 for i, s in enumerate(sources)]
    return {"contractVersion": graph.GROWTH_READ_CONTRACT, "transport": transport,
            "collectionMode": "EXPLICIT_READ_ONLY", "publicPublishAllowed": False,
            "growthDataLayer": {"contractVersion": graph.GROWTH_DATA_CONTRACT,
                                "asOf": "2026-11-24T04:00:00.000Z", "sources": sources,
                                "publicPublishAllowed": False, "automaticRecommendationPromotion": False,
                                "attributionEvents": []}}


class GrowthReadGraphTests(unittest.TestCase):
    def test_growth_input_is_bounded_before_parsing(self):
        payload = growth_payload()
        self.assertEqual(graph.read_growth_input(io.BytesIO(json.dumps(payload).encode())), payload)
        for raw, message in [(b" " * 262145, "INPUT_TOO_LARGE"),
                             (b"not-json", "INVALID_INPUT"), (b"\xff", "INVALID_INPUT")]:
            with self.subTest(message=message):
                with self.assertRaisesRegex(SystemExit, message):
                    graph.read_growth_input(io.BytesIO(raw))

    def test_partial_provider_batch_preserves_other_sources(self):
        result = graph.growth_source_review({"payload": growth_payload()})["source_status"]
        self.assertEqual(len(result), 4)
        self.assertEqual(result[0]["status"], graph.GROWTH_RECORDED)
        self.assertEqual(result[1]["transport"], "AUTH_REQUIRED")
        self.assertNotIn("metrics", result[0])

    def test_invalid_source_identity_period_metrics_and_status_fail_closed(self):
        cases = [("identity", "properties/0"), ("endDate", "2026-11-31"),
                 ("observedAt", "not-a-date"), ("status", []),
                 ("metrics", {"sessions": 3, "engagedSessions": 9}),
                 ("metrics", {"sessions": 9.5, "engagedSessions": 3})]
        for key, value in cases:
            with self.subTest(key=key, value=value):
                payload = growth_payload()
                payload["growthDataLayer"]["sources"][0][key] = value
                self.assertEqual(graph.growth_source_review({"payload": payload})["source_status"], [])
        payload = growth_payload()
        payload["transport"][0]["status"] = []
        self.assertEqual(graph.growth_source_review({"payload": payload})["source_status"], [])
        payload = growth_payload()
        payload["growthDataLayer"]["asOf"] = "2026-11-27T04:00:00.000Z"
        self.assertEqual(graph.growth_source_review({"payload": payload})["source_status"], [])

    def test_actual_growth_graph_never_grants_publish_spend_or_attribution(self):
        try:
            from langgraph.graph import StateGraph
        except ImportError:
            self.skipTest("pinned LangGraph not installed locally; execution NOT_PROVEN")
        _ = StateGraph
        graph_instance = graph.build_growth_read_graph()
        payload = growth_payload()
        report = graph_instance.invoke({"payload": payload, "findings": []},
                                       {"recursion_limit": 8})["report"]
        self.assertEqual(report["quality"], "PASS_WITH_GAPS")
        self.assertTrue(report["eligibleForDraftReview"])
        self.assertEqual(report["providerAuthentication"], "NOT_PROVEN_BY_GRAPH")
        self.assertFalse(report["publicationAllowed"])
        self.assertFalse(report["costActivationAllowed"])
        self.assertFalse(report["automaticChanges"])
        self.assertEqual(report["attributionEvents"], [])
        payload["transport"][0]["status"] = []
        denied = graph_instance.invoke({"payload": payload, "findings": []},
                                       {"recursion_limit": 8})["report"]
        self.assertEqual(denied["quality"], "BLOCKED")
        self.assertFalse(denied["eligibleForDraftReview"])



if __name__ == "__main__":
    unittest.main()
