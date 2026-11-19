import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OwnerGa4ConfigView } from './OwnerGa4ConfigView';

const render = (config: Parameters<typeof OwnerGa4ConfigView>[0]['config'], unavailable = false) =>
  renderToStaticMarkup(createElement(OwnerGa4ConfigView, { config, unavailable }));
test('accessible owner-only Universe diagnostics view has semantic labels, seven visual accents, and fixed advice', () => {
  const html = render({JSON_VALID:false,PROJECT_MATCH:null,reason:'GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON'});
  assert.match(html, /aria-labelledby="owner-ga4-config-heading"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<dt[^>]*>JSON_VALID<\/dt>/);
  assert.match(html, /<dt[^>]*>PROJECT_MATCH<\/dt>/);
  assert.match(html, /GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON/);
  assert.match(html, /Original-JSON/);
  assert.equal((html.match(/background-color:/g) || []).length, 7);
  assert.doesNotMatch(html, /private_key|client_email|secret@example|BEGIN PRIVATE KEY/);
});
test('missing diagnostic is NOT_PROVEN and never synthetic success or zero', () => {
  assert.match(render(null), /NOT_PROVEN/);
  assert.match(render(null,true), /keine Ersatzwerte/);
  assert.doesNotMatch(render(null), /JSON_VALID.*TRUE|PROJECT_MATCH.*TRUE/);
});
test('safe diagnostic view never renders a secret or project ID', () => {
  const html = render({JSON_VALID:true,PROJECT_MATCH:true,reason:'GA4_CONFIG_VALID'});
  assert.match(html, /GA4_CONFIG_VALID/);
  assert.doesNotMatch(html, /private_key|client_email|aifinancial-500208|RENDER_API_KEY=/);
});
