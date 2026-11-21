"""Issue #874: local draft-only LangGraph + bounded source-bound RAG review.

No LangSmith, paid provider, publishing, credential access, API access or runtime
permissions. Existing scripts/growth-agent/requirements.lock supplies LangGraph.
This graph only evaluates caller-supplied contract output and local evidence.
"""
from __future__ import annotations

import json
import math
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
                      and math.isfinite(s.get("roiPercent"))))
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


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Local, offline product-opportunity draft review")
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()
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
