import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LANGUAGES } from './messages';
import { sectionKeys, sectionMessages } from './landingSectionCopy';
test('all six languages have complete localized landing-section copy', () => {
  for (const {code} of LANGUAGES) {
    const dictionary = sectionMessages[code];
    assert.deepEqual(Object.keys(dictionary), [...sectionKeys], code);
    for (const key of sectionKeys) assert.ok(dictionary[key]?.trim(), `${code}: ${key}`);
  }
});
test('dynamic source-backed claims are not replaced by unverified translations', () => {
  assert.match(sectionMessages.en.contractOriginal, /German/);
  assert.match(sectionMessages.de.campaignRule, /Contracts/);
});
