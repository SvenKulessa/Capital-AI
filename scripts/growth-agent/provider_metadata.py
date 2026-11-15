"""Fail-closed provider metadata adapters for the offline credential lifecycle.

Inputs are *pre-minimized, metadata-only* authenticated-provider readbacks supplied
by a trusted caller. This module performs no HTTP, SQL, authentication, OAuth,
credential refresh, writes, logging or scheduling. It cannot authenticate the
caller or turn a supplied JSON document into verified provider provenance.
"""
from __future__ import annotations

from datetime import datetime, timezone
import re

SCHEMA = "capital-ai.provider-readback.v1"
LIFECYCLE_SCHEMA = "capital-ai.credential-lifecycle.v1"
# Exact tenant/resource bindings, never accept arbitrary project/account IDs.
BINDINGS = {
    "supabase": ("project:ryzywoktpmyhwzxmstyu", "social_expiry_aggregate"),
    "render": ("workspace:tea-d90o4rj7uimc739i86ug", "service_registry_metadata"),
    "stripe": ("account:acct_1TbfHJPKr4joNbEc", "webhook_endpoint_metadata"),
    "google": ("project:aifinancial-500208", "service_account_key_metadata"),
    "github": ("repo:SvenKulessa/Capital-AI", "actions_secret_metadata"),
}
SOCIAL_IDS = {"x": "x_owner_oauth", "youtube": "youtube_owner_oauth"}
UTC = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z\Z")
GITHUB_NAME = re.compile(r"[A-Z][A-Z0-9_]{0,79}\Z")
ENDPOINT_ID = re.compile(r"we_[A-Za-z0-9]{12,64}\Z")


def _utc(value):
    if not isinstance(value, str) or not UTC.fullmatch(value):
        raise ValueError("invalid canonical metadata timestamp")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("invalid metadata timestamp") from None


def _fields(obj, expected):
    # Check keys before touching values: an unexpected key could contain a
    # private token, signing secret, HTTP body, or credential JSON.
    if not isinstance(obj, dict) or set(obj) != set(expected):
        raise ValueError("unsupported provider metadata fields")


def _bounded_count(value):
    if type(value) is not int or not 0 <= value <= 10000:
        raise ValueError("invalid metadata count")
    return value


def _bound_timestamp(value, observed):
    if value is not None:
        dt = _utc(value)
        if dt.year < 2020 or dt.year > 2100:
            raise ValueError("unsupported metadata date")
        return dt
    return None


def _supabase(records, observed):
    seen = set()
    observations = []
    for record in records:
        _fields(record, ("platform", "status", "account_count", "nearest_expiry", "owner_bound"))
        platform = record["platform"]
        if not isinstance(platform, str) or platform not in SOCIAL_IDS or platform in seen:
            raise ValueError("unexpected social metadata scope")
        seen.add(platform)
        if type(record["owner_bound"]) is not bool:
            raise ValueError("owner binding is not a boolean")
        count = _bounded_count(record["account_count"])
        expiry = record["nearest_expiry"]
        _bound_timestamp(expiry, observed)
        if record["status"] not in ("connected", "disconnected"):
            raise ValueError("invalid social metadata state")
        if count == 0 and expiry is not None:
            raise ValueError("expiry without matching account")
        # A project-wide single row is NOT an owner identity proof. The
        # trusted collector must explicitly bind a restricted aggregate to
        # the authenticated owner before marking owner_bound=true. This
        # boolean is still NOT provider authentication or an attestation.
        if (record["owner_bound"] is True and count == 1
                and record["status"] == "connected" and expiry is not None):
            observations.append({
                "id": SOCIAL_IDS[platform], "expires_at": expiry,
                "observed_at": observed, "evidence_ref": "provider:supabase-social-expiry",
            })
    return observations, "EXPIRY_METADATA_PRESENT" if observations else "EXPIRY_NOT_PROVEN"


def _render(records, observed):
    if len(records) != 1:
        raise ValueError("unexpected render service cardinality")
    record = records[0]
    _fields(record, ("service_id", "registry_credential_present", "registry_updated_at"))
    if record["service_id"] != "srv-dau1rp893c1s73cdhm1g" or type(record["registry_credential_present"]) is not bool:
        raise ValueError("unexpected render service binding")
    _bound_timestamp(record["registry_updated_at"], observed)
    if not record["registry_credential_present"] and record["registry_updated_at"] is not None:
        raise ValueError("invalid registry metadata")
    return [], "EXPIRY_NOT_EXPOSED"


def _stripe(records, observed):
    seen = set()
    for record in records:
        _fields(record, ("endpoint_id", "livemode", "status", "created_at"))
        identity = record["endpoint_id"]
        if not isinstance(identity, str) or not ENDPOINT_ID.fullmatch(identity) or identity in seen:
            raise ValueError("invalid stripe webhook identity")
        seen.add(identity)
        if type(record["livemode"]) is not bool or record["status"] not in ("enabled", "disabled"):
            raise ValueError("invalid stripe webhook metadata")
        _bound_timestamp(record["created_at"], observed)
    # Webhook endpoints are not signing-secret expiration evidence.
    return [], "EXPIRY_NOT_EXPOSED"


def _google(records, observed):
    if len(records) != 1:
        raise ValueError("unexpected google identity cardinality")
    record = records[0]
    _fields(record, ("service_account", "disabled", "user_managed_key_valid_before"))
    if record["service_account"] != "capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com" or type(record["disabled"]) is not bool:
        raise ValueError("unexpected google service account")
    keys = record["user_managed_key_valid_before"]
    if not isinstance(keys, list) or len(keys) > 20:
        raise ValueError("invalid google key metadata")
    for date in keys:
        _bound_timestamp(date, observed)
        if date is None:
            raise ValueError("invalid google key expiry")
    # There is NO proven key-ID binding to the legacy JSON in Render. Never
    # assign the validity of unrelated Google keys to that credential.
    return [], "UNBOUND_KEY_EXPIRY" if keys else "EXPIRY_NOT_EXPOSED"


def _github(records, observed):
    seen = set()
    for record in records:
        _fields(record, ("secret_name", "updated_at"))
        name = record["secret_name"]
        if not isinstance(name, str) or not GITHUB_NAME.fullmatch(name) or name in seen:
            raise ValueError("invalid github secret metadata")
        seen.add(name)
        _bound_timestamp(record["updated_at"], observed)
    # Actions secret updated_at is NOT its expiration, and PAT metadata
    # cannot be inferred from GitHub Actions secret names.
    return [], "EXPIRY_NOT_EXPOSED"


ADAPTERS = {"supabase": _supabase, "render": _render, "stripe": _stripe,
            "google": _google, "github": _github}


def adapt_provider_readbacks(document: object, inventory: object, at: datetime) -> tuple[dict, list[dict]]:
    """Validate pinned source identities and adapt only allowable expiry fields.

    All checks report `INPUT_VALIDATED_NOT_ATTESTED`: authenticated provenance
    remains an independent caller/provider obligation, never a JSON assertion.
    """
    _fields(document, ("schema", "readbacks"))
    if document["schema"] != SCHEMA or not isinstance(document["readbacks"], list) or len(document["readbacks"]) > 5:
        raise ValueError("invalid provider document")
    if at.tzinfo is None or at.utcoffset().total_seconds() != 0:
        raise ValueError("evaluation time must be UTC")
    if not isinstance(inventory, dict) or inventory.get("schema") != LIFECYCLE_SCHEMA or not isinstance(inventory.get("credentials"), list):
        raise ValueError("invalid inventory binding")
    known = {c.get("id") for c in inventory["credentials"] if isinstance(c, dict)}
    seen = set()
    observations = []
    checks = []
    for item in document["readbacks"]:
        _fields(item, ("provider", "scope", "method", "observed_at", "records"))
        provider = item["provider"]
        if not isinstance(provider, str) or provider not in BINDINGS or provider in seen:
            raise ValueError("unknown or duplicate provider readback")
        seen.add(provider)
        scope, method = BINDINGS[provider]
        if item["scope"] != scope or item["method"] != method:
            raise ValueError("provider source identity mismatch")
        observed = _utc(item["observed_at"])
        if observed > at or (at - observed).total_seconds() > 86400:
            raise ValueError("stale or future provider readback")
        records = item["records"]
        if not isinstance(records, list) or len(records) > 100:
            raise ValueError("provider readback exceeds bounds")
        added, expiry_status = ADAPTERS[provider](records, item["observed_at"])
        if any(row["id"] not in known for row in added):
            raise ValueError("readback credential not in inventory")
        observations.extend(added)
        checks.append({"provider": provider, "metadata_status": expiry_status,
                       "provenance_status": "INPUT_VALIDATED_NOT_ATTESTED",
                       "record_count": len(records)})
    return {"schema": LIFECYCLE_SCHEMA, "observations": observations}, checks