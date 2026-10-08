/**
 * Read-only post-merge snapshot. This does not sync branches, approve rights,
 * rerun CI, authorize merges, or deploy. It is evidence, not an admission.
 */
import { mkdir, writeFile, appendFile } from 'node:fs/promises';

const REQUIRED = Object.freeze(['Docker Security Gate', 'Domain Governance']);
const SHA = /^[0-9a-f]{40}$/;

const securityPath = name =>
  /^(?:\.github\/workflows\/|deploy\/|supabase\/|docs\/security\/|server\/auth|server\/security|Dockerfile|Dockerfile\.security|package(?:-lock)?\.json$)/.test(name);
const licensePath = name =>
  /(?:^|\/)(?:LICENSE|NOTICE)(?:[./-]|$)|licen[cs]e|provider|rights|attribution|terms/i.test(name);

export function summarizePostMerge({
  eventSha, currentMainSha, mergedPr, targetPr = null, selectedHead = null,
  liveHead = null, behindBy = null, draft = null, files = [], checkRuns = [],
  checkRef = null, error = null,
}) {
  const selectedChanged = Boolean(targetPr && selectedHead && liveHead && selectedHead !== liveHead);
  const contexts = REQUIRED.map(name => {
    const matches = checkRuns.filter(check => check.name === name)
      .sort((a, b) => String(a.started_at || '').localeCompare(String(b.started_at || '')));
    const check = matches.at(-1);
    const status = !check ? 'NOT_PROVEN' : check.status !== 'completed' ? 'PENDING'
      : check.conclusion === 'success' ? 'CI_PASS_OBSERVED' : 'BLOCKED';
    return { name, status, checkedRef: checkRef, url: check?.html_url ?? null };
  });
  const ciState = !targetPr ? 'NOT_APPLICABLE' : error ? 'NOT_PROVEN' : selectedChanged
    ? 'REVALIDATION_REQUIRED' : contexts.some(c => c.status === 'BLOCKED') ? 'BLOCKED'
    : contexts.some(c => c.status === 'PENDING') ? 'PENDING'
    : contexts.every(c => c.status === 'CI_PASS_OBSERVED') ? 'CI_SNAPSHOT_PASS_ONLY'
    : 'NOT_PROVEN';
  const securityPaths = files.filter(securityPath);
  const licensePaths = files.filter(licensePath);
  return {
    schema: 'CAPITAL_AI_POST_MERGE_FOLLOWUP@1',
    authority: 'READ_ONLY_EVIDENCE',
    mergedPr,
    eventMainSha: eventSha,
    observedMainSha: currentMainSha,
    newerMainObserved: Boolean(eventSha && currentMainSha && eventSha !== currentMainSha),
    selectedPr: targetPr,
    selectedHeadSha: selectedHead,
    observedHeadSha: liveHead,
    selectedHeadChanged: selectedChanged,
    synchronizeNextPr: {
      state: !targetPr ? 'NOT_APPLICABLE' : behindBy === null ? 'NOT_PROVEN'
        : behindBy > 0 ? 'SYNC_REQUIRED_MANUAL_CODE_UPDATE' : 'NO_BEHIND_COMMITS_OBSERVED',
      behindBy,
      autoSync: false,
    },
    requiredChecks: { state: ciState, contexts, reRunTriggered: false, mergeApproval: false },
    securityEvidence: {
      state: targetPr ? 'REVIEW_REQUIRED' : 'NOT_APPLICABLE',
      affectedPaths: securityPaths,
      evidenceCompleteness: 'NOT_PROVEN',
    },
    licenseEvidence: {
      state: targetPr ? 'REVIEW_REQUIRED' : 'NOT_APPLICABLE',
      affectedPaths: licensePaths,
      rightsApproval: false,
    },
    humanOwnerApprovalRequired: true,
    autoMerge: false,
    productionApproval: false,
    error: error ?? null,
  };
}

async function main() {
  const repository = process.env.REPOSITORY;
  const token = process.env.GH_TOKEN;
  const eventSha = process.env.MERGE_SHA ?? null;
  const mergedPr = Number(process.env.MERGED_PR);
  const targetPr = process.env.TARGET_PR ? Number(process.env.TARGET_PR) : null;
  const selectedHead = process.env.SELECTED_HEAD || null;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')
    || !token || !SHA.test(eventSha ?? '') || !Number.isSafeInteger(mergedPr)
    || (targetPr !== null && !Number.isSafeInteger(targetPr))) {
    throw new Error('INVALID_POST_MERGE_INPUT');
  }
  const api = async route => {
    const response = await fetch('https://api.github.com/repos/' + repository + route, {
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('GITHUB_READ_HTTP_' + response.status);
    return response.json();
  };
  const facts = { eventSha, mergedPr, targetPr, selectedHead };
  try {
    const mainRef = await api('/git/ref/heads/main');
    facts.currentMainSha = mainRef.object?.sha ?? null;
    if (!SHA.test(facts.currentMainSha ?? '')) throw new Error('INVALID_LIVE_MAIN_SHA');
    if (targetPr) {
      const pr = await api('/pulls/' + targetPr);
      if (pr.state !== 'open' || pr.base?.ref !== 'main' || pr.head?.repo?.full_name !== repository) {
        throw new Error('SELECTED_PR_NO_LONGER_ELIGIBLE');
      }
      facts.liveHead = pr.head?.sha ?? null;
      facts.draft = pr.draft;
      if (!SHA.test(facts.liveHead ?? '')) throw new Error('INVALID_PR_HEAD_SHA');
      const comparison = await api('/compare/' + facts.currentMainSha + '...' + facts.liveHead);
      facts.behindBy = Number.isInteger(comparison.behind_by) ? comparison.behind_by : null;
      facts.files = [];
      for (let page = 1; page <= 30; page++) {
        const items = await api('/pulls/' + targetPr + '/files?per_page=100&page=' + page);
        if (!Array.isArray(items)) throw new Error('INVALID_PR_FILES');
        facts.files.push(...items.map(item => item.filename).filter(Boolean));
        if (items.length < 100) break;
        if (page === 30) throw new Error('PR_FILES_PAGINATION_EXCEEDED');
      }
      facts.checkRef = SHA.test(pr.merge_commit_sha ?? '') ? pr.merge_commit_sha : facts.liveHead;
      const checks = await api('/commits/' + facts.checkRef + '/check-runs?per_page=100');
      facts.checkRuns = Array.isArray(checks.check_runs) ? checks.check_runs : [];
      if ((checks.total_count ?? 0) > 100) facts.error = 'CHECK_RUN_PAGINATION_INCOMPLETE';
    }
  } catch (error) {
    facts.error = error instanceof Error ? error.message : 'UNKNOWN_GITHUB_READ_ERROR';
  }
  const report = summarizePostMerge(facts);
  await mkdir('correlation', { recursive: true });
  await writeFile('correlation/post-merge-followup.json', JSON.stringify(report, null, 2) + '\n');
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const summary = [
      '### Postmerge-Follow-up (read-only)',
      '- Merge PR: #' + mergedPr + ' | Event-Main: ' + eventSha,
      '- Beobachteter Main: ' + (report.observedMainSha || 'NOT_PROVEN') +
        (report.newerMainObserved ? ' (nachfolgende Merges vorhanden)' : ''),
      '- Erster betroffener PR: ' + (targetPr ? '#' + targetPr : 'keiner'),
      '- Branch-Sync: ' + report.synchronizeNextPr.state,
      '- Required CI: ' + report.requiredChecks.state,
      '- Security-Evidence: ' + report.securityEvidence.state +
        ' | Lizenz-Evidence: ' + report.licenseEvidence.state,
      '- Kein Auto-Sync, kein Auto-Merge, keine Lizenz- oder Production-Freigabe.',
      report.error ? '- Readback-Fehler: ' + report.error : '',
      '',
    ].filter(Boolean).join('\n');
    await appendFile(summaryFile, summary);
  }
  if (report.error) console.warn('Postmerge read-only evidence: ' + report.error);
}

if (process.argv[1]?.endsWith('/post-merge-followup.mjs')) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
