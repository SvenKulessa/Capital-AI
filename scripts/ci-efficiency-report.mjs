import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPOSITORY = 'SvenKulessa/Capital-AI';
const API = 'https://api.github.com';

function secondsBetween(start, end) {
  if (!start || !end) return null;
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return (b - a) / 1000;
}

function percentile(values, p) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const index = Math.min(clean.length - 1, Math.max(0, Math.ceil((p / 100) * clean.length) - 1));
  return clean[index];
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function summarizeCiEfficiency({
  runs,
  jobsByRun = new Map(),
  generatedAt = new Date().toISOString(),
  lookbackHours = 168,
  truncated = false,
  cacheUsage = null,
}) {
  const workflows = new Map();
  const expensiveRuns = [];

  for (const run of runs) {
    const name = run.name || run.workflow_name || 'UNKNOWN_WORKFLOW';
    const entry = workflows.get(name) || {
      workflow: name,
      runs: 0,
      success: 0,
      failure: 0,
      cancelled: 0,
      other: 0,
      runSeconds: [],
      queueSeconds: [],
      jobWallSeconds: [],
    };

    entry.runs += 1;
    if (run.conclusion === 'success') entry.success += 1;
    else if (run.conclusion === 'failure') entry.failure += 1;
    else if (run.conclusion === 'cancelled') entry.cancelled += 1;
    else entry.other += 1;

    const runSeconds = secondsBetween(run.run_started_at || run.created_at, run.updated_at);
    const queueSeconds = secondsBetween(run.created_at, run.run_started_at);
    if (runSeconds !== null) entry.runSeconds.push(runSeconds);
    if (queueSeconds !== null) entry.queueSeconds.push(queueSeconds);

    const jobs = jobsByRun.get(Number(run.id)) || jobsByRun.get(String(run.id)) || [];
    let jobWall = 0;
    let observedJobs = 0;
    for (const job of jobs) {
      const seconds = secondsBetween(job.started_at, job.completed_at);
      if (seconds !== null) {
        jobWall += seconds;
        observedJobs += 1;
      }
    }
    if (observedJobs > 0) entry.jobWallSeconds.push(jobWall);

    expensiveRuns.push({
      runId: Number(run.id),
      workflow: name,
      event: run.event || null,
      conclusion: run.conclusion || null,
      htmlUrl: run.html_url || null,
      runSeconds: round(runSeconds),
      observedJobWallSeconds: observedJobs > 0 ? round(jobWall) : null,
      observedRunnerMinutes: observedJobs > 0 ? round(jobWall / 60) : null,
      queueSeconds: round(queueSeconds),
      createdAt: run.created_at || null,
      startedAt: run.run_started_at || null,
      updatedAt: run.updated_at || null,
    });

    workflows.set(name, entry);
  }

  const workflowRows = [...workflows.values()].map(entry => {
    const totalJobWall = entry.jobWallSeconds.reduce((sum, value) => sum + value, 0);
    return {
      workflow: entry.workflow,
      runs: entry.runs,
      success: entry.success,
      failure: entry.failure,
      cancelled: entry.cancelled,
      other: entry.other,
      medianRunSeconds: round(percentile(entry.runSeconds, 50)),
      p95RunSeconds: round(percentile(entry.runSeconds, 95)),
      maxRunSeconds: round(entry.runSeconds.length ? Math.max(...entry.runSeconds) : null),
      medianQueueSeconds: round(percentile(entry.queueSeconds, 50)),
      p95QueueSeconds: round(percentile(entry.queueSeconds, 95)),
      maxQueueSeconds: round(entry.queueSeconds.length ? Math.max(...entry.queueSeconds) : null),
      observedJobWallSeconds: round(totalJobWall),
      observedRunnerMinutes: round(totalJobWall / 60),
      runnerMinuteEvidence: entry.jobWallSeconds.length ? 'OBSERVED_JOB_WALLTIME_NOT_BILLING' : 'NOT_PROVEN',
    };
  }).sort((a, b) => (b.observedRunnerMinutes || 0) - (a.observedRunnerMinutes || 0));

  expensiveRuns.sort((a, b) => (b.observedJobWallSeconds || b.runSeconds || 0) - (a.observedJobWallSeconds || a.runSeconds || 0));

  return {
    schema: 'CAPITAL_AI_CI_EFFICIENCY_EVIDENCE@1',
    generatedAt,
    lookbackHours,
    truncated,
    measurements: {
      workflowRuntime: 'VERIFIED_FROM_GITHUB_ACTIONS_TIMESTAMPS',
      queueDelay: 'VERIFIED_WHEN_CREATED_AT_AND_RUN_STARTED_AT_ARE_PRESENT',
      runnerMinutes: 'OBSERVED_JOB_WALLTIME_NOT_BILLING',
      billedMinutes: 'NOT_PROVEN',
      cacheHitRate: 'NOT_PROVEN',
      cacheHitRateReason: 'GitHub Actions cache usage exposes active cache count/bytes but not a repository-wide hit/miss rate.',
    },
    cacheUsage: cacheUsage ? {
      activeCachesCount: cacheUsage.active_caches_count ?? null,
      activeCachesSizeBytes: cacheUsage.active_caches_size_in_bytes ?? null,
      evidenceState: 'CURRENT_USAGE_ONLY_NOT_HIT_RATE',
    } : {
      activeCachesCount: null,
      activeCachesSizeBytes: null,
      evidenceState: 'NOT_PROVEN',
    },
    workflows: workflowRows,
    topExpensiveRuns: expensiveRuns.slice(0, 20),
  };
}

async function githubJson(route, token) {
  const response = await fetch(API + route, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'capital-ai-ci-efficiency-evidence',
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GITHUB_API_${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

async function mapLimit(items, limit, mapper) {
  const result = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      result[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => worker()));
  return result;
}

async function collectRuns(repository, token, sinceMs, maxRuns) {
  const collected = [];
  let truncated = false;
  for (let page = 1; page <= 20; page++) {
    const data = await githubJson(`/repos/${repository}/actions/runs?per_page=100&page=${page}`, token);
    const pageRuns = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
    if (!pageRuns.length) break;

    let reachedOld = false;
    for (const run of pageRuns) {
      const created = Date.parse(run.created_at || '');
      if (Number.isFinite(created) && created < sinceMs) {
        reachedOld = true;
        continue;
      }
      collected.push(run);
      if (collected.length >= maxRuns) {
        truncated = true;
        return { runs: collected, truncated };
      }
    }
    if (reachedOld || pageRuns.length < 100) break;
  }
  return { runs: collected, truncated };
}

async function collectJobs(repository, token, runs) {
  const pairs = await mapLimit(runs, 8, async run => {
    const data = await githubJson(`/repos/${repository}/actions/runs/${run.id}/jobs?per_page=100&filter=latest`, token);
    return [Number(run.id), Array.isArray(data.jobs) ? data.jobs : []];
  });
  return new Map(pairs);
}

async function collectCacheUsage(repository, token) {
  try {
    return await githubJson(`/repos/${repository}/actions/cache/usage`, token);
  } catch (error) {
    process.stderr.write(`CACHE_USAGE_NOT_PROVEN: ${error.message}\n`);
    return null;
  }
}

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN_REQUIRED');
  const repository = process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY;
  const lookbackHours = Number.parseInt(process.env.CI_LOOKBACK_HOURS || '168', 10);
  const maxRuns = Number.parseInt(process.env.CI_MAX_RUNS || '300', 10);
  if (!Number.isSafeInteger(lookbackHours) || lookbackHours <= 0 || lookbackHours > 24 * 31) {
    throw new Error('CI_LOOKBACK_HOURS_OUT_OF_RANGE');
  }
  if (!Number.isSafeInteger(maxRuns) || maxRuns <= 0 || maxRuns > 1000) {
    throw new Error('CI_MAX_RUNS_OUT_OF_RANGE');
  }

  const generatedAt = new Date().toISOString();
  const sinceMs = Date.now() - lookbackHours * 60 * 60 * 1000;
  const { runs, truncated } = await collectRuns(repository, token, sinceMs, maxRuns);
  const jobsByRun = await collectJobs(repository, token, runs);
  const cacheUsage = await collectCacheUsage(repository, token);
  const report = summarizeCiEfficiency({ runs, jobsByRun, generatedAt, lookbackHours, truncated, cacheUsage });

  const output = process.env.CI_EFFICIENCY_OUTPUT || 'ci-efficiency-evidence.json';
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');

  process.stdout.write(JSON.stringify({
    output,
    workflows: report.workflows.length,
    runs: runs.length,
    truncated,
    totalObservedRunnerMinutes: round(report.workflows.reduce((sum, row) => sum + (row.observedRunnerMinutes || 0), 0)),
    cacheHitRate: report.measurements.cacheHitRate,
  }) + '\n');
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
