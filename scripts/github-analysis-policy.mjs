import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNER = 'SvenKulessa';
const REPO = 'Capital-AI';
const ROOT = `https://api.github.com/repos/${OWNER}/${REPO}/`;
const SHA = /^[0-9a-f]{40}$/;
const TYPES = ['code_scanning', 'code_quality'];

export function evaluateAnalysisEvidence({ sourceSha, activeRules = [], ruleSuite = null,
  codeqlAnalyses = [], codeScanningAlerts = [], codeQualityFindings = [], complete = false }) {
  const rules = TYPES.filter(type => activeRules.some(rule => rule?.type === type));
  const boundSuite = complete && SHA.test(sourceSha || '') && ruleSuite &&
    Number.isSafeInteger(ruleSuite.id) && ruleSuite.id > 0 &&
    ruleSuite.after_sha === sourceSha && ruleSuite.ref === 'refs/heads/main' &&
    ruleSuite.result === 'pass' &&
    (ruleSuite.evaluation_result == null || ruleSuite.evaluation_result === 'pass') &&
    Array.isArray(ruleSuite.rule_evaluations);
  return rules.map(type => {
    const evaluations = boundSuite ? ruleSuite.rule_evaluations.filter(rule =>
      rule?.rule_type === type && rule?.enforcement === 'active') : [];
    const policyPass = evaluations.length === 1 && evaluations[0].result === 'pass';
    const sourceAnalyses = Array.isArray(codeqlAnalyses) && codeqlAnalyses.some(a =>
      a?.commit_sha === sourceSha && a?.ref === 'refs/heads/main' && a?.tool?.name === 'CodeQL');
    const noOpenScanning = Array.isArray(codeScanningAlerts) && codeScanningAlerts.length === 0;
    const noOpenQuality = Array.isArray(codeQualityFindings) && codeQualityFindings.length === 0;
    const pass = Boolean(boundSuite && policyPass &&
      (type === 'code_scanning' ? sourceAnalyses && noOpenScanning : noOpenQuality));
    const suiteUrl = boundSuite ? ROOT + 'rulesets/rule-suites/' + ruleSuite.id : null;
    return {
      type,
      sourceSha,
      status: pass ? 'PASS' : 'NOT_PROVEN',
      evidenceUrl: pass ? suiteUrl : null,
      providerEvidence: pass ? {
        ruleSuiteId: ruleSuite.id,
        afterSha: ruleSuite.after_sha,
        ref: ruleSuite.ref,
        suiteResult: ruleSuite.result,
        ruleType: type,
        ruleResult: evaluations[0].result,
        sourceBound: true,
      } : null,
      evidence: {
        suiteBound: Boolean(boundSuite),
        policyEvaluated: policyPass,
        codeqlAnalysisSourceBound: Boolean(sourceAnalyses),
        codeScanningOpenCount: Array.isArray(codeScanningAlerts) ? codeScanningAlerts.length : null,
        codeQualityOpenCount: Array.isArray(codeQualityFindings) ? codeQualityFindings.length : null,
        complete: Boolean(complete),
      },
    };
  });
}

function nextPage(link) {
  const match = /<([^>]+)>;\s*rel="next"/.exec(link || '');
  if (!match) return null;
  const next = new URL(match[1]);
  if (next.origin !== 'https://api.github.com' || !next.pathname.startsWith('/repos/' + OWNER + '/' + REPO + '/')) {
    throw new Error('Untrusted GitHub pagination URL');
  }
  return next.toString();
}

async function readPages(path, token) {
  if (!token) throw new Error('GitHub read token absent');
  let next = ROOT + path, pageCount = 0;
  const items = [];
  const visited = new Set();
  while (next) {
    if (pageCount >= 20 || visited.has(next)) throw new Error('Incomplete or cyclic GitHub pagination');
    visited.add(next); pageCount++;
    const reply = await fetch(next, {
      method: 'GET', redirect: 'error',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        'X-GitHub-Api-Version': '2026-03-10',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!reply.ok) throw new Error('GitHub evidence HTTP ' + reply.status);
    const json = await reply.json();
    if (!Array.isArray(json)) throw new Error('Unexpected GitHub evidence schema');
    items.push(...json);
    if (items.length > 2000) throw new Error('GitHub evidence exceeds bounded read');
    next = nextPage(reply.headers.get('link'));
  }
  return items;
}

async function readOne(path, token) {
  if (!token) throw new Error('GitHub read token absent');
  const reply = await fetch(ROOT + path, {
    method: 'GET', redirect: 'error',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2026-03-10',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!reply.ok) throw new Error('GitHub evidence HTTP ' + reply.status);
  return reply.json();
}

export async function collectAnalysisEvidence({ sourceSha, activeRules, token }) {
  let suite = null, analyses = [], alerts = [], quality = [], complete = false, blocker = null;
  try {
    if (!SHA.test(sourceSha || '')) throw new Error('Invalid exact main source SHA');
    const list = await readPages('rulesets/rule-suites?ref=refs%2Fheads%2Fmain&time_period=month&per_page=100', token);
    const matches = list.filter(s => s.after_sha === sourceSha && s.ref === 'refs/heads/main');
    if (matches.length !== 1 || !Number.isSafeInteger(matches[0].id)) {
      throw new Error('Missing or ambiguous current-main rule suite');
    }
    suite = await readOne('rulesets/rule-suites/' + matches[0].id + '?include_metadata=true', token);
    if (activeRules.some(r => r.type === 'code_scanning')) {
      analyses = await readPages('code-scanning/analyses?ref=refs%2Fheads%2Fmain&per_page=100', token);
      alerts = await readPages('code-scanning/alerts?state=open&ref=refs%2Fheads%2Fmain&per_page=100', token);
    }
    if (activeRules.some(r => r.type === 'code_quality')) {
      quality = await readPages('code-quality/findings?state=open&per_page=100', token);
    }
    complete = true;
  } catch (error) {
    blocker = String(error?.message || error).slice(0,160);
  }
  return {
    report: evaluateAnalysisEvidence({
      sourceSha, activeRules, ruleSuite: suite,
      codeqlAnalyses: analyses, codeScanningAlerts: alerts, codeQualityFindings: quality, complete,
    }),
    blocker,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [rulesetsPath, outPath] = process.argv.slice(2);
  if (!rulesetsPath || !outPath) throw new Error('Usage: github-analysis-policy.mjs <rulesets.json> <output.json>');
  const sourceSha = process.env.SOURCE_SHA;
  const rulesets = JSON.parse(readFileSync(rulesetsPath, 'utf8'));
  const activeRules = (Array.isArray(rulesets) ? rulesets : [])
    .filter(r => r?.target === 'branch' && r?.enforcement === 'active' &&
      r?.conditions?.ref_name?.include?.some(v => ['~DEFAULT_BRANCH', 'refs/heads/main'].includes(v)))
    .flatMap(r => Array.isArray(r.rules) ? r.rules : []);
  const result = await collectAnalysisEvidence({
    sourceSha, activeRules, token: process.env.GH_TOKEN,
  });
  writeFileSync(outPath, JSON.stringify(result.report, null, 2) + '\n');
  console.log(JSON.stringify({
    status: result.report.every(r => r.status === 'PASS') ? 'PASS' : 'NOT_PROVEN',
    types: result.report.map(r => ({ type: r.type, status: r.status })),
    blocker: result.blocker,
  }));
  // Missing provider permissions leave a fail-closed NOT_PROVEN report for the handoff validator.
}
