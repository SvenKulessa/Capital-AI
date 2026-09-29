import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function blueprint(profile, image) {
  // Configuration generation only. Security/attestation verification is a separate mandatory gate.
  const expected = `${profile.registryRepository}@sha256:`;
  if (!image?.startsWith(expected) || !/^[a-f0-9]{64}$/.test(image.slice(expected.length))) {
    throw new Error('Expected exact Capital-AI GHCR sha256 image reference; tags are rejected');
  }
  const quote = value => JSON.stringify(value);
  return `# Apply only in workspace ${profile.workspaceName} (${profile.workspaceId}).\n` +
    `# Apply only after all five release gates pass for this exact image.\n` +
    `services:\n  - type: web\n    name: ${quote(profile.serviceName)}\n` +
    `    runtime: image\n    image:\n      url: ${quote(image)}\n` +
    `    region: ${quote(profile.region)}\n    plan: ${quote(profile.plan)}\n` +
    `    numInstances: ${profile.instances}\n    healthCheckPath: ${quote(profile.healthCheckPath)}\n` +
    `    renderSubdomainPolicy: enabled\n    maxShutdownDelaySeconds: 15\n` +
    `    previews:\n      generation: off\n` +
    `    envVars:\n      - key: NODE_ENV\n        value: production\n` +
    `      - key: PORT\n        value: ${quote(String(profile.port))}\n` +
    `      - key: MARKET_SYMBOLS\n        value: ${quote(profile.marketSymbols)}\n` +
    profile.requiredRuntimeSecrets.map(key => `      - key: ${key}\n        sync: false\n`).join('');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const profile = JSON.parse(await readFile(new URL('../deploy/render-image-profile.json', import.meta.url), 'utf8'));
    process.stdout.write(blueprint(profile, process.argv[2]));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
