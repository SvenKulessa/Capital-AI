import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAlertPreferences } from '../src/utils/alertPreferences.ts';
import { PipelineStorageService, getPresetPipelines } from '../src/services/pipelineStorage.ts';

test('legacy Telegram credentials and unknown fields are discarded on reload and serialization', () => {
  const legacy = { inAppNotifications: true, autoCheckIntervalSec: 1, botToken: 'old-secret', telegram: { enabled: true, botToken: 'old-secret', chatId: '12345', unknown: 'old-secret' } };
  const clean = sanitizeAlertPreferences({ ...legacy, telegram: { ...legacy.telegram, connected: true } }, true);
  assert.equal(JSON.stringify(clean).includes('old-secret'), false);
  assert.equal('chatId' in clean.telegram, false);
  assert.equal(clean.autoCheckIntervalSec, 10);
  assert.equal(clean.telegram.enabled, true);
  assert.equal(clean.telegram.connected, false);
});

test('pipeline storage discards invalid rows while retaining schema-valid drafts', () => {
  const entries = new Map();
  globalThis.window = {};
  globalThis.localStorage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  try {
    const preset = getPresetPipelines()[0];
    entries.set('capital_ai_pipelines_v1', JSON.stringify([preset, { id: 'invalid', nodes: 'corrupt', edges: [] }]));
    const values = PipelineStorageService.listPipelines();
    assert.equal(values.length, 1); assert.equal(values[0].id, preset.id);
    assert.equal(PipelineStorageService.importFromJson('{"id":"invalid"}').success, false);
    assert.equal(PipelineStorageService.importFromJson(' '.repeat(262145)).success, false);
    assert.equal(PipelineStorageService.decodePipelineFromUrl('a'.repeat(1048577)), null);
    const oversized = { ...preset, nodes: Array.from({ length: 201 }, () => preset.nodes[0]) };
    assert.equal(PipelineStorageService.importFromJson(JSON.stringify(oversized)).success, false);
    const imported = PipelineStorageService.importFromJson(JSON.stringify(preset));
    assert.equal(imported.success, true);
    assert.match(imported.pipeline.id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    assert.equal(PipelineStorageService.listPipelines().length, 2);
    const originalWrite = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.equal(PipelineStorageService.importFromJson(JSON.stringify(preset)).success, false);
    globalThis.localStorage.setItem = originalWrite;
    assert.equal(PipelineStorageService.listPipelines().length, 2);
  } finally { delete globalThis.window; delete globalThis.localStorage; }
});
