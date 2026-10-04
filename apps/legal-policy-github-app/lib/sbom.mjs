import { githubHeaders } from './github.mjs';

function githubApiError(message, status, body = null) {
  const error = new Error(message);
  error.status = status;
  error.body = body;
  return error;
}

function validatedFetchUrl(rawUrl, owner, repo) {
  const url = new URL(rawUrl);
  const prefix = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/dependency-graph/sbom/fetch-report/`;
  if (url.protocol !== 'https:' || url.hostname !== 'api.github.com' || !url.pathname.startsWith(prefix)) {
    throw new Error('GitHub returned an unexpected SBOM fetch URL');
  }
  return url;
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
  if (response.status !== 201 || !body?.sbom_url) throw githubApiError(`GitHub async SBOM generation failed with ${response.status}`, response.status, body);
  return validatedFetchUrl(body.sbom_url, owner, repo).toString();
}

export async function fetchAsyncSbom({ sbomUrl, owner, repo, token, fetchImpl = fetch }) {
  const url = validatedFetchUrl(sbomUrl, owner, repo);
  const response = await fetchImpl(url, { method: 'GET', redirect: 'manual', headers: githubHeaders(token) });
  if (response.status === 202) return {status:'pending', sbom:null};
  if (response.status !== 302) {
    const text = await response.text();
    throw githubApiError(`GitHub async SBOM fetch failed with ${response.status}`, response.status, text || null);
  }
  const location = response.headers.get('location');
  if (!location) throw new Error('GitHub async SBOM redirect is missing Location');
  const downloadUrl = new URL(location);
  if (downloadUrl.protocol !== 'https:') throw new Error('GitHub async SBOM download URL must use HTTPS');

  // Never forward the installation token to the temporary download origin.
  const download = await fetchImpl(downloadUrl, {method:'GET', redirect:'follow', headers:{'user-agent':'legal-policy-github-app/0.2'}});
  if (!download.ok) throw githubApiError(`GitHub async SBOM download failed with ${download.status}`, download.status);
  const sbom = await download.json();
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
