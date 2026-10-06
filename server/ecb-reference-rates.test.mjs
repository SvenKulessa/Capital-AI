// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ECB_REFERENCE_RATE_CURRENCIES,
  ECB_REFERENCE_RATE_INSTRUMENTS,
  ECB_REFERENCE_RATE_URL,
  fetchEcbReferenceRates,
  parseEcbReferenceRatesXml,
  referenceDateObservedAt,
} from './ecb-reference-rates.mjs';

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <Cube>
    <Cube time='2026-10-05'>
      <Cube currency='USD' rate='1.1204'/>
      <Cube currency='JPY' rate='177.28'/>
      <Cube currency='CZK' rate='24.456'/>
      <Cube currency='DKK' rate='7.4745'/>
      <Cube currency='GBP' rate='0.84720'/>
      <Cube currency='HUF' rate='367.80'/>
      <Cube currency='PLN' rate='4.3795'/>
      <Cube currency='RON' rate='5.3363'/>
      <Cube currency='SEK' rate='11.2525'/>
      <Cube currency='CHF' rate='0.9311'/>
      <Cube currency='ISK' rate='137.00'/>
      <Cube currency='NOK' rate='10.7575'/>
      <Cube currency='TRY' rate='55.0755'/>
      <Cube currency='AUD' rate='1.6097'/>
      <Cube currency='BRL' rate='5.5849'/>
      <Cube currency='CAD' rate='1.5969'/>
      <Cube currency='CNY' rate='7.5118'/>
      <Cube currency='HKD' rate='8.7925'/>
      <Cube currency='IDR' rate='20069.89'/>
      <Cube currency='ILS' rate='3.4310'/>
      <Cube currency='INR' rate='107.8915'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`;

const publishedAt = Date.parse('2026-10-05T14:00:00.000Z');
const receivedAt = Date.parse('2026-10-05T14:00:10.000Z');

test('adapter defines exactly the 20 manifest-bound EUR reference-rate instruments', () => {
  assert.equal(ECB_REFERENCE_RATE_CURRENCIES.length, 20);
  assert.equal(ECB_REFERENCE_RATE_INSTRUMENTS.length, 20);
  assert.equal(new Set(ECB_REFERENCE_RATE_CURRENCIES).size, 20);
  assert.equal(new Set(ECB_REFERENCE_RATE_INSTRUMENTS.map(item => item.instrumentId)).size, 20);
  assert.equal(ECB_REFERENCE_RATE_INSTRUMENTS[0].instrumentId, 'fx:EUR-USD:ecb-reference');
  assert.equal(ECB_REFERENCE_RATE_INSTRUMENTS.at(-1).instrumentId, 'fx:EUR-ILS:ecb-reference');
});

test('XML parser preserves daily/reference semantics and date-level observation precision', () => {
  const rows = parseEcbReferenceRatesXml(fixture, { publishedAt, receivedAt });
  assert.equal(rows.length, 20);
  assert.equal(rows[0].symbol, 'EUR/USD');
  assert.equal(rows[0].rate, 1.1204);
  assert.equal(rows[0].referenceDate, '2026-10-05');
  assert.equal(rows[0].observedAt, referenceDateObservedAt('2026-10-05'));
  assert.equal(rows[0].observedAtPrecision, 'date');
  assert.equal(rows[0].publishedAt, publishedAt);
  assert.equal(rows[0].publishedAtSource, 'http_last_modified');
  assert.equal(rows[0].receivedAt, receivedAt);
  assert.equal(rows[0].timeSemantics, 'reference');
  assert.equal(rows[0].realtime, false);
  assert.equal(rows[0].executionPrice, false);
  assert.equal(rows[0].decisionEligible, false);
});

test('parser fails closed on incomplete, duplicate or unsafe XML', () => {
  assert.throws(
    () => parseEcbReferenceRatesXml(fixture.replace("<Cube currency='ILS' rate='3.4310'/>", ''), { publishedAt, receivedAt }),
    /ECB_REQUIRED_CURRENCIES_MISSING:ILS/,
  );
  assert.throws(
    () => parseEcbReferenceRatesXml(fixture.replace("<Cube currency='ILS' rate='3.4310'/>", "<Cube currency='USD' rate='1.1204'/><Cube currency='ILS' rate='3.4310'/>"), { publishedAt, receivedAt }),
    /ECB_DUPLICATE_CURRENCY:USD/,
  );
  assert.throws(
    () => parseEcbReferenceRatesXml('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>' + fixture, { publishedAt, receivedAt }),
    /ECB_XML_UNSAFE_DECLARATION/,
  );
});

test('fetcher requires official ECB origin, XML content type and HTTP publication evidence', async () => {
  const headers = new Map([
    ['content-type', 'text/xml; charset=UTF-8'],
    ['last-modified', 'Mon, 05 Oct 2026 14:00:00 GMT'],
  ]);
  const response = {
    ok: true,
    status: 200,
    url: ECB_REFERENCE_RATE_URL,
    headers: { get: name => headers.get(name.toLowerCase()) ?? null },
    text: async () => fixture,
  };
  const result = await fetchEcbReferenceRates({
    fetchImpl: async () => response,
    now: () => receivedAt,
  });
  assert.equal(result.rates.length, 20);
  assert.equal(result.referenceDate, '2026-10-05');
  assert.equal(result.publishedAt, publishedAt);
  assert.equal(result.receivedAt, receivedAt);
  assert.equal(result.rawPayload.body, fixture);

  await assert.rejects(
    fetchEcbReferenceRates({
      fetchImpl: async () => ({ ...response, url: 'https://attacker.example/rates.xml' }),
      now: () => receivedAt,
    }),
    /ECB_UNTRUSTED_REDIRECT/,
  );
  await assert.rejects(
    fetchEcbReferenceRates({
      fetchImpl: async () => ({ ...response, headers: { get: name => name === 'content-type' ? 'text/xml' : null } }),
      now: () => receivedAt,
    }),
    /ECB_PUBLISHED_AT_UNVERIFIED/,
  );
});
