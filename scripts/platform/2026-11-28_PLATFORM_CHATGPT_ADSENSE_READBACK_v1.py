"""Bounded AdSense GET diagnosis using existing gcloud user credentials.

No credential files, login, API activation, writes, payments, or ad serving.
Only target-site metadata is printed. Never print upstream error bodies.
"""
import hashlib
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TARGET = "capital-ai.online"


class Blocked(Exception):
    pass


def cli(*args):
    binary = shutil.which("gcloud")
    if not binary:
        raise Blocked("GCLOUD_EXECUTABLE_NOT_FOUND")
    env = dict(os.environ)
    for key in ("SSLKEYLOGFILE", "LD_PRELOAD", "LD_LIBRARY_PATH", "PYTHONPATH",
                "PYTHONHOME", "OPENSSL_CONF", "BASH_ENV", "ENV", "NODE_OPTIONS"):
        env.pop(key, None)
    try:
        result = subprocess.run([binary, *args, "--quiet"], env=env,
                                capture_output=True, timeout=40, check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise Blocked("GCLOUD_EXECUTION_FAILED") from None
    if result.returncode:
        raise Blocked("GCLOUD_EXISTING_AUTH_UNAVAILABLE")
    if len(result.stdout) > 16384:
        raise Blocked("GCLOUD_RESPONSE_LIMIT")
    return result.stdout.decode("utf-8").strip()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise Blocked("PROVIDER_REDIRECT_REJECTED")


def http_get(opener, token, path, params):
    url = "https://adsense.googleapis.com/v2/" + path
    url += "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"Authorization": "Bearer " + token,
                                                  "Accept": "application/json"}, method="GET")
    try:
        with opener.open(request, timeout=25) as response:
            data = response.read(1048577)
    except urllib.error.HTTPError as error:
        body = error.read(65536)
        try:
            details = json.loads(body).get("error", {}).get("details", [])
            reasons = {item.get("reason") for item in details if isinstance(item, dict)}
        except (ValueError, AttributeError, TypeError):
            reasons = set()
        for reason in ("ACCESS_TOKEN_SCOPE_INSUFFICIENT", "SERVICE_DISABLED", "CONSUMER_INVALID"):
            if reason in reasons:
                raise Blocked(reason) from None
        raise Blocked("ADSENSE_HTTP_" + str(error.code)) from None
    if len(data) > 1048576:
        raise Blocked("PROVIDER_RESPONSE_LIMIT")
    result = json.loads(data)
    if not isinstance(result, dict):
        raise Blocked("PROVIDER_SCHEMA_INVALID")
    return result


def listing(get, path, field):
    rows, page, seen = [], None, set()
    for _ in range(5):
        params = {"pageSize": 50}
        if page:
            params["pageToken"] = page
        response = get(path, params)
        batch = response.get(field, [])
        if not isinstance(batch, list) or not all(isinstance(x, dict) for x in batch):
            raise Blocked("PROVIDER_SCHEMA_INVALID")
        rows.extend(batch)
        page = response.get("nextPageToken")
        if not page:
            return rows
        if not isinstance(page, str) or len(page) > 4096 or page in seen:
            raise Blocked("PAGINATION_INVALID")
        seen.add(page)
    raise Blocked("PAGINATION_LIMIT_NO_COMPLETE_READBACK")


def diagnose(get):
    accounts = listing(get, "accounts", "accounts")
    if len(accounts) > 10:
        raise Blocked("ACCOUNT_SCAN_LIMIT")
    matches = []
    for account in accounts:
        name = account.get("name", "")
        if not isinstance(name, str) or not re.fullmatch(r"accounts/pub-[0-9]+", name):
            raise Blocked("ACCOUNT_RESOURCE_INVALID")
        for site in listing(get, name + "/sites", "sites"):
            if site.get("domain") == TARGET:
                matches.append((account, site))
    if len(matches) != 1:
        raise Blocked("TARGET_SITE_NOT_FOUND" if not matches else "TARGET_SITE_AMBIGUOUS")
    account, site = matches[0]
    state = site.get("state", "STATE_UNSPECIFIED")
    account_state = account.get("state", "STATE_UNSPECIFIED")
    if state not in {"STATE_UNSPECIFIED", "REQUIRES_REVIEW", "GETTING_READY", "READY", "NEEDS_ATTENTION"}:
        raise Blocked("SITE_STATE_INVALID")
    if account_state not in {"STATE_UNSPECIFIED", "READY", "NEEDS_ATTENTION", "CLOSED"}:
        raise Blocked("ACCOUNT_STATE_INVALID")
    print("ADSENSE_TARGET_READBACK=VERIFIED")
    print("ADSENSE_ACCOUNT_STATE=" + account_state)
    print("ADSENSE_SITE_STATE=" + state)
    print("ADSENSE_AUTO_ADS=" + ("ENABLED" if site.get("autoAdsEnabled") is True else "DISABLED_OR_UNREPORTED"))
    print("ADSENSE_PUBLISHER_ID=" + "ca-" + account["name"].split("/")[1])
    print("CMP_CONFIGURATION=NOT_PROVEN")
    print("AD_SERVING_ACTIVATION=NOT_PERFORMED")
    return 0


def main():
    print("SCRIPT_SHA256=" + hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    print("PROVIDER_WRITE=DISABLED")
    print("LOGIN=DISABLED")
    try:
        account = cli("config", "get-value", "account")
        if not account or account == "(unset)" or account.endswith(".gserviceaccount.com"):
            raise Blocked("ADSENSE_USER_AUTH_REQUIRED_GA4_KEY_NOT_REUSED")
        print("GCLOUD_ACCOUNT_TYPE=USER_CONFIGURED_NOT_TOKEN_IDENTITY_PROOF")
        token = cli("auth", "print-access-token")
        if not token or len(token) > 16384 or re.search(r"\s", token):
            raise Blocked("ACCESS_TOKEN_INVALID")
        os.environ.pop("SSLKEYLOGFILE", None)
        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(),
                                            urllib.request.HTTPSHandler(context=context))
        return diagnose(lambda path, params: http_get(opener, token, path, params))
    except Blocked as error:
        print("ADSENSE_READBACK=BLOCKED")
        print("BLOCKER=" + str(error))
        return 1
    except Exception as error:
        print("ADSENSE_READBACK=BLOCKED")
        print("ERROR_TYPE=" + type(error).__name__)
        return 1


if __name__ == "__main__":
    code = main()
    print("EXIT_CODE=" + str(code))
    sys.exit(code)
