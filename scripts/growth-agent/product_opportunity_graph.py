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


def build_growth_read_graph():
    """Real pinned StateGraph, reusing the existing offline worker boundary."""
    from langgraph.graph import END, START, StateGraph
    domains = ("PRODUCT", "MARKET", "PLATFORM", "TRUST", "GROWTH")
    graph = StateGraph(GrowthReadState)
    graph.add_node("source_review", growth_source_review)
    graph.add_edge(START, "source_review")
    for domain in domains:
        graph.add_node(domain.lower(), growth_domain_review(domain))
        graph.add_edge("source_review", domain.lower())
    graph.add_node("quality", growth_quality)
    graph.add_edge([domain.lower() for domain in domains], "quality")
    graph.add_edge("quality", END)
    return graph.compile()


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Local, offline product-opportunity draft review")
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument("--input", type=Path)
    inputs.add_argument("--growth-data", type=Path)
    args = parser.parse_args()
    if args.growth_data is not None:
        if args.growth_data.stat().st_size > 262144:
            raise SystemExit("INPUT_TOO_LARGE")
        raw = json.loads(args.growth_data.read_text(encoding="utf-8"))
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
