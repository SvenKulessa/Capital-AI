"""Opt-in, offline provider metadata readback evaluation. No network or writes."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json

from credential_lifecycle import build_graph, parse_utc, read_limited, SCHEMA
from provider_metadata import adapt_provider_readbacks


def main(argv=None):
    parser = argparse.ArgumentParser(description="Offline metadata-only provider credential audit")
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--readbacks", required=True)
    parser.add_argument("--at", help="canonical UTC time for deterministic tests")
    args = parser.parse_args(argv)
    try:
        now = parse_utc(args.at) if args.at else datetime.now(timezone.utc)
        inventory = read_limited(args.inventory)
        observations, checks = adapt_provider_readbacks(read_limited(args.readbacks), inventory, now)
        output = build_graph(inventory, observations, now).invoke({})["report"]
        output["provider_checks"] = checks
        # Do not print provider payloads, exception texts, raw errors or tokens.
        print(json.dumps(output, sort_keys=True, separators=(",", ":")))
        return 0
    except (ValueError, TypeError, ImportError, KeyError):
        print(json.dumps({"schema": SCHEMA, "status": "BLOCKED", "error": "INVALID_PROVIDER_METADATA"}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())