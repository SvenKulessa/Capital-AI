// SPDX-License-Identifier: MIT
// Native, dependency-free adapter for the ECB-published euro FX reference-rate XML.
export const ECB_REFERENCE_RATE_URL =
  'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

export const ECB_REFERENCE_RATE_CURRENCIES = Object.freeze([
  'USD','JPY','CZK','DKK','GBP','HUF','PLN','RON','SEK','CHF',
  'ISK','NOK','TRY','AUD','BRL','CAD','CNY','HKD','IDR','ILS',
]);

export const ECB_REFERENCE_RATE_INSTRUMENTS = Object.freeze(
  ECB_REFERENCE_RATE_CURRENCIES.map(currency => Object.freeze({
    currency,
    symbol: `EUR/${currency}`,
    instrumentId: `fx:EUR-${currency}:ecb-reference`,
    providerInstrumentId: `EUR/${currency}`,
    baseCurrency: 'EUR',
    quoteCurrency: currency,
    venue: 'ECB reference rates',
    instrumentType: 'REFERENCE_RATE',
    tradingStatus: 'REFERENCE_ONLY_NOT_EXECUTABLE',
  })),
);

export const ECB_REFERENCE_RATE_SYMBOLS = Object.freeze(
  ECB_REFERENCE_RATE_INSTRUMENTS.map(item => item.symbol),
);

const TARGET_BY_CURRENCY = new Map(
  ECB_REFERENCE_RATE_INSTRUMENTS.map(item => [item.currency, item]),
);

const MAX_XML_BYTES = 128 * 1024;
const ALLOWED_CONTENT_TYPES = Object.freeze(['application/xml', 'text/xml']);

function parseAttributes(fragment) {
  const attributes = {};
  for (const match of fragment.matchAll(/([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*(['"])(.*?)\2/g)) {
    attributes[match[1]] = match[3];
  }
  return attributes;
}

export function referenceDateObservedAt(referenceDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) throw new Error('ECB_REFERENCE_DATE_INVALID');
  const timestamp = Date.parse(`${referenceDate}T00:00:00.000Z`);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new Error('ECB_REFERENCE_DATE_INVALID');
  return timestamp;
}

export function parseEcbReferenceRatesXml(xml, timing) {
  if (typeof xml !== 'string' || !xml.length || Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES) {
    throw new Error('ECB_XML_INVALID_SIZE');
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('ECB_XML_UNSAFE_DECLARATION');
  const publishedAt = Number(timing?.publishedAt);
  const receivedAt = Number(timing?.receivedAt);
  if (!Number.isSafeInteger(publishedAt) || publishedAt <= 0) throw new Error('ECB_PUBLISHED_AT_UNVERIFIED');
  if (!Number.isSafeInteger(receivedAt) || receivedAt <= 0 || receivedAt + 300000 < publishedAt) {
    throw new Error('ECB_RECEIVED_AT_INVALID');
  }

  let referenceDate = null;
  const rates = new Map();
  for (const match of xml.matchAll(/<Cube\b([^>]*)>/g)) {
    const attributes = parseAttributes(match[1]);
    if (attributes.time) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(attributes.time)) throw new Error('ECB_REFERENCE_DATE_INVALID');
      if (referenceDate && referenceDate !== attributes.time) throw new Error('ECB_MULTIPLE_REFERENCE_DATES');
      referenceDate = attributes.time;
    }
    if (attributes.currency || attributes.rate) {
      if (!attributes.currency || !attributes.rate) throw new Error('ECB_RATE_ROW_INCOMPLETE');
      if (!TARGET_BY_CURRENCY.has(attributes.currency)) continue;
      if (rates.has(attributes.currency)) throw new Error(`ECB_DUPLICATE_CURRENCY:${attributes.currency}`);
      const rate = Number(attributes.rate);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error(`ECB_RATE_INVALID:${attributes.currency}`);
      rates.set(attributes.currency, rate);
    }
  }
  if (!referenceDate) throw new Error('ECB_REFERENCE_DATE_MISSING');
  const observedAt = referenceDateObservedAt(referenceDate);
  if (publishedAt < observedAt) throw new Error('ECB_PUBLICATION_BEFORE_REFERENCE_DATE');

  const missing = ECB_REFERENCE_RATE_CURRENCIES.filter(currency => !rates.has(currency));
  if (missing.length) throw new Error(`ECB_REQUIRED_CURRENCIES_MISSING:${missing.join(',')}`);

  return ECB_REFERENCE_RATE_INSTRUMENTS.map(instrument => Object.freeze({
    ...instrument,
    provider: 'ecb-reference-rates',
    rate: rates.get(instrument.currency),
    referenceDate,
    observedAt,
    observedAtPrecision: 'date',
    publishedAt,
    publishedAtSource: 'http_last_modified',
    receivedAt,
    timeSemantics: 'reference',
    mode: 'rest',
    realtime: false,
    executionPrice: false,
    decisionEligible: false,
  }));
}

export async function fetchEcbReferenceRates({
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  timeoutMs = 5000,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('ECB_FETCH_UNAVAILABLE');
  const response = await fetchImpl(ECB_REFERENCE_RATE_URL, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      accept: 'application/xml, text/xml;q=0.9',
      'user-agent': 'CAPITAL-AI-MARKET/1.0 ECB-reference-rate-adapter',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response?.ok) throw new Error(`ECB_HTTP_STATUS:${response?.status ?? 'unknown'}`);
  const effectiveUrl = String(response.url || ECB_REFERENCE_RATE_URL);
  if (!effectiveUrl.startsWith('https://www.ecb.europa.eu/')) throw new Error('ECB_UNTRUSTED_REDIRECT');

  const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.some(type => contentType.startsWith(type))) {
    throw new Error('ECB_CONTENT_TYPE_INVALID');
  }
  const lastModified = String(response.headers?.get?.('last-modified') || '');
  const publishedAt = Date.parse(lastModified);
  if (!Number.isSafeInteger(publishedAt) || publishedAt <= 0) throw new Error('ECB_PUBLISHED_AT_UNVERIFIED');

  const body = await response.text();
  const receivedAt = Number(now());
  const rates = parseEcbReferenceRatesXml(body, { publishedAt, receivedAt });
  return Object.freeze({
    providerId: 'ecb-reference-rates',
    sourceUrl: effectiveUrl,
    contentType,
    lastModified,
    publishedAt,
    receivedAt,
    referenceDate: rates[0].referenceDate,
    rates,
    rawPayload: Object.freeze({
      sourceUrl: effectiveUrl,
      contentType,
      lastModified,
      body,
    }),
  });
}
