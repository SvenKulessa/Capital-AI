import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES } from './messages';
import { legalAvailabilityNotice } from './legalAvailability';

test('unreviewed legal pages remain German, with explicit visitor-language notices', () => {
  assert.equal(legalAvailabilityNotice.de, '');
  for (const {code} of LANGUAGES) {
    if (code === 'de') continue;
    assert.ok(legalAvailabilityNotice[code].length > 100, code);
  }
});
