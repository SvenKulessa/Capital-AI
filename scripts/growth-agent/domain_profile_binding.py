"""Read-only, fail-closed SOLO2 domain metadata for the existing offline graph.

Only hardcoded repository paths are read. Prompts and skill text are DATA,
never a permission, instruction, GitHub/Render adapter, or scheduling trigger.
The verified source digest is included in trusted checkpoint identity.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import re
import stat

from offline_scope import scoped_thread_id

DOMAINS = ("PRODUCT", "MARKET", "PLATFORM", "TRUST", "GROWTH")
REPOSITORY = "SvenKulessa/Capital-AI"
APP = ".agents/app.prompt.json"
REGISTRY = ".agents/skills/registry.json"
PROFILES = {domain: f"CAPITAL-AI-{domain}/domain.prompt.json" for domain in DOMAINS}
SOURCES = ("AGENTS.md", REGISTRY, APP, *PROFILES.values())
MAX_SOURCE_BYTES = 180_000
BIDI_CONTROLS = frozenset(("\u202a", "\u202b", "\u202c", "\u202d", "\u202e",
                           "\u2066", "\u2067", "\u2068", "\u2069", "\u200e",
                           "\u200f", "\u061c"))
SKILL_ID = re.compile(r"[a-z][a-z0-9-]{1,70}\Z", re.ASCII)


def _read_source(root: Path, relative: str) -> bytes:
    if relative not in SOURCES:
        raise ValueError("non-allowlisted domain source")
    segments = relative.split("/")
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(root, flags)
    try:
        for part in segments[:-1]:
            nextfd = os.open(part, flags, dir_fd=fd)
            os.close(fd)
            fd = nextfd
        name = segments[-1]
        before = os.stat(name, dir_fd=fd, follow_symlinks=False)
        if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_SOURCE_BYTES:
            raise ValueError("unsafe profile source")
        handle = os.open(name, os.O_RDONLY | os.O_NONBLOCK | getattr(os, "O_NOFOLLOW", 0),
                         dir_fd=fd)
        try:
            after = os.fstat(handle)
            if (not stat.S_ISREG(after.st_mode) or after.st_ino != before.st_ino
                    or after.st_dev != before.st_dev or after.st_size != before.st_size
                    or after.st_size > MAX_SOURCE_BYTES):
                raise ValueError("profile changed during read")
            raw = os.read(handle, MAX_SOURCE_BYTES + 1)
            if len(raw) != before.st_size or len(raw) > MAX_SOURCE_BYTES:
                raise ValueError("profile source size mismatch")
            return raw
        finally:
            os.close(handle)
    finally:
        os.close(fd)


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON property")
        result[key] = value
    return result


def _json(raw: bytes) -> dict:
    try:
        text = raw.decode("utf-8")
        if any(char in text for char in BIDI_CONTROLS) or "\x00" in text:
            raise ValueError("unsafe Unicode control in profile metadata")
        value = json.loads(text, object_pairs_hook=_unique_object,
                           parse_constant=lambda _: (_ for _ in ()).throw(ValueError("invalid number")))
    except (UnicodeError, ValueError) as exc:
        raise ValueError("invalid domain profile JSON") from exc
    if not isinstance(value, dict):
        raise ValueError("domain profile JSON must be object")
    return value


def _authority(value: object) -> bool:
    return (isinstance(value, dict)
            and value.get("source") == "AGENTS.md"
            and value.get("contract") == "SOLO_MAINTAINER_FLOW@2"
            and value.get("type") == "NON_AUTHORIZING_CONTEXT"
            and value.get("permissionExpansion") is False)


def load_domain_profiles(repo_root: Path) -> dict:
    """Return trustworthy *metadata only*, with a digest bound to all eight files.

    Missing, swapped, duplicate-key, widened-authority or mismatched sources
    fail closed before any LangGraph action or checkpoint resume.
    """
    root = Path(repo_root).resolve(strict=True)
    raw = {path: _read_source(root, path) for path in SOURCES}
    if b"SOLO_MAINTAINER_FLOW@2" not in raw["AGENTS.md"]:
        raise ValueError("root engineering contract not present")
    app, registry = _json(raw[APP]), _json(raw[REGISTRY])
    common = app.get("solo2DomainLoop")
    if (app.get("schema") != "CAPITAL_AI_APPLICATION_EXECUTION_PROMPT@1"
            or not _authority(app.get("authority"))
            or app.get("skillRegistry") != REGISTRY
            or app.get("domainPrompts") != PROFILES
            or not isinstance(common, dict)
            or common.get("schema") != "CAPITAL_AI_SOLO2_DOMAIN_LOOP@1"
            or common.get("kind") != "NON_AUTHORIZING_EXECUTION_PROFILE"
            or common.get("repository") != REPOSITORY
            or common.get("projectIsolation") != "STRICT"
            or common.get("authority") != "AGENTS.md"
            or common.get("contract") != "SOLO_MAINTAINER_FLOW@2"
            or common.get("domainRegistry") != REGISTRY
            or common.get("domainProfiles") != "domainPrompts"
            or common.get("orchestrator") != "scripts/growth-agent/auto_loop.py"
            or common.get("schedulerPolicy") != "REUSE_EXISTING_ONLY"
            or common.get("runtimeActivation") != "NOT_PROVEN"
            or common.get("permissionExpansion") is not False
            or not isinstance(common.get("claims"), dict)
            or not common["claims"]
            or any(flag is not False for flag in common["claims"].values())
            or not isinstance(common.get("orchestration"), dict)
            or common["orchestration"].get("writesSerialized") is not True
            or common["orchestration"].get("oneMutatingScopePerRepository") is not True):
        raise ValueError("untrusted application execution profile")
    if (registry.get("authority") != "AGENTS.md"
            or registry.get("contract") != "SOLO_MAINTAINER_FLOW@2"
            or not isinstance(registry.get("domains"), dict)
            or set(registry["domains"]) != set(DOMAINS)
            or registry.get("promptContracts", {}).get("domains") != PROFILES
            or registry["promptContracts"].get("authority") != "AGENTS.md"):
        raise ValueError("domain registry mismatch")
    selected = {}
    for domain in DOMAINS:
        candidate = _json(raw[PROFILES[domain]])
        route = candidate.get("solo2DomainLoop")
        skill = registry["domains"][domain]
        if (candidate.get("schema") != "CAPITAL_AI_DOMAIN_EXECUTION_PROMPT@1"
                or candidate.get("domain") != domain
                or candidate.get("projectFolder") != "CAPITAL-AI-" + domain
                or not _authority(candidate.get("authority"))
                or candidate.get("skillRegistry") != REGISTRY
                or candidate.get("engineeringSkill") != skill.get("engineering")
                or candidate.get("advisorySkill") != skill.get("advisory")
                or candidate.get("chatAgent") != skill.get("chatAgent")
                or not isinstance(route, dict)
                or route.get("profile") != common["schema"]
                or route.get("application") != APP
                or route.get("primaryDomain") != domain
                or route.get("linkedOrchestrator") != common["orchestrator"]
                or route.get("routeSkillsByRegistry") is not True
                or route.get("permissionExpansion") is not False
                or route.get("createsRequiredChecks") is not False
                or route.get("createsScheduler") is not False
                or route.get("serializedMutations") is not True
                or route.get("qualityIndependentPerspective") is not True
                or not all(isinstance(skill.get(k), str) and SKILL_ID.fullmatch(skill[k])
                           for k in ("engineering", "advisory"))):
            raise ValueError("domain route metadata mismatch")
        selected[domain] = {
            "profile_sha256": hashlib.sha256(raw[PROFILES[domain]]).hexdigest(),
            "skills": [skill["engineering"], skill["advisory"]],
        }
    digest = hashlib.sha256(b"CAPITAL_AI_SOLO2_DOMAIN_BUNDLE@1\x00")
    for path in SOURCES:
        digest.update(path.encode("ascii"))
        digest.update(b"\x00")
        digest.update(hashlib.sha256(raw[path]).digest())
    return {"bundle_sha256": digest.hexdigest(), "domains": selected,
            "permission_expansion": False, "provider_access": False}



@dataclass(frozen=True)
class BoundDomainTask:
    """Immutable source-bound identity; metadata only, never authority."""

    thread_id: str
    domain: str
    query: str
    bundle_sha256: str
    profile_sha256: str
    skills: tuple[str, str]

    def initial_state(self) -> dict:
        return {
            "task_id": self.thread_id,
            "domain": self.domain,
            "query": self.query,
            "bundle_sha256": self.bundle_sha256,
            "profile_sha256": self.profile_sha256,
            "profile_skills": list(self.skills),
            "attempts": 0,
            "history": [],
        }

    def matches_state(self, state: object) -> bool:
        return (
            isinstance(state, dict)
            and state.get("task_id") == self.thread_id
            and state.get("domain") == self.domain
            and state.get("query") == self.query
            and state.get("bundle_sha256") == self.bundle_sha256
            and state.get("profile_sha256") == self.profile_sha256
            and state.get("profile_skills") == list(self.skills)
        )


def bind_domain_task(repo_root: Path, *, tenant: str, repository: str,
                     task: object) -> BoundDomainTask:
    """Share the exact offline task/profile/checkpoint identity with both graphs.

    The trusted host supplies tenant/repository, never task JSON, prompts or
    retrieved content. This contract does NOT admit customer tenants or ONLINE
    execution and never returns credentials, callbacks or permissions.
    """
    if repository != REPOSITORY:
        raise ValueError("cross-repository domain task forbidden")
    if (type(task) is not dict or set(task) != {"schema", "task_id", "domain", "query"}
            or task.get("schema") != "CAPITAL_AI_OFFLINE_RESEARCH@1"
            or type(task.get("task_id")) is not str
            or re.fullmatch(r"[A-Za-z0-9._:-]{1,96}", task["task_id"], re.ASCII) is None
            or type(task.get("domain")) is not str or task["domain"] not in DOMAINS
            or type(task.get("query")) is not str
            or not 1 <= len(task["query"]) <= 300):
        raise ValueError("invalid offline domain task contract")
    bundle = load_domain_profiles(repo_root)
    metadata = bundle["domains"][task["domain"]]
    thread_id = scoped_thread_id(
        tenant=tenant, repository=repository, task_id=task["task_id"],
        payload={**task, "bundle_sha256": bundle["bundle_sha256"]},
    )
    return BoundDomainTask(
        thread_id=thread_id, domain=task["domain"], query=task["query"],
        bundle_sha256=bundle["bundle_sha256"],
        profile_sha256=metadata["profile_sha256"],
        skills=tuple(metadata["skills"]),
    )
