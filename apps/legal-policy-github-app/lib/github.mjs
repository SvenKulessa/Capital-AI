import { createSign } from 'node:crypto';

const API_VERSION = '2026-03-10';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function createAppJwt({ appId, privateKey, now = Math.floor(Date.now() / 1000) }) {
  if (!appId || !privateKey) throw new Error('GitHub App id and private key are required');
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: String(appId) }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey, 'base64url')}`;
}

export async function githubJson(path, { token, method = 'GET', body, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`https://api.github.com${path}`, {
    method,
    redirect: 'follow',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': API_VERSION,
      'user-agent': 'legal-policy-github-app/0.1',
      ...(body ? {'content-type':'application/json'} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`GitHub API ${method} ${path} failed with ${response.status}`);
    error.status = response.status;
    error.body = parsed;
    throw error;
  }
  return parsed;
}

export async function createInstallationToken({ installationId, appJwt, fetchImpl = fetch }) {
  const response = await githubJson(`/app/installations/${installationId}/access_tokens`, {
    token: appJwt,
    method: 'POST',
    body: {},
    fetchImpl,
  });
  return response.token;
}

export async function getMarketplaceSubscription({ accountId, appJwt, fetchImpl = fetch }) {
  try {
    return await githubJson(`/marketplace_listing/accounts/${accountId}`, {token: appJwt, fetchImpl});
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}
