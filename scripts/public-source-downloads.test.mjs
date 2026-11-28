import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

 test('repository source downloads omit internal operational references without broadening Docker admission', () => {
  for (const path of ['public/downloads/CAPITAL-AI_Market-Screener-Hub_Open-Source-SOURCES_2026-10-04.md','public/downloads/CAPITAL-AI_DOCUMENTATION_PROVENANCE_2026-10-05.md']) {
    const content = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(content, /MARKET_QUOTES_ENABLED|admittedSources|GitHub PR #\d+|main@[a-f0-9]{40}|Owner Decision|Legacy Isolation|NATS JetStream|Valkey/i, path);
  }
  const dockerignore = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
  assert.doesNotMatch(dockerignore, /!public\/downloads\/CAPITAL-AI_(?:Market-Screener-Hub_Open-Source-SOURCES|DOCUMENTATION_PROVENANCE)/);
});
