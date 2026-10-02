import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The local preflight is also rerun by CI; local results never replace the required gate.
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--full') || args.length > 1) {
  console.error('Usage: node scripts/preflight.mjs [--full]');
  process.exit(2);
}
const run = (command, argv) => {
  const result = spawnSync(command, argv, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) {
    console.error(`Preflight failed: ${command} ${argv.join(' ')}`);
    process.exit(result.status || 1);
  }
};
run(process.execPath, ['--test',
  'scripts/docker-context.test.mjs', 'scripts/container-evidence-identity.test.mjs', 'scripts/license-evidence.test.mjs',
  'scripts/summarize-trivy.test.mjs', 'scripts/publish-security-summary.test.mjs', 'scripts/production-handoff.test.mjs',
  'scripts/diagnose-oidc.test.mjs', 'scripts/verify-main-ruleset.test.mjs', 'scripts/npm-security-patch-policy.test.mjs',
  'scripts/percentage-parser.test.mjs',
  'server/observability.test.mjs',
  'server/cads-observability.test.mjs',
  'scripts/font-distribution.test.mjs',
  'scripts/post-merge-correlation.test.mjs',
  'scripts/verify-release-readiness.test.mjs',
]);
run(process.execPath, ['scripts/license-evidence.mjs']);
if (args.includes('--full')) {
  // Run npm ci --ignore-scripts before this mode; it never installs packages implicitly.
  run('npm', ['run', 'lint']);
  run('npm', ['test']);
  run('npm', ['run', 'test:security']);
  run('npm', ['run', 'test:navigation']);
  run('npm', ['run', 'build']);
  run('npm', ['run', 'verify:browser']);
}
console.log('PASS: preflight' + (args.includes('--full') ? ' (full)' : ' (dependency-free)'));
