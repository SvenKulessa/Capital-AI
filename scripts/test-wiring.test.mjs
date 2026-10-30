import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectTestWiring, repositoryTestSources } from './verify-test-wiring.mjs';

const fixture = entries => new Map(Object.entries(entries));

test('guard follows workflow package scripts, glob discovery and extensionless imports', () => {
  const files = fixture({
    'package.json': JSON.stringify({scripts:{test:'node --run test:unit','test:unit':'node --import tsx --test src/*.test.ts'}}),
    '.github/workflows/check.yml': 'jobs:\n  unit:\n    steps:\n      - run: |\n          node --run test\n',
    'src/main.test.ts': "import './nested/extra.test';",
    'src/nested/extra.test.ts': "import test from 'node:test'; test('extra',()=>{});",
  });
  assert.equal(inspectTestWiring(files).passed,true);
});

test('Docker COPY, comments, string reads and an unused manual script do not execute a test', () => {
  const files = fixture({
    'package.json':JSON.stringify({scripts:{manual:'node --test src/orphan.test.ts'}}),
    'Dockerfile': 'COPY src/orphan.test.ts ./src/\n# RUN node --test src/orphan.test.ts\nRUN node scripts/read.mjs\n',
    'scripts/read.mjs': "readFileSync('src/orphan.test.ts'); // import './orphan.test.ts'",
    'src/orphan.test.ts': "import test from 'node:test'; test('orphan',()=>{});",
  });
  assert.deepEqual(inspectTestWiring(files).unreferenced,['src/orphan.test.ts']);
});

test('export-only suites need an actual imported function call', () => {
  const files=fixture({
    'package.json':'{}',
    'Dockerfile':'RUN node scripts/collector.mjs',
    'scripts/collector.mjs':"import {runLegacySuite} from '../src/legacy.test.ts';",
    'src/legacy.test.ts':'export function runLegacySuite(){return {passed:true};}',
  });
  assert.deepEqual(inspectTestWiring(files).uncalledSuites,['src/legacy.test.ts:runLegacySuite']);
  files.set('scripts/collector.mjs',files.get('scripts/collector.mjs')+'\nfunction neverCalled(){runLegacySuite();}');
  assert.deepEqual(inspectTestWiring(files).uncalledSuites,['src/legacy.test.ts:runLegacySuite']);
  files.set('scripts/collector.mjs',files.get('scripts/collector.mjs')+'\nrunLegacySuite();');
  assert.equal(inspectTestWiring(files).passed,true);
});

test('erased TypeScript-only imports do not execute a test module', () => {
  const files=fixture({'package.json':'{}','Dockerfile':'RUN node src/main.ts','src/main.ts':"import {type Proof} from './orphan.test.ts';",'src/orphan.test.ts':'export type Proof = string;'});
  assert.deepEqual(inspectTestWiring(files).unreferenced,['src/orphan.test.ts']);
});

test('guard catches a future unreferenced file and handles cyclic package aliases', () => {
  const files=fixture({'package.json':JSON.stringify({scripts:{one:'node --run two',two:'node --run one'}}),'.github/workflows/a.yml':'run: node --run one','src/new.test.ts':''});
  assert.deepEqual(inspectTestWiring(files).unreferenced,['src/new.test.ts']);
});

test('BuildKit RUN options and runtime bind-mount Node tests count, echo does not', () => {
  const files=fixture({'package.json':JSON.stringify({scripts:{unused:'node --test src/orphan.test.ts'}}),'Dockerfile':'RUN --network=none node --test src/build.test.ts','.github/workflows/a.yml':'run: |\n  docker run --entrypoint node image --test /app/src/runtime.test.ts\n  echo "node --run unused"\n  # node --run unused\n','src/build.test.ts':'','src/runtime.test.ts':'','src/orphan.test.ts':''});
  assert.deepEqual(inspectTestWiring(files).unreferenced,['src/orphan.test.ts']);
});

test('all own Node tests in the checkout have executable references and legacy suite calls', () => {
  const result=inspectTestWiring(repositoryTestSources(process.cwd()));
  assert.equal(result.passed,true,JSON.stringify(result));
});
