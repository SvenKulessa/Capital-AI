import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCiEfficiency } from './ci-efficiency-report.mjs';

test('summarizes workflow runtime, queue delay and observed job walltime without claiming billing', () => {
  const runs = [
    {
      id: 1,
      name: 'Docker Build Sicherheit',
      event: 'pull_request',
      conclusion: 'success',
      created_at: '2026-10-09T00:00:00Z',
      run_started_at: '2026-10-09T00:00:10Z',
      updated_at: '2026-10-09T00:03:40Z',
      html_url: 'https://example.invalid/1',
    },
    {
      id: 2,
      name: 'Docker Build Sicherheit',
      event: 'push',
      conclusion: 'failure',
      created_at: '2026-10-09T01:00:00Z',
      run_started_at: '2026-10-09T01:00:20Z',
      updated_at: '2026-10-09T01:04:20Z',
      html_url: 'https://example.invalid/2',
    },
    {
      id: 3,
      name: 'Social Renderer Worker Evidence',
      event: 'pull_request',
      conclusion: 'success',
      created_at: '2026-10-09T02:00:00Z',
      run_started_at: '2026-10-09T02:00:05Z',
      updated_at: '2026-10-09T02:08:05Z',
      html_url: 'https://example.invalid/3',
    },
  ];
  const jobsByRun = new Map([
    [1, [{ started_at: '2026-10-09T00:00:10Z', completed_at: '2026-10-09T00:03:40Z' }]],
    [2, [{ started_at: '2026-10-09T01:00:20Z', completed_at: '2026-10-09T01:04:20Z' }]],
    [3, [{ started_at: '2026-10-09T02:00:05Z', completed_at: '2026-10-09T02:08:05Z' }]],
  ]);

  const report = summarizeCiEfficiency({
    runs,
    jobsByRun,
    generatedAt: '2026-10-09T03:00:00Z',
    lookbackHours: 168,
    cacheUsage: { active_caches_count: 2, active_caches_size_in_bytes: 4096 },
  });

  assert.equal(report.measurements.runnerMinutes, 'OBSERVED_JOB_WALLTIME_NOT_BILLING');
  assert.equal(report.measurements.billedMinutes, 'NOT_PROVEN');
  assert.equal(report.measurements.cacheHitRate, 'NOT_PROVEN');
  assert.equal(report.cacheUsage.activeCachesCount, 2);

  const docker = report.workflows.find(row => row.workflow === 'Docker Build Sicherheit');
  assert.equal(docker.runs, 2);
  assert.equal(docker.success, 1);
  assert.equal(docker.failure, 1);
  assert.equal(docker.medianQueueSeconds, 10);
  assert.equal(docker.p95QueueSeconds, 20);
  assert.equal(docker.observedRunnerMinutes, 7.5);

  assert.equal(report.topExpensiveRuns[0].workflow, 'Social Renderer Worker Evidence');
  assert.equal(report.topExpensiveRuns[0].observedRunnerMinutes, 8);
});
