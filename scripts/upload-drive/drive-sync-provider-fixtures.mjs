/**
 * DOCSYNC-02: offline-only, deterministic provider response fixtures.
 * No OAuth, HTTP, Drive SDK, side effects, writes or real provider calls.
 * These receipts model READ-ONLY list responses; they are NOT API evidence.
 */
import { validateMapping } from './drive-sync-plan.mjs';
import { collectPages } from './drive-sync-delta.mjs';

export const FIXTURE_SCHEMA = 'capital-ai.doc-tree-provider-fixture.v1';
const PAGE_SCHEMA = 'capital-ai.doc-tree-pages.v1';
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const MAX_PAGES = 100;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const TOKEN = /^[A-Za-z0-9_-]{1,128}$/;
const FIELDS = new Set(['schemaVersion', 'rootKey', 'rootId', 'operation', 'permission', 'requests']);
const RESPONSE_FIELDS = new Set(['status', 'body', 'retryAfterSeconds']);
const BODY_FIELDS = new Set(['nextPageToken', 'folders', 'files']);
const PERMISSION_FIELDS = new Set(['kind', 'rootId', 'canList', 'visibleFolderIds']);
const FOLDER_FIELDS = new Set(['id', 'parentId', 'key', 'name']);
const FILE_FIELDS = new Set(['id', 'parentId', 'name', 'syncKey', 'sha256', 'revision', 'etag']);

function fail(code) { throw new Error(code); }
function onlyFields(value, allowed, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some((key) => !allowed.has(key))) fail(code);
}
function validId(value) { return typeof value === 'string' && ID.test(value); }
function validToken(value) { return value === null || (typeof value === 'string' && TOKEN.test(value)); }

/**
 * Replay a finite, complete synthetic list transcript. No transport can be
 * injected: unexpected URLs, credentials, requests and mutation verbs fail.
 * Timing is returned as a deterministic test schedule; the function never sleeps.
 */
export function replayReadOnlyProviderFixture({ mapping, fixture }) {
  validateMapping(mapping);
  onlyFields(fixture, FIELDS, 'INVALID_PROVIDER_FIXTURE');
  if (fixture.schemaVersion !== FIXTURE_SCHEMA || fixture.operation !== 'LIST_ONLY'
    || fixture.rootKey !== mapping.targetRootKey || !validId(fixture.rootId)) fail('INVALID_PROVIDER_FIXTURE');

  const permission = fixture.permission;
  onlyFields(permission, PERMISSION_FIELDS, 'INVALID_PROVIDER_PERMISSION');
  if (permission.kind !== 'SYNTHETIC_READ_ONLY' || permission.rootId !== fixture.rootId
    || permission.canList !== true || !Array.isArray(permission.visibleFolderIds)
    || permission.visibleFolderIds.length > 20 || !permission.visibleFolderIds.every(validId)
    || new Set(permission.visibleFolderIds).size !== permission.visibleFolderIds.length) {
    fail('PROVIDER_PERMISSION_DENIED');
  }
  if (!Array.isArray(fixture.requests) || fixture.requests.length < 1 || fixture.requests.length > MAX_PAGES) {
    fail('INVALID_PROVIDER_REQUESTS');
  }

  const visible = new Set(permission.visibleFolderIds);
  const pages = [];
  let expectedToken = null;
  const seenTokens = new Set();
  const schedule = [];

  for (let i = 0; i < fixture.requests.length; i++) {
    const request = fixture.requests[i];
    onlyFields(request, new Set(['pageToken', 'attempts']), 'INVALID_PROVIDER_REQUEST');
    if (!validToken(request.pageToken) || request.pageToken !== expectedToken
      || !Array.isArray(request.attempts) || request.attempts.length < 1
      || request.attempts.length > MAX_ATTEMPTS) fail('PROVIDER_PAGINATION_OR_RETRY_BOUNDS');

    let success = null;
    for (let attempt = 0; attempt < request.attempts.length; attempt++) {
      const response = request.attempts[attempt];
      onlyFields(response, RESPONSE_FIELDS, 'INVALID_PROVIDER_RESPONSE');
      if (!Number.isInteger(response.status)) fail('INVALID_PROVIDER_STATUS');
      if (response.status === 200) {
        if (attempt !== request.attempts.length - 1 || response.retryAfterSeconds !== undefined) fail('PROVIDER_UNEXPECTED_SUCCESS_SEQUENCE');
        onlyFields(response.body, BODY_FIELDS, 'INVALID_PROVIDER_BODY');
        const body = response.body;
        if (!validToken(body.nextPageToken) || !Array.isArray(body.folders) || !Array.isArray(body.files)
          || body.folders.length > 200 || body.files.length > 200) fail('INVALID_PROVIDER_BODY');
        success = body;
        break;
      }
      if (response.body !== undefined) fail('PROVIDER_ERROR_BODY_FORBIDDEN');
      if (!RETRYABLE.has(response.status)) {
        if (response.status === 401) fail('PROVIDER_AUTH_REQUIRED');
        if (response.status === 403) fail('PROVIDER_PERMISSION_DENIED');
        if (response.status === 404) fail('PROVIDER_ROOT_NOT_FOUND');
        if (response.status === 412) fail('PROVIDER_PRECONDITION_FAILED');
        fail('PROVIDER_NONRETRYABLE_STATUS');
      }
      if (response.retryAfterSeconds !== undefined && (!Number.isInteger(response.retryAfterSeconds)
          || response.retryAfterSeconds < 0 || response.retryAfterSeconds > 30)) {
        fail('PROVIDER_UNSAFE_RETRY_AFTER');
      }
      if (attempt === request.attempts.length - 1) fail('PROVIDER_RETRY_EXHAUSTED');
      const simulatedBackoffMs = Math.max(Math.min(250 * 2 ** attempt, 4000), (response.retryAfterSeconds ?? 0) * 1000);
      schedule.push({ pageIndex: i, attempt: attempt + 1, status: response.status, simulatedBackoffMs });
    }
    if (!success) fail('PROVIDER_PAGE_NOT_COMPLETED');

    // A folder must be in the exact mock grant, under the exact known root,
    // with its configured logical identity. No wildcard/root-wide permissions.
    for (const folder of success.folders) {
      onlyFields(folder, FOLDER_FIELDS, 'INVALID_PROVIDER_FOLDER_METADATA');
      if (!folder || !validId(folder.id) || !visible.has(folder.id)
        || folder.parentId !== fixture.rootId
        || !mapping.folders.some((entry) => entry.key === folder.key && entry.name === folder.name
          && entry.parentKey === mapping.targetRootKey)) fail('PROVIDER_CROSS_FOLDER_DENIED');
    }
    for (const file of success.files) {
      onlyFields(file, FILE_FIELDS, 'INVALID_PROVIDER_FILE_METADATA');
      if (!file || !visible.has(file.parentId)) fail('PROVIDER_CROSS_FOLDER_DENIED');
    }
    if (success.nextPageToken !== null) {
      if (success.nextPageToken === expectedToken || seenTokens.has(success.nextPageToken)) fail('PROVIDER_PAGINATION_CYCLE');
      seenTokens.add(success.nextPageToken);
    }
    if (success.nextPageToken === null && i !== fixture.requests.length - 1) fail('PROVIDER_EARLY_TERMINATION');
    if (success.nextPageToken !== null && i === fixture.requests.length - 1) fail('PROVIDER_INCOMPLETE_PAGINATION');
    pages.push({ pageToken: expectedToken, nextPageToken: success.nextPageToken,
      folders: success.folders, files: success.files });
    expectedToken = success.nextPageToken;
  }

  const pageFixture = { schemaVersion: PAGE_SCHEMA, rootKey: fixture.rootKey, rootId: fixture.rootId, pages };
  const inventory = collectPages(pageFixture, mapping);
  const folderIds = new Set();
  const folderKeys = new Set();
  const remoteIds = new Set();
  const remoteSources = new Set();
  const remoteNames = new Set();
  for (const folder of inventory.folders) {
    if (folderIds.has(folder.id) || folderKeys.has(folder.key)) fail('PROVIDER_DUPLICATE_FOLDER');
    folderIds.add(folder.id); folderKeys.add(folder.key);
  }
  for (const file of inventory.files) {
    if (!folderIds.has(file.parentId)) fail('PROVIDER_CROSS_FOLDER_DENIED');
    const name = `${file.parentId}/${file.name.toLocaleLowerCase('en-US')}`;
    if (remoteIds.has(file.id) || remoteSources.has(file.syncKey) || remoteNames.has(name)) fail('PROVIDER_DUPLICATE_FILE');
    remoteIds.add(file.id); remoteSources.add(file.syncKey); remoteNames.add(name);
  }
  return {
    pageFixture,
    evidence: {
      schemaVersion: 'capital-ai.doc-tree-provider-fixture-evidence.v1',
      mode: 'SYNTHETIC_READ_ONLY', operation: 'LIST_ONLY',
      sourceOfTruth: 'GITHUB', pages: pages.length,
      retries: schedule.length, retrySchedule: schedule,
      networkRequests: 0, providerWrites: 0, credentialReads: 0,
    },
  };
}
