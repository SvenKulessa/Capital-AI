// SPDX-License-Identifier: MIT
// File-specific license: licenses/faironchain-historical-adapter.MIT.txt

import { HistoricalPriceObservationSchema, FAIRONCHAIN_ETH_USD_SOURCE } from '../shared/historical-market-data.mjs';

function parseCsvLine(line) {
  const cells = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      cells.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  cells.push(value);
  if (quoted) throw new Error('CSV_UNTERMINATED_QUOTE');
  return cells;
}

function parseUtc(value, code) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) throw new Error(code);
  return timestamp;
}

function integer(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(code);
  return parsed;
}

function positiveNumber(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(code);
  return parsed;
}

export function parseFairOnChainEthUsdSnapshot(csvText, options) {
  if (typeof csvText !== 'string' || csvText.length === 0) throw new Error('HISTORICAL_CSV_REQUIRED');
  if (!options || typeof options !== 'object') throw new Error('HISTORICAL_SNAPSHOT_OPTIONS_REQUIRED');

  const datasetSnapshotSha256 = String(options.datasetSnapshotSha256 || '');
  if (!/^[a-f0-9]{64}$/.test(datasetSnapshotSha256)) throw new Error('HISTORICAL_DATASET_SHA256_REQUIRED');

  const fetchedAt = Number(options.fetchedAt);
  if (!Number.isSafeInteger(fetchedAt) || fetchedAt <= 0 || fetchedAt > Date.now() + 3000) {
    throw new Error('HISTORICAL_FETCHED_AT_INVALID');
  }

  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) throw new Error('HISTORICAL_CSV_EMPTY');
  const headers = parseCsvLine(lines[0]).map(value => value.trim());
  const required = [
    'global_round_id','phase','aggregator_round','round_updated_at_utc','answer_normalized',
    'answered_in_round','answer_status','extraction_run_id','schema_version','extraction_timestamp_utc',
    'client_name','client_version','chain_id','feed_proxy_address','feed_description',
    'base_asset','quote_asset','extraction_script_hash','abi_hash'
  ];
  for (const key of required) {
    if (!headers.includes(key)) throw new Error(`HISTORICAL_COLUMN_MISSING:${key}`);
  }

  let row = null;
  for (let index = lines.length - 1; index >= 1; index -= 1) {
    const cells = parseCsvLine(lines[index]);
    if (cells.length !== headers.length) continue;
    const candidate = Object.fromEntries(headers.map((header, position) => [header, cells[position]]));
    if (candidate.answer_status === 'ok') {
      row = candidate;
      break;
    }
  }
  if (!row) throw new Error('HISTORICAL_NO_VALID_OBSERVATION');

  if (row.base_asset !== 'ETH' || row.quote_asset !== 'USD') throw new Error('HISTORICAL_INSTRUMENT_MISMATCH');
  const chainId = integer(row.chain_id, 'HISTORICAL_CHAIN_ID_INVALID');
  if (chainId !== 1) throw new Error('HISTORICAL_CHAIN_ID_INVALID');

  const observedAt = parseUtc(row.round_updated_at_utc, 'HISTORICAL_OBSERVED_AT_INVALID');
  const extractedAt = parseUtc(row.extraction_timestamp_utc, 'HISTORICAL_EXTRACTED_AT_INVALID');
  if (observedAt > fetchedAt || extractedAt > fetchedAt) throw new Error('HISTORICAL_FUTURE_TIMESTAMP');

  return HistoricalPriceObservationSchema.parse({
    schema: 'CAPITAL_AI_HISTORICAL_PRICE_OBSERVATION@1',
    providerId: FAIRONCHAIN_ETH_USD_SOURCE.providerId,
    datasetId: FAIRONCHAIN_ETH_USD_SOURCE.datasetId,
    datasetSnapshotSha256,
    dataLicense: FAIRONCHAIN_ETH_USD_SOURCE.dataLicense,
    displayStatus: 'DELAYED',
    isDemo: false,
    asset: {
      assetId: 'crypto:ETH:USD:CHAINLINK_ETHEREUM',
      symbol: 'ETHUSD',
      name: 'Ether / US Dollar',
      assetClass: 'crypto',
      venue: 'CHAINLINK_ETHEREUM',
      currency: 'USD',
    },
    value: positiveNumber(row.answer_normalized, 'HISTORICAL_PRICE_INVALID'),
    observedAt,
    extractedAt,
    fetchedAt,
    provenance: {
      globalRoundId: String(row.global_round_id),
      phase: integer(row.phase, 'HISTORICAL_PHASE_INVALID'),
      aggregatorRound: integer(row.aggregator_round, 'HISTORICAL_AGGREGATOR_ROUND_INVALID'),
      answeredInRound: String(row.answered_in_round),
      answerStatus: 'ok',
      extractionRunId: String(row.extraction_run_id),
      schemaVersion: String(row.schema_version),
      clientName: String(row.client_name),
      clientVersion: String(row.client_version),
      chainId,
      feedProxyAddress: String(row.feed_proxy_address),
      feedDescription: String(row.feed_description),
      baseAsset: 'ETH',
      quoteAsset: 'USD',
      extractionScriptHash: String(row.extraction_script_hash).toLowerCase(),
      abiHash: String(row.abi_hash).toLowerCase(),
      sourceUrl: FAIRONCHAIN_ETH_USD_SOURCE.sourceUrl,
      attribution: 'FairOnChain / Open Price, CC BY 4.0',
    },
    liveEligible: false,
    marketQuoteEligible: false,
    scoreEligible: false,
    decisionEligible: false,
    reasonCodes: [
      'HISTORICAL_DELAYED_SOURCE',
      'NOT_LIVE_MARKET_QUOTE',
      'SCORING_ADMISSION_NOT_GRANTED',
    ],
  });
}
