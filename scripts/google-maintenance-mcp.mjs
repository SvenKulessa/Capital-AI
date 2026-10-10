#!/usr/bin/env node
// Local/SSH stdio MCP entrypoint; never listens on a public TCP port.
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { createGoogleMaintenance } from '../server/google-maintenance-api.mjs';

const empty = { type: 'object', properties: {}, additionalProperties: false };
export const GOOGLE_MAINTENANCE_TOOLS = Object.freeze([
  { name: 'google_maintenance_status', description: 'Configured targets and enabled capabilities; does not prove Google access.', inputSchema: empty },
  { name: 'gcp_get_project', description: 'Read exact Capital-AI Cloud project metadata.', inputSchema: empty },
  { name: 'gcp_list_enabled_services', description: 'List enabled APIs for the exact Capital-AI project; does not enable services.', inputSchema: empty },
  { name: 'ga4_get_property', description: 'Read exact GA4 property 548187678 settings.', inputSchema: empty },
  { name: 'ga4_list_data_streams', description: 'Read property streams and verify capital-ai.online web-stream association.', inputSchema: empty },
  { name: 'ga4_country_report', description: 'Aggregated country report for Germany, Italy, Spain, Portugal and UK; no user-level data.', inputSchema: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 90, default: 28 } }, additionalProperties: false } },
  { name: 'gsc_list_sitemaps', description: 'Read sitemap status for sc-domain:capital-ai.online.', inputSchema: empty },
  { name: 'gsc_country_report', description: 'Read top 20 organic landing pages for each of the five target markets; up to five quota-limited calls.', inputSchema: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 90, default: 28 } }, additionalProperties: false } },
  { name: 'ga4_plan_property_update', description: 'Prepare a five-minute property-settings plan; requires explicit worker write enablement. Review report impact.', inputSchema: { type: 'object', properties: { patch: { type: 'object', properties: { displayName: { type: 'string', minLength: 1, maxLength: 100 }, timeZone: { type: 'string', maxLength: 80 }, currencyCode: { type: 'string', pattern: '^[A-Z]{3}$' } }, minProperties: 1, additionalProperties: false } }, required: ['patch'], additionalProperties: false } },
  { name: 'ga4_apply_property_update', description: 'Apply an inspected one-use plan with drift check and provider readback; no IAM, deletion or spend operation.', inputSchema: { type: 'object', properties: { planId: { type: 'string', maxLength: 36 } }, required: ['planId'], additionalProperties: false } },
]);

export async function handleGoogleMaintenanceMessage(message, maintenance) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid request' } };
  if (!Object.hasOwn(message, 'id')) return null;
  if (!['string', 'number'].includes(typeof message.id) || (typeof message.id === 'number' && !Number.isFinite(message.id))) return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request ID' } };
  const base = { jsonrpc: '2.0', id: message.id };
  if (message.method === 'initialize') return { ...base, result: { protocolVersion: ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'].includes(message.params?.protocolVersion) ? message.params.protocolVersion : '2025-11-25', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'capital-ai-google-maintenance', version: '1.0.0' } } };
  if (message.method === 'ping') return { ...base, result: {} };
  if (message.method === 'tools/list') return { ...base, result: { tools: GOOGLE_MAINTENANCE_TOOLS } };
  if (message.method !== 'tools/call') return { ...base, error: { code: -32601, message: 'Method not found' } };
  const name = message.params?.name;
  if (!GOOGLE_MAINTENANCE_TOOLS.some(tool => tool.name === name)) return { ...base, error: { code: -32602, message: 'Tool not allowed' } };
  try {
    const data = await maintenance.call(name, message.params?.arguments ?? {});
    return { ...base, result: { structuredContent: data, content: [{ type: 'text', text: JSON.stringify(data) }], isError: false } };
  } catch (error) {
    // Only our bounded error codes are visible, never Google bodies or token/CLI output.
    const code = /^[A-Z][A-Z0-9_]{1,80}$/.test(error?.message || '') ? error.message : 'GOOGLE_MAINTENANCE_UNAVAILABLE';
    return { ...base, result: { isError: true, content: [{ type: 'text', text: code }] } };
  }
}

export function startGoogleMaintenanceStdio() {
  const maintenance = createGoogleMaintenance();
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let queue = Promise.resolve();
  lines.on('line', line => {
    if (line.length > 65_536) { process.stderr.write('MCP_REQUEST_TOO_LARGE\n'); lines.close(); process.stdin.destroy(); return; }
    queue = queue.then(async () => {
      let message;
      try { message = JSON.parse(line); } catch { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n'); return; }
      const response = await handleGoogleMaintenanceMessage(message, maintenance);
      if (response) process.stdout.write(JSON.stringify(response) + '\n');
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startGoogleMaintenanceStdio();
