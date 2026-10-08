import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LANGUAGES, messageKeys, messageArrays, messages } from './messages';
test('all six dictionaries include the complete landing strings', () => {
  for (const {code} of LANGUAGES) {
    assert.equal(messageArrays[code].length, messageKeys.length, code);
    for (const key of messageKeys) assert.ok(messages[code][key], `${code}: ${key}`);
  }
});
