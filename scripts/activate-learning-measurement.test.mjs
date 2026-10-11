import test from 'node:test';
import assert from 'node:assert/strict';
import { activateLearningMeasurement } from './activate-learning-measurement.mjs';
const setup = { measurementId: 'G-0542DT2HCE', mode: 'apply', property: 'properties/548187678', websiteStreamVerified: true,
 configuration: { enhancedMeasurementDisabled: true, emailRedactionEnabled: true, queryParameterRedactionEnabled: true, leadEventConfigured: true, formInteractionsEnabled: false } };
test('activation requires verified privacy readback before any Render call', async () => {
 let requests = 0;
 await assert.rejects(activateLearningMeasurement({ setup: { ...setup, configuration: { ...setup.configuration, enhancedMeasurementDisabled: false } }, token: 'private', fetchImpl: async () => { requests++; } }), /PRECONDITION/);
 assert.equal(requests, 0);
});
test('activation updates only the two owned keys on the confirmed Main service', async () => {
 const calls = [];
 const result = await activateLearningMeasurement({ setup, token: 'private-token', fetchImpl: async (url, options) => {
   calls.push({ url, method: options.method, body: options.body });
   return Response.json(options.method === 'PUT' ? { updated: true } : { id: 'srv-dau1rp893c1s73cdhm1g', ownerId: 'tea-d90o4rj7uimc739i86ug', branch: 'main', repo: 'https://github.com/SvenKulessa/Capital-AI' });
 } });
 assert.equal(calls.length, 3);assert.ok(calls[1].url.endsWith('/env-vars/GA4_MEASUREMENT_ID'));
 assert.ok(calls[2].url.endsWith('/env-vars/GA4_ENHANCED_MEASUREMENT_VERIFIED'));
 assert.equal(result.runtimeActivationVerified, false);assert.doesNotMatch(JSON.stringify(result), /private-token/);
});
test('another owner or preview branch prevents configuration mutation', async () => {
 let calls = 0;
 await assert.rejects(activateLearningMeasurement({ setup, token: 'private', fetchImpl: async () => { calls++;return Response.json({ id: 'srv-dau1rp893c1s73cdhm1g', ownerId: 'other', branch: 'main', repo: 'https://github.com/SvenKulessa/Capital-AI' }); } }), /TARGET_MISMATCH/);
 assert.equal(calls, 1);
});
