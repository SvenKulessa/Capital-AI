"""Bounded Acode observations, never trusted CI or executable remediation.

Local owner-operated handoff only. No network, new persistence or scheduler.
"""
import hashlib
import json
import os
import re
import stat
from collections import Counter
from pathlib import Path

SCHEMA = "ACODE_SMARTCOPY_FAILURE@1"
PROVIDERS = frozenset(("supabase","render","gcloud","drive","web-backend","acodex","github"))
CATEGORIES = frozenset(("HEALTH_NOT_PROVEN","OAUTH_ACCESS","GUARD_REJECTED","STARTUP_PULL_MISSING",
                        "ACCESS_DENIED","RATE_LIMIT","TIMEOUT","UNCLASSIFIED_NONZERO"))
FLAGS = frozenset(("LANGGRAPH","RAG","GROWTH_INTELLIGENCE"))
REQUIRED = frozenset(("schema","event_id","provider","category","exit_code","fingerprint",
                      "status","features","automatic_upload","repair_authority"))
MAX_BYTES = 131072
MAX_EVENTS = 128


def validate_event(event):
    if not isinstance(event, dict) or set(event) not in (REQUIRED, REQUIRED | {"offline_task"}):
        raise ValueError("ACOPY_EVENT_FIELDS_INVALID")
    provider, category, rc = event["provider"], event["category"], event["exit_code"]
    if (event["schema"] != SCHEMA or not isinstance(provider,str) or provider not in PROVIDERS
            or not isinstance(category,str) or category not in CATEGORIES
            or type(rc) is not int or not 1 <= rc <= 255
            or not isinstance(event["event_id"],str) or not re.fullmatch(r"[0-9a-f]{32}",event["event_id"])
            or event["status"] != "OBSERVED_UNTRUSTED"
            or event["automatic_upload"] is not False or event["repair_authority"] is not False):
        raise ValueError("ACOPY_EVENT_INVALID")
    if (category == "HEALTH_NOT_PROVEN" and (provider != "acodex" or rc != 2)
            or category == "OAUTH_ACCESS" and provider not in ("drive","acodex","gcloud")
            or category == "GUARD_REJECTED" and provider not in ("drive","acodex")
            or category == "STARTUP_PULL_MISSING" and provider != "acodex"):
        raise ValueError("ACOPY_CATEGORY_SCOPE_INVALID")
    flags = event["features"]
    if not isinstance(flags,dict) or set(flags) != FLAGS or any(type(v) is not bool for v in flags.values()) or not any(flags.values()):
        raise ValueError("ACOPY_FEATURES_INVALID")
    digest = hashlib.sha256(json.dumps([SCHEMA,provider,category,rc],separators=(",",":")).encode()).hexdigest()
    if event["fingerprint"] != digest:
        raise ValueError("ACOPY_FINGERPRINT_MISMATCH")
    # Do not trust caller-supplied text, even from the plugin.
    task = None
    if flags["LANGGRAPH"] and flags["RAG"] and category != "HEALTH_NOT_PROVEN":
        task = {"schema":"CAPITAL_AI_OFFLINE_RESEARCH@1","task_id":"acopy-"+event["event_id"],
                "domain":"PLATFORM","query":f"Review {provider} {category} exit {rc} using existing repository playbooks. Proposal only."}
    if (task is None and "offline_task" in event or task is not None and event.get("offline_task") != task):
        raise ValueError("ACOPY_TASK_MISMATCH")
    return task


def research_task(event):
    task = validate_event(event)
    if task is None:
        raise ValueError("ACOPY_RESEARCH_NOT_REQUESTED")
    return task


def summarize(events):
    """Count distinct observations; recurrence is not proof of a cause or repair."""
    if not isinstance(events,list) or len(events)>MAX_EVENTS:
        raise ValueError("ACOPY_BATCH_INVALID")
    seen = {}
    counts = Counter()
    pending = 0
    for event in events:
        validate_event(event)
        event_id = event["event_id"]
        if event_id in seen:
            if seen[event_id] != event:
                raise ValueError("ACOPY_EVENT_ID_CONFLICT")
            continue
        seen[event_id] = event
        if not event["features"]["GROWTH_INTELLIGENCE"]:
            continue
        if event["category"] == "HEALTH_NOT_PROVEN":
            pending += 1
            continue
        counts[(event["provider"],event["category"],event["exit_code"],event["fingerprint"])] += 1
    return {"status":"OBSERVATIONS_ONLY" if seen else "NOT_PROVEN",
            "uniqueEvents":len(seen),"healthNotProven":pending,
            "patterns":[{"provider":p,"category":c,"exitCode":rc,"fingerprint":fp,
                         "count":count,"recurring":count>1}
                        for (p,c,rc,fp),count in sorted(counts.items())],
            "verifiedSolutions":0,"automaticWrites":False,"providerCalls":0}


def read_private_batch(path):
    """Explicit owner-supplied private file, no symlinks, bounded read."""
    path = Path(path)
    if any(p.is_symlink() for p in (path,*path.parents)):
        raise ValueError("ACOPY_BATCH_SYMLINK")
    fd = os.open(path,os.O_RDONLY | os.O_NONBLOCK | getattr(os,"O_NOFOLLOW",0))
    with os.fdopen(fd,"rb") as stream:
        st = os.fstat(stream.fileno())
        if (not stat.S_ISREG(st.st_mode) or st.st_uid != os.geteuid()
                or stat.S_IMODE(st.st_mode) != 0o600 or st.st_size>MAX_BYTES):
            raise ValueError("ACOPY_BATCH_NOT_PRIVATE")
        raw = stream.read(MAX_BYTES+1)
    if len(raw)>MAX_BYTES:
        raise ValueError("ACOPY_BATCH_OVERSIZE")
    return summarize(json.loads(raw))

def review_summary(value):
    """Only bounded metadata may cross the existing Growth plan boundary."""
    empty={"status":"NOT_PROVEN","patterns":[],"verifiedSolutions":0,"automaticWrites":False,"providerCalls":0}
    blocked={**empty,"status":"BLOCKED"}
    if value is None:
        return empty
    if value == blocked:
        return blocked
    if (not isinstance(value,dict) or set(value)!={"status","uniqueEvents","healthNotProven","patterns","verifiedSolutions","automaticWrites","providerCalls"}
            or value["status"] not in ("OBSERVATIONS_ONLY","NOT_PROVEN")
            or type(value["uniqueEvents"]) is not int or not 0 <= value["uniqueEvents"] <= MAX_EVENTS
            or type(value["healthNotProven"]) is not int or not 0 <= value["healthNotProven"] <= value["uniqueEvents"]
            or value["verifiedSolutions"] != 0 or value["providerCalls"] != 0 or value["automaticWrites"] is not False
            or not isinstance(value["patterns"],list) or len(value["patterns"])>MAX_EVENTS
            or (value["status"]=="OBSERVATIONS_ONLY") != (value["uniqueEvents"]>0)):
        return blocked
    patterns=[]
    seen=set()
    total=value["healthNotProven"]
    for row in value["patterns"]:
        if not isinstance(row,dict) or set(row)!={"provider","category","exitCode","fingerprint","count","recurring"}:
            return blocked
        p,c,rc,n=row["provider"],row["category"],row["exitCode"],row["count"]
        if (not isinstance(p,str) or p not in PROVIDERS or not isinstance(c,str) or c not in CATEGORIES or c=="HEALTH_NOT_PROVEN"
                or type(rc) is not int or not 1<=rc<=255 or type(n) is not int or not 1<=n<=MAX_EVENTS
                or row["recurring"] is not (n>1)):
            return blocked
        digest=hashlib.sha256(json.dumps([SCHEMA,p,c,rc],separators=(",",":")).encode()).hexdigest()
        if row["fingerprint"]!=digest or digest in seen:
            return blocked
        seen.add(digest)
        total+=n
        patterns.append({"provider":p,"category":c,"exitCode":rc,"fingerprint":digest,"count":n,"recurring":n>1})
    if total>value["uniqueEvents"]:
        return blocked
    return {"status":value["status"],"uniqueEvents":value["uniqueEvents"],"healthNotProven":value["healthNotProven"],
            "patterns":patterns,"verifiedSolutions":0,"automaticWrites":False,"providerCalls":0}
