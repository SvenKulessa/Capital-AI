"""Offline, source-bound multi-agent retrieval on the existing LangGraph stack.

No model, network, provider API or shell action can be called by any graph node.
Repository documentation is untrusted *data*, never an authority for tool calls.
"""
from __future__ import annotations

import hashlib
import os
import re
import stat
from pathlib import Path
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from domain_profile_binding import load_domain_profiles

DOMAINS = ("PLATFORM", "TRUST", "MARKET", "GROWTH", "PRODUCT")
# Public, curated, repository-owned references only; no arbitrary path in a task.
SOURCES = {
    "PLATFORM": ("docs/architecture/EXECUTION-FIRST-LANGGRAPH.md",
                 "docs/platform/LANGGRAPH-WORKER-READBACK-20261115.md"),
    "TRUST": ("AGENTS.md", "docs/architecture/EXECUTION-FIRST-LANGGRAPH.md"),
    "MARKET": ("AGENTS.md",),
    "GROWTH": ("AGENTS.md",),
    "PRODUCT": ("AGENTS.md",),
}
MAX_BYTES = 180_000
WORD = re.compile(r"[\wÄÖÜäöüß]{3,}", re.UNICODE)


class ResearchState(TypedDict, total=False):
    task_id: str
    domain: str
    query: str
    status: str
    citations: list[dict]
    agent_route: list[str]
    specialist: str
    source_count: int
    recommendation: str
    profile_sha256: str
    bundle_sha256: str
    profile_skills: list[str]


def words(s: str) -> set[str]:
    return {x.lower() for x in WORD.findall(s[:1000])}


def retrieve(root: Path, *, domain: str, query: str, limit: int = 3) -> list[dict]:
    """Extract grounded snippets, SHA-bind each source and retain line locations."""
    if domain not in DOMAINS or not isinstance(query, str) or not 1 <= len(query) <= 300:
        raise ValueError("unsupported research task")
    if type(limit) is not int or not 1 <= limit <= 3:
        raise ValueError("invalid retrieval bound")
    root = Path(root).resolve(strict=True)
    terms = words(query)
    if not terms:
        return []
    ranked = []
    for relative in SOURCES[domain]:
        # Reject symlinks in every parent component, not only the final file.
        path = root
        for part in Path(relative).parts[:-1]:
            path = path / part
            parent = path.lstat()
            if not stat.S_ISDIR(parent.st_mode) or stat.S_ISLNK(parent.st_mode):
                raise ValueError("invalid curated source parent")
        path = root / relative
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_BYTES:
            raise ValueError("invalid curated source")
        handle = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
        try:
            opened = os.fstat(handle)
            if (not stat.S_ISREG(opened.st_mode) or opened.st_size > MAX_BYTES
                    or opened.st_ino != info.st_ino or opened.st_dev != info.st_dev):
                raise ValueError("invalid source")
            data = os.read(handle, MAX_BYTES + 1)
        finally:
            os.close(handle)
        if len(data) > MAX_BYTES:
            raise ValueError("oversized curated source")
        content = data.decode("utf-8")
        digest = hashlib.sha256(data).hexdigest()
        lines = content.splitlines()
        for start in range(0, len(lines), 8):
            segment = " ".join(line.strip() for line in lines[start:start + 8])
            matches = terms & words(segment)
            if not matches:
                continue
            ranked.append((len(matches), relative, start + 1, {
                "source": relative, "line": start + 1,
                "source_sha256": digest, "excerpt": segment[:360],
            }))
    ranked.sort(key=lambda item: (-item[0], item[1], item[2]))
    return [item[3] for item in ranked[:limit]]


def build_research_graph(repo_root: Path, *, checkpointer=None,
                         expected_bundle_sha256: str | None = None):
    """Existing offline LangGraph supervisor -> retriever -> specialist -> TRUST.

    Repo-owned profile metadata only; NEVER converts a prompt into authority.
    Checkpoint callers must bind expected_bundle_sha256 to trusted task scope.
    """
    root = Path(repo_root)
    bundle = load_domain_profiles(root)
    if (expected_bundle_sha256 is not None
            and bundle["bundle_sha256"] != expected_bundle_sha256):
        raise ValueError("domain profile changed between checkpoint binding and graph creation")

    def route(state: ResearchState) -> dict:
        if (state.get("domain") not in DOMAINS
                or not isinstance(state.get("task_id"), str)
                or not re.fullmatch(r"[a-zA-Z0-9._:-]{1,96}", state["task_id"])
                or not isinstance(state.get("query"), str)
                or not 1 <= len(state["query"]) <= 300):
            return {"status": "BLOCKED", "agent_route": ["supervisor"]}
        route = bundle["domains"][state["domain"]]
        return {"status": "ROUTED", "agent_route": ["supervisor"],
                "profile_sha256": route["profile_sha256"],
                "bundle_sha256": bundle["bundle_sha256"],
                "profile_skills": list(route["skills"])}

    def search(state: ResearchState) -> dict:
        try:
            citations = retrieve(root, domain=state["domain"], query=state["query"])
        except (OSError, UnicodeError, ValueError):
            return {"status": "BLOCKED", "citations": [],
                    "agent_route": state["agent_route"] + ["retriever"]}
        return {"status": "SOURCES_FOUND" if citations else "NOT_PROVEN",
                "citations": citations,
                "agent_route": state["agent_route"] + ["retriever"]}

    def specialist(domain: str):
        def assess(state: ResearchState) -> dict:
            return {"specialist": domain,
                    "source_count": len(state.get("citations", [])),
                    "agent_route": state["agent_route"] + [domain.lower() + "_analyst"]}
        return assess

    def trust(state: ResearchState) -> dict:
        citations = state.get("citations", [])
        route = bundle["domains"][state["domain"]]
        ok = (bool(citations)
              and state.get("bundle_sha256") == bundle["bundle_sha256"]
              and state.get("profile_sha256") == route["profile_sha256"]
              and state.get("profile_skills") == route["skills"]
              and all(c["source"] in SOURCES[state["domain"]]
                                     and re.fullmatch(r"[a-f0-9]{64}", c["source_sha256"])
                                     for c in citations))
        return {"status": "RESEARCH_DRAFT" if ok else "NOT_PROVEN",
                "recommendation": "Source-bound analysis only; no autonomous actions",
                "agent_route": state["agent_route"] + ["trust_reviewer"]}

    graph = StateGraph(ResearchState)
    graph.add_node("route", route)
    graph.add_node("retrieve", search)
    for domain in DOMAINS:
        graph.add_node("agent_" + domain.lower(), specialist(domain))
        graph.add_edge("agent_" + domain.lower(), "trust")
    graph.add_node("trust", trust)
    graph.add_edge(START, "route")
    graph.add_conditional_edges("route", lambda s: "stop" if s["status"] == "BLOCKED" else "retrieve",
                                {"stop": END, "retrieve": "retrieve"})
    graph.add_conditional_edges("retrieve", lambda s: "agent_" + s["domain"].lower() if s["status"] == "SOURCES_FOUND" else "stop",
                                {**{"agent_" + d.lower(): "agent_" + d.lower() for d in DOMAINS}, "stop": END})
    graph.add_edge("trust", END)
    return graph.compile(checkpointer=checkpointer)


def research_evidence_handoff(root: Path, state: ResearchState) -> dict:
    """Read back curated RAG citations; never export excerpts, prompts or authority."""
    domain = state.get("domain")
    thread_id = state.get("task_id")
    if domain not in DOMAINS or not isinstance(thread_id, str) or not re.fullmatch(r"offline-[a-f0-9]{40}", thread_id):
        raise ValueError("unbound research result")
    bundle = load_domain_profiles(root)
    profile = bundle["domains"][domain]
    if state.get("bundle_sha256") != bundle["bundle_sha256"] or state.get("profile_sha256") != profile["profile_sha256"]:
        raise ValueError("stale research profile")
    def keys(citations):
        return [(c["source"], c["line"], c["source_sha256"]) for c in citations]
    current = retrieve(root, domain=domain, query=state["query"])
    previous = state.get("citations", [])
    match = state.get("status") == "RESEARCH_DRAFT" and bool(current) and keys(current) == keys(previous)
    return {"contractVersion": "CAPITAL_AI_RESEARCH_EVIDENCE_HANDOFF@1",
            "threadId": thread_id, "domain": domain, "bundleSha256": bundle["bundle_sha256"],
            "profileSha256": profile["profile_sha256"],
            "citationDigests": sorted({c["source_sha256"] for c in current}) if match else [],
            "sourceCount": len(current) if match else 0,
            "status": "SOURCE_READBACK_MATCH" if match else "NOT_PROVEN",
            "authorityGranted": False}
