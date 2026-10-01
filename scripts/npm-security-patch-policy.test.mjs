import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('deploy/npm-security-patches/package.json', 'utf8'));
const lock = JSON.parse(readFileSync('deploy/npm-security-patches/package-lock.json', 'utf8'));
const hardener = readFileSync('scripts/harden-npm-toolchain.mjs', 'utf8');

const fixed = '5.0.12';
const integrity = 'sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==';

test('brace-expansion donor is pinned above CVE-2026-102277 affected range', () => {
  assert.equal(packageJson.dependencies['brace-expansion'], fixed);
  assert.equal(lock.packages[''].dependencies['brace-expansion'], fixed);

  const entry = lock.packages['node_modules/brace-expansion'];
  assert.equal(entry.version, fixed);
  assert.equal(entry.resolved, 'https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.12.tgz');
  assert.equal(entry.integrity, integrity);
  assert.equal(entry.license, 'MIT');
  assert.equal(entry.dependencies['balanced-match'], '^4.0.2');
});

test('npm hardener cannot silently regress brace-expansion to 5.0.11', () => {
  assert.match(hardener, /\['brace-expansion', '5\.0\.9', '5\.0\.12'\]/);
  assert.doesNotMatch(hardener, /\['brace-expansion', '5\.0\.9', '5\.0\.11'\]/);
});

test('major upgrade preserves the vendor patch and removes npm from runtime', () => {
  const dockerfile = readFileSync('Dockerfile', 'utf8');
  assert.match(dockerfile, /npm install --global npm@12\.2\.0 --ignore-scripts/);
  assert.match(hardener, /version !== '12\.2\.0'/);
  assert.match(dockerfile, /node \/opt\/harden-npm-toolchain\.mjs/);
  assert.match(dockerfile.split('FROM crypto-base AS runtime')[1], /\/usr\/local\/lib\/node_modules\/npm/);
});

test('IP parser remediation is an integrity-locked compatible bundle replacement', () => {
  const entry = lock.packages['node_modules/ip-address'];
  assert.equal(packageJson.dependencies['ip-address'], '10.7.2');
  assert.equal(entry.version, '10.7.2');
  assert.equal(entry.resolved, 'https://registry.npmjs.org/ip-address/-/ip-address-10.7.2.tgz');
  assert.equal(entry.integrity, 'sha512-7H/2gFSIitxc0hG3nOI1glS8QLo/EHBFFLk8vEUjXY/xu0AdL8jZ9U1IzO2PUm0d2D/ofQcAifb0g6OBkt8U7w==');
  assert.equal(entry.license, 'MIT');
  assert.match(hardener, /\['ip-address', '10\.5\.0', '10\.7\.2'\]/);
  assert.match(hardener, /Address4\.fromArpa\('42\.2\.0\.192\.IN-ADDR\.ARPA'\)/);
  assert.match(hardener, /Address6\.fromArpa\('8\.B\.D\.0\.1\.0\.0\.2\.IP6\.ARPA'\)/);
});

test('undici remediation stays on the npm-compatible 6.x donor line with locked integrity', () => {
  const entry = lock.packages['node_modules/undici'];
  assert.equal(packageJson.dependencies.undici, '6.29.0');
  assert.equal(entry.version, '6.29.0');
  assert.equal(entry.resolved, 'https://registry.npmjs.org/undici/-/undici-6.29.0.tgz');
  assert.equal(entry.integrity, 'sha512-R+RODBqp6i2pPflGdq+xIOUkl+RNfGgHwoinecKu/JCuf2uO06cOKoDbI2P7Dn6KcswdKwrczbU6IYJ6K8X+wg==');
  assert.equal(entry.license, 'MIT');
  assert.match(hardener, /\['undici', '6\.28\.0', '6\.29\.0'\]/);
});
