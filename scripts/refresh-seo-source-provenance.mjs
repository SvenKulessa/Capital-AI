/**
 * SEO source provenance maintenance: no automatic CI writes.
 * --check is read-only and fails closed; --write requires intentional review.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { SEO_CONTENT_MANIFEST } from '../shared/seo-content-manifest.mjs';
import { SEO_SOURCE_ARTIFACTS, seoSourceSetKey } from '../shared/seo-source-provenance.mjs';

const provenanceUrl = new URL('../shared/seo-source-provenance.mjs', import.meta.url);
const hash = (algorithm, bytes) => createHash(algorithm).update(bytes).digest('hex');
const escapeRegex = value => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');

function replaceExactlyOnce(content, pattern, replacement, key) {
  if ([...content.matchAll(pattern)].length !== 1) {
    throw new Error('Missing or ambiguous SEO source entry: ' + key);
  }
  return content.replace(pattern, replacement);
}

export async function calculateSeoSourceProvenanceUpdate() {
  const hashes = new Map();
  for (const sourcePath of Object.keys(SEO_SOURCE_ARTIFACTS)) {
    const bytes = await readFile(new URL('../' + sourcePath, import.meta.url));
    hashes.set(sourcePath, {
      sourceBlobSha: createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'),
      contentSha256: hash('sha256', bytes),
    });
  }
  const original = await readFile(provenanceUrl, 'utf8');
  let updated = original;
  for (const [sourcePath, value] of hashes) {
    const pattern = new RegExp(
      "('" + escapeRegex(sourcePath) + "': Object\\.freeze\\(\\{\\s*sourceBlobSha: ')" +
      "[0-9a-f]{40}(',\\s*contentSha256: ')[0-9a-f]{64}(')", 'g'
    );
    updated = replaceExactlyOnce(
      updated, pattern,
      (_, start, middle, end) => start + value.sourceBlobSha + middle + value.contentSha256 + end,
      sourcePath
    );
  }
  const sourceSets = new Map();
  for (const entry of SEO_CONTENT_MANIFEST) {
    const key = seoSourceSetKey(entry.sourceRefs);
    if (sourceSets.has(key)) continue;
    const material = [...entry.sourceRefs].sort().map(sourcePath => {
      const source = hashes.get(sourcePath);
      if (!source) throw new Error('Unknown SEO source: ' + sourcePath);
      return sourcePath + '\n' + source.sourceBlobSha + '\n' + source.contentSha256;
    }).join('\n--\n');
    sourceSets.set(key, hash('sha256', material));
  }
  for (const [key, digest] of sourceSets) {
    const pattern = new RegExp("('" + escapeRegex(key) + "': ')[0-9a-f]{64}(')", 'g');
    updated = replaceExactlyOnce(updated, pattern, (_, start, end) => start + digest + end, key);
  }
  return { original, updated, changed: original !== updated };
}

async function main() {
  const mode = process.argv[2] ?? '--check';
  if (!['--check', '--write'].includes(mode) || process.argv.length > 3) {
    throw new Error('Usage: node scripts/refresh-seo-source-provenance.mjs [--check|--write]');
  }
  const result = await calculateSeoSourceProvenanceUpdate();
  if (mode === '--check' && result.changed) {
    throw new Error('SEO provenance drift: review sources, then run npm run seo:provenance:refresh');
  }
  if (mode === '--write' && result.changed) {
    await writeFile(provenanceUrl, result.updated, 'utf8');
  }
  process.stdout.write(result.changed && mode === '--write'
    ? 'SEO source fingerprints updated; review the Git diff.\n'
    : 'SEO source provenance matches tracked source bytes.\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
