#!/usr/bin/env bash
# Run only as a non-root user inside a disposable, resource-limited, no-secret container.
set -Eeuo pipefail
umask 077

LOCK="${1:?Usage: collect_os_source_mirror.sh LOCK INVENTORY MIRROR REPORT_DIR}"
INVENTORY="${2:?missing inventory}"
MIRROR="${3:?missing mirror directory}"
REPORT_DIR="${4:?missing report directory}"
REPO_VERIFIER="${REPO_VERIFIER:-/repo/scripts/verify-os-source-mirror.mjs}"
APORTS_DIR="${APORTS_DIR:-$(dirname "$REPORT_DIR")/aports-git}"

if [[ $(id -u) -eq 0 ]]; then echo 'ERROR: refused root runner' >&2; exit 90; fi
for p in "$LOCK" "$INVENTORY" "$REPO_VERIFIER"; do
  if [[ ! -f "$p" || -L "$p" ]]; then echo 'ERROR: missing/unsafe input' >&2; exit 91; fi
done
mkdir -p "$MIRROR" "$REPORT_DIR" "$APORTS_DIR"
export GIT_TERMINAL_PROMPT=0 GIT_CONFIG_NOSYSTEM=1

# Check exact source SHA, image config identity, all 21 recipe refs and 34 APK binaries.
python3 - "$LOCK" "$INVENTORY" <<'PY'
import json, re, sys
lock=json.load(open(sys.argv[1],encoding='utf8'))
inv=json.load(open(sys.argv[2],encoding='utf8'))
assert lock['schema']=='CAPITAL_AI_OS_RECIPE_LOCK@1'
assert inv['schema']=='OS_SOURCE_NOTICE_INVENTORY@1'
assert lock['sourceSha']==inv['sourceSha']
assert lock['testedMergeSha']==inv['testedSha']
assert lock['localImageConfigDigest']==inv['imageConfigDigest']
assert lock['installedApkDbSha256']==inv['installedApkDbSha256']
assert lock['publishedOCIManifestDigest'] is None
assert lock['status']['redistributionApproved'] is False
assert len(lock['recipes'])==21==len(inv['sourceRecipeLocators'])
assert len(inv['packages'])==34
idx={x['package']:x for x in inv['sourceRecipeLocators']}
assert len(idx)==21
for r in lock['recipes']:
    assert re.fullmatch(r'[a-z0-9][a-z0-9+_.-]*',r['sourcePackage'])
    assert re.fullmatch(r'[a-f0-9]{40}',r['aportsCommit'])
    assert re.fullmatch(r'[a-f0-9]{40}',r['apkbuildGitBlob'])
    assert r['path']==f"main/{r['sourcePackage']}/APKBUILD"
    assert idx[r['sourcePackage']]['aportsCommit']==r['aportsCommit']
    p=[x for x in inv['packages'] if x['sourcePackage']==r['sourcePackage']]
    assert p and all(x['version']==r['version'] for x in p)
print('LOCK_INVENTORY_CROSSCHECK_PASS: 21 source recipes / 34 binary packages')
PY

if [[ ! -d "$APORTS_DIR/.git" ]]; then
  git init -q "$APORTS_DIR"
  git -C "$APORTS_DIR" remote add origin https://github.com/alpinelinux/aports.git
  git -C "$APORTS_DIR" config remote.origin.promisor true
  git -C "$APORTS_DIR" config remote.origin.partialclonefilter blob:none
fi

python3 - "$LOCK" <<'PY' > "$REPORT_DIR/recipes.tsv"
import json,sys
for x in json.load(open(sys.argv[1],encoding='utf8'))['recipes']:
    print('\t'.join(x[k] for k in ('sourcePackage','aportsCommit','apkbuildGitBlob','version')))
PY

failures=0
while IFS=$'\t' read -r name commit expected_blob expected_version; do
  [[ -n "$name" ]] || continue
  echo "Collecting pinned aports recipe: $name @ $commit" >&2
  mkdir -p "$MIRROR/$name" "$MIRROR/$name/distfiles"
  log="$REPORT_DIR/$name.log"
  if ! git -C "$APORTS_DIR" -c protocol.version=2 fetch --quiet --no-tags --depth=1 --filter=blob:none origin "$commit" >"$log" 2>&1; then
    echo 'APORTS_FETCH_FAILED' >>"$log"; failures=$((failures+1)); continue
  fi
  # Extract all commit-pinned recipe-directory files (includes Alpine patches and build inputs).
  if ! (git -C "$APORTS_DIR" archive "$commit" "main/$name" | tar -x --strip-components=2 -C "$MIRROR/$name") >>"$log" 2>&1; then
    echo 'APORTS_ARCHIVE_FAILED' >>"$log"; failures=$((failures+1)); continue
  fi
  found_blob="$(git hash-object "$MIRROR/$name/APKBUILD")"
  if [[ "$found_blob" != "$expected_blob" ]]; then
    echo "APKBUILD_BLOB_MISMATCH" >>"$log"; failures=$((failures+1)); continue
  fi
  # Never grant additional permissions. abuild may source APKBUILD shell code:
  # this step MUST execute inside an unprivileged, no-secret isolated container.
  if ! (cd "$MIRROR/$name" && SRCDEST="$MIRROR/$name/distfiles" abuild fetch verify) >>"$log" 2>&1; then
    echo 'ABUILD_FETCH_VERIFY_FAILED' >>"$log"; failures=$((failures+1)); continue
  fi
  echo 'APORTS_BLOB_AND_ABUILD_FETCH_VERIFY_PASS' >>"$log"
done < "$REPORT_DIR/recipes.tsv"

# Independent offline SHA512 / exact APKBUILD Git blob / image-inventory verification.
node "$REPO_VERIFIER" "$LOCK" "$INVENTORY" "$MIRROR" "$REPORT_DIR/os-source-verification.json" \
  >"$REPORT_DIR/verifier.stdout" 2>"$REPORT_DIR/verifier.stderr" || failures=$((failures+1))

python3 - "$REPORT_DIR" "$failures" <<'PY'
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1]); failures=int(sys.argv[2]); p=root/'os-source-verification.json'
report=json.loads(p.read_text()) if p.exists() else {}
files=[{'name':q.name,'sha256':hashlib.sha256(q.read_bytes()).hexdigest()} for q in sorted(root.glob('*.log'))]
# alpine-base is a pure metadata/release recipe with no external source declaration.
unhashed=[n for n in report.get('noSha512Declarations',[]) if n != 'alpine-base']
status='SOURCE_HASHES_VERIFIED_NON_AUTHORIZING' if failures==0 and report.get('archiveHashesVerified') is True and not unhashed else 'BLOCKED_NOT_PROVEN'
summary={'schema':'CAPITAL_AI_ISOLATED_OS_SOURCE_COLLECTION@1','status':status,
         'checksFailClosed':True,'externalFetchFailures':failures,
         'sourceDeliveryProven':False,'redistributionApproved':False,
         'publishedOCIManifestDigest':None,'verification':report,'logSha256':files}
(root/'collection-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ('status','externalFetchFailures','sourceDeliveryProven','redistributionApproved')}))
PY
if ! grep -q '"status": "SOURCE_HASHES_VERIFIED_NON_AUTHORIZING"' "$REPORT_DIR/collection-summary.json"; then exit 2; fi
