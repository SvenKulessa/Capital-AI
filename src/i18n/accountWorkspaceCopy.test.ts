import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES } from './messages';
import { accountCopy, accountCopyKeys } from './accountWorkspaceCopy';
test('account and workspace catalog has identical nonblank keys for all six locales', () => {
  for (const {code} of LANGUAGES) {
    assert.deepEqual(Object.keys(accountCopy[code]), [...accountCopyKeys], code);
    for (const key of accountCopyKeys) assert.ok(accountCopy[code][key].trim(), `${code}/${key}`);
  }
});
test('disabled runtime and private data boundaries are explained in every locale', () => {
  for (const {code} of LANGUAGES) {
    assert.ok(accountCopy[code].wsRuntime.length > 50, code);
    assert.ok(accountCopy[code].wsModuleIntro.length > 160, code);
  }
});
