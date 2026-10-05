import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFairOnChainEthUsdSnapshot } from './faironchain-historical-adapter.mjs';

const header = [
  'global_round_id','phase','aggregator_round','round_updated_at_utc','answer_normalized',
  'answered_in_round','answer_status','extraction_run_id','schema_version','extraction_timestamp_utc',
  'client_name','client_version','chain_id','feed_proxy_address','feed_description',
  'base_asset','quote_asset','extraction_script_hash','abi_hash'
].join(',');

const validRow = [
  '18446744073709551617','1','1','2026-10-04 18:18:35+00:00','2500.25',
  '18446744073709551617','ok','test-run','chainlink_price_feed_v1','2026-10-04 18:20:00+00:00',
  'erigon','3.0.0','1','0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419','ETH / USD',
  'ETH','USD','a'.repeat(64),'b'.repeat(64)
].join(',');

test('FairOnChain fixture stays delayed and non-actionable', () => {
  const result = parseFairOnChainEthUsdSnapshot(header + '\n' + validRow + '\n', {
    datasetSnapshotSha256: 'c'.repeat(64),
    fetchedAt: Date.parse('2026-10-05T00:00:00Z'),
  });
  assert.equal(result.displayStatus, 'DELAYED');
  assert.equal(result.isDemo, false);
  assert.equal(result.asset.symbol, 'ETHUSD');
  assert.equal(result.liveEligible, false);
  assert.equal(result.marketQuoteEligible, false);
  assert.equal(result.scoreEligible, false);
  assert.equal(result.decisionEligible, false);
});

test('FairOnChain adapter rejects wrong instrument and future timestamps', () => {
  const wrongInstrument = validRow.replace(',ETH,USD,', ',BTC,USD,');
  assert.throws(() => parseFairOnChainEthUsdSnapshot(header + '\n' + wrongInstrument + '\n', {
    datasetSnapshotSha256: 'c'.repeat(64),
    fetchedAt: Date.parse('2026-10-05T00:00:00Z'),
  }), /HISTORICAL_INSTRUMENT_MISMATCH/);

  assert.throws(() => parseFairOnChainEthUsdSnapshot(header + '\n' + validRow + '\n', {
    datasetSnapshotSha256: 'c'.repeat(64),
    fetchedAt: Date.parse('2026-10-04T18:00:00Z'),
  }), /HISTORICAL_FUTURE_TIMESTAMP/);
});

test('FairOnChain adapter requires a content-addressed dataset snapshot', () => {
  assert.throws(() => parseFairOnChainEthUsdSnapshot(header + '\n' + validRow + '\n', {
    datasetSnapshotSha256: 'not-a-hash',
    fetchedAt: Date.parse('2026-10-05T00:00:00Z'),
  }), /HISTORICAL_DATASET_SHA256_REQUIRED/);
});
