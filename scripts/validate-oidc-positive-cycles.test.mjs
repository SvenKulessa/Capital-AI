import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOidcPositiveCycles, REQUIRED_OIDC_SUCCESS_EVENTS } from './validate-oidc-positive-cycles.mjs';

const cycle = (id, overrides = {}) => ({
  validationId: `validation-${id}`,
  runId: `run-${id}`,
  deployId: 'dep-example',
  observedAt: `2026-10-0${id}T12:00:00Z`,
  sourceSha: 'a'.repeat(40),
  imageDigest: 'sha256:' + 'b'.repeat(64),
  gates: {
    configurationPresent: true,
    discoveryVerified: true,
    credentialAuthenticationVerified: true,
    loginVerified: true,
    idTokenValidated: true,
    sessionEstablished: true,
  },
  successEvents: [...REQUIRED_OIDC_SUCCESS_EVENTS],
  ...overrides,
});

test('one positive cycle is not enough for self-healing promotion', () => {
  const report = evaluateOidcPositiveCycles({ cycles: [cycle(1)] });
  assert.equal(report.positiveCycles, 1);
  assert.equal(report.selfHealingPromotionEligible, false);
  assert.equal(report.pass, false);
});

test('duplicate validation or run IDs do not count as independent cycles', () => {
  const report = evaluateOidcPositiveCycles({
    cycles: [
      cycle(1),
      cycle(2, { validationId: 'validation-1' }),
      cycle(3),
    ],
  });
  assert.equal(report.positiveCycles, 3);
  assert.equal(report.uniquePositiveCycles, false);
  assert.equal(report.pass, false);
});

test('three independent complete cycles permit promotion eligibility', () => {
  const report = evaluateOidcPositiveCycles({ cycles: [cycle(1), cycle(2), cycle(3)] });
  assert.equal(report.positiveCycles, 3);
  assert.equal(report.uniquePositiveCycles, true);
  assert.equal(report.selfHealingPromotionEligible, true);
  assert.equal(report.pass, true);
});

test('missing credential, login, token or session evidence fails closed', () => {
  for (const gate of ['credentialAuthenticationVerified', 'loginVerified', 'idTokenValidated', 'sessionEstablished']) {
    const broken = cycle(3);
    broken.gates[gate] = false;
    const report = evaluateOidcPositiveCycles({ cycles: [cycle(1), cycle(2), broken] });
    assert.equal(report.positiveCycles, 2);
    assert.equal(report.pass, false);
  }
});
