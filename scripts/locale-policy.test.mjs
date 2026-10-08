import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localeFromCountry, localeFromAcceptLanguage, resolveLocale, localeFromLandingPath, SUPPORTED_LOCALES } from '../shared/locale-policy.mjs';
test('six locales', () => assert.deepEqual(SUPPORTED_LOCALES, ['de','en','it','fr','pt','es']));
test('native country mapping', () => {
  for (const [country, expected] of Object.entries({DE:'de',AT:'de',IT:'it',FR:'fr',PT:'pt',BR:'pt',ES:'es',MX:'es'})) {
    assert.equal(localeFromCountry(country), expected);
  }
});
test('unsupported and multilingual countries use English', () => {
  for (const country of ['PL','CH','BE','JP','XX','T1','']) assert.equal(localeFromCountry(country),'en');
});
test('manual preference wins; unsupported country overrides browser', () => {
  assert.deepEqual(resolveLocale({cookieHeader:'a=b; capital_ai_locale=es',countryHeader:'DE',acceptLanguage:'de'}),{locale:'es',source:'manual'});
  assert.deepEqual(resolveLocale({countryHeader:'PL',acceptLanguage:'de'}),{locale:'en',source:'country'});
  assert.deepEqual(resolveLocale({countryHeader:'T1',acceptLanguage:'de'}),{locale:'en',source:'country'});
  assert.deepEqual(resolveLocale({cookieHeader:'capital_ai_locale=xx',countryHeader:'DE'}),{locale:'de',source:'country'});
});
test('browser language is fallback only without country', () => {
  assert.deepEqual(resolveLocale({acceptLanguage:'fr-CH,fr;q=0.9,en;q=0.4'}),{locale:'fr',source:'browser'});
  assert.equal(localeFromAcceptLanguage('ja;q=1,it;q=0.8'),'it');
  assert.equal(localeFromAcceptLanguage('ja,ko'),'en');
  assert.equal(localeFromAcceptLanguage('de;q=0,pt;q=0.8'),'pt');
});

test('localized landing URL overrides country and cookie only for six exact roots', () => {
  for (const code of SUPPORTED_LOCALES) {
    assert.equal(localeFromLandingPath(`/${code}/`), code);
    assert.equal(localeFromLandingPath(`/${code}`), code);
  }
  for (const route of ['/en/login','/es/faq','/fr/profile','/pl/','/en/../api']) {
    assert.equal(localeFromLandingPath(route), null, route);
  }
});
