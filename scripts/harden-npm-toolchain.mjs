import { readFileSync, cpSync, rmSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// Temporary build-only vendor patch until npm publishes fixed bundled dependencies.
// Donors must be installed with npm ci from deploy/npm-security-patches/package-lock.json.
const [targetArg, donorArg] = process.argv.slice(2);
if (!targetArg || !donorArg) throw new Error('Expected npm root and locked donor node_modules');
const target = realpathSync(targetArg), donors = realpathSync(donorArg);
const read = p => JSON.parse(readFileSync(p, 'utf8'));
if (read(path.join(target, 'package.json')).version !== '12.2.0') throw new Error('Unexpected npm version');
const require = createRequire(path.join(target, 'package.json'));
const semver = require('./node_modules/semver');
const lock = read(path.join(donors, '..', 'package-lock.json'));
const changes = [['brace-expansion', '5.0.9', '5.0.12'], ['undici', '6.28.0', '6.29.0'], ['ip-address', '10.5.0', '10.7.2']];
// Validate the entire plan before changing any installed code.
for (const [name, before, after] of changes) {
  const old = read(path.join(target, 'node_modules', name, 'package.json'));
  const donor = read(path.join(donors, name, 'package.json'));
  const entry = lock.packages[`node_modules/${name}`];
  if (old.name !== name || old.version !== before || donor.name !== name || donor.version !== after ||
      entry.version !== after || entry.resolved !== `https://registry.npmjs.org/${name}/-/${name}-${after}.tgz` ||
      !entry.integrity?.startsWith('sha512-') || !semver.satisfies(process.versions.node, donor.engines.node)) {
    throw new Error(`Unexpected patch input for ${name}`);
  }
  for (const [dependency, range] of Object.entries(donor.dependencies || {})) {
    const installed = read(path.join(target, 'node_modules', dependency, 'package.json'));
    if (!semver.satisfies(installed.version, range)) throw new Error(`Incompatible ${name} dependency`);
  }
}
for (const [name, , after] of changes) {
  const destination = path.join(target, 'node_modules', name);
  rmSync(destination, { recursive: true });
  cpSync(path.join(donors, name), destination, { recursive: true });
  if (read(path.join(destination, 'package.json')).version !== after) throw new Error('Patch verification failed');
}
// Exercise actual consumers, not only package version labels.
const { minimatch } = require('./node_modules/minimatch');
if (!minimatch('source.ts', '*.{ts,js}')) throw new Error('Patched brace consumer failed');
const { Request } = require('./node_modules/undici');
if (new Request('https://example.invalid/').method !== 'GET') throw new Error('Patched undici failed');
const { Address4, Address6 } = require('./node_modules/ip-address');
if (new Address4('192.0.2.1/24').correctForm() !== '192.0.2.1' ||
    new Address6('2001:db8::1').correctForm() !== '2001:db8::1' ||
    Address4.fromArpa('42.2.0.192.IN-ADDR.ARPA').correctForm() !== '192.0.2.42' ||
    Address6.fromArpa('8.B.D.0.1.0.0.2.IP6.ARPA').networkForm() !== '2001:db8::/32') {
  throw new Error('Patched IP address parser failed');
}
console.log(JSON.stringify({ npm: '12.2.0', vendorPatched: true, dependencies: Object.fromEntries(changes.map(([name, , version]) => [name, version])) }));
