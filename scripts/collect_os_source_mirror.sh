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
    # Only use a named official Alpine distfiles mirror for known unavailable upstream archives.
    # A fallback is accepted ONLY after comparing actual bytes to the pinned APKBUILD SHA-512.
    archive_name=''
    case "$name" in
      apk-tools) archive_name='apk-tools-v3.0.8.tar.gz' ;;
      ca-certificates) archive_name='ca-certificates-20261020.tar.bz2' ;;
      ncurses) archive_name='ncurses-6.6-20260516.tgz' ;;
    esac
    found=0
    if [[ -n "$archive_name" ]]; then
      expected_sha=$(python3 - "$MIRROR/$name/APKBUILD" "$archive_name" <<'PYHASH'
import pathlib,re,sys
content=pathlib.Path(sys.argv[1]).read_text(encoding='utf8')
block=re.search(r'^sha512sums="([\s\S]*?)"',content,re.M)
values=[entry.split() for entry in (block.group(1) if block else '').splitlines() if re.fullmatch(r'[0-9a-f]{128}\s+\S+',entry.strip())]
matched=[v[0] for v in values if len(v)==2 and v[1]==sys.argv[2]]
if len(matched)!=1:raise SystemExit('missing or ambiguous pinned source SHA512')
print(matched[0])
PYHASH
)
      for mirror_release in v3.24 v3.18; do
        out=$(mktemp "$MIRROR/$name/distfiles/.source-check.XXXXXXXX")
        if curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
          --connect-timeout 10 --max-time 80 \
          "https://distfiles.alpinelinux.org/distfiles/$mirror_release/$archive_name" -o "$out" \
          >>"$log" 2>&1 && [[ "$(sha512sum "$out" | awk '{print $1}')" == "$expected_sha" ]]; then
          mv -- "$out" "$MIRROR/$name/distfiles/$archive_name"
          echo "OFFICIAL_ALPINE_SOURCE_MIRROR_SHA512_PASS: $archive_name ($mirror_release)" >>"$log"
          found=1
          break
        fi
        rm -f -- "$out"
      done
    fi
    if [[ "$found" != 1 ]] || ! (cd "$MIRROR/$name" && SRCDEST="$MIRROR/$name/distfiles" abuild fetch verify) >>"$log" 2>&1; then
      echo 'ABUILD_FETCH_VERIFY_FAILED' >>"$log"; failures=$((failures+1)); continue
    fi
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
failed_recipes=sorted(q.stem for q in root.glob('*.log') if q.read_text(encoding='utf8',errors='replace').rstrip().endswith(('APORTS_FETCH_FAILED','APORTS_ARCHIVE_FAILED','APKBUILD_BLOB_MISMATCH','ABUILD_FETCH_VERIFY_FAILED')))
# alpine-base is a pure metadata/release recipe with no external source declaration.
unhashed=[n for n in report.get('noSha512Declarations',[]) if n != 'alpine-base']
status='SOURCE_HASHES_VERIFIED_NON_AUTHORIZING' if failures==0 and report.get('archiveHashesVerified') is True and not unhashed else 'BLOCKED_NOT_PROVEN'
summary={'schema':'CAPITAL_AI_ISOLATED_OS_SOURCE_COLLECTION@1','status':status,
         'checksFailClosed':True,'externalFetchFailures':failures,
         'sourceDeliveryProven':False,'redistributionApproved':False,
         'publishedOCIManifestDigest':None,'verification':report,'logSha256':files,'failedRecipes':failed_recipes}
(root/'collection-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ('status','externalFetchFailures','sourceDeliveryProven','redistributionApproved','failedRecipes')}))
PY
if ! grep -q '"status": "SOURCE_HASHES_VERIFIED_NON_AUTHORIZING"' "$REPORT_DIR/collection-summary.json"; then exit 2; fi
# Package only after all real SHA512 checks passed, as the SAME nonprivileged user.
# This is a private CI source mirror, NOT proof of corresponding-source legal delivery.
tar -C "$(dirname "$MIRROR")" --exclude="$(basename "$MIRROR")/*/src" --exclude="$(basename "$MIRROR")/*/src/*" -czf "$REPORT_DIR/source-mirror.tar.gz" "$(basename "$MIRROR")"
( cd "$REPORT_DIR" && sha256sum source-mirror.tar.gz > source-mirror.tar.gz.sha256 )
python3 - "$REPORT_DIR" <<'PYARCHIVE'
import json,pathlib,sys
p=pathlib.Path(sys.argv[1]); report=p/'collection-summary.json'
data=json.loads(report.read_text()); digest=(p/'source-mirror.tar.gz.sha256').read_text().split()[0]
data['privateMirrorArchiveSha256']='sha256:'+digest
data['privateMirrorArchiveBytes']=(p/'source-mirror.tar.gz').stat().st_size
data['sourceDeliveryProven']=False;data['redistributionApproved']=False
report.write_text(json.dumps(data,indent=2)+'\n')
PYARCHIVE
