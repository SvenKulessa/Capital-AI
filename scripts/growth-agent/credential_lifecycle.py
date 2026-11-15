"""Offline credential-expiry evidence evaluation via a bounded LangGraph.

Never connects to providers, reads secret values, refreshes tokens, rotates keys,
starts OAuth, schedules work or writes files. All input fields are allowlisted.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import TypedDict

SCHEMA = "capital-ai.credential-lifecycle.v1"
ID = re.compile(r"^[a-z][a-z0-9_-]{2,63}$")
SOURCE = re.compile(r"^repo:[a-zA-Z0-9._/-]{1,140}$")
EVIDENCE = re.compile(r"^(?:provider|owner|github-run):[a-zA-Z0-9._/-]{1,100}$")
KINDS = frozenset({"oauth_access", "api_key", "webhook_signing", "jwt_signing", "service_account", "registry_credential", "machine_secret", "workload_identity"})
MODES = frozenset({"provider_refresh", "owner_manual", "keyless"})
INVENTORY_KEYS = frozenset({"id", "provider", "consumer", "kind", "rotation_mode", "source_ref", "expires_at", "review_due_at"})
OBSERVATION_KEYS = frozenset({"id", "expires_at", "observed_at", "evidence_ref"})
THRESHOLDS = (30, 14, 7, 3, 1)


class LifecycleState(TypedDict, total=False):
    phase: str
    records: list[dict]
    findings: list[dict]
    report: dict
    history: list[str]


def parse_utc(value: object) -> datetime:
    if not isinstance(value, str) or len(value) > 35 or not re.fullmatch(
        r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z", value
    ):
        raise ValueError("timestamp must be canonical UTC ISO 8601")
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("invalid timestamp") from None
    return dt.astimezone(timezone.utc)


def iso_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _date(value: object) -> datetime | None:
    return None if value is None else parse_utc(value)


def validate_inventory(raw: object) -> list[dict]:
    if not isinstance(raw, dict) or set(raw) != {"schema", "credentials"} or raw["schema"] != SCHEMA:
        raise ValueError("invalid inventory document")
    items = raw["credentials"]
    if not isinstance(items, list) or not 1 <= len(items) <= 100:
        raise ValueError("invalid inventory size")
    seen = set()
    result = []
    for item in items:
        if not isinstance(item, dict) or set(item) != INVENTORY_KEYS:
            raise ValueError("unsupported inventory fields")
        ident = item["id"]
        if not isinstance(ident, str) or not ID.fullmatch(ident) or ident in seen:
            raise ValueError("invalid or duplicate credential id")
        seen.add(ident)
        if (item["kind"] not in KINDS or item["rotation_mode"] not in MODES
                or not isinstance(item["provider"], str)
                or not re.fullmatch(r"[A-Za-z][A-Za-z0-9 -]{1,40}", item["provider"])
                or not isinstance(item["consumer"], str)
                or not ID.fullmatch(item["consumer"])
                or not isinstance(item["source_ref"], str)
                or not SOURCE.fullmatch(item["source_ref"])):
            raise ValueError("invalid inventory metadata")
        _date(item["expires_at"])
        _date(item["review_due_at"])
        if item["rotation_mode"] == "keyless" and item["review_due_at"] is not None:
            raise ValueError("keyless identity has no rotation review")
        result.append(dict(item))
    return result


def validate_observations(raw: object, inventory: list[dict], at: datetime) -> dict[str, dict]:
    if raw is None:
        return {}
    if not isinstance(raw, dict) or set(raw) != {"schema", "observations"} or raw["schema"] != SCHEMA:
        raise ValueError("invalid observation document")
    values = raw["observations"]
    if not isinstance(values, list) or len(values) > len(inventory):
        raise ValueError("invalid observation size")
    valid_ids = {item["id"] for item in inventory}
    result = {}
    for value in values:
        if not isinstance(value, dict) or set(value) != OBSERVATION_KEYS:
            raise ValueError("unsupported observation fields")
        ident = value["id"]
        if not isinstance(ident, str) or ident not in valid_ids or ident in result:
            raise ValueError("invalid or duplicate observation id")
        observed = parse_utc(value["observed_at"])
        _date(value["expires_at"])
        if observed > at or (at - observed).total_seconds() > 86400:
            # Fail closed: stale/future records do not override the static inventory.
            raise ValueError("stale or future observation")
        if not isinstance(value["evidence_ref"], str) or not EVIDENCE.fullmatch(value["evidence_ref"]):
            raise ValueError("invalid evidence reference")
        result[ident] = dict(value)
    return result


def evaluate(inventory: list[dict], observations: dict[str, dict], at: datetime) -> list[dict]:
    findings = []
    for item in inventory:
        obs = observations.get(item["id"])
        expiry = _date(obs["expires_at"] if obs else item["expires_at"])
        review = _date(item["review_due_at"])
        if item["rotation_mode"] == "keyless" and expiry is None:
            verdict, action, days = "KEYLESS", "verify_federation", None
        elif expiry is not None:
            seconds = (expiry - at).total_seconds()
            days = max(0, int(seconds // 86400)) if seconds > 0 else 0
            if seconds <= 0:
                verdict, action = "EXPIRED", "inspect_refresh_or_reauthorization"
            elif seconds <= 86400 * 30:
                threshold = min((n for n in THRESHOLDS if seconds <= n * 86400), default=30)
                verdict, action = f"DUE_{threshold}D", "plan_authorized_rotation"
            else:
                verdict, action = "CURRENT", "no_action"
        elif review is not None:
            days = max(0, int((review - at).total_seconds() // 86400))
            verdict, action = (("REVIEW_DUE", "review_metadata") if review <= at else
                               ("REVIEW_SCHEDULED", "no_action"))
        else:
            verdict, action, days = "NOT_PROVEN", "obtain_provider_metadata", None
        # No unbounded provider data, raw errors, token bytes, or evidence payload.
        findings.append({"id": item["id"], "provider": item["provider"],
                         "verdict": verdict, "action": action, "days_remaining": days,
                         "evidence_status": "PROVIDER_OBSERVED" if obs else "REPOSITORY_ONLY"})
    return findings


def build_report(findings: list[dict], at: datetime) -> dict:
    counts = Counter(item["verdict"] for item in findings)
    status = ("BLOCKED" if counts["EXPIRED"] else
              "NOT_PROVEN" if counts["NOT_PROVEN"] else
              "REVIEW_REQUIRED" if any(k.startswith("DUE_") or k == "REVIEW_DUE" for k in counts) else
              "VERIFIED")
    return {"schema": SCHEMA, "generated_at": iso_utc(at),
            "status": status, "counts": dict(sorted(counts.items())),
            "credentials": findings, "scope": "metadata_only_no_provider_actions"}


def evaluate_offline(raw_inventory: object, raw_observations: object = None,
                     at: datetime | None = None) -> dict:
    at = at or datetime.now(timezone.utc)
    if at.tzinfo is None or at.utcoffset().total_seconds() != 0:
        raise ValueError("evaluation time must be UTC")
    records = validate_inventory(raw_inventory)
    observations = validate_observations(raw_observations, records, at)
    return build_report(evaluate(records, observations, at), at)


def build_graph(raw_inventory: object, raw_observations: object = None,
                at: datetime | None = None):
    """Real LangGraph state machine, deliberately without any mutation nodes."""
    from langgraph.graph import START, END, StateGraph
    instant = at or datetime.now(timezone.utc)
    if instant.tzinfo is None or instant.utcoffset().total_seconds() != 0:
        raise ValueError("evaluation time must be UTC")

    def inventory_node(state: LifecycleState) -> LifecycleState:
        records = validate_inventory(raw_inventory)
        validate_observations(raw_observations, records, instant)
        return {"phase": "INVENTORIED", "records": records, "history": ["INVENTORIED"]}

    def evaluate_node(state: LifecycleState) -> LifecycleState:
        observations = validate_observations(raw_observations, state["records"], instant)
        return {"phase": "EVALUATED", "findings": evaluate(state["records"], observations, instant),
                "history": [*state["history"], "EVALUATED"]}

    def evidence_node(state: LifecycleState) -> LifecycleState:
        report = build_report(state["findings"], instant)
        return {"phase": "EVIDENCED", "report": report,
                "history": [*state["history"], report["status"], "EVIDENCED"]}

    builder = StateGraph(LifecycleState)
    builder.add_node("inventory", inventory_node)
    builder.add_node("evaluate", evaluate_node)
    builder.add_node("evidence", evidence_node)
    builder.add_edge(START, "inventory")
    builder.add_edge("inventory", "evaluate")
    builder.add_edge("evaluate", "evidence")
    builder.add_edge("evidence", END)
    return builder.compile()


def read_limited(path: str) -> object:
    try:
        file = Path(path)
        if not file.is_file() or file.stat().st_size > 65536:
            raise ValueError("invalid metadata file")
        return json.loads(file.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError("cannot read valid metadata document") from None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Offline credential lifecycle metadata audit")
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--observations", help="Optional trusted, metadata-only provider readback JSON")
    parser.add_argument("--at", help="UTC timestamp for deterministic evaluation")
    args = parser.parse_args(argv)
    try:
        at = parse_utc(args.at) if args.at else datetime.now(timezone.utc)
        raw = read_limited(args.inventory)
        observations = read_limited(args.observations) if args.observations else None
        result = build_graph(raw, observations, at).invoke({})
        print(json.dumps(result["report"], sort_keys=True, separators=(",", ":")))
        return 0
    except (ValueError, TypeError, ImportError):
        print(json.dumps({"schema": SCHEMA, "status": "BLOCKED", "error": "INVALID_METADATA_OR_RUNTIME"}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())