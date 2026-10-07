import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('positive Einzel-Admission erzeugt keine allgemeine automatische Mutationsautoritaet', () => {
  const security = read('SECURITY.md');

  assert.match(security, /positives einzelnes Security-, Compliance-, Lizenz- oder Admission-Ergebnis ist ausschließlich Evidence/i);
  assert.match(security, /keine automatische Mutationsautorität/i);
  assert.match(security, /Admission allein reicht dafür niemals aus/i);

  for (const forbidden of [
    'Codeänderungen',
    'Commits',
    'Branch-Erstellung',
    'Pull Requests',
    'Merges',
    'Deployments außerhalb eines vollständig positiven, policy-definierten automatischen Deployment-Gate-Vertrags',
    'Secret- oder Credential-Rotation',
    'Permission-/Role-/Ruleset-Änderungen',
    'Infrastruktur-Mutationen',
    'Production Enablement',
  ]) {
    assert.ok(security.includes(forbidden), `SECURITY.md muss die automatische Autorisierung von ${forbidden} ausschließen`);
  }
});

test('SECURITY.md bleibt mit Root- und Governance-Policies fail-closed kompatibel', () => {
  const agents = read('AGENTS.md');
  const governance = read('docs/governance/DOMAIN-RELEASE-GOVERNANCE.md');
  const postMerge = read('docs/security/POST-MERGE-CORRELATION-SELF-HEALING.md');
  const trust = read('CAPITAL-AI-TRUST/PROJECT.md');

  assert.match(agents, /Ein erfolgreicher Test, Build oder Scan ist \*\*niemals allein\*\* eine Lizenz-, Security- oder Production-Freigabe/);
  assert.match(governance, /Ein erfolgreicher Test, Build oder Scan ist niemals allein eine Lizenz-, Security- oder Production-Freigabe/);
  assert.match(governance, /keine zusätzliche menschliche Deployment-Admission erforderlich/i);
  assert.match(trust, /Keine Security-Ausnahme, Lizenzfreigabe oder Production-Freigabe automatisch aus einem grünen Test ableiten/);

  assert.match(postMerge, /Admission ist keine Security-, Lizenz-, Merge- oder Production-Freigabe/);
  assert.match(postMerge, /Eine automatische Mutation bleibt gesperrt, solange nicht alle/);
  assert.match(postMerge, /explizite Admission des exakten Fix-Fingerprints/);
});

test('Security Policy behauptet Private Vulnerability Reporting nicht ungeprüft als aktiviert', () => {
  const security = read('SECURITY.md');
  assert.match(security, /sofern die Funktion repositoryseitig aktiviert ist/);
  assert.doesNotMatch(security, /Private Vulnerability Reporting ist aktiviert/i);
});

test('vollstaendiger policy-definierter Gate-Satz darf Deployment automatisch autorisieren', () => {
  const agents = read('AGENTS.md');
  const security = read('SECURITY.md');
  const governance = read('docs/governance/DOMAIN-RELEASE-GOVERNANCE.md');
  const handoff = read('docs/security/PRODUCTION-HANDOFF.md');

  assert.match(agents, /keine separate Admission, Human-Approval oder erneute Owner-Bestätigung/i);
  assert.match(agents, /alle.*Deployment-Gates.*terminal.*PASS/is);
  assert.match(security, /Pipeline-Authorized Deployment/);
  assert.match(security, /vollständigen Gate-Satz.*deployEligible:true/is);
  assert.match(governance, /keine zusätzliche menschliche Deployment-Admission erforderlich/i);
  assert.match(handoff, /technischer Verifikationsvertrag/i);
  assert.match(handoff, /Nur der resultierende `main`-Commit darf Production auslösen/i);

  for (const blocked of ['fehlende', 'laufende', 'übersprungene', 'unbekannte', 'fehlgeschlagene']) {
    assert.match(security, new RegExp(blocked, 'i'));
  }
});

test('merge authority bleibt beim Human Owner und entsteht niemals aus Gates', () => {
  const agents = read('AGENTS.md');
  const security = read('SECURITY.md');
  const governance = read('docs/governance/DOMAIN-RELEASE-GOVERNANCE.md');

  assert.match(agents, /Jede Codeänderung.*Pull Request.*Human Repository Owner selbst gemerged/is);
  assert.match(agents, /Automatische Merges sind standardmäßig verboten/i);
  assert.match(agents, /im Chat ausdrücklich die Freigabe zum Merge eines konkreten Pull Requests/i);
  assert.match(agents, /Deployment-Autorität.*niemals Merge-Autorität/is);

  assert.match(security, /Human Merge Boundary/);
  assert.match(security, /kein erfolgreicher Test, Scan, Benchmark, Admission-Status.*autorisiert einen Merge/is);
  assert.match(security, /Human Repository Owner gemerged/i);

  assert.match(governance, /Standardzustand: kein automatischer Merge/i);
  assert.match(governance, /ausdrückliche Chat-Freigabe des Owners.*konkret bezeichneten PR/is);
});

test('normale Entwicklung benoetigt keine separate Admission', () => {
  const agents = read('AGENTS.md');
  const security = read('SECURITY.md');
  const handoff = read('docs/security/PRODUCTION-HANDOFF.md');

  assert.match(agents, /Eine separate Admission ist \*\*nicht\*\* Teil normaler Entwicklung/i);
  assert.match(security, /Admission ist kein allgemeiner Entwicklungsschritt/i);
  assert.match(handoff, /Normale Bugfixes, Produktänderungen, Refactorings, Dokumentation, Tests.*keine separate Admission/is);
});
