/** Fail-closed planning only. This module never deletes or retrieves a Drive object. */
const ARCHIVE = /^capital-ai-supabase-(\d{8}T\d{6}Z)-([a-f0-9]{64})\.sql\.age$/;
const HEX = /^[a-f0-9]{64}$/;
const DAY = 86_400_000;

export function planBackupRetention({ objects, now, retentionDays = 30, minimumCopies = 7 }) {
  if (!Array.isArray(objects) || objects.length > 10000 ||
      !Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 365 ||
      !Number.isInteger(minimumCopies) || minimumCopies < 7 || minimumCopies > 90) {
    throw new Error('RETENTION_POLICY_INVALID');
  }
  const today = Date.parse(now);
  if (!Number.isFinite(today)) throw new Error('RETENTION_CLOCK_INVALID');
  const relevant = objects.filter(o => typeof o?.name === 'string' && o.name.startsWith('capital-ai-supabase-'));
  const seen = new Set();
  const seenNames = new Set();
  const rows = [];
  for (const o of relevant) {
    const m = ARCHIVE.exec(o.name);
    if (!m || typeof o.id !== 'string' || !/^[a-zA-Z0-9_-]{10,}$/.test(o.id) ||
        seen.has(o.id) || seenNames.has(o.name) ||
        typeof o.size !== 'number' || !Number.isSafeInteger(o.size) || o.size <= 0 ||
        !HEX.test(o.sha256 || '') || !HEX.test(o.readbackSha256 || '') ||
        o.sha256 !== o.readbackSha256 || o.sha256 !== m[2]) {
      return { state: 'BLOCKED_UNVERIFIED_ARCHIVE', keep: relevant.length, deleteIds: [] };
    }
    const dt = Date.parse(m[1].replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));
    if (!Number.isFinite(dt) || dt > today || dt < 0) {
      return { state: 'BLOCKED_BAD_TIMESTAMP', keep: relevant.length, deleteIds: [] };
    }
    seen.add(o.id);
    seenNames.add(o.name);
    rows.push({ id: o.id, timestamp: dt });
  }
  rows.sort((a,b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
  if (rows.length < minimumCopies || !rows.length || today - rows[0].timestamp > 2*DAY) {
    return { state: 'BLOCKED_NO_FRESH_VERIFIED_BACKUP', keep: rows.length, deleteIds: [] };
  }
  const protectedIds = new Set(rows.slice(0,minimumCopies).map(r => r.id));
  const deleteIds = rows.filter(r => !protectedIds.has(r.id) && r.timestamp < today - retentionDays * DAY).map(r => r.id);
  return { state: 'DRY_RUN_ONLY', keep: rows.length - deleteIds.length, deleteIds };
}
