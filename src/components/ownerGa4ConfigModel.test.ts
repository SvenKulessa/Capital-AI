import test from 'node:test';
import assert from 'node:assert/strict';
import {
 GA4_CONFIG_SCHEMA, GA4_CONFIG_CODES, ga4ConfigRecommendation, readGa4ConfigResult,
} from './ownerGa4ConfigModel';

const example = (reason: string, JSON_VALID: unknown, PROJECT_MATCH: unknown) => ({
 schema: GA4_CONFIG_SCHEMA, status: 'CONFIG_DIAGNOSTIC_ONLY', reason, JSON_VALID, PROJECT_MATCH,
});
test('safe diagnostic statuses accept only consistent code/booleans', () => {
 const accepted = [
  ['GA4_CONFIG_VALID', true, true],
  ['GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED', null, null],
  ['GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON', false, null],
  ['GA4_MCP_SERVICE_ACCOUNT_INVALID', true, null],
  ['GA4_MCP_CLOUD_PROJECT_NOT_CONFIGURED', true, null],
  ['GA4_MCP_PROJECT_MISMATCH', true, false],
 ] as const;
 assert.equal(accepted.length, GA4_CONFIG_CODES.length);
 for (const [reason, json, project] of accepted) {
  assert.deepEqual(readGa4ConfigResult(example(reason, json, project)), {
   JSON_VALID: json, PROJECT_MATCH: project, reason,
  });
  assert.ok(ga4ConfigRecommendation(reason).length > 30);
 }
});
test('reject attacker-crafted response codes, contradictory flags, and malformed data', () => {
 for (const value of [
  null, [], { reason: 'GA4_CONFIG_VALID' },
  example('GA4_CONFIG_VALID', true, false),
  example('GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON', true, null),
  example('GA4_MCP_PROJECT_MISMATCH', false, false),
  example('GA4_CONFIG_VALID', 'true', true),
  example('GA4_CONFIG_VALID', true, undefined),
  example('GA4_MCP_UNTRUSTED_SECRET=abc123', true, true),
  { ...example('GA4_CONFIG_VALID', true, true), schema: 'UNTRUSTED_SCHEMA' },
  { ...example('GA4_CONFIG_VALID', true, true), status: 'UNTRUSTED_STATUS' },
 ]) assert.equal(readGa4ConfigResult(value), null);
});
test('untrusted account or credential fields never appear in parsed UI', () => {
 const sensitive = {
  ...example('GA4_CONFIG_VALID', true, true),
  private_key: 'CANARY_KEY_MUST_NEVER_RENDER',
  email: 'CANARY_EMAIL',
  project_id: 'CANARY_PROJECT',
  message: 'CANARY_SECRET_PROVIDER_MESSAGE',
 };
 const result = readGa4ConfigResult(sensitive);
 assert.deepEqual(Object.keys(result ?? {}).sort(), ['JSON_VALID','PROJECT_MATCH','reason'].sort());
 assert.doesNotMatch(JSON.stringify(result), /CANARY|private_key|project_id|email|message/);
 for (const reason of GA4_CONFIG_CODES) {
  assert.doesNotMatch(ga4ConfigRecommendation(reason), /CANARY|private_key\s*[:=]/);
 }
});
