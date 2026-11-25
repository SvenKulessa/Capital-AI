"""Opt-in local OSS MCP entry points and bounded GitHub Quality diagnostic.
No automatic installs, cloud calls, browser fallbacks, or merge authority.
"""
import argparse
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPRedirectHandler, ProxyHandler

REPO = "SvenKulessa/Capital-AI"
API = "https://api.github.com/repos/" + REPO
SHA = re.compile(r"[0-9a-f]{40}\Z")
PINS = {"github": "2.3.0", "playwright": "0.0.86", "browser-use": "1.0.8"}
ORIGINS = "https://github.com;https://api.github.com;https://github.githubassets.com"
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

class ReadbackError(Exception):
    def __init__(self, status):
        self.status = status

def get_json(token, path):
    # Fixed paths only; no user supplied URLs, no redirects, bounded responses.
    if not re.fullmatch(r"/(?:pulls/[1-9][0-9]{0,5}|code-quality/findings\?state=open&per_page=100&page=(?:[1-9]|10))", path):
        raise ValueError("UNAPPROVED_PATH")
    opener = build_opener(ProxyHandler({}), NoRedirect)
    req = Request(API + path, headers={"Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10", "Authorization": "Bearer " + token,
        "User-Agent": "capital-ai-quality-readback"})
    try:
        with opener.open(req, timeout=15) as response:
            if response.status != 200 or "json" not in response.headers.get("Content-Type", "").lower():
                raise ReadbackError("INVALID_RESPONSE")
            content = response.read(1048577)
            if len(content) > 1048576:
                raise ReadbackError("RESPONSE_LIMIT")
            return json.loads(content)
    except HTTPError as exc:
        raise ReadbackError("HTTP_" + str(exc.code)) from None
    except (URLError, OSError, ValueError) as exc:
        raise ReadbackError("RESPONSE_NOT_PROVEN") from None

def quality_readback(pr, head, read):
    if type(pr) is not int or not 1 <= pr <= 999999 or not isinstance(head, str) or not SHA.fullmatch(head):
        raise ValueError("INVALID_SCOPE")
    result = {"schema": "CAI_CODE_QUALITY_READBACK@1", "repository": REPO, "pr": pr,
        "requestedHead": head, "scope": "REPOSITORY_FINDINGS_ONLY", "prQuality": "NOT_PROVEN",
        "status": "NOT_PROVEN"}
    def current():
        data = read("/pulls/" + str(pr))
        if not isinstance(data, dict):
            return False
        h = data.get("head") or {}
        return (data.get("number") == pr and h.get("sha") == head
                and (h.get("repo") or {}).get("full_name") == REPO)
    try:
        if not current():
            result["reason"] = "HEAD_OR_REPO_MISMATCH"
            return result
        counts = {"warning": 0, "error": 0, "other": 0}
        ids = set()
        for page in range(1, 11):
            data = read("/code-quality/findings?state=open&per_page=100&page=" + str(page))
            if not isinstance(data, list) or len(data) > 100:
                raise ReadbackError("INVALID_FINDINGS")
            for item in data:
                if not isinstance(item, dict) or type(item.get("number")) is not int or item["number"] <= 0 or item["number"] in ids or item.get("state") != "open" or not isinstance(item.get("rule"), dict):
                    raise ReadbackError("INVALID_FINDINGS")
                ids.add(item["number"])
                severity = item["rule"].get("severity")
                counts[severity if severity in ("warning", "error") else "other"] += 1
            if len(data) < 100:
                break
        else:
            raise ReadbackError("PAGE_LIMIT")
        if not current():
            raise ReadbackError("HEAD_OR_REPO_MISMATCH")
        result.update(status="REPOSITORY_READBACK_VERIFIED", counts=counts, findings=len(ids))
    except ReadbackError as exc:
        result["reason"] = exc.status
    return result

def gh_token():
    # Existing gh login only; never print token, never request a wider token.
    try:
        proc = subprocess.run(["gh", "auth", "token", "--hostname", "github.com"],
            capture_output=True, text=True, timeout=10, check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise ReadbackError("GH_AUTH_UNAVAILABLE") from None
    token = proc.stdout.strip()
    if proc.returncode or not token or len(token) > 4096 or any(c.isspace() for c in token):
        raise ReadbackError("GH_AUTH_UNAVAILABLE")
    return token

def private_dir(path):
    if path.is_symlink() or path.resolve() != path:
        raise ValueError("PRIVATE_PATH_REQUIRED")
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    st = path.lstat()
    if not stat.S_ISDIR(st.st_mode) or st.st_uid != os.getuid() or stat.S_IMODE(st.st_mode) != 0o700:
        raise ValueError("PRIVATE_DIRECTORY_REQUIRED")
    return path

def launch_spec(provider, root, environ):
    if provider not in PINS or environ.get("CAI_OSS_MCP_ENABLED") != "1":
        raise ValueError("OSS_MCP_DISABLED")
    if provider != "github":
        if environ.get("CAI_BROWSER_LOCAL_ENABLED") != "1" or os.getuid() == 0:
            raise ValueError("LOCAL_BROWSER_DISABLED_OR_ROOT")
        if "alpine" in Path("/etc/os-release").read_text().lower():
            raise ValueError("ALPINE_BROWSER_UNSUPPORTED")
    # Isolate configuration, downloads, and caches from the normal account.
    root = private_dir(root)
    home = private_dir(root / provider)
    env = {"HOME": str(home), "PATH": "/usr/local/bin:/usr/bin:/bin",
        "XDG_CONFIG_HOME": str(private_dir(home / "config")),
        "XDG_CACHE_HOME": str(private_dir(home / "cache")),
        "XDG_DATA_HOME": str(private_dir(home / "data")),
        "LANG": "C.UTF-8"}
    if provider == "github":
        # A separately scoped read-only token (no model/browser credentials).
        token = environ.get("CAI_GITHUB_MCP_READ_TOKEN", "")
        if not token or len(token) > 4096 or any(c.isspace() for c in token):
            raise ValueError("GITHUB_READ_TOKEN_REQUIRED")
        env["GITHUB_PERSONAL_ACCESS_TOKEN"] = token
        env["GITHUB_READ_ONLY"] = "true"
        cmd = [
            str(root / "bin" / ("github-mcp-server-" + PINS[provider])),
            "stdio", "--read-only", "--toolsets", "repos,pull_requests,actions,code_quality"]
    elif provider == "playwright":
        cmd = [str(root / "playwright-runtime" / "node_modules" / ".bin" / "playwright-mcp"),
            "--browser", "chromium", "--user-data-dir", str(private_dir(home / "profile")),
            "--allowed-origins", ORIGINS]
    else:
        # v1.0.8 exposes raw Python execution. Only trusted operator in a
        # separately isolated OS worker; never pass a GitHub token/model API key.
        if environ.get("CAI_BROWSER_USE_TRUSTED_LOCAL") != "1":
            raise ValueError("BROWSER_USE_TRUSTED_LOCAL_REQUIRED")
        env["BROWSER_USE_ALLOWED_DOMAINS"] = "github.com,api.github.com"
        cmd = [str(root / "browser-use-runtime" / "bin" / "browser-use"), "--cli-mcp"]
    if provider != "github":
        for key in ("DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR", "XAUTHORITY", "DBUS_SESSION_BUS_ADDRESS"):
            if environ.get(key):
                env[key] = environ[key]
    return cmd, env

def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="action", required=True)
    q = sub.add_parser("quality")
    q.add_argument("--pr", type=int, required=True)
    q.add_argument("--head", required=True)
    l = sub.add_parser("launch")
    l.add_argument("provider", choices=tuple(PINS))
    args = parser.parse_args()
    if args.action == "quality":
        try:
            token = gh_token()
            result = quality_readback(args.pr, args.head, lambda path: get_json(token, path))
        except (ReadbackError, ValueError) as exc:
            result = {"schema": "CAI_CODE_QUALITY_READBACK@1", "status": "NOT_PROVEN",
                "prQuality": "NOT_PROVEN", "reason": exc.status if isinstance(exc, ReadbackError) else "INVALID_SCOPE"}
        print(json.dumps(result, sort_keys=True))
        return 0 if result["status"] == "REPOSITORY_READBACK_VERIFIED" else 2
    try:
        os.umask(0o077)
        root = Path.home() / ".local" / "share" / "capital-ai" / "oss-mcp"
        cmd, env = launch_spec(args.provider, root, os.environ)
        if not Path(cmd[0]).is_file() or not os.access(cmd[0], os.X_OK):
            raise ValueError("PINNED_LOCAL_INSTALL_REQUIRED")
        os.chdir(env["HOME"])
        os.execve(cmd[0], cmd, env)
    except (OSError, ValueError):
        print("OSS_MCP_LAUNCH_BLOCKED", file=sys.stderr)
        return 2

if __name__ == "__main__":
    sys.exit(main())
