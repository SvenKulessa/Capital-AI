import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAND_COLORS, HUB_BRANDING, hubBrandForRoute } from '../shared/hub-branding.mjs';
import { canonicalHubTarget, hubRouteForPath } from '../shared/hub-routes.mjs';

test('Social Hub has own unused pink brand colour', () => {
  assert.equal(HUB_BRANDING.social.color, BRAND_COLORS.pink);
  assert.equal(hubBrandForRoute('/social'), 'social');
  assert.equal(hubBrandForRoute('/social/lizenzen'), 'social');
  assert.notEqual(HUB_BRANDING.social.color, HUB_BRANDING.learning.color);
});
test('Canonical Social Hub routes and unknown-route isolation', () => {
  for (const [tab,slug] of [['overview','uebersicht'],['studio','studio'],['news','news'],['licenses','lizenzen']]) {
    assert.equal(canonicalHubTarget('/social?tab='+tab), '/social/'+slug);
    assert.equal(hubRouteForPath('/social/'+slug)?.hub, '/social');
  }
  assert.equal(hubRouteForPath('/social/secret'), null);
});
