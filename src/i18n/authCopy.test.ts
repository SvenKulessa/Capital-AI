import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LANGUAGES } from './messages';
import { authCopy, authCopyKeys } from './authCopy';
test('auth presentation dictionary covers six languages', () => {
  for (const {code} of LANGUAGES) {
    assert.deepEqual(Object.keys(authCopy[code]), [...authCopyKeys]);
    for (const key of authCopyKeys) assert.ok(authCopy[code][key].trim(), `${code}/${key}`);
  }
});
