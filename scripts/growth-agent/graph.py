"""Local, zero-paid-provider LangGraph marketing operations.
Domain workers are deterministic; no LLM, browser login, ad spend or publication.
"""
from __future__ import annotations

import argparse
import json
import operator
import os
from pathlib import Path
import re
import subprocess
from typing import Annotated, TypedDict

# Explicitly disable hosted tracing before any LangChain/LangGraph import.
os.environ["LANGSMITH_TRACING"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"


class GrowthState(TypedDict, total=False):
    repo_root: str
    google_reads: bool
    tool_radar: dict
    findings: Annotated[list[dict], operator.add]
    plan: dict


def source(root: str, name: str) -> str:
    path = Path(root) / name
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")[:1_000_000]


def finding(agent: str, status: str, detail: str) -> dict:
    return {"agent": agent, "status": status, "detail": detail}


def local_checks(root: str, agent: str, paths: list[str]) -> dict:
    """Run only fixed local test files; never expose process output or secrets."""
    if not all((Path(root) / path).is_file() for path in paths):
        return finding(agent, "NOT_PROVEN", "Local contract tests unavailable in this checkout.")
    try:
        result = subprocess.run(["node", "--test", *paths], cwd=root,
                                text=True, capture_output=True, timeout=60, check=False)
        return finding(agent, "LOCAL_TEST_PASSED" if result.returncode == 0 else "LOCAL_TEST_FAILED",
                       "Local contracts: " + ", ".join(paths) + "; no live browser or provider claim.")
    except (OSError, subprocess.TimeoutExpired):
        return finding(agent, "NOT_PROVEN", "Local contract test runner unavailable.")


def seo_agent(state: GrowthState) -> dict:
    policy = source(state["repo_root"], "shared/seo-indexing-policy.mjs")
    noindex = re.findall(r"path: '([^']+)', classification: 'NOINDEX'", policy)
    metadata = source(state["repo_root"], "shared/seo-metadata.mjs")
    # Match the entire source declaration; a substring could also occur in an
    # unrelated comment, URL path, or an attacker-controlled hostname.
    canonical_origin_defined = "export const SEO_SITE_ORIGIN = 'https://capital-ai.online';" in metadata.splitlines()
    return {"findings": [
        finding("seo", "SOURCE_OBSERVED" if policy else "NOT_PROVEN", "Public product routes awaiting crawlable landing content: " + ", ".join(path for path in noindex if path in {"/marketscreener", "/pricing", "/dokumentation"})),
        finding("seo", "SOURCE_OBSERVED" if canonical_origin_defined else "NOT_PROVEN", "Production canonical origin source inspected; live canonical/indexing and ranking require independent readback."),
        local_checks(state["repo_root"], "seo", ["scripts/seo-content-manifest.test.mjs", "scripts/seo-metadata.test.mjs"]),
    ]}


def privacy_agent(state: GrowthState) -> dict:
    analytics = source(state["repo_root"], "src/utils/analytics.ts")
    disabled = "export const GA_MEASUREMENT_ID = ''" in analytics and bool(re.search(r"function initGoogleAnalytics[^\n]+\{\}", analytics))
    return {"findings": [finding("privacy", "SOURCE_OBSERVED" if analytics else "NOT_PROVEN",
        "Optional analytics implementation is disabled; do not invent GA4 demand metrics. Consent accept/reject/withdrawal and tag duplication need browser tests." if disabled else
        "Tracking source changed: verify consent denial, withdrawal, data minimization and duplicate tag handling before activation."),
        local_checks(state["repo_root"], "privacy", ["scripts/privacy-analytics.test.mjs"]),
        finding("privacy", "NOT_PROVEN", "Browser consent accept/reject/withdrawal is not implemented or verified by the disabled-analytics contract.")]}


def google_agent(state: GrowthState) -> dict:
    # Credentials stay in the trusted worker's inherited environment, never state/output.
    if not state.get("google_reads"):
        return {"findings": [finding("google", "NOT_PROVEN", "Live Google reads are opt-in; project aifinancial-500208, GA4 548187678 and GSC sc-domain:capital-ai.online access not verified.")]}
    findings = []
    for tool in ["ga4_get_property", "ga4_list_data_streams", "ga4_country_report", "gsc_list_sitemaps", "gsc_country_report"]:
        request = {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": tool, "arguments": {}}}
        try:
            result = subprocess.run(
                ["node", str(Path(state["repo_root"]) / "scripts/google-maintenance-mcp.mjs")],
                input=json.dumps(request) + "\n", text=True, capture_output=True,
                timeout=100, check=False,
            )
            if result.returncode != 0 or len(result.stdout) > 1_100_000:
                raise ValueError("worker unavailable")
            response = json.loads(result.stdout.strip())
            if not isinstance(response, dict) or not isinstance(response.get("result"), dict):
                raise ValueError("invalid worker response")
            payload = response["result"]
            success = payload.get("isError") is False
            detail = tool + ": provider read succeeded." if success else tool + ": provider read unavailable; inspect trusted-worker identity and permissions."
            if success and tool == "ga4_list_data_streams":
                structured = payload.get("structuredContent")
                if not isinstance(structured, dict) or not isinstance(structured.get("streams"), list):
                    raise ValueError("invalid stream response")
                streams = structured["streams"]
                if not all(isinstance(item, dict) for item in streams):
                    raise ValueError("invalid stream entries")
                bound = any(item.get("associatedDomainVerified") is True for item in streams)
                detail = "GA4 HTTPS capital-ai.online stream association " + ("verified." if bound else "NOT_PROVEN.")
                success = bound
            findings.append(finding("google", "VERIFIED" if success else "NOT_PROVEN", detail))
        except (OSError, ValueError, subprocess.TimeoutExpired):
            findings.append(finding("google", "NOT_PROVEN", tool + ": trusted worker unavailable."))
    return {"findings": findings}


def review_tool_radar(payload: object) -> dict:
    # Untrusted metadata is a research queue, not a tool execution contract.
    denied = {"state": "NOT_PROVEN", "candidates": [], "automaticInstall": False}
    if not isinstance(payload, dict) or payload.get("schema") != "CAPITAL_AI_GROWTH_TOOL_RADAR@1":
        return denied
    if (payload.get("metadataOnly") is not True or payload.get("automaticInstall") is not False
            or payload.get("publicPublishAllowed") is not False
            or type(payload.get("paidProviderCalls")) is not int or payload["paidProviderCalls"] != 0):
        return denied
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or len(candidates) > 40:
        return denied
    allowed = {"MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "MPL-2.0"}
    result, seen = [], set()
    for row in candidates:
        if not isinstance(row, dict):
            return denied
        name = row.get("repository")
        if (not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", name)
                or len(name) > 200 or name.lower() in seen
                or row.get("installAllowed") is not False or row.get("activationAllowed") is not False
                or row.get("commercialRights") != "NOT_PROVEN" or row.get("outputRights") != "NOT_PROVEN"):
            return denied
        seen.add(name.lower())
        license_id = row.get("declaredLicense")
        if isinstance(license_id, str) and license_id in allowed and row.get("commercialCandidate") is True and row.get("state") == "REVIEW_REQUIRED":
            result.append({"repository": name, "declaredLicense": license_id, "nextAction": "EXACT_ARTIFACT_AND_RIGHTS_REVIEW"})
    topics = payload.get("topics")
    if not isinstance(topics, list) or not topics or not all(isinstance(t, dict) for t in topics):
        return denied
    if not any(t.get("status") == "METADATA_OBSERVED" for t in topics):
        return denied
    return {"state": "METADATA_ONLY_REVIEW_REQUIRED", "candidates": result, "automaticInstall": False}


def marketing_agent(state: GrowthState) -> dict:
    visual = source(state["repo_root"], "src/shared/growthVisualScenes.ts")
    radar = source(state["repo_root"], "server/tool-update-discovery.mjs")
    return {"findings": [
        finding("marketing", "SOURCE_OBSERVED" if visual and radar else "NOT_PROVEN", "3D draft recipes and public tool discovery source; daily evidence, commercial output rights and renderer runtime require independent review."),
        finding("marketing", "PROPOSED", "Separate B2B fintech integration/data-rights content from learner vocabulary and trader tooling; validate demand using actual GSC reports."),
        finding("marketing", "PROPOSED", "Countries DE/IT/ES/PT/GB; language rollout de-DE, en-GB, it-IT, es-ES, pt-PT. Localized previews stay noindex until complete crawlable translations."),
    ]}


def plan_agent(state: GrowthState) -> dict:
    findings = sorted(state.get("findings", []), key=lambda item: (item["agent"], item["detail"]))
    return {"plan": {
        "schema": "CAPITAL_AI_LOCAL_GROWTH_GRAPH@1",
        "engine": "langgraph",
        "workers": ["seo", "privacy", "google", "marketing"],
        "budget": {"paidProviderCalls": 0, "adSpend": 0, "hostedTracing": False},
        "execution": {"mode": "audit-and-plan", "automaticWrites": False, "publication": False},
        "findings": findings,
        "toolRadar": review_tool_radar(state.get("tool_radar")),
        "nextActions": [
            "Verify intended Google identity and exact property/domain associations.",
            "Measure 28-day and preceding-period organic performance; unavailable values remain NOT_PROVEN.",
            "Improve canonical metadata and useful public audience landing content through reviewed repository changes.",
            "Implement and browser-test consent before activating analytics or advertising tags.",
        ],
    }}


def build_graph():
    from langgraph.graph import END, START, StateGraph

    builder = StateGraph(GrowthState)
    nodes = {"seo": seo_agent, "privacy": privacy_agent, "google": google_agent, "marketing": marketing_agent}
    for name, node in nodes.items():
        builder.add_node(name, node)
        builder.add_edge(START, name)
    builder.add_node("plan", plan_agent)
    builder.add_edge(list(nodes), "plan")
    builder.add_edge("plan", END)
    return builder.compile()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument("--google-reads", action="store_true")
    parser.add_argument("--tool-radar", type=Path, help="Bounded local daily metadata evidence file")
    args = parser.parse_args()
    radar = None
    if args.tool_radar:
        try:
            with args.tool_radar.open("rb") as stream:
                raw = stream.read(262145)
            if len(raw) <= 262144:
                radar = json.loads(raw)
        except (OSError, ValueError, RecursionError):
            radar = None
    result = build_graph().invoke({"repo_root": args.repo_root, "google_reads": args.google_reads, "findings": [], "tool_radar": radar}, {"recursion_limit": 8})
    print(json.dumps(result["plan"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
