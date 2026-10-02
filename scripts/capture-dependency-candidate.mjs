import fs from 'node:fs';

export function captureCandidate({ lock, evidence }) {
  const root = lock?.packages?.[''] || {};
  const packageNode = lock?.packages?.['node_modules/typescript'];
  const nativeName = evidence?.fingerprint?.nativeArtifact?.packageName;
  const nativeNode = nativeName ? lock?.packages?.['node_modules/' + nativeName] : null;
  const requested = root?.devDependencies?.typescript ?? root?.dependencies?.typescript ?? null;
  return {
    schema: 'CAPITAL_AI_DEPENDENCY_CANDIDATE@1',
    name: evidence?.dependency?.name ?? 'typescript',
    version: packageNode?.version ?? requested,
    fingerprint: {
      packageIntegrity: packageNode?.integrity ?? null,
      nativeArtifactIntegrity: nativeNode?.integrity ?? null,
      binarySha256: null,
      embeddedRuntime: null,
      securityEvidenceRevision: null
    }
  };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const [evidenceFile, outputFile] = process.argv.slice(2);
  if (!evidenceFile) {
    console.error('Usage: node scripts/capture-dependency-candidate.mjs <evidence.json> [output.json]');
    process.exit(2);
  }
  const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  const candidate = captureCandidate({ lock, evidence });
  const json = JSON.stringify(candidate, null, 2) + '\n';
  if (outputFile) fs.writeFileSync(outputFile, json);
  else process.stdout.write(json);
}
