"""Issue #874: local draft-only LangGraph + bounded source-bound RAG review.

No LangSmith, paid provider, publishing, credential access, API access or runtime
permissions. Existing scripts/growth-agent/requirements.lock supplies LangGraph.
This graph only evaluates caller-supplied contract output and local evidence.
"""
from __future__ import annotations

import json
import operator
import os
import re
from pathlib import Path
from typing import Annotated, TypedDict

os.environ["LANGSMITH_TRACING"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"

CONTRACT = "CAPITAL_AI_PRODUCT_OPPORTUNITY@1"
DOMAINS = ("MARKET", "PRODUCT", "FINANCE", "GROWTH", "TRUST")


class OpportunityState(TypedDict, total=False):
    product: dict
    documents: list[dict]
    retrieved: list[dict]
    findings: Annotated[list[dict], operator.add]
    report: dict


def valid_sha(value: object) -> bool:
    return isinstance(value, str) and bool(re.fullmatch(r"[0-9a-f]{40}", value))


def bounded_text(value: object, maximum: int = 500) -> bool:
    return isinstance(value, str) and 0 < len(value) <= maximum and not (
        re.search(r"[\x00-\x1f\x7f]", value)
        or re.search(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}", value, re.I)
        or re.search(r"(github_pat_|gh[pousr]_|sk-(proj-)?|Bearer\s+)[a-z0-9_-]{8,}", value, re.I)
    )


def retrieve_source_bound(product: object, docs: object, max_results: int = 8) -> list[dict]:
    """Conservative in-memory lexical retrieval, NOT a proof of source authenticity.

    Never read filesystem paths from a document, follow URLs, serialize snippets,
    ingest different product/SHA records, or turn source text into instructions.
    """
    if not isinstance(product, dict) or product.get("contractVersion") != CONTRACT:
        return []
    product_id, source_sha = product.get("productId"), product.get("sourceSha")
    if not isinstance(product_id, str) or not valid_sha(source_sha) or not isinstance(docs, list):
        return []
    if not 0 <= len(docs) <= 64:
        return []
    query = str(product.get("productId", "")) + " " + str(product.get("decision", ""))
    words = set(re.findall(r"[a-z0-9]{3,}", query.lower()))
    matches = []
    ids = set()
    for doc in docs:
        if not isinstance(doc, dict) or set(doc) != {
            "id", "productId", "sourceSha", "status", "scope", "evidenceRef", "snippet"
        }:
            continue
        if doc["productId"] != product_id or doc["sourceSha"] != source_sha:
            continue
        if doc["status"] != "SOURCE_RECORDED" or doc["scope"] not in (
            "PRODUCT", "MARKET", "FINANCE", "GROWTH", "TRUST"
        ):
            continue
        if not bounded_text(doc["id"], 80) or not bounded_text(doc["evidenceRef"], 160):
            continue
        if not bounded_text(doc["snippet"]) or doc["id"] in ids:
            continue
        ids.add(doc["id"])
        overlap = len(words & set(re.findall(r"[a-z0-9]{3,}", doc["snippet"].lower())))
        matches.append((overlap, doc))
    matches.sort(key=lambda item: (-item[0], item[1]["id"]))
    return [{
        "id": doc["id"],
        "scope": doc["scope"],
        "status": "SOURCE_RECORDED_NOT_AUTHENTICATED",
        "evidenceRef": doc["evidenceRef"],
    } for _, doc in matches[:max_results]]


def rag_agent(state: OpportunityState) -> dict:
    return {"retrieved": retrieve_source_bound(state.get("product"), state.get("documents"))}


def finding(agent: str, status: str, detail: str) -> dict:
    return {"agent": agent, "status": status, "detail": detail}


def domain_agent(domain: str):
    def run(state: OpportunityState) -> dict:
        product = state.get("product", {})
        if not isinstance(product, dict) or product.get("contractVersion") != CONTRACT:
            return {"findings": [finding(domain, "BLOCKED", "Unknown input contract.")]}
        docs = state.get("retrieved", [])
        if domain == "MARKET":
            count = product.get("competitorCount")
            ok = (isinstance(count, int) and not isinstance(count, bool) and count > 0
                  and isinstance(docs, list) and any(
                      isinstance(d, dict) and d.get("scope") == "MARKET" for d in docs))
            detail = "Competitor evidence recorded; independent market verification still required."
        elif domain == "PRODUCT":
            claims = product.get("supportedDraftClaims")
            ok = (isinstance(claims, list) and 0 < len(claims) <= 20
                  and all(isinstance(item, str) and bool(re.fullmatch(r"[a-z0-9-]{2,80}", item))
                          for item in claims)
                  and valid_sha(product.get("sourceSha")))
            detail = "Bound draft capabilities recorded; product evidence remains unverified."
        elif domain == "FINANCE":
            values = product.get("scenarioResults")
            ok = isinstance(values, list) and 0 < len(values) <= 6 and all(
                isinstance(s, dict) and s.get("evidenceStatus") == "HYPOTHESIS_NOT_VERIFIED"
                and (s.get("roiPercent") is None or
                     (type(s.get("roiPercent")) in (float, int)
                      and -10**12 <= s["roiPercent"] <= 10**12))
                for s in values
            )
            detail = "Unit economics are scenarios, never measured ROI."
        elif domain == "GROWTH":
            permissions = product.get("permissions", {})
            ok = isinstance(permissions, dict) and all(
                permissions.get(key) is False for key in ("publication", "spend", "deployment", "billing")
            )
            detail = "No paid media, publisher, billing or deployment authority."
        else:
            quality = product.get("quality")
            ok = (isinstance(quality, dict) and quality.get("verdict") == "NOT_PROVEN"
                  and isinstance(docs, list) and all(
                      isinstance(d, dict) and d.get("status") == "SOURCE_RECORDED_NOT_AUTHENTICATED"
                      for d in docs))
            detail = "Evidence source identities bounded; source authenticity and rights not attested."
        return {"findings": [finding(domain, "PASS_WITH_GAPS" if ok else "BLOCKED", detail)]}
    return run


def independent_quality(state: OpportunityState) -> dict:
    findings = state.get("findings")
    observed = {f["agent"]: f["status"] for f in findings
                if isinstance(f, dict) and isinstance(f.get("agent"), str)
                and isinstance(f.get("status"), str)} if isinstance(findings, list) else {}
    completed = all(observed.get(domain) == "PASS_WITH_GAPS" for domain in DOMAINS)
    product = state.get("product", {})
    proposed = product.get("decision") if isinstance(product, dict) else None
    return {"report": {
        "contractVersion": CONTRACT,
        "engine": "langgraph",
        "retrieval": "LOCAL_SOURCE_BOUND_LEXICAL_RAG",
        "decision": proposed if completed and proposed in ("VALIDATE", "HOLD", "REJECT") else "HOLD",
        "quality": "PASS_WITH_GAPS" if completed else "BLOCKED",
        "externalFactVerification": "NOT_PROVEN",
        "publicationAllowed": False,
        "costActivationAllowed": False,
        "automaticChanges": False,
        "agentStatuses": observed,
        "retrievedEvidenceIds": [d["id"] for d in state.get("retrieved", [])],
    }}


def build_graph():
    """Reuse the pinned LangGraph StateGraph; no auto_loop authority injection."""
    from langgraph.graph import END, START, StateGraph

    graph = StateGraph(OpportunityState)
    graph.add_node("rag", rag_agent)
    graph.add_edge(START, "rag")
    for domain in DOMAINS:
        graph.add_node(domain.lower(), domain_agent(domain))
        graph.add_edge("rag", domain.lower())
    graph.add_node("quality", independent_quality)
    graph.add_edge([domain.lower() for domain in DOMAINS], "quality")
    graph.add_edge("quality", END)
    return graph.compile()



GROWTH_DATA_CONTRACT = "CAPITAL_AI_GROWTH_DATA_LAYER@1"
GROWTH_READ_CONTRACT = "CAPITAL_AI_GROWTH_PROVIDER_READ@1"
GROWTH_SOURCE_METRICS = {
    "GA4": {"sessions", "engagedSessions"},
    "GSC": {"clicks", "impressions", "ctr", "position"},
    "INSTAGRAM": {"reach", "accounts_engaged"},
    "YOUTUBE": {"views", "estimatedMinutesWatched"},
}
GROWTH_RECORDED = "SOURCE_RECORDED_NOT_AUTHENTICATED"
GROWTH_FAILURES = {
    "BLOCKED_DUPLICATE_SOURCE", "NOT_PROVEN_NO_READBACK", "BLOCKED_IDENTITY_NOT_CONFIGURED",
    "BLOCKED_IDENTITY_OR_ENVELOPE", "BLOCKED_INVALID_PERIOD", "NOT_PROVEN_STALE",
    "NOT_PROVEN_INVALID_OR_EMPTY_REPORT", "NOT_PROVEN_INVALID_METRICS",
}
GROWTH_TRANSPORT_STATES = {
    "DISABLED", "AUTH_REQUIRED", "RATE_LIMITED", "PROVIDER_UNAVAILABLE",
    "INVALID_RESPONSE", "IDENTITY_MISMATCH", "INCOMPLETE_PERIOD", "READ_RESPONSE_RECEIVED",
}


class GrowthReadState(TypedDict, total=False):
    payload: dict
    source_status: list[dict]
    findings: Annotated[list[dict], operator.add]
    report: dict


def growth_source_review(state: GrowthReadState) -> dict:
    """Only consume the bounded JSON handoff, never call network or read credentials.
    Digest shape is checked, but imported hashes do not attest upstream provenance.
    """
    payload = state.get("payload")
    if not isinstance(payload, dict) or payload.get("contractVersion") != GROWTH_READ_CONTRACT:
        return {"source_status": []}
    layer = payload.get("growthDataLayer")
    transport = payload.get("transport")
    if (not isinstance(layer, dict) or layer.get("contractVersion") != GROWTH_DATA_CONTRACT
            or layer.get("publicPublishAllowed") is not False
            or layer.get("automaticRecommendationPromotion") is not False
            or layer.get("attributionEvents") != [] or payload.get("publicPublishAllowed") is not False
            or payload.get("collectionMode") != "EXPLICIT_READ_ONLY"
            or not isinstance(transport, list) or len(transport) != 4):
        return {"source_status": []}
    rows = layer.get("sources")
    if not isinstance(rows, list) or len(rows) != 4:
        return {"source_status": []}
    result = []
    for source, names in GROWTH_SOURCE_METRICS.items():
        matches = [r for r in rows if isinstance(r, dict) and r.get("source") == source]
        reads = [r for r in transport if isinstance(r, dict) and r.get("source") == source]
        if len(matches) != 1 or len(reads) != 1:
            return {"source_status": []}
        row, read = matches[0], reads[0]
        if (set(read) != {"source", "status"} or not isinstance(read.get("status"), str)
                or read["status"] not in GROWTH_TRANSPORT_STATES):
            return {"source_status": []}
        status = row.get("status")
        digest = row.get("evidenceSha256")
        if status == GROWTH_RECORDED:
            metrics = row.get("metrics")
            if (set(row) != {"source", "identity", "startDate", "endDate", "observedAt",
                            "metrics", "status", "evidenceSha256"}
                    or read["status"] != "READ_RESPONSE_RECEIVED" or not isinstance(digest, str)
                    or re.fullmatch(r"[0-9a-f]{64}", digest) is None
                    or not isinstance(metrics, dict) or set(metrics) != names
                    or any(type(value) not in (int, float) or not 0 <= value <= 9007199254740991
                           for value in metrics.values())):
                return {"source_status": []}
        elif (not isinstance(status, str) or status not in GROWTH_FAILURES
              or set(row) != {"source", "status", "metrics", "evidenceSha256"}
              or row.get("metrics") is not None or digest is not None):
            return {"source_status": []}
        if status == GROWTH_RECORDED:
            # Fail closed on malformed imported account/period fields. A digest
            # shape is only a reference, never an authentication claim.
            identity_patterns = {
                "GA4": r"properties/[1-9][0-9]{0,19}",
                "GSC": r"sc-domain:capital-ai\.online",
                "INSTAGRAM": r"[0-9]{1,32}",
                "YOUTUBE": r"UC[A-Za-z0-9_-]{22}",
            }
            identity = row.get("identity")
            if not isinstance(identity, str) or re.fullmatch(identity_patterns[source], identity) is None:
                return {"source_status": []}
            from datetime import date, datetime, timezone
            try:
                start, end = (date.fromisoformat(row[k]) for k in ("startDate", "endDate"))
                observed = datetime.fromisoformat(row["observedAt"].replace("Z", "+00:00"))
                as_of = datetime.fromisoformat(layer["asOf"].replace("Z", "+00:00"))
                if (start.isoformat() != row["startDate"] or end.isoformat() != row["endDate"]
                        or observed.tzinfo != timezone.utc or as_of.tzinfo != timezone.utc
                        or not 0 <= (end - start).days <= 30 or end >= observed.date()
                        or not 0 <= (as_of - observed).total_seconds() <= 86400
                        or not 0 <= (as_of.date() - end).days <= 7):
                    return {"source_status": []}
            except (KeyError, TypeError, ValueError, AttributeError, OverflowError):
                return {"source_status": []}
            if any(type(value) is not int for name, value in metrics.items()
                   if name not in {"ctr", "position"}):
                return {"source_status": []}
            if ((source == "GA4" and metrics["engagedSessions"] > metrics["sessions"])
                    or (source == "GSC" and (metrics["clicks"] > metrics["impressions"]
                                             or metrics["ctr"] > 1))):
                return {"source_status": []}
        result.append({"source": source, "status": status, "transport": read["status"],
                       "evidenceSha256": digest})
    return {"source_status": result}


def growth_domain_review(domain: str):
    def run(state: GrowthReadState) -> dict:
        statuses = state.get("source_status", [])
        ok = len(statuses) == 4
        # This is a private draft-only quality handoff, not market, identity,
        # publication or cost authority. No cross-source metric is calculated.
        detail = {
            "PRODUCT": "Existing content draft contract only.",
            "MARKET": "Market-news pipeline remains independent.",
            "PLATFORM": "Bounded source projections; no provider calls from graph.",
            "TRUST": "No imported verification, attribution, or mutation authority.",
            "GROWTH": "Independent source evidence available for draft review.",
        }[domain]
        return {"findings": [finding(domain, "PASS_WITH_GAPS" if ok else "BLOCKED", detail)]}
    return run


def growth_quality(state: GrowthReadState) -> dict:
    statuses = state.get("source_status", [])
    findings = state.get("findings", [])
    domains = ("PRODUCT", "MARKET", "PLATFORM", "TRUST", "GROWTH")
    ok = len(statuses) == 4 and all(
        any(f.get("agent") == domain and f.get("status") == "PASS_WITH_GAPS" for f in findings)
        for domain in domains)
    return {"report": {
        "contractVersion": "CAPITAL_AI_GROWTH_GRAPH_HANDOFF@1",
        "engine": "langgraph", "quality": "PASS_WITH_GAPS" if ok else "BLOCKED",
        "sources": statuses if ok else [],
        "eligibleForDraftReview": ok and any(s["status"] == GROWTH_RECORDED for s in statuses),
        "providerAuthentication": "NOT_PROVEN_BY_GRAPH",
        "attributionEvents": [], "publicationAllowed": False,
        "costActivationAllowed": False, "automaticChanges": False,
    }}


def build_offline_review_graph(state_type, source_review, domain_review, quality):
    """Shared graph topology; no runtime authority or network side effects."""
    from langgraph.graph import END, START, StateGraph
    domains = ("PRODUCT", "MARKET", "PLATFORM", "TRUST", "GROWTH")
    graph = StateGraph(state_type)
    graph.add_node("source_review", source_review)
    graph.add_edge(START, "source_review")
    for domain in domains:
        graph.add_node(domain.lower(), domain_review(domain))
        graph.add_edge("source_review", domain.lower())
    graph.add_node("quality", quality)
    graph.add_edge([domain.lower() for domain in domains], "quality")
    graph.add_edge("quality", END)
    return graph.compile()


def build_growth_read_graph():
    return build_offline_review_graph(GrowthReadState, growth_source_review, growth_domain_review, growth_quality)


VIRAL_INPUT_CONTRACT = "CAPITAL_AI_VIRAL_GRAPH_INPUT@1"


class ViralReadState(TypedDict, total=False):
    payload: dict
    viral_valid: bool
    opportunity_refs: list[dict]
    findings: Annotated[list[dict], operator.add]
    report: dict


def viral_source_review(state: ViralReadState) -> dict:
    """Imported hashes and scores are documentation, never provider authentication."""
    payload = state.get("payload")
    denied = {"viral_valid": False, "opportunity_refs": []}
    keys = {"contractVersion", "status", "analyzedTrendsCount", "opportunities",
            "publicationState", "publicPublishAllowed", "providerCalls",
            "additionalCostUsd", "providerAuthentication"}
    if (not isinstance(payload, dict) or set(payload) != keys
            or payload["contractVersion"] != VIRAL_INPUT_CONTRACT
            or payload["status"] not in ("NOT_PROVEN", "SOURCE_RECORDED_NOT_AUTHENTICATED")
            or payload["publicationState"] != "DRAFT_ONLY" or payload["publicPublishAllowed"] is not False
            or payload["providerAuthentication"] != "NOT_PROVEN"
            or type(payload["providerCalls"]) is not int or payload["providerCalls"] != 0
            or type(payload["additionalCostUsd"]) is not int or payload["additionalCostUsd"] != 0
            or type(payload["analyzedTrendsCount"]) is not int
            or not 0 <= payload["analyzedTrendsCount"] <= 1000
            or not isinstance(payload["opportunities"], list)
            or len(payload["opportunities"]) > min(64, payload["analyzedTrendsCount"])
            or (payload["status"] == "NOT_PROVEN" and payload["analyzedTrendsCount"] != 0)):
        return denied
    refs = []
    seen = set()
    row_keys = {"recordSha256", "productContextSha256", "productSourceSha", "draftSha256",
                "sourcePlatform", "correlationScore", "review"}
    for row in payload["opportunities"]:
        if (not isinstance(row, dict) or set(row) != row_keys
                or any(not isinstance(row[k], str) or re.fullmatch(r"[0-9a-f]{64}", row[k]) is None
                       for k in ("recordSha256", "productContextSha256", "draftSha256"))
                or not valid_sha(row["productSourceSha"])
                or row["sourcePlatform"] not in ("TikTok", "Instagram", "X", "YouTube")
                or type(row["correlationScore"]) is not int or not 70 <= row["correlationScore"] <= 100
                or row["review"] != "REVIEW_REQUIRED" or row["recordSha256"] in seen):
            return denied
        seen.add(row["recordSha256"])
        refs.append(dict(row))
    return {"viral_valid": True, "opportunity_refs": refs}


def viral_domain_review(domain: str):
    def run(state: ViralReadState) -> dict:
        details = {"PRODUCT": "Product source references only; runtime claims not authenticated.",
                   "MARKET": "No market, demand or conversion proof.",
                   "PLATFORM": "Bounded offline draft references; no provider calls.",
                   "TRUST": "No imported rights, publish, spend or mutation authority.",
                   "GROWTH": "Qualified draft references for editorial review only."}
        return {"findings": [finding(domain, "PASS_WITH_GAPS" if state.get("viral_valid") is True else "BLOCKED", details[domain])]}
    return run


def viral_quality(state: ViralReadState) -> dict:
    domains = ("PRODUCT", "MARKET", "PLATFORM", "TRUST", "GROWTH")
    findings = state.get("findings", [])
    ok = state.get("viral_valid") is True and all(
        any(f.get("agent") == domain and f.get("status") == "PASS_WITH_GAPS" for f in findings)
        for domain in domains)
    refs = state.get("opportunity_refs", []) if ok else []
    return {"report": {"contractVersion": "CAPITAL_AI_VIRAL_GRAPH_HANDOFF@1",
                       "engine": "langgraph", "quality": "PASS_WITH_GAPS" if ok else "BLOCKED",
                       "opportunities": refs, "eligibleForDraftReview": bool(refs),
                       "providerAuthentication": "NOT_PROVEN_BY_GRAPH", "publicationAllowed": False,
                       "costActivationAllowed": False, "automaticChanges": False, "attributionEvents": []}}


def build_viral_read_graph():
    return build_offline_review_graph(ViralReadState, viral_source_review, viral_domain_review, viral_quality)


class ConversionReadState(TypedDict, total=False):
    payload: dict
    conversion_valid: bool
    findings: Annotated[list[dict], operator.add]
    report: dict



def smartcopy_conversion_valid(p):
    # Same offline candidate contract as existing CLI. No verified metrics admitted.
    from datetime import datetime
    keys = {"contractVersion", "productId", "campaignId", "asOf", "status",
            "candidatePayments", "candidateActiveLicenses", "candidateFullRefunds",
            "candidatePartialRefunds", "candidateDisputes", "candidateNetPaidCents",
            "verifiedMetrics", "providerAuthentication", "publicPublishAllowed",
            "liveSalesAllowed", "automaticChanges", "providerCalls", "campaignSpend"}
    if (not isinstance(p, dict) or set(p) != keys
            or p["contractVersion"] != "CAPITAL_AI_SMARTCOPY_CONVERSION_CANDIDATES@1"
            or p["productId"] != "ai-smartcopy" or not isinstance(p["campaignId"], str)
            or not re.fullmatch(r"smartcopy-[a-f0-9]{24}", p["campaignId"])
            or p["status"] != "SOURCE_RECORDED_NOT_AUTHENTICATED"
            or p["providerAuthentication"] != "NOT_PROVEN"
            or p["verifiedMetrics"] != {"paidLicenses": None, "revenueCents": None, "refunds": None}
            or any(p[k] is not False for k in ("publicPublishAllowed", "liveSalesAllowed", "automaticChanges"))
            or any(type(p[k]) is not int or p[k] != 0 for k in ("providerCalls", "campaignSpend"))):
        return False
    try:
        if not isinstance(p["asOf"], str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z", p["asOf"]):
            return False
        datetime.fromisoformat(p["asOf"].replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return False
    n = p["candidatePayments"]
    values = [p[k] for k in ("candidateActiveLicenses", "candidateFullRefunds", "candidatePartialRefunds", "candidateDisputes", "candidateNetPaidCents")]
    if n is None:
        return all(v is None for v in values)
    if type(n) is not int or not 1 <= n <= 1000:
        return False
    if any(type(v) is not int or not 0 <= v <= n for v in values[:4]) or type(values[4]) is not int or not 0 <= values[4] <= n * 100000000:
        return False
    return values[1] + values[2] <= n and values[0] + max(values[1], values[3]) <= n


def conversion_source_review(state: ConversionReadState) -> dict:
    from datetime import datetime, timedelta
    p = state.get("payload")
    if isinstance(p, dict) and p.get("contractVersion") == "CAPITAL_AI_SMARTCOPY_CONVERSION_CANDIDATES@1":
        return {"conversion_valid": smartcopy_conversion_valid(p)}
    keys = {"contractVersion", "campaignId", "contentId", "start", "end", "asOf",
            "status", "candidateRegistrations", "candidatePaidSubscribers",
            "candidateInitialInvoiceCents", "registrations", "paidSubscriptions",
            "revenueCents", "providerAuthentication", "publicPublishAllowed",
            "costActivationAllowed", "providerCalls", "automaticChanges"}
    denied = {"conversion_valid": False}
    if (not isinstance(p, dict) or set(p) != keys
            or p["contractVersion"] != "CAPITAL_AI_X_CONVERSION_CANDIDATES@1"
            or p["campaignId"] != "capital-ai-growth-20261120"
            or p["contentId"] != "CAP-GROW-005"
            or p["status"] != "SOURCE_RECORDED_NOT_AUTHENTICATED"
            or p["providerAuthentication"] != "NOT_PROVEN"
            or any(p[k] is not None for k in ("registrations", "paidSubscriptions", "revenueCents"))
            or any(p[k] is not False for k in ("publicPublishAllowed", "costActivationAllowed", "automaticChanges"))
            or type(p["providerCalls"]) is not int or p["providerCalls"] != 0):
        return denied
    try:
        start, end, as_of = (datetime.fromisoformat(p[k].replace("Z", "+00:00")) for k in ("start", "end", "asOf"))
        if not (start < end <= as_of and end - start <= timedelta(days=30)):
            return denied
    except (TypeError, ValueError, AttributeError, OverflowError):
        return denied
    reg, paid, cents = (p[k] for k in ("candidateRegistrations", "candidatePaidSubscribers", "candidateInitialInvoiceCents"))
    if any(v is not None and (type(v) is not int or not 1 <= v <= bound)
           for v, bound in ((reg, 1000), (paid, 1000), (cents, 100000000000))):
        return denied
    if (paid is None) != (cents is None) or (paid is not None and (reg is None or paid > reg or cents < paid)):
        return denied
    return {"conversion_valid": True}


def conversion_domain_review(domain: str):
    def run(state: ConversionReadState) -> dict:
        return {"findings": [finding(domain, "PASS_WITH_GAPS" if state.get("conversion_valid") is True else "BLOCKED",
            "Consent-bound candidate review only; trusted source and complete cohort evidence required.")]}
    return run


def conversion_quality(state: ConversionReadState) -> dict:
    ok = state.get("conversion_valid") is True and all(
        any(f.get("agent") == domain and f.get("status") == "PASS_WITH_GAPS" for f in state.get("findings", []))
        for domain in ("PRODUCT", "MARKET", "PLATFORM", "TRUST", "GROWTH"))
    p = state.get("payload")
    if isinstance(p, dict) and p.get("contractVersion") == "CAPITAL_AI_SMARTCOPY_CONVERSION_CANDIDATES@1":
        return {"report": {"contractVersion": "CAPITAL_AI_SMARTCOPY_CONVERSION_GRAPH_HANDOFF@1",
            "engine": "langgraph", "productId": "ai-smartcopy", "quality": "PASS_WITH_GAPS" if ok else "BLOCKED",
            "nextAction": "VERIFY_SOURCE_AND_COHORT" if ok else "REPAIR_INPUT",
            "providerAuthentication": "NOT_PROVEN_BY_GRAPH", "verifiedMetrics": {"paidLicenses": None, "revenueCents": None, "refunds": None},
            "publicationAllowed": False, "costActivationAllowed": False, "automaticChanges": False}}
    return {"report": {"contractVersion": "CAPITAL_AI_X_CONVERSION_GRAPH_HANDOFF@1",
        "engine": "langgraph", "quality": "PASS_WITH_GAPS" if ok else "BLOCKED",
        "nextAction": "VERIFY_SOURCE_AND_COHORT" if ok else "REPAIR_INPUT",
        "providerAuthentication": "NOT_PROVEN_BY_GRAPH", "registrations": None,
        "paidSubscriptions": None, "revenueCents": None, "publicationAllowed": False,
        "costActivationAllowed": False, "automaticChanges": False}}


def build_conversion_read_graph():
    return build_offline_review_graph(ConversionReadState, conversion_source_review, conversion_domain_review, conversion_quality)



class ProductChannelReadState(TypedDict, total=False):
    payload: dict
    channel_valid: bool
    product_refs: list[dict]
    findings: Annotated[list[dict], operator.add]
    report: dict


CHANNEL_RULES = {
    "website": "REVIEW_REQUIRED", "acode": "LISTING_REVIEW_REQUIRED",
    "acodeCommunity": "LOCAL_RULES_REVIEW_REQUIRED", "youtube": "REVIEW_REQUIRED",
    "productHunt": "REVIEW_REQUIRED", "redditShowcase": "LOCAL_RULES_REVIEW_REQUIRED",
    "alternativeTo": "LISTING_REVIEW_REQUIRED", "devto": "REVIEW_REQUIRED",
    "showHN": "HUMAN_ONLY_NO_GENERATED_TEXT",
    "githubMarketplace": "LISTING_REVIEW_REQUIRED", "linkedin": "REVIEW_REQUIRED",
    "x": "REVIEW_REQUIRED", "tiktok": "COMMERCIAL_DISCLOSURE_REQUIRED",
}


def channel_source_review(state: ProductChannelReadState) -> dict:
    p = state.get("payload")
    denied = {"channel_valid": False, "product_refs": []}
    keys = {"contractVersion", "sourceSha256", "publicationState", "publicPublishAllowed",
            "liveSalesAllowed", "providerCalls", "campaignSpend", "products"}
    if (not isinstance(p, dict) or set(p) != keys
            or p["contractVersion"] != "CAPITAL_AI_PRODUCT_CHANNEL_GRAPH_INPUT@1"
            or not isinstance(p["sourceSha256"], str)
            or not re.fullmatch(r"[0-9a-f]{64}", p["sourceSha256"])
            or p["publicationState"] != "DRAFT_ONLY"
            or p["publicPublishAllowed"] is not False or p["liveSalesAllowed"] is not False
            or any(type(p[k]) is not int or p[k] != 0 for k in ("providerCalls", "campaignSpend"))
            or not isinstance(p["products"], list) or not 1 <= len(p["products"]) <= 133):
        return denied
    refs, seen = [], set()
    for item in p["products"]:
        if (not isinstance(item, dict) or set(item) != {"id", "researchStatus", "channels"}
                or not isinstance(item["id"], str) or not re.fullmatch(r"[a-z0-9-]{1,80}", item["id"])
                or item["id"] in seen or not isinstance(item["channels"], list)
                or len(item["channels"]) > len(CHANNEL_RULES)
                or item["researchStatus"] not in ("CANDIDATES_REVIEW_REQUIRED", "UNMAPPED_RESEARCH_REQUIRED")
                or bool(item["channels"]) != (item["researchStatus"] == "CANDIDATES_REVIEW_REQUIRED")):
            return denied
        seen.add(item["id"])
        channel_ids = set()
        rows = []
        for c in item["channels"]:
            if (not isinstance(c, dict) or set(c) != {"id", "priority", "rule"}
                    or not isinstance(c["id"], str) or c["id"] not in CHANNEL_RULES
                    or c["id"] in channel_ids or c["rule"] != CHANNEL_RULES[c["id"]]
                    or c["priority"] not in ("P0", "P1", "P2")):
                return denied
            channel_ids.add(c["id"])
            rows.append(dict(c))
        refs.append({"id": item["id"], "researchStatus": item["researchStatus"], "channels": rows})
    return {"channel_valid": True, "product_refs": refs}


def channel_domain_review(domain: str):
    def run(state: ProductChannelReadState) -> dict:
        return {"findings": [finding(domain, "PASS_WITH_GAPS" if state.get("channel_valid") is True else "BLOCKED",
            "Editorial channel candidates only; independent source, platform rules, rights and demand review required.")]}
    return run


def channel_quality(state: ProductChannelReadState) -> dict:
    ok = state.get("channel_valid") is True and all(
        any(f.get("agent") == domain and f.get("status") == "PASS_WITH_GAPS" for f in state.get("findings", []))
        for domain in ("PRODUCT", "MARKET", "PLATFORM", "TRUST", "GROWTH"))
    refs = state.get("product_refs", []) if ok else []
    return {"report": {
        "contractVersion": "CAPITAL_AI_PRODUCT_CHANNEL_GRAPH_HANDOFF@1", "engine": "langgraph",
        "quality": "PASS_WITH_GAPS" if ok else "BLOCKED",
        "products": refs, "researchQueue": [r["id"] for r in refs if not r["channels"]],
        "sourceAuthentication": "NOT_PROVEN_BY_GRAPH", "publicationAllowed": False,
        "liveSalesAllowed": False, "costActivationAllowed": False, "automaticChanges": False,
        "attributionEvents": [],
    }}


def build_channel_read_graph():
    return build_offline_review_graph(ProductChannelReadState, channel_source_review, channel_domain_review, channel_quality)


class VisualReadState(TypedDict, total=False):
    payload: dict
    visual_valid: bool
    metrics: dict
    findings: Annotated[list[dict], operator.add]
    report: dict


def visual_source_review(state: VisualReadState) -> dict:
    p = state.get("payload")
    denied = {"visual_valid": False, "metrics": {}}
    def sha(v):
        return isinstance(v, str) and bool(re.fullmatch(r"[a-f0-9]{64}", v))
    def integer(v, lo, hi):
        return type(v) is int and lo <= v <= hi
    keys = {"contractVersion", "sourceDigest", "state", "publicPublishAllowed",
            "providerCalls", "providerCost", "manualTimeSavedMs", "drafts"}
    if (not isinstance(p, dict) or set(p) != keys
        or p["contractVersion"] != "CAPITAL_AI_VISUAL_GRAPH_INPUT@1"
        or p["sourceDigest"] != "d08aa8e7f831dea7cb15010f46374f8fbdecaee1408619af1a4fb857460c1234"
        or p["state"] != "DRAFT_ONLY" or p["publicPublishAllowed"] is not False
        or not all(integer(p[k], 0, 0) for k in ("providerCalls", "providerCost"))
        or p["manualTimeSavedMs"] is not None or not isinstance(p["drafts"], list)
        or len(p["drafts"]) != 2):
        return denied
    expected = {"CAP-GROW-005": ("X", 1440, 960), "CAP-GROW-007": ("INSTAGRAM", 1080, 1350)}
    seen = set()
    totals = dict(assetCount=0, inputBytes=0, selectedBytes=0, elapsedMs=0, repairCycles=0)
    for d in p["drafts"]:
        if (not isinstance(d, dict) or set(d) != {"contentId", "channel", "width", "height", "sourceSha256",
            "manifestSha256", "elapsedMs", "repairCycles", "selectedSha256", "assets"}
            or not isinstance(d["contentId"], str) or d["contentId"] not in expected or d["contentId"] in seen
            or (d["channel"], d["width"], d["height"]) != expected[d["contentId"]]
            or not all(sha(d[k]) for k in ("sourceSha256", "manifestSha256", "selectedSha256"))
            or not integer(d["elapsedMs"], 0, 3600000) or not integer(d["repairCycles"], 0, 0)
            or not isinstance(d["assets"], list) or not 3 <= len(d["assets"]) <= 4):
            return denied
        seen.add(d["contentId"])
        assets = {}
        for a in d["assets"]:
            if (not isinstance(a, dict) or set(a) != {"sha256", "mimeType", "byteLength"}
                or not sha(a["sha256"]) or not integer(a["byteLength"], 1, 16777216)
                or not isinstance(a["mimeType"], str) or a["mimeType"] not in
                ("image/svg+xml", "image/png", "image/jpeg", "image/webp") or a["mimeType"] in assets):
                return denied
            assets[a["mimeType"]] = a
        if not {"image/svg+xml", "image/png", "image/jpeg"} <= set(assets):
            return denied
        png = assets["image/png"]
        if png["sha256"] != d["sourceSha256"]:
            return denied
        selected = next((a for k, a in assets.items() if k in ("image/png", "image/webp")
                         and a["sha256"] == d["selectedSha256"]), None)
        if selected is None or selected["byteLength"] > png["byteLength"]:
            return denied
        totals["assetCount"] += len(assets)
        totals["inputBytes"] += png["byteLength"]
        totals["selectedBytes"] += selected["byteLength"]
        totals["elapsedMs"] += d["elapsedMs"]
    return {"visual_valid": True, "metrics": totals}


def visual_domain_review(domain: str):
    def run(state: VisualReadState) -> dict:
        ok = state.get("visual_valid") is True
        return {"findings": [finding(domain, "PASS_WITH_GAPS" if ok else "BLOCKED",
            "Local receipt metadata only; independent bytes, runtime, rights and cost verification required.")]}
    return run


def visual_quality(state: VisualReadState) -> dict:
    ok = state.get("visual_valid") is True and all(
        any(f.get("agent") == domain and f.get("status") == "PASS_WITH_GAPS" for f in state.get("findings", []))
        for domain in ("PRODUCT", "MARKET", "PLATFORM", "TRUST", "GROWTH"))
    return {"report": {"contractVersion": "CAPITAL_AI_VISUAL_GRAPH_HANDOFF@1", "engine": "langgraph",
        "quality": "PASS_WITH_GAPS" if ok else "BLOCKED", "metrics": state.get("metrics") if ok else None,
        "sourceAuthentication": "NOT_PROVEN_BY_GRAPH", "manualTimeSavedMs": None,
        "publicationAllowed": False, "costActivationAllowed": False, "automaticChanges": False}}


def build_visual_read_graph():
    return build_offline_review_graph(VisualReadState, visual_source_review, visual_domain_review, visual_quality)


def read_growth_input(stream):
    """Bound input before parsing, including stdin or changing local files."""
    raw = stream.read(262145)
    if len(raw) > 262144:
        raise SystemExit("INPUT_TOO_LARGE")
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeError, ValueError, RecursionError):
        raise SystemExit("INVALID_INPUT") from None


def main():
    import argparse
    import sys
    parser = argparse.ArgumentParser(description="Local, offline product-opportunity draft review")
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument("--input", type=Path)
    inputs.add_argument("--growth-data", type=Path, help="Bounded JSON file, or - for stdin")
    inputs.add_argument("--viral-data", type=Path, help="Bounded draft-only reference JSON, or - for stdin")
    inputs.add_argument("--conversion-data", type=Path, help="Bounded candidate JSON, or - for stdin")
    inputs.add_argument("--product-channels", type=Path, help="Bounded draft-only channel JSON, or - for stdin")
    inputs.add_argument("--visual-data", type=Path, help="Bounded local visual receipt, or - for stdin")
    args = parser.parse_args()
    if args.visual_data is not None:
        if args.visual_data == Path("-"):
            raw = read_growth_input(sys.stdin.buffer)
        else:
            with args.visual_data.open("rb") as stream:
                raw = read_growth_input(stream)
        result = build_visual_read_graph().invoke({"payload": raw, "findings": []}, {"recursion_limit": 8})
        print(json.dumps(result["report"], ensure_ascii=False, sort_keys=True))
        return
    if args.product_channels is not None:
        if args.product_channels == Path("-"):
            raw = read_growth_input(sys.stdin.buffer)
        else:
            with args.product_channels.open("rb") as stream:
                raw = read_growth_input(stream)
        result = build_channel_read_graph().invoke({"payload": raw, "findings": []}, {"recursion_limit": 8})
        print(json.dumps(result["report"], ensure_ascii=False, sort_keys=True))
        return
    if args.conversion_data is not None:
        if args.conversion_data == Path("-"):
            raw = read_growth_input(sys.stdin.buffer)
        else:
            with args.conversion_data.open("rb") as stream:
                raw = read_growth_input(stream)
        result = build_conversion_read_graph().invoke({"payload": raw, "findings": []}, {"recursion_limit": 8})
        print(json.dumps(result["report"], ensure_ascii=False, sort_keys=True))
        return
    if args.viral_data is not None:
        if args.viral_data == Path("-"):
            raw = read_growth_input(sys.stdin.buffer)
        else:
            with args.viral_data.open("rb") as stream:
                raw = read_growth_input(stream)
        result = build_viral_read_graph().invoke({"payload": raw, "findings": []}, {"recursion_limit": 8})
        print(json.dumps(result["report"], ensure_ascii=False, sort_keys=True))
        return
    if args.growth_data is not None:
        if args.growth_data == Path("-"):
            raw = read_growth_input(sys.stdin.buffer)
        else:
            with args.growth_data.open("rb") as stream:
                raw = read_growth_input(stream)
        result = build_growth_read_graph().invoke({"payload": raw, "findings": []},
                                                  {"recursion_limit": 8})
        print(json.dumps(result["report"], ensure_ascii=False, sort_keys=True))
        return
    if args.input.stat().st_size > 131072:
        raise SystemExit("INPUT_TOO_LARGE")
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or set(payload) != {"product", "documents"}:
        raise SystemExit("INVALID_INPUT")
    result = build_graph().invoke({
        "product": payload["product"], "documents": payload["documents"], "findings": []
    }, {"recursion_limit": 8})
    print(json.dumps(result["report"], ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
