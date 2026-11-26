import { pathToFileURL } from 'node:url';

const PROJECT = /^[a-z][a-z0-9-]{4,29}$/;
const DATASET = /^[A-Za-z0-9_]{1,1024}$/;
const EXPORT = /^gcp_billing_export_(?:v1_|resource_v1_|focus_)[A-Za-z0-9_]+$/;

export async function discover({
  token,
  fetcher = fetch,
  maxCalls = 100,
  timeout = 10000
} = {}) {
  const report = {
    schema: 'CAPITAL_AI_BILLING_DISCOVERY@1',
    readOnly: true,
    projectsVisible: 0,
    projectsScanned: 0,
    datasetsVisible: 0,
    exportDatasetsVisible: 0,
    exportTablesVisible: 0,
    blockedProjects: 0,
    projectDiscovery: 'NOT_PROVEN',
    inventory: 'NOT_PROVEN',
    visibilityComplete: false,
    sqlJobsCreated: 0,
    productionExportAllowed: false,
    actualCostEur: null,
    costStatus: 'NOT_PROVEN'
  };

  if (typeof token !== 'string' ||
      token.length < 10 ||
      /\s/.test(token)) {
    return {...report, inventory: 'BLOCKED_TOKEN'};
  }

  let calls = 0;

  async function list(url, key, bigquery = false) {
    const rows = [];
    const seen = new Set();
    let cursor = '';

    for (let i = 0; i < 10; i++) {
      if (++calls > maxCalls) throw Error('LIMIT');

      const target = new URL(url);
      target.searchParams.set(
        bigquery ? 'maxResults' : 'pageSize', '100'
      );

      if (cursor) {
        target.searchParams.set('pageToken', cursor);
      }

      let res;

      try {
        res = await fetcher(target.toString(), {
          method: 'GET',
          redirect: 'error',
          headers: {
            Authorization: 'Bearer ' + token,
            Accept: 'application/json'
          },
          signal: AbortSignal.timeout(timeout)
        });
      } catch {
        throw Error('TRANSPORT');
      }

      if (res.status !== 200) {
        throw Error(
          [401,403].includes(res.status)
            ? 'ACCESS'
            : 'PROVIDER'
        );
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw Error('RESPONSE');
      }

      if (!data || typeof data !== 'object' ||
          Array.isArray(data)) {
        throw Error('RESPONSE');
      }

      const page = data[key] ?? [];

      if (!Array.isArray(page) ||
          page.length > 100 ||
          rows.length + page.length > 1000) {
        throw Error('RESPONSE');
      }

      rows.push(...page);

      const next = data.nextPageToken ?? '';

      if (typeof next !== 'string' ||
          next.length > 2048 ||
          seen.has(next)) {
        throw Error('PAGINATION');
      }

      if (!next) return rows;

      seen.add(next);
      cursor = next;
    }

    throw Error('LIMIT');
  }

  const projects = new Set(['aifinancial-500208']);

  try {
    const visible = await list(
      'https://cloudresourcemanager.googleapis.com/v3/projects:search',
      'projects'
    );

    const discovered = new Set();

    for (const p of visible) {
      if (!PROJECT.test(p?.projectId ?? '') ||
          discovered.has(p.projectId)) {
        throw Error('IDENTITY');
      }

      discovered.add(p.projectId);

      if (p.state === 'ACTIVE') {
        projects.add(p.projectId);
      }
    }

    report.projectDiscovery = 'VISIBLE_SCOPE_READ';
  } catch {
    report.projectDiscovery = 'PARTIAL_OR_BLOCKED';
  }

  report.projectsVisible = projects.size;

  if (projects.size > 25) {
    return {...report, inventory: 'BLOCKED_PROJECT_LIMIT'};
  }

  for (const project of projects) {
    const base =
      'https://bigquery.googleapis.com/bigquery/v2/projects/' +
      encodeURIComponent(project);

    try {
      const datasets = await list(
        base + '/datasets', 'datasets', true
      );

      const datasetIds = new Set();

      for (const d of datasets) {
        const ref = d?.datasetReference;

        if (ref?.projectId !== project ||
            !DATASET.test(ref.datasetId ?? '') ||
            datasetIds.has(ref.datasetId)) {
          throw Error('IDENTITY');
        }

        datasetIds.add(ref.datasetId);
      }

      report.datasetsVisible += datasetIds.size;

      for (const id of datasetIds) {
        const tables = await list(
          base + '/datasets/' +
          encodeURIComponent(id) + '/tables',
          'tables',
          true
        );

        const tableIds = new Set();

        for (const t of tables) {
          const ref = t?.tableReference;

          if (ref?.projectId !== project ||
              ref?.datasetId !== id ||
              typeof ref.tableId !== 'string' ||
              ref.tableId.length > 1024 ||
              tableIds.has(ref.tableId)) {
            throw Error('IDENTITY');
          }

          tableIds.add(ref.tableId);
        }

        const count = [...tableIds]
          .filter(t => EXPORT.test(t)).length;

        if (count > 0) {
          report.exportDatasetsVisible++;
          report.exportTablesVisible += count;
        }
      }

      report.projectsScanned++;
    } catch {
      report.blockedProjects++;
    }
  }

  report.inventory = report.exportTablesVisible > 0
    ? 'EXPORT_VISIBLE'
    : report.blockedProjects > 0 ||
      report.projectDiscovery !== 'VISIBLE_SCOPE_READ'
      ? 'PARTIAL_VISIBILITY'
      : 'NO_EXPORT_IN_VISIBLE_SCOPE';

  report.apiCalls = calls;

  return report;
}

if (process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await discover({
      token: process.env.GOOGLE_CLOUD_ADMIN_ACCESS_TOKEN
    });

    console.log(
      'CAI664_BILLING_DISCOVERY ' +
      JSON.stringify(report)
    );

    if (report.inventory.startsWith('BLOCKED')) {
      process.exitCode = 2;
    }
  } catch {
    console.error('CAI664_DISCOVERY_BLOCKED');
    process.exitCode = 2;
  }
}
