import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const zoneName = 'capital-ai.online';
export const hostnames = [zoneName, `www.${zoneName}`, `mta-sts.${zoneName}`];
const webTypes = new Set(['A', 'AAAA', 'CNAME']);
const api = 'https://api.hosting.ionos.com/dns/v1';
const service = 'https://capital-ai-uvsl.onrender.com';
const policy = 'version: STSv1\nmode: testing\nmx: mx00.emig.kundenserver.de\nmx: mx01.emig.kundenserver.de\nmax_age: 86400\n';
const normalize = value => String(value).toLowerCase().replace(/\.$/, '');

export function inventory(zone) {
  if (normalize(zone.name) !== zoneName || !Array.isArray(zone.records)) throw new Error('INVALID_TARGET_ZONE');
  const selected = [], preserved = [];
  for (const record of zone.records) {
    if (!record || typeof record.name !== 'string' || typeof record.type !== 'string') throw new Error('INVALID_RECORD_SCHEMA');
    if (hostnames.includes(normalize(record.name)) && webTypes.has(record.type)) {
      if (typeof record.id !== 'string' || typeof record.content !== 'string' || !Number.isInteger(record.ttl) || typeof record.disabled !== 'boolean') throw new Error('INVALID_WEB_RECORD_SCHEMA');
      selected.push({ id: record.id, name: record.name, type: record.type, content: record.content, ttl: record.ttl, disabled: record.disabled });
    } else preserved.push(record);
  }
  selected.sort((a, b) => a.id.localeCompare(b.id));
  // Do not publish unrelated hostnames, mail TXT values or verification tokens.
  const preservedDigest = createHash('sha256').update(JSON.stringify(preserved.map(r => JSON.stringify(Object.fromEntries(Object.entries(r).sort()))).sort())).digest('hex');
  return { schemaVersion: 1, zone: zoneName, observedAt: new Date().toISOString(), mode: 'READ_ONLY', mutationEligible: false,
    targetService: 'srv-dau1rp893c1s73cdhm1g', targetOrigin: service, hostnames,
    rollbackWebRecords: selected, preservedRecordCount: preserved.length, preservedDigest,
    remainingGates: ['DEPLOYED_MTA_STS', 'RENDER_DOMAIN_BINDINGS_AND_DNS_INSTRUCTIONS', 'OIDC_LOGIN_VERIFIED', 'EXACT_RECORD_CHANGE_PLAN'] };
}

export async function readZone(key, request = fetch) {
  if (typeof key !== 'string' || !/^[^\s.]+\.[^\s]+$/.test(key)) throw new Error('INVALID_OR_MISSING_IONOS_API_KEY');
  const get = async path => {
    let response;
    try { response = await request(`${api}${path}`, { method: 'GET', headers: { 'X-API-Key': key, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error('IONOS_REQUEST_FAILED'); }
    if (!response.ok) throw new Error(`IONOS_HTTP_${response.status}`);
    try { return await response.json(); } catch { throw new Error('INVALID_IONOS_RESPONSE'); }
  };
  const zones = await get('/zones');
  if (!Array.isArray(zones)) throw new Error('INVALID_ZONES_SCHEMA');
  const matches = zones.filter(z => normalize(z.name) === zoneName);
  if (matches.length !== 1 || typeof matches[0].id !== 'string') throw new Error('TARGET_ZONE_NOT_UNIQUE');
  return inventory(await get(`/zones/${encodeURIComponent(matches[0].id)}`));
}

export async function probeService(request = fetch) {
  const result = {};
  for (const [name, path] of [['health', '/healthz'], ['mtaSts', '/.well-known/mta-sts.txt']]) {
    try {
      const response = await request(service + path, { redirect: 'error', signal: AbortSignal.timeout(15000) });
      const body = await response.text();
      result[name] = { status: response.status, contentType: response.headers.get('content-type'), pass: response.status === 200 && (name === 'health' ? (() => { try { return JSON.parse(body).status === 'ok'; } catch { return false; } })() : response.headers.get('content-type')?.startsWith('text/plain') === true && body === policy) };
    } catch { result[name] = { pass: false, error: 'LIVE_PROBE_FAILED' }; }
  }
  return result;
}

async function main() {
  // Write the DNS rollback inventory before probing the deployment.
  const report = await readZone(process.env.IONOS_API_KEY);
  await mkdir('domain-evidence', { recursive: true });
  await writeFile('domain-evidence/ionos-inventory.json', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  const probes = await probeService();
  await writeFile('domain-evidence/deployment-probes.json', JSON.stringify({ observedAt: new Date().toISOString(), ...probes }, null, 2) + '\n', { mode: 0o600 });
  console.log('DNS inventory saved. No DNS or Render settings were changed.');
  console.log(`Deployment gates: health=${probes.health.pass}, mtaSts=${probes.mtaSts.pass}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  // Only locally generated fixed error codes; never log response bodies or credentials.
  console.error(/^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'INVENTORY_FAILED');
  process.exitCode = 1;
});
