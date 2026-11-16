#!/bin/sh
# One-shot isolated staging probe. No production credentials, no service deployment.
set -eu
umask 077
phase=PRECONDITIONS
status=BLOCKED
start_ms=$(node -p 'Date.now()')
scratch=
sock=
clamd_pid=
fresh_pid=
fresh_peak=0
clamd_peak=0
cleanup() {
  code=$?
  trap - 0
  [ -z "$clamd_pid" ] || { kill "$clamd_pid" 2>/dev/null || :; wait "$clamd_pid" 2>/dev/null || :; }
  [ -z "$fresh_pid" ] || { kill "$fresh_pid" 2>/dev/null || :; wait "$fresh_pid" 2>/dev/null || :; }
  [ -z "$sock" ] || rm -f -- "$sock"
  [ -z "$scratch" ] || rm -rf -- "$scratch"
  end_ms=$(node -p 'Date.now()')
  printf '{"schema":"CAPITAL_AI_AVATAR_OFFICIAL_FRESHCLAM_STAGING@1","status":"%s","phase":"%s","exitCode":%s,"durationMs":%s,"freshclamPeakRssKiB":%s,"clamdPeakRssKiB":%s,"productionUploadEnabled":false}\n' "$status" "$phase" "$code" "$((end_ms-start_ms))" "$fresh_peak" "$clamd_peak"
  exit "$code"
}
trap cleanup 0
[ "${CAPITAL_AI_ISOLATED_STAGING:-}" = true ] || { phase=ISOLATION_NOT_ATTESTED; exit 77; }
[ "${PROFILE_AVATAR_UPLOAD_ENABLED:-false}" != true ] &&
[ -z "${SUPABASE_SECRET_KEY:-}" ] &&
[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ] &&
[ -z "${RENDER_SERVICE_ID:-}" ] ||
{ phase=REFUSED_PRODUCTION_OR_SECRET_CONTEXT; exit 78; }
[ "$(id -u)" = 1000 ] || { phase=UNSAFE_UID; exit 79; }
for command in freshclam clamd sigtool node stat df awk du; do
  command -v "$command" >/dev/null 2>&1 || { phase=MISSING_BINARY; exit 80; }
done
[ -d /run/clamav ] && [ -w /run/clamav ] &&
[ "$(stat -c %u /run/clamav)" = 1000 ] &&
[ "$(stat -c %a /run/clamav)" = 700 ] ||
{ phase=UNSAFE_SOCKET_DIRECTORY; exit 81; }
mem=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)
disk=$(df -Pk /tmp | awk 'END {print $4}')
[ "$mem" -ge 3145728 ] && [ "$disk" -ge 5242880 ] ||
{ phase=INSUFFICIENT_MEMORY_OR_DISK; exit 82; }
if [ -r /sys/fs/cgroup/memory.max ]; then
  limit=$(cat /sys/fs/cgroup/memory.max)
  case "$limit" in
    max) ;;
    *[!0-9]*|'') phase=UNKNOWN_CGROUP_LIMIT; exit 83 ;;
    *) [ "$limit" -ge 3221225472 ] || { phase=CGROUP_MEMORY_TOO_SMALL; exit 84; } ;;
  esac
fi

phase=FRESHCLAM_OFFICIAL_DOWNLOAD
scratch=$(mktemp -d /tmp/capital-ai-avatar-staging.XXXXXXXX)
mkdir -m 700 "$scratch/db"
sock="/run/clamav/staging-$(basename "$scratch" | tr -cd 'A-Za-z0-9').sock"
cat > "$scratch/freshclam.conf" <<EOF
DatabaseDirectory $scratch/db
DatabaseMirror database.clamav.net
ScriptedUpdates off
Checks 6
Foreground yes
EOF
freshclam --config-file="$scratch/freshclam.conf" >"$scratch/freshclam.log" 2>&1 &
fresh_pid=$!
while kill -0 "$fresh_pid" 2>/dev/null; do
  rss=$(awk '/^VmRSS:/{print $2}' "/proc/$fresh_pid/status" 2>/dev/null || echo 0)
  case "$rss" in ''|*[!0-9]*) rss=0 ;; esac
  [ "$rss" -le "$fresh_peak" ] || fresh_peak=$rss
  sleep 0.25
done
wait "$fresh_pid" || {
  phase=FRESHCLAM_FAILED
  if grep -Eqi 'HTTP[^[:digit:]]*(403|429)|rate.limit|blocked by cloudflare|forbidden' "$scratch/freshclam.log"; then
    phase=OFFICIAL_FEED_RATE_LIMITED
  elif grep -Eqi 'cannot resolve|could not resolve|name resolution|DNS lookup|network is unreachable|connection refused' "$scratch/freshclam.log"; then
    phase=OFFICIAL_FEED_UNREACHABLE
  elif grep -Eqi 'error parsing|invalid configuration|unknown option|unrecognized option|configuration error' "$scratch/freshclam.log"; then
    phase=FRESHCLAM_CONFIG_INVALID
  elif grep -Eqi 'permission denied|access denied|cannot create|not writable' "$scratch/freshclam.log"; then
    phase=FRESHCLAM_PERMISSION_DENIED
  fi
  # No application credentials are passed. Only bounded diagnostic lines are emitted;
  # suppress URLs, filenames, and any user-provided network data.
  grep -Ei 'ERROR|WARNING|FAILED|BLOCKED|HTTP|DNS|INITIALIZ' "$scratch/freshclam.log" |
    head -n 8 |
    sed -E 's#https?://[^[:space:]]+#<redacted-url>#g; s#/[A-Za-z0-9_./-]+#<redacted-path>#g' >&2 || :
  exit 85
}
fresh_pid=

phase=SIGNED_CVD_AND_FRESHNESS
for name in main daily; do
  [ -s "$scratch/db/$name.cvd" ] || { phase=SIGNED_CVD_MISSING; exit 86; }
  info=$(sigtool --info "$scratch/db/$name.cvd" 2>/dev/null) ||
  { phase=SIGNED_CVD_INVALID; exit 87; }
  printf '%s\n' "$info" | grep -q '^Verification OK\.' ||
  { phase=CVD_SIGNATURE_NOT_VERIFIED; exit 88; }
  if [ "$name" = daily ]; then
    build_time=$(printf '%s\n' "$info" | awk -F': ' '/^Build time:/ {print $2; exit}')
    node -e 'const t=Date.parse(process.argv[1]);let age=Date.now()-t;if(!Number.isFinite(t)||age < -300000||age > 48*3600000)process.exit(1)' "$build_time" ||
    { phase=SIGNATURE_OLDER_THAN_48H; exit 89; }
  fi
done

phase=REAL_CLAMD_SOCKET
cat > "$scratch/clamd.conf" <<EOF
Foreground yes
DatabaseDirectory $scratch/db
LocalSocket $sock
LocalSocketMode 600
FixStaleSocket yes
FailIfCvdOlderThan 2
MaxThreads 1
MaxConnectionQueueLength 4
ReadTimeout 10
StreamMaxLength 3M
MaxFileSize 4M
MaxScanSize 8M
EOF
clamd --config-file="$scratch/clamd.conf" >/dev/null 2>&1 &
clamd_pid=$!
ready=false
for n in $(seq 1 600); do
  kill -0 "$clamd_pid" 2>/dev/null || { phase=CLAMD_EXITED; exit 90; }
  if [ -S "$sock" ]; then ready=true; break; fi
  sleep 0.2
done
[ "$ready" = true ] || { phase=CLAMD_SOCKET_TIMEOUT; exit 91; }
[ "$(stat -c %u "$sock")" = 1000 ] &&
[ "$(stat -c %a "$sock")" = 600 ] ||
{ phase=CLAMD_SOCKET_PERMISSIONS; exit 92; }

phase=REAL_PNG_AND_EICAR_SCAN
node --input-type=module - "$sock" <<'NODE'
import { scanClamavLocal } from './server/profile-avatar-upload.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR42mOUEdFgYGBgYmBgYGBgAAAEPgBcCk+iJQAAAABJRU5ErkJggg==','base64');
assert.equal(createHash('sha256').update(png).digest('hex'),'31a0620e671486432db6ada238855a5479c9ece3e4872ca3735e81f2a8796b41');
const eicar=['X5O!P%@AP[4\\PZX54(P^)7CC)7}','$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!','$H+H*'].join('');
assert.equal(createHash('md5').update(eicar).digest('hex'),'44d88612fea8a8f36de82e1278abb02f');
const clean=await scanClamavLocal(png,process.argv[2],10000);
const malicious=await scanClamavLocal(Buffer.from(eicar),process.argv[2],10000);
assert.equal(clean.clean,true);
assert.equal(malicious.clean,false);
assert.ok(clean.signatureAgeMs >= -300000 && clean.signatureAgeMs <= 48*3600000);
console.log(JSON.stringify({scan:'OFFICIAL_FRESHCLAM',png:'OK',eicar:'FOUND',socketMode:'0600',signatureAgeHours:Number((clean.signatureAgeMs/3600000).toFixed(2)),signatureVersion:clean.signatureVersion}));
NODE
clamd_peak=$(awk '/^VmHWM:/ {print $2}' "/proc/$clamd_pid/status" 2>/dev/null || echo 0)
case "$clamd_peak" in ''|*[!0-9]*) clamd_peak=0 ;; esac
phase=COMPLETE
status=VERIFIED
