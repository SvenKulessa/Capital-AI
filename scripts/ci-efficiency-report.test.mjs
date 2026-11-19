import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCiEfficiency, collectJobs } from './ci-efficiency-report.mjs';

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

test('ranks measured CI bottleneck steps without treating skipped steps as runtime', () => {
  const runs = [
    { id: 11, name: 'Docker Build Sicherheit', conclusion: 'success',
      created_at: '2026-10-11T07:00:00Z', run_started_at: '2026-10-11T07:00:05Z',
      updated_at: '2026-10-11T07:03:00Z' },
    { id: 12, name: 'Docker Build Sicherheit', conclusion: 'failure',
      created_at: '2026-10-11T08:00:00Z', run_started_at: '2026-10-11T08:00:05Z',
      updated_at: '2026-10-11T08:03:00Z' },
  ];
  const job = (start, buildSeconds, conclusion) => {
    const timestamp = seconds => new Date(Date.parse(start) + seconds * 1000).toISOString();
    return [{
      name: 'Docker Security Gate',
      started_at: timestamp(0),
      completed_at: timestamp(180),
      steps: [
        { name: 'Build-Stufe scannen', status: 'completed', conclusion,
          started_at: timestamp(10), completed_at: timestamp(10 + buildSeconds) },
        { name: 'Lizenzinventar', status: 'completed', conclusion: 'success',
          started_at: timestamp(165), completed_at: timestamp(180) },
        { name: 'NATS voll scannen', status: 'completed', conclusion: 'skipped',
          started_at: timestamp(0), completed_at: timestamp(0) },
        { name: 'No timestamps', status: 'completed', conclusion: 'success' },
      ],
    }];
  };
  const jobsByRun = new Map([
    [11, job('2026-10-11T07:00:05Z', 100, 'success')],
    [12, job('2026-10-11T08:00:05Z', 150, 'failure')],
  ]);
  const report = summarizeCiEfficiency({ runs, jobsByRun });
  assert.equal(report.measurements.stepWalltime, 'OBSERVED_STEP_WALLTIME_NOT_BILLING');
  assert.equal(report.measurements.billedMinutes, 'NOT_PROVEN');
  assert.equal(report.topSlowSteps.length, 2);
  assert.equal(report.topSlowSteps[0].step, 'Build-Stufe scannen');
  assert.equal(report.topSlowSteps[0].observations, 2);
  assert.equal(report.topSlowSteps[0].totalObservedSeconds, 250);
  assert.equal(report.topSlowSteps[0].medianSeconds, 100);
  assert.equal(report.topSlowSteps[0].p95Seconds, 150);
  assert.equal(report.topSlowSteps[0].failures, 1);
  assert.equal(report.topSlowSteps[0].evidence, 'OBSERVED_STEP_WALLTIME_NOT_BILLING');
  assert.equal(report.workflows[0].slowestSteps[0].step, 'Build-Stufe scannen');
  assert.equal(report.topSlowSteps.some(s => s.step === 'NATS voll scannen'), false);
});

test('keeps pull-request and main-push step timings in separate cohorts', () => {
  const runs = [
    { id: 21, name: 'Docker Build Sicherheit', event: 'pull_request', conclusion: 'success' },
    { id: 22, name: 'Docker Build Sicherheit', event: 'push', conclusion: 'success' },
  ];
  const job = (start, duration) => {
    const end = new Date(Date.parse(start) + duration * 1000).toISOString();
    return [{ name: 'Docker Security Gate', started_at: start, completed_at: end,
      steps: [{ name: 'Build-Stufe scannen', status: 'completed', conclusion: 'success',
        started_at: start, completed_at: end }] }];
  };
  const jobsByRun = new Map([
    [21, job('2026-10-11T01:00:00Z', 40)],
    [22, job('2026-10-11T02:00:00Z', 120)],
  ]);
  const report = summarizeCiEfficiency({ runs, jobsByRun });
  assert.equal(report.topSlowSteps.length, 2);
  const push = report.topSlowSteps.find(s => s.event === 'push');
  const pr = report.topSlowSteps.find(s => s.event === 'pull_request');
  assert.equal(push?.totalObservedSeconds, 120);
  assert.equal(pr?.totalObservedSeconds, 40);
});

test('counts both attempts of the Docker Gate without claiming billed minutes', () => {
  const runs = [{
    id: 44407750370, name: 'Docker Build Sicherheit', event: 'pull_request',
    conclusion: 'success', run_attempt: 2,
  }];
  const jobsByRun = new Map([[44407750370, [
    { id: 135167397430, name: 'Docker Security Gate', run_attempt: 1,
      conclusion: 'failure', started_at: '2026-11-18T22:03:00Z',
      completed_at: '2026-11-18T22:04:00Z' },
    { id: 135168530469, name: 'Docker Security Gate', run_attempt: 2,
      conclusion: 'success', started_at: '2026-11-18T22:05:00Z',
      completed_at: '2026-11-18T22:07:00Z' },
  ]]]);
  const report = summarizeCiEfficiency({ runs, jobsByRun });
  const row = report.workflows[0];
  assert.equal(row.runs, 1);
  assert.equal(row.success, 1);
  assert.equal(row.observedRunnerMinutes, 3);
  assert.equal(row.rerunRuns, 1);
  assert.equal(row.observedPriorAttemptRunnerMinutes, 1);
  assert.equal(row.rerunCoverage, 'ALL_ATTEMPTS_OBSERVED');
  assert.equal(report.topExpensiveRuns[0].runAttempts, 2);
  assert.deepEqual(report.topExpensiveRuns[0].observedJobAttempts, [1, 2]);
  assert.equal(report.topExpensiveRuns[0].attemptCoverage, 'ALL_ATTEMPTS_OBSERVED');
  assert.equal(report.measurements.billedMinutes, 'NOT_PROVEN');
  assert.equal(report.measurements.retryOverhead, 'OBSERVED_PRIOR_ATTEMPT_JOB_WALLTIME_NOT_BILLING');
});

test('does not claim zero retry overhead when an earlier attempt is missing', () => {
  const runs = [{ id: 79, name: 'Docker Build Sicherheit',
    conclusion: 'success', run_attempt: 2 }];
  const jobsByRun = new Map([[79, [{
    id: 2, run_attempt: 2, name: 'Docker Security Gate',
    started_at: '2026-11-18T22:05:00Z',
    completed_at: '2026-11-18T22:07:00Z',
  }]]]);
  const report = summarizeCiEfficiency({ runs, jobsByRun });
  assert.equal(report.workflows[0].rerunCoverage, 'PARTIAL_NOT_PROVEN');
  assert.equal(report.workflows[0].observedPriorAttemptRunnerMinutes, null);
  assert.equal(report.topExpensiveRuns[0].attemptCoverage, 'NOT_PROVEN');
  assert.equal(report.topExpensiveRuns[0].observedPriorAttemptRunnerMinutes, null);
});

test('collectJobs retrieves all attempts and paginates without a second workflow', async () => {
  const paths = [];
  const read = async (route, token) => {
    assert.equal(token, 'synthetic-token');
    paths.push(route);
    const page = new URL('https://api.github.com' + route).searchParams.get('page');
    const jobs = page === '1'
      ? Array.from({ length: 100 }, (_, index) => ({ id: index + 1, run_attempt: 1 }))
      : [{ id: 101, run_attempt: 2 }];
    return { total_count: 101, jobs };
  };
  const jobs = await collectJobs('SvenKulessa/Capital-AI', 'synthetic-token', [{ id: 91 }], read);
  assert.equal(jobs.get(91).length, 101);
  assert.equal(paths.length, 2);
  assert.ok(paths.every(path => path.includes('filter=all')));
  assert.ok(paths[0].includes('page=1'));
  assert.ok(paths[1].includes('page=2'));
});

test('collectJobs fails closed on incomplete API pagination', async () => {
  await assert.rejects(
    collectJobs('SvenKulessa/Capital-AI', 'synthetic-token', [{ id: 91 }],
      async () => ({ total_count: 2, jobs: [{ id: 1 }] })),
    /CI_JOBS_INCOMPLETE/,
  );
});
