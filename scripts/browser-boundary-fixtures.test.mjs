import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyBrowserBoundary } from './verify-browser-boundary.mjs';

async function fixture(files, run) {
  const root = await mkdtemp(path.join(tmpdir(), 'capital-ai-boundary-'));
  try {
    for (const [name, source] of Object.entries(files)) {
      const target = path.join(root, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, source);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('accepts safe executable browser code', () => fixture({
  'assets/app.js': 'const env = { mode: "browser" }; console.log(env.mode);',
  'index.html': '<main>CAPITAL-AI</main>'
}, async root => {
  const result = await verifyBrowserBoundary(root);
  assert.equal(result.status, 'PASS');
  assert.equal(result.checked, 2);
}));

test('documentation strings containing process.env stay allowed', () => fixture({
  'assets/docs.js': 'const example = "Use process.env on the server only";'
}, async root => {
  assert.equal((await verifyBrowserBoundary(root)).status, 'PASS');
}));

for (const [name, source, expected] of [
  ['dot access', 'console.log(process.env.API_KEY);', /Executable process\.env/],
  ['element access', 'console.log(process["env"].API_KEY);', /Executable process\.env/],
  ['server symbol', 'const x = "GEMINI_API_KEY";', /Server-only symbol/],
  ['server endpoint', 'fetch("https://api.telegram.org/bot");', /Server-only symbol/],
  ['server package', 'import("@google/genai");', /Server-only symbol/],
  ['server handler', 'window.x = handleAdvisorRequest;', /Server-only symbol/]
]) {
  test('rejects ' + name, () => fixture({ 'assets/app.js': source }, async root => {
    await assert.rejects(() => verifyBrowserBoundary(root), expected);
  }));
}

test('fails closed when no browser artifacts exist', () => fixture({
  'README.txt': 'not a browser artifact'
}, async root => {
  await assert.rejects(() => verifyBrowserBoundary(root), /No browser artifacts found/);
}));
