import { githubHeaders } from './github.mjs';

function githubApiError(message, status, body = null) {
  const error = new Error(message);
  error.status = status;
  error.body = body;
  return error;
}

function validatedFetchPath(rawUrl, owner, repo) {
  const url = new URL(rawUrl);
  const prefix = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/dependency-graph/sbom/fetch-report/`;
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'api.github.com' ||
    url.port ||
    url.username ||
    url.password ||
    !url.pathname.startsWith(prefix)
  ) {
    throw new Error('GitHub returned an unexpected SBOM fetch URL');
  }
  return `${url.pathname}${url.search}`;
}

function positiveInteger(value, fallback, max) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function requestAsyncSbom({ owner, repo, token, fetchImpl = fetch }) {
  const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/dependency-graph/sbom/generate-report`;
  const response = await fetchImpl(`https://api.github.com${path}`, {
    method: 'GET',
    redirect: 'manual',
    headers: githubHeaders(token),
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = {message:text}; }
  }
  if (response.status !== 201 || !body?.sbom_url) {
    throw githubApiError(`GitHub async SBOM generation failed with ${response.status}`, response.status, body);
  }
  return `https://api.github.com${validatedFetchPath(body.sbom_url, owner, repo)}`;
}

export async function fetchAsyncSbom({ sbomUrl, owner, repo, token, fetchImpl = fetch }) {
  const path = validatedFetchPath(sbomUrl, owner, repo);

  // Keep the server-side request target fixed to GitHub's validated REST origin.
  // The fetch implementation follows GitHub's temporary 302 download redirect;
  // application code never consumes Location as a new request target.
  const response = await fetchImpl(`https://api.github.com${path}`, {
    method: 'GET',
    redirect: 'follow',
    headers: githubHeaders(token),
  });

  if (response.status === 202) return {status:'pending', sbom:null};
  if (!response.ok) {
    const text = await response.text();
    throw githubApiError(`GitHub async SBOM fetch failed with ${response.status}`, response.status, text || null);
  }

  const sbom = await response.json();
  return {status:'ready', sbom};
}

export async function generateAndFetchAsyncSbom({ owner, repo, token, fetchImpl = fetch, attempts = 3, pollDelayMs = 250, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  const maxAttempts = positiveInteger(attempts, 3, 5);
  const delay = Math.min(Math.max(Number(pollDelayMs) || 250, 0), 1000);
  const sbomUrl = await requestAsyncSbom({owner, repo, token, fetchImpl});
  for (let index = 0; index < maxAttempts; index += 1) {
    const fetched = await fetchAsyncSbom({sbomUrl, owner, repo, token, fetchImpl});
    if (fetched.status === 'ready') return {...fetched, sbomUrl};
    if (index < maxAttempts - 1 && delay > 0) await sleep(delay);
  }
  return {status:'pending', sbom:null, sbomUrl};
}
