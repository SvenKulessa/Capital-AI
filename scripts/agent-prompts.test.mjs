import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const canonical = read('.ai/prompts/000-execution-first.prompt.md');
const prompts = ["001-ArchitekturContinuation","002-ResponsibilityConsolidation","003--TracabilityMatrix","004-GouvernanceValidator","005-ComplianceEngine","006-Eventmesh","007-SendMailAfterCeckout","008-MasterAudit","009-ScreeningMasterAudit"];
test('legacy tasks inherit execution-first without becoming extra governance', () => {
  assert.match(canonical, /AUTONOMOUS_EXECUTION_FIRST/);
  assert.match(canonical, /read-only/);
  assert.match(canonical, /Root-`AGENTS.md`/);
  for (const name of prompts) {
    const content = read(`.ai/prompts/${name}.prompt.md`);
    assert.ok(content.startsWith('> **Ausführungsmodus (2026-11-15):**'), name);
    assert.match(content.slice(0, 700), /000-execution-first.prompt.md/, name);
    assert.match(content.slice(0, 700), /keine neuen Owner-Freigaben/, name);
  }
});
test('removal of execution-first prefix is detectable', () => {
  for (const name of prompts) {
    const content = read(`.ai/prompts/${name}.prompt.md`);
    assert.ok(!content.replace('> **Ausführungsmodus (2026-11-15):**', '[REMOVED]')
      .startsWith('> **Ausführungsmodus (2026-11-15):**'), name);
  }
});
