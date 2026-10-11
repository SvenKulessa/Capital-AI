// Main-only setup runner. No secret/env/report values are printed.
import { readFile } from 'node:fs/promises';
const origin = 'https://api.render.com/v1/services/srv-dau1rp893c1s73cdhm1g';
export async function activateLearningMeasurement({ setup, token, fetchImpl = fetch }) {
  if (setup.measurementId !== 'G-0542DT2HCE' || setup.mode !== 'apply' || setup.property !== 'properties/548187678' ||
      !setup.websiteStreamVerified || !setup.configuration?.enhancedMeasurementDisabled ||
      !setup.configuration?.emailRedactionEnabled || !setup.configuration?.queryParameterRedactionEnabled ||
      !setup.configuration?.leadEventConfigured || setup.configuration?.formInteractionsEnabled !== false || !token) throw Error('ACTIVATION_PRECONDITION_FAILED');
  async function request(path, options = {}) {
    const response = await fetchImpl(origin + path, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw Error('RENDER_ACTIVATION_FAILED');
    return response.json();
  }
  const service = await request('');
  if (service.id !== 'srv-dau1rp893c1s73cdhm1g' || service.ownerId !== 'tea-d90o4rj7uimc739i86ug' || service.branch !== 'main' || service.repo !== 'https://github.com/SvenKulessa/Capital-AI') throw Error('RENDER_TARGET_MISMATCH');
  // Update individual keys; preserve every unrelated credential and setting.
  await request('/env-vars/GA4_MEASUREMENT_ID', { method: 'PUT', body: JSON.stringify({ value: 'G-0542DT2HCE' }) });
  await request('/env-vars/GA4_ENHANCED_MEASUREMENT_VERIFIED', { method: 'PUT', body: JSON.stringify({ value: 'true' }) });
  // Environment writes alone do not prove that the running process received them.
  return { configurationWritten: true, runtimeActivationVerified: false };
}
if (process.argv[1]?.endsWith('/activate-learning-measurement.mjs')) {
  try {
    const setup = JSON.parse(await readFile(process.argv[2], 'utf8'));
    const result = await activateLearningMeasurement({ setup, token: process.env.RENDER_API_KEY });
    console.log(JSON.stringify(result));
  } catch { console.error('LEARNING_MEASUREMENT_ACTIVATION_FAILED'); process.exitCode = 1; }
}
