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




def viral_payload():
    return {"contractVersion": graph.VIRAL_INPUT_CONTRACT,
            "status": "SOURCE_RECORDED_NOT_AUTHENTICATED", "analyzedTrendsCount": 31,
            "opportunities": [{"recordSha256": "a" * 64, "productContextSha256": "b" * 64,
                               "productSourceSha": "c" * 40, "draftSha256": "d" * 64,
                               "sourcePlatform": "X", "correlationScore": 90, "review": "REVIEW_REQUIRED"}],
            "publicationState": "DRAFT_ONLY", "publicPublishAllowed": False, "providerCalls": 0,
            "additionalCostUsd": 0, "providerAuthentication": "NOT_PROVEN"}


class ViralReadGraphTests(unittest.TestCase):
    def test_reference_only_validation_rejects_authority_and_bad_scores(self):
        payload = viral_payload()
        self.assertTrue(graph.viral_source_review({"payload": payload})["viral_valid"])
        for key, value in [("publicPublishAllowed", True), ("providerCalls", 1),
                           ("additionalCostUsd", 0.1), ("analyzedTrendsCount", 0),
                           ("providerAuthentication", "VERIFIED")]:
            invalid = viral_payload()
            invalid[key] = value
            self.assertFalse(graph.viral_source_review({"payload": invalid})["viral_valid"])
        for key, value in [("correlationScore", 69), ("draftSha256", "invalid"),
                           ("review", "APPROVED"), ("sourcePlatform", [])]:
            invalid = viral_payload()
            invalid["opportunities"][0][key] = value
            self.assertFalse(graph.viral_source_review({"payload": invalid})["viral_valid"])
        invalid = viral_payload()
        invalid["opportunities"].append(invalid["opportunities"][0])
        self.assertFalse(graph.viral_source_review({"payload": invalid})["viral_valid"])

    def test_actual_viral_graph_draft_only(self):
        try:
            from langgraph.graph import StateGraph
        except ImportError:
            self.skipTest("pinned LangGraph not installed locally; execution NOT_PROVEN")
        _ = StateGraph
        compiled = graph.build_viral_read_graph()
        report = compiled.invoke({"payload": viral_payload(), "findings": []}, {"recursion_limit": 8})["report"]
        self.assertEqual(report["quality"], "PASS_WITH_GAPS")
        self.assertTrue(report["eligibleForDraftReview"])
        self.assertFalse(report["publicationAllowed"])
        self.assertFalse(report["costActivationAllowed"])
        self.assertFalse(report["automaticChanges"])
        self.assertEqual(report["attributionEvents"], [])
        empty = viral_payload()
        empty.update(status="NOT_PROVEN", analyzedTrendsCount=0, opportunities=[])
        self.assertFalse(compiled.invoke({"payload": empty, "findings": []}, {"recursion_limit": 8})["report"]["eligibleForDraftReview"])
        invalid = viral_payload()
        invalid["publicPublishAllowed"] = True
        self.assertEqual(compiled.invoke({"payload": invalid, "findings": []}, {"recursion_limit": 8})["report"]["quality"], "BLOCKED")




class XConversionReviewTests(unittest.TestCase):
    def fixture(self):
        return {"contractVersion": "CAPITAL_AI_X_CONVERSION_CANDIDATES@1",
                "campaignId": "capital-ai-growth-20261120", "contentId": "CAP-GROW-005",
                "start": "2026-11-20T00:00:00.000Z", "end": "2026-11-24T00:00:00.000Z",
                "asOf": "2026-11-24T12:00:00.000Z",
                "status": "SOURCE_RECORDED_NOT_AUTHENTICATED",
                "candidateRegistrations": 1, "candidatePaidSubscribers": 1,
                "candidateInitialInvoiceCents": 2500, "registrations": None,
                "paidSubscriptions": None, "revenueCents": None,
                "providerAuthentication": "NOT_PROVEN", "publicPublishAllowed": False,
                "costActivationAllowed": False, "providerCalls": 0, "automaticChanges": False}

    def run_graph(self, payload):
        return graph.build_conversion_read_graph().invoke(
            {"payload": payload, "findings": []}, {"recursion_limit": 8})["report"]

    def test_review_never_promotes_candidate_counts(self):
        r = self.run_graph(self.fixture())
        self.assertEqual(r["quality"], "PASS_WITH_GAPS")
        self.assertEqual(r["nextAction"], "VERIFY_SOURCE_AND_COHORT")
        self.assertIsNone(r["paidSubscriptions"])
        self.assertIsNone(r["revenueCents"])
        self.assertFalse(r["costActivationAllowed"])
        self.assertFalse(r["publicationAllowed"])

    def test_rejects_forged_metrics_wrong_cohort_and_authority(self):
        for change in ({"registrations": 1}, {"providerAuthentication": "VERIFIED"},
                       {"costActivationAllowed": True}, {"campaignId": "other"},
                       {"candidatePaidSubscribers": 2}, {"candidatePaidSubscribers": True},
                       {"candidateInitialInvoiceCents": None}, {"providerCalls": 1},
                       {"end": "2026-12-24T00:00:00Z"}, {"email": "synthetic@example.invalid"}):
            with self.subTest(change=change):
                self.assertEqual(self.run_graph({**self.fixture(), **change})["quality"], "BLOCKED")



class ProductChannelReviewTests(unittest.TestCase):
    def fixture(self):
        return {"contractVersion": "CAPITAL_AI_PRODUCT_CHANNEL_GRAPH_INPUT@1",
                "sourceSha256": "a" * 64, "publicationState": "DRAFT_ONLY",
                "publicPublishAllowed": False, "liveSalesAllowed": False, "providerCalls": 0,
                "campaignSpend": 0, "products": [
                    {"id": "ai-smartcopy", "researchStatus": "CANDIDATES_REVIEW_REQUIRED",
                     "channels": [{"id": "acode", "priority": "P0", "rule": "LISTING_REVIEW_REQUIRED"},
                                  {"id": "showHN", "priority": "P2", "rule": "HUMAN_ONLY_NO_GENERATED_TEXT"}]},
                    {"id": "unknown", "researchStatus": "UNMAPPED_RESEARCH_REQUIRED", "channels": []}]}

    def test_channel_source_rejects_forged_authority_and_unsupported_rows(self):
        self.assertTrue(graph.channel_source_review({"payload": self.fixture()})["channel_valid"])
        for key, value in [("publicPublishAllowed", True), ("liveSalesAllowed", True),
                           ("providerCalls", False), ("campaignSpend", 1), ("sourceSha256", "bad")]:
            p = self.fixture()
            p[key] = value
            self.assertFalse(graph.channel_source_review({"payload": p})["channel_valid"])
        p = self.fixture()
        p["products"][0]["channels"][1]["rule"] = "REVIEW_REQUIRED"
        self.assertFalse(graph.channel_source_review({"payload": p})["channel_valid"])
        p = self.fixture()
        p["products"].append(p["products"][0])
        self.assertFalse(graph.channel_source_review({"payload": p})["channel_valid"])
        p = self.fixture()
        p["products"][1]["channels"] = [{"id": "unknown", "priority": "P0", "rule": "REVIEW_REQUIRED"}]
        self.assertFalse(graph.channel_source_review({"payload": p})["channel_valid"])

    def test_extended_distribution_channels_keep_review_rules(self):
        p = self.fixture()
        p["products"][0]["channels"].append(
            {"id": "mcpRegistry", "priority": "P1", "rule": "LISTING_REVIEW_REQUIRED"})
        self.assertTrue(graph.channel_source_review({"payload": p})["channel_valid"])
        p["products"][0]["channels"][-1]["rule"] = "PUBLISH_ALLOWED"
        self.assertFalse(graph.channel_source_review({"payload": p})["channel_valid"])

    def test_saas_marketplace_rules_accept_only_exact_review_contract(self):
        rules = {"saasHub": "HUMAN_ONLY_SUBMISSION_REQUIRED",
                 "g2": "LISTING_REVIEW_REQUIRED", "capterra": "LISTING_REVIEW_REQUIRED",
                 "microsoftMarketplace": "LISTING_REVIEW_REQUIRED"}
        for channel, rule in rules.items():
            with self.subTest(channel=channel):
                p = self.fixture()
                row = {"id": channel, "priority": "P1", "rule": rule}
                p["products"][0]["channels"].append(row)
                self.assertTrue(graph.channel_source_review({"payload": p})["channel_valid"])
                row["rule"] = "REVIEW_REQUIRED"
                self.assertFalse(graph.channel_source_review({"payload": p})["channel_valid"])
                row["rule"] = rule
                p["products"][0]["channels"].append(dict(row))
                self.assertFalse(graph.channel_source_review({"payload": p})["channel_valid"])

    def test_actual_existing_review_topology_preserves_queue_and_denies_publication(self):
        try:
            from langgraph.graph import StateGraph
        except ImportError:
            self.skipTest("pinned LangGraph not installed locally; execution NOT_PROVEN")
        _ = StateGraph
        compiled = graph.build_channel_read_graph()
        payload = self.fixture()
        for channel, rule in (("saasHub", "HUMAN_ONLY_SUBMISSION_REQUIRED"),
                              ("g2", "LISTING_REVIEW_REQUIRED"), ("capterra", "LISTING_REVIEW_REQUIRED"),
                              ("microsoftMarketplace", "LISTING_REVIEW_REQUIRED")):
            payload["products"][0]["channels"].append({"id": channel, "priority": "P1", "rule": rule})
        report = compiled.invoke({"payload": payload, "findings": []}, {"recursion_limit": 8})["report"]
        self.assertEqual(report["quality"], "PASS_WITH_GAPS")
        self.assertEqual(report["products"][0]["channels"], payload["products"][0]["channels"])
        self.assertEqual(report["researchQueue"], ["unknown"])
        self.assertFalse(report["publicationAllowed"])
        self.assertFalse(report["liveSalesAllowed"])
        self.assertFalse(report["costActivationAllowed"])
        self.assertFalse(report["automaticChanges"])
        self.assertEqual(report["attributionEvents"], [])



class SmartcopyConversionReviewTests(unittest.TestCase):
    def fixture(self):
        return {"contractVersion": "CAPITAL_AI_SMARTCOPY_CONVERSION_CANDIDATES@1",
                "productId": "ai-smartcopy", "campaignId": "smartcopy-" + "a" * 24,
                "asOf": "2026-11-25T12:00:00.000Z", "status": "SOURCE_RECORDED_NOT_AUTHENTICATED",
                "candidatePayments": 2, "candidateActiveLicenses": 1, "candidateFullRefunds": 1,
                "candidatePartialRefunds": 0, "candidateDisputes": 0, "candidateNetPaidCents": 499,
                "verifiedMetrics": {"paidLicenses": None, "revenueCents": None, "refunds": None},
                "providerAuthentication": "NOT_PROVEN", "publicPublishAllowed": False, "liveSalesAllowed": False,
                "automaticChanges": False, "providerCalls": 0, "campaignSpend": 0}

    def test_valid_and_forged_source(self):
        p = self.fixture()
        self.assertTrue(graph.smartcopy_conversion_valid(p))
        for change in ({"productId": "smartclip"}, {"candidatePayments": True}, {"candidateActiveLicenses": 2},
                       {"candidateNetPaidCents": -1}, {"verifiedMetrics": {"paidLicenses": 1}},
                       {"liveSalesAllowed": True}, {"providerAuthentication": "VERIFIED"}, {"campaignSpend": 1}):
            self.assertFalse(graph.smartcopy_conversion_valid({**p, **change}))

    def test_existing_graph_never_promotes_candidate_aggregates(self):
        compiled = graph.build_conversion_read_graph()
        report = compiled.invoke({"payload": self.fixture(), "findings": []}, {"recursion_limit": 8})["report"]
        self.assertEqual(report["contractVersion"], "CAPITAL_AI_SMARTCOPY_CONVERSION_GRAPH_HANDOFF@1")
        self.assertEqual(report["quality"], "PASS_WITH_GAPS")
        self.assertEqual(report["verifiedMetrics"], {"paidLicenses": None, "revenueCents": None, "refunds": None})
        self.assertFalse(report["publicationAllowed"])
        self.assertNotIn("candidatePayments", report)
        p = self.fixture()
        p["liveSalesAllowed"] = True
        self.assertEqual(compiled.invoke({"payload": p, "findings": []}, {"recursion_limit": 8})["report"]["quality"], "BLOCKED")


class VisualReviewTests(unittest.TestCase):
    def fixture(self):
        drafts = []
        for content, channel, w, h in (("CAP-GROW-005", "X", 1440, 960), ("CAP-GROW-007", "INSTAGRAM", 1080, 1350)):
            drafts.append(dict(contentId=content, channel=channel, width=w, height=h,
                sourceSha256="a"*64, manifestSha256="b"*64, elapsedMs=25, repairCycles=0,
                selectedSha256="c"*64, assets=[
                    dict(sha256="a"*64, mimeType="image/png", byteLength=500),
                    dict(sha256="b"*64, mimeType="image/svg+xml", byteLength=600),
                    dict(sha256="d"*64, mimeType="image/jpeg", byteLength=200),
                    dict(sha256="c"*64, mimeType="image/webp", byteLength=100)]))
        return dict(contractVersion="CAPITAL_AI_VISUAL_GRAPH_INPUT@1",
            sourceDigest="d08aa8e7f831dea7cb15010f46374f8fbdecaee1408619af1a4fb857460c1234",
            state="DRAFT_ONLY", publicPublishAllowed=False, providerCalls=0, providerCost=0,
            manualTimeSavedMs=None, drafts=drafts)

    def test_receipt_bounds_and_authority(self):
        p = self.fixture()
        self.assertEqual(graph.visual_source_review({"payload":p})["metrics"],
            dict(assetCount=8,inputBytes=1000,selectedBytes=200,elapsedMs=50,repairCycles=0))
        for change in ({"publicPublishAllowed": True}, {"providerCost":1}, {"manualTimeSavedMs":100}, {"sourceDigest":"a"*64}):
            self.assertFalse(graph.visual_source_review({"payload":{**p,**change}})["visual_valid"])
        for change in ({"selectedSha256":"0"*64},{"channel":"WEBSITE"},{"width":1080},{"elapsedMs":True}):
            p = self.fixture()
            p["drafts"][0].update(change)
            self.assertFalse(graph.visual_source_review({"payload":p})["visual_valid"])

    def test_actual_graph_join_keeps_metrics_unverified(self):
        compiled=graph.build_visual_read_graph()
        report=compiled.invoke({"payload":self.fixture(),"findings":[]},{"recursion_limit":8})["report"]
        self.assertEqual(report["quality"],"PASS_WITH_GAPS")
        self.assertEqual(report["sourceAuthentication"],"NOT_PROVEN_BY_GRAPH")
        self.assertFalse(report["publicationAllowed"])
        self.assertIsNone(report["manualTimeSavedMs"])
        p=self.fixture()
        p["drafts"][0]["assets"][3]["byteLength"]=501
        blocked=compiled.invoke({"payload":p,"findings":[]},{"recursion_limit":8})["report"]
        self.assertEqual(blocked["quality"],"BLOCKED")
        self.assertIsNone(blocked["metrics"])


if __name__ == "__main__":
    unittest.main()
