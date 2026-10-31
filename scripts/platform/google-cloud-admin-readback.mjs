#!/usr/bin/env node
/**
 * CAPITAL-AI keyless Google Cloud Operator: strictly read-only Service Usage API.
 * No Cloud API mutations, no Google credentials in artifacts, no arbitrary URL.
 */
import { pathToFileURL } from 'node:url';

export const TARGET = Object.freeze({
  projectId: 'aifinancial-500208',
  projectNumber: '542877602707',
  repository: 'SvenKulessa/Capital-AI',
  repositoryId: '1293009324',
  workloadIdentityPool: 'capital-ai-github-admin',
  workloadIdentityProvider: 'capital-ai-github-admin',
  serviceAccount: 'capital-ai-cloud-operator@aifinancial-500208.iam.gserviceaccount.com',
});
const API_HOST = 'https://serviceusage.googleapis.com';
const PREFIX = 'projects/' + TARGET.projectNumber + '/services/';
const MAX_PAGES = 25;
const MAX_SERVICES = 5000;
const SAFE_API = /^[a-z0-9][a-z0-9.-]*\.googleapis\.com$/;

export async function readEnabledCloudApis({ token, fetcher = fetch } = {}) {
  if (typeof token !== 'string' || token.length < 10 || /[\r\n]/.test(token))
    throw new Error('CLOUD_OPERATOR_TOKEN_INVALID');
  const enabled = new Set();
  const seenTokens = new Set();
  let pageToken = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL('/v1/projects/' + TARGET.projectNumber + '/services', API_HOST);
    url.searchParams.set('filter', 'state:ENABLED');
    url.searchParams.set('pageSize', '200');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    let response;
    try {
      response = await fetcher(url.toString(), {
        method: 'GET',
        redirect: 'error',
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new Error('CLOUD_OPERATOR_SERVICE_USAGE_TRANSPORT_FAILED');
    }
    if (!response || response.status !== 200)
      throw new Error('CLOUD_OPERATOR_SERVICE_USAGE_HTTP_' + (Number.isInteger(response?.status) ? response.status : 'INVALID'));
    let result;
    try { result = await response.json(); }
    catch { throw new Error('CLOUD_OPERATOR_RESPONSE_JSON_INVALID'); }
    if (!result || typeof result !== 'object' || !Array.isArray(result.services) || result.services.length > 200)
      throw new Error('CLOUD_OPERATOR_RESPONSE_SHAPE_INVALID');
    for (const entry of result.services) {
      const name = entry?.name;
      if (typeof name !== 'string' || !name.startsWith(PREFIX) || entry.state !== 'ENABLED')
        throw new Error('CLOUD_OPERATOR_RESPONSE_PROJECT_OR_STATE_INVALID');
      const api = name.slice(PREFIX.length);
      if (!SAFE_API.test(api)) throw new Error('CLOUD_OPERATOR_RESPONSE_SERVICE_NAME_INVALID');
      enabled.add(api);
      if (enabled.size > MAX_SERVICES) throw new Error('CLOUD_OPERATOR_RESPONSE_LIMIT_EXCEEDED');
    }
    const next = result.nextPageToken ?? '';
    if (typeof next !== 'string' || next.length > 2048 || (next && (next === pageToken || seenTokens.has(next))))
      throw new Error('CLOUD_OPERATOR_PAGINATION_INVALID');
    if (!next) {
      return Object.freeze({
        projectId: TARGET.projectId,
        projectNumber: TARGET.projectNumber,
        enabledServiceCount: enabled.size,
        serviceUsageEnabled: enabled.has('serviceusage.googleapis.com'),
        iamEnabled: enabled.has('iam.googleapis.com'),
        iamCredentialsEnabled: enabled.has('iamcredentials.googleapis.com'),
        driveApiEnabled: enabled.has('drive.googleapis.com'),
        youtubeDataApiEnabled: enabled.has('youtube.googleapis.com'),
        readonly: true,
      });
    }
    seenTokens.add(next);
    pageToken = next;
  }
  throw new Error('CLOUD_OPERATOR_PAGINATION_LIMIT_EXCEEDED');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  readEnabledCloudApis({ token: process.env.GOOGLE_CLOUD_ADMIN_ACCESS_TOKEN })
    .then(summary => {
      process.stdout.write('CLOUD_OPERATOR_SERVICE_USAGE_READ_PASS ' + JSON.stringify(summary) + '\n');
    })
    .catch(error => {
      // Only locally-authored error codes. Never print upstream response bodies or tokens.
      console.error(/^CLOUD_OPERATOR_[A-Z0-9_]+$/.test(error.message)
        ? error.message : 'CLOUD_OPERATOR_READBACK_FAILED');
      process.exitCode = 1;
    });
}
