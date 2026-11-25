import test from 'node:test';
import assert from 'node:assert/strict';
import { discover } from './google-billing-export-discovery.mjs';

const token = 'synthetic-token-for-tests';
const project = 'aifinancial-500208';
const dataset = 'private_dataset_test';

const ok = data => ({
  status: 200,
  json: async () => data
});

test('empty inventory stays cost NOT_PROVEN', async () => {
  const r = await discover({
    token,
    fetcher: async () => ok({})
  });

  assert.equal(r.exportTablesVisible, 0);
  assert.equal(r.costStatus, 'NOT_PROVEN');
  assert.equal(r.visibilityComplete, false);
  assert.equal(r.sqlJobsCreated, 0);
});

test('missing token performs no requests', async () => {
  const r = await discover({
    token: '',
    fetcher: async () => assert.fail()
  });

  assert.equal(r.inventory, 'BLOCKED_TOKEN');
});

test('403 does not imply absent exports', async () => {
  const r = await discover({
    token,
    fetcher: async () => ({status: 403})
  });

  assert.equal(r.inventory, 'PARTIAL_VISIBILITY');
  assert.equal(r.blockedProjects, 1);
});

test('transport timeout remains partial', async () => {
  const r = await discover({
    token,
    fetcher: async () => {
      throw Error('synthetic timeout');
    }
  });

  assert.equal(r.inventory, 'PARTIAL_VISIBILITY');
});

test('reject foreign dataset identity', async () => {
  const r = await discover({
    token,
    fetcher: async url =>
      url.includes('projects:search')
        ? ok({})
        : ok({datasets: [{
            datasetReference: {
              projectId: 'foreign-project',
              datasetId: dataset
            }
          }]})
  });

  assert.equal(r.blockedProjects, 1);
});

test('detect export without leaking identifiers', async () => {
  const r = await discover({
    token,
    fetcher: async (url, options) => {
      assert.equal(options.method, 'GET');

      if (url.includes('projects:search')) {
        return ok({});
      }

      if (url.includes('/tables')) {
        return ok({tables: [{
          tableReference: {
            projectId: project,
            datasetId: dataset,
            tableId: 'gcp_billing_export_v1_PRIVATE'
          }
        }]});
      }

      return ok({datasets: [{
        datasetReference: {
          projectId: project,
          datasetId: dataset
        }
      }]});
    }
  });

  assert.equal(r.exportTablesVisible, 1);
  assert.equal(r.inventory, 'EXPORT_VISIBLE');

  const output = JSON.stringify(r);
  assert.equal(output.includes(dataset), false);
  assert.equal(output.includes(project), false);
  assert.equal(output.includes('PRIVATE'), false);
  assert.equal(output.includes(token), false);
});

test('pagination loop is bounded', async () => {
  const r = await discover({
    token,
    fetcher: async () =>
      ok({nextPageToken: 'repeat'})
  });

  assert.equal(r.inventory, 'PARTIAL_VISIBILITY');
});

test('request budget is bounded', async () => {
  let calls = 0;

  await discover({
    token,
    maxCalls: 1,
    fetcher: async () => {
      calls++;
      return ok({});
    }
  });

  assert.equal(calls, 1);
});
