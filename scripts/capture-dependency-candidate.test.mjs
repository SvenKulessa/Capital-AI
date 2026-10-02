import test from 'node:test';
import assert from 'node:assert/strict';
import { captureCandidate } from './capture-dependency-candidate.mjs';

test('captures root and native package integrity from lockfile', () => {
  const evidence = { dependency:{name:'typescript'}, fingerprint:{nativeArtifact:{packageName:'@typescript/typescript-linux-x64'}} };
  const lock = { packages: {
    '': { devDependencies:{typescript:'7.0.3'} },
    'node_modules/typescript': { version:'7.0.3', integrity:'sha512-root' },
    'node_modules/@typescript/typescript-linux-x64': { version:'7.0.3', integrity:'sha512-native' }
  }};
  const r = captureCandidate({ lock, evidence });
  assert.equal(r.version,'7.0.3');
  assert.equal(r.fingerprint.packageIntegrity,'sha512-root');
  assert.equal(r.fingerprint.nativeArtifactIntegrity,'sha512-native');
});
