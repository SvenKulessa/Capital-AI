#!/usr/bin/env python3
"""Owner-run AcodeX/Alpine session audit; no secrets or automatic startup edits."""
import argparse
import json
import os
import re
import ssl
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

CA = Path("/etc/ssl/certs/ca-certificates.crt")
SAFE_PATH = "/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin"
UNSAFE_ENV = frozenset(("GIT_SSL_NO_VERIFY", "RCLONE_NO_CHECK_CERTIFICATE",
                       "SSL_CERT_FILE", "SSL_CERT_DIR", "CURL_CA_BUNDLE",
                       "REQUESTS_CA_BUNDLE", "GIT_SSL_CAINFO", "GIT_SSL_CAPATH",
                       "RCLONE_CA_CERT", "SSLKEYLOGFILE", "NODE_TLS_REJECT_UNAUTHORIZED",
                       "ENV", "BASH_ENV", "PROMPT_COMMAND", "PS4", "SHELLOPTS",
                       "BASHOPTS", "GCONV_PATH", "LOCPATH"))
UNSAFE_PREFIXES = ("LD_", "DYLD_", "PYTHON", "OPENSSL_", "BASH_FUNC_")
PROXY_ENV = frozenset(("http_proxy", "https_proxy", "no_proxy", "all_proxy",
                       "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "ALL_PROXY"))


def clean_environment(source):
    # The explicit interactive session keeps its normal user context, but
    # never forwards the known interpreter/loader/TLS override variables.
    env = {key: value for key, value in source.items()
           if key not in UNSAFE_ENV and not key.startswith(UNSAFE_PREFIXES)}
    env["PATH"] = SAFE_PATH
    return env


def package_environment(source):
    # Package commands do not need GitHub, cloud, or shell credentials.
    # Preserve configured proxies to avoid silently changing network routes.
    env = {key: value for key, value in source.items() if key in PROXY_ENV}
    env.update(PATH=SAFE_PATH, LC_ALL="C")
    return env


def environment_selftest():
    sample = {key: "synthetic" for key in (*UNSAFE_ENV, "LD_PRELOAD",
              "DYLD_INSERT_LIBRARIES", "PYTHONPATH", "PYTHONHTTPSVERIFY",
              "OPENSSL_CONF", "BASH_FUNC_demo%%", "GH_TOKEN", "GITHUB_TOKEN",
              "GOOGLE_APPLICATION_CREDENTIALS", "AWS_SECRET_ACCESS_KEY", "HOME")}
    sample.update(PATH="/untrusted", https_proxy="http://example.invalid:8080")
    clean = clean_environment(sample)
    if any(key in clean for key in sample if key in UNSAFE_ENV
           or key.startswith(UNSAFE_PREFIXES)) or clean.get("PATH") != SAFE_PATH:
        raise AssertionError("SESSION_ENV_POLICY_REGRESSION")
    package = package_environment(sample)
    if package != {"PATH": SAFE_PATH, "LC_ALL": "C",
                   "https_proxy": sample["https_proxy"]}:
        raise AssertionError("PACKAGE_ENV_POLICY_REGRESSION")
    if clean.get("HOME") != sample["HOME"]:
        raise AssertionError("SESSION_HOME_REGRESSION")


CLEAN = clean_environment(os.environ)
APK_ENV = package_environment(os.environ)

def run(args, timeout=60):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout,
                          env=APK_ENV, check=False)

def release_branch():
    release = Path("/etc/alpine-release").read_text().strip()
    if not re.fullmatch(r"3\.[0-9]+\.[0-9]+", release):
        raise ValueError("UNSUPPORTED_ALPINE_RELEASE")
    return "v" + ".".join(release.split(".")[:2])

def install_ca(branch):
    # Restrict this operation to the current stable release, official HTTPS
    # repository, and apk's default package-signature verification.
    local = Path("/usr/local/share/ca-certificates")
    if local.exists() and any(local.rglob("*.crt")):
        raise ValueError("CUSTOM_CA_PRESENT_REVIEW_REQUIRED")
    with tempfile.TemporaryDirectory(prefix="acodex-ca-") as tmp:
        repos = Path(tmp) / "repositories"
        repos.write_text("https://dl-cdn.alpinelinux.org/alpine/" + branch + "/main\n")
        result = run(["apk", "--repositories-file", str(repos), "add",
                      "--no-cache", "ca-certificates"], 180)
        if result.returncode:
            raise ValueError("CA_PACKAGE_INSTALL_FAILED")
    result = run(["update-ca-certificates"], 60)
    if result.returncode:
        raise ValueError("CA_REBUILD_FAILED")
    print("CA_PACKAGE_SETUP=SUCCESS")

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def tls_context():
    # create_default_context reads SSLKEYLOGFILE from the parent environment.
    # Use explicit client defaults and trust only the selected CA bundle.
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_verify_locations(cafile=str(CA))
    if (context.keylog_filename is not None or not context.check_hostname
            or context.verify_mode != ssl.CERT_REQUIRED):
        raise ValueError("TLS_CONTEXT_POLICY_VIOLATION")
    return context

def read_secdb(branch, repo):
    url = "https://secdb.alpinelinux.org/" + branch + "/" + repo + ".json"
    context = tls_context()
    opener = urllib.request.build_opener(NoRedirect(),
        urllib.request.HTTPSHandler(context=context))
    with opener.open(url, timeout=25) as response:
        if response.status != 200 or response.geturl() != url:
            raise ValueError("SECDB_HTTP_FAILED")
        payload = response.read(16 * 1024 * 1024 + 1)
    if len(payload) > 16 * 1024 * 1024:
        raise ValueError("SECDB_TOO_LARGE")
    data = json.loads(payload)
    if data.get("distroversion") != branch or data.get("reponame") != repo:
        raise ValueError("SECDB_BRANCH_MISMATCH")
    if not isinstance(data.get("packages"), list) or not data["packages"]:
        raise ValueError("SECDB_EMPTY")
    return data["packages"]

def index_fixes(entries):
    fixes = {}
    for entry in entries:
        pkg = entry["pkg"]
        name = pkg["name"]
        if not isinstance(name, str) or not isinstance(pkg["secfixes"], dict):
            raise ValueError("SECDB_SCHEMA")
        for version, ids in pkg["secfixes"].items():
            if not isinstance(ids, list):
                raise ValueError("SECDB_SCHEMA")
            for cve in ids:
                if isinstance(cve, str) and re.fullmatch(r"CVE-[0-9]{4}-[0-9]{4,}", cve):
                    fixes.setdefault(name, {}).setdefault(cve, set()).add(version)
    return fixes

def older(a, b):
    result = run(["apk", "version", "-t", a, b], 10)
    cmp = result.stdout.strip()
    if result.returncode or cmp not in ("<", "=", ">"):
        raise ValueError("APK_VERSION_COMPARE_FAILED")
    return cmp == "<"

def assess(inventory, fixes, compare=older):
    findings, unmatched = set(), 0
    for pkg in inventory:
        name, version, origin = (pkg.get(k) for k in ("name", "version", "origin"))
        if not all(isinstance(v, str) and re.fullmatch(r"[A-Za-z0-9_.+~-]+", v)
                   and not v.startswith("-") for v in (name, version, origin)):
            raise ValueError("APK_INVENTORY_SCHEMA")
        if origin not in fixes:
            unmatched += 1
            continue
        for cve, versions in fixes[origin].items():
            if all(compare(version, fix) for fix in versions):
                findings.add((name, version, cve, ",".join(sorted(versions))))
    return sorted(findings), unmatched

def scan(branch):
    result = run(["apk", "query", "--installed", "--fields",
                  "name,version,origin", "--format", "json", "*"])
    if result.returncode:
        raise ValueError("APK_QUERY_FAILED")
    inventory = json.loads(result.stdout)
    if not isinstance(inventory, list) or not inventory:
        raise ValueError("APK_INVENTORY_UNAVAILABLE")
    fixes = index_fixes(read_secdb(branch, "main") + read_secdb(branch, "community"))
    findings, unmatched = assess(inventory, fixes)
    print("SECDB_TLS=VERIFIED")
    print("PACKAGES_SCANNED=" + str(len(inventory)))
    print("PACKAGES_WITHOUT_SECDB_MATCH=" + str(unmatched))
    print("CVE_CANDIDATES=" + str(len(findings)))
    for row in findings:
        print("CVE_CANDIDATE=" + "|".join(row))
    print("SCOPE=ALPINE_RECORDED_FIXES_ONLY_NOT_FULL_CVE_OR_MALWARE_SCAN")
    return 2 if findings else 0

def session():
    if not CA.is_file():
        raise ValueError("CA_BUNDLE_MISSING")
    tls_context()
    env = dict(CLEAN, SSL_CERT_FILE=str(CA), CURL_CA_BUNDLE=str(CA),
               REQUESTS_CA_BUNDLE=str(CA), GIT_SSL_CAINFO=str(CA),
               HISTFILE="/dev/null", HISTSIZE="0")
    for key in ("ENV", "BASH_ENV", "PROMPT_COMMAND", "PS4"):
        env.pop(key, None)
    print("SESSION=NEW_CHILD_SHELL; UMASK=0077; HISTORY=DISABLED", flush=True)
    os.execve("/bin/sh", ["sh", "-i"], env)

def selftest():
    environment_selftest()
    print("ENVIRONMENT_SELFTEST=PASS")
    from unittest.mock import patch
    with tempfile.TemporaryDirectory(prefix="acodex-tls-test-") as tmp:
        keylog = Path(tmp) / "keys.log"
        with patch.dict(os.environ, {"SSLKEYLOGFILE": str(keylog)}), \
                patch.object(ssl.SSLContext, "load_verify_locations") as load:
            context = tls_context()
            load.assert_called_once_with(cafile=str(CA))
            if (context.keylog_filename is not None or keylog.exists()
                    or not context.check_hostname
                    or context.verify_mode != ssl.CERT_REQUIRED
                    or context.minimum_version != ssl.TLSVersion.TLSv1_2):
                raise AssertionError("TLS_KEYLOG_OR_VERIFICATION_REGRESSION")
    fixes = index_fixes([{"pkg": {"name": "demo", "secfixes":
                         {"2": ["CVE-2026-1234"]}}}])
    inventory = [{"name": "demo-sub", "version": "1", "origin": "demo"}]
    assert assess(inventory, fixes, lambda a,b: int(a)<int(b))[0]
    inventory[0]["version"] = "2"
    assert not assess(inventory, fixes, lambda a,b: int(a)<int(b))[0]
    assert assess([{"name":"other","version":"1","origin":"other"}], fixes)[1] == 1
    try:
        assess([{"name":"-bad","version":"1","origin":"demo"}], fixes)
    except ValueError:
        pass
    else:
        raise AssertionError("invalid package accepted")
    print("SELFTEST=PASS")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install-ca", action="store_true",
                        help="explicitly install/rebuild Alpine CA trust")
    parser.add_argument("--session", action="store_true",
                        help="start hardened interactive child shell; no acopy")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    os.umask(0o077)
    if args.self_test:
        selftest()
        return 0
    try:
        branch = release_branch()
        print("ALPINE_BRANCH=" + branch)
        print("HOME_PRIVACY=NOT_PROVEN")
        if args.install_ca:
            install_ca(branch)
        if args.session:
            session()
        if not CA.is_file():
            raise ValueError("CA_BUNDLE_MISSING")
        tls_context()
        print("CA_BUNDLE=LOADABLE")
        audit = run(["apk", "audit", "--system"], 120)
        print("APK_AUDIT_EXIT=" + str(audit.returncode))
        print("APK_AUDIT_OUTPUT_LINES=" + str(len(audit.stdout.splitlines())))
        print("APK_AUDIT_CONTENT_NOT_CLASSIFIED")
        status = scan(branch)
        return 1 if audit.returncode else status
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        # No raw exception details (provider URLs, credentials, paths).
        print("SCAN_OR_SETUP=NOT_PROVEN; CHECK_CA_APK_NETWORK_OR_SCHEMA")
        return 1

if __name__ == "__main__":
    sys.exit(main())
