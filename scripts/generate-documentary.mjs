import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  projectDocumentaryRecord,
  renderDocumentaryMarkdown,
  validateDocumentaryEvidence,
} from '../src/platform/Documentary/Services/documentaryProjection.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_DIR = path.join(ROOT, 'documentary/evidence');

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), 'utf8'));
}

function canonicalize(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite numbers are not allowed in canonical JSON');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  throw new Error(`Unsupported canonical JSON value: ${typeof value}`);
}

function calculateDocumentaryDigest(record) {
  const digestInput = structuredClone(record);
  digestInput.integrity.documentaryDigest = null;
  return createHash('sha256').update(canonicalize(digestInput), 'utf8').digest('hex');
}

async function loadProjectionConfig() {
  const propagation = await readJson('contracts/platform/CHANGE_PROPAGATION@1.yaml');
  const growth = await readJson('contracts/growth/GROWTH_PROJECTION@1.yaml');

  const target = propagation?.projections?.documentary?.target;
  if (target !== 'generated/documentary/') {
    throw new Error(`Unexpected documentary target: ${String(target)}`);
  }

  const renderTargets = growth?.documentary?.renderTargets ?? [];
  if (!renderTargets.includes('markdown') || !renderTargets.includes('json')) {
    throw new Error('GROWTH_PROJECTION@1 must enable documentary markdown and json render targets');
  }
  if (growth?.integrity?.generatedFiles?.editableByHand !== false) {
    throw new Error('Generated documentary files must remain non-editable by hand');
  }

  return { outputDir: path.join(ROOT, target), outputTarget: target };
}

async function loadEvidenceRecords() {
  const names = (await fs.readdir(EVIDENCE_DIR))
    .filter((name) => name.endsWith('.json'))
    .sort();

  if (!names.length) throw new Error('No Documentary evidence records found');

  const records = [];
  const ids = new Set();
  const changeIds = new Set();

  for (const name of names) {
    const record = JSON.parse(await fs.readFile(path.join(EVIDENCE_DIR, name), 'utf8'));
    const failures = validateDocumentaryEvidence(record);
    if (failures.length) {
      throw new Error(`${name}: documentary validation failed: ${failures.join('; ')}`);
    }

    const expectedDigest = calculateDocumentaryDigest(record);
    if (record.integrity.documentaryDigest !== expectedDigest) {
      throw new Error(
        `${name}: documentaryDigest mismatch; expected ${expectedDigest}, got ${record.integrity.documentaryDigest}`,
      );
    }

    if (ids.has(record.identity.documentaryId)) {
      throw new Error(`Duplicate documentaryId: ${record.identity.documentaryId}`);
    }
    if (changeIds.has(record.correlation.changeId)) {
      throw new Error(`Duplicate changeId: ${record.correlation.changeId}`);
    }
    ids.add(record.identity.documentaryId);
    changeIds.add(record.correlation.changeId);
    records.push(record);
  }

  return records.sort((left, right) => {
    const byTime = left.identity.createdAt.localeCompare(right.identity.createdAt);
    return byTime || left.identity.documentaryId.localeCompare(right.identity.documentaryId);
  });
}

function buildExpectedOutputs(records) {
  const outputs = new Map();
  const indexEntries = [];

  for (const record of records) {
    const id = record.identity.documentaryId;
    const projected = projectDocumentaryRecord(record, 'engineering');
    const jsonName = `${id}.json`;
    const markdownName = `${id}.md`;

    const payload = {
      generated: true,
      editableByHand: false,
      audience: 'engineering',
      source: {
        schema: record.schema,
        schemaVersion: record.version,
        documentaryId: id,
        changeId: record.correlation.changeId,
        sourceSha: record.identity.sourceSha,
        documentaryDigest: record.integrity.documentaryDigest,
      },
      documentary: projected,
    };

    outputs.set(jsonName, `${JSON.stringify(payload, null, 2)}\n`);
    outputs.set(markdownName, renderDocumentaryMarkdown(record, 'engineering'));

    indexEntries.push({
      documentaryId: id,
      changeId: record.correlation.changeId,
      createdAt: record.identity.createdAt,
      lifecycle: record.state.lifecycle,
      sourceSha: record.identity.sourceSha,
      schema: record.schema,
      schemaVersion: record.version,
      documentaryDigest: record.integrity.documentaryDigest,
      json: `generated/documentary/${jsonName}`,
      markdown: `generated/documentary/${markdownName}`,
    });
  }

  const index = {
    generated: true,
    editableByHand: false,
    sourceSchema: 'DOCUMENTARY_EVIDENCE@1',
    schemaVersion: '1.0.0',
    chronology: 'identity.createdAt ASC, documentaryId ASC',
    entries: indexEntries,
  };
  outputs.set('index.json', `${JSON.stringify(index, null, 2)}\n`);

  return outputs;
}

async function writeOutputs(outputDir, outputs) {
  await fs.mkdir(outputDir, { recursive: true });
  for (const [name, content] of outputs) {
    await fs.writeFile(path.join(outputDir, name), content, 'utf8');
  }
}

async function checkOutputs(outputDir, outputs) {
  const failures = [];
  let existing = [];
  try {
    existing = (await fs.readdir(outputDir)).filter((name) => name.endsWith('.json') || name.endsWith('.md')).sort();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return ['generated/documentary/ is missing'];
    }
    throw error;
  }

  const expectedNames = [...outputs.keys()].sort();
  const unexpected = existing.filter((name) => !outputs.has(name));
  const missing = expectedNames.filter((name) => !existing.includes(name));
  if (unexpected.length) failures.push(`unexpected generated files: ${unexpected.join(', ')}`);
  if (missing.length) failures.push(`missing generated files: ${missing.join(', ')}`);

  for (const [name, expected] of outputs) {
    try {
      const actual = await fs.readFile(path.join(outputDir, name), 'utf8');
      if (actual !== expected) failures.push(`stale generated file: ${name}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  return failures;
}

export async function runDocumentaryProjection({ mode = 'check' } = {}) {
  const { outputDir } = await loadProjectionConfig();
  const records = await loadEvidenceRecords();
  const outputs = buildExpectedOutputs(records);

  if (mode === 'write') {
    await writeOutputs(outputDir, outputs);
    return { passed: true, records: records.length, outputs: outputs.size, failures: [] };
  }
  if (mode !== 'check') throw new Error(`Unsupported Documentary projection mode: ${mode}`);

  const failures = await checkOutputs(outputDir, outputs);
  return { passed: failures.length === 0, records: records.length, outputs: outputs.size, failures };
}

const mode = process.argv.includes('--write') ? 'write' : 'check';
const result = await runDocumentaryProjection({ mode });

if (!result.passed) {
  console.error('Documentary projection check failed:', result.failures);
  process.exitCode = 1;
} else {
  console.log(
    `✓ Documentary ${mode} passed: ${result.records} evidence record(s), ${result.outputs} deterministic output(s).`,
  );
}
