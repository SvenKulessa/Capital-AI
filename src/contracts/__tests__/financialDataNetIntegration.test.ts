import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCIAL_DATA_NET_CONNECTIONS,
  FINANCIAL_DATA_NET_DATASET_GROUPS,
  FINANCIAL_DATA_NET_PROVENANCE,
  getFinancialDataNetIntegrationSummary,
} from '../../data/financialDataNetIntegration';
import { ProviderAdapterRegistry } from '../../services/providerAdapters';

describe('FinancialData.Net integration catalog', () => {
  it('separates SDK software provenance from provider data rights', () => {
    assert.equal(FINANCIAL_DATA_NET_PROVENANCE.sdkVersion, '0.6.0');
    assert.equal(FINANCIAL_DATA_NET_PROVENANCE.sdkLicense, 'UNVERIFIED_METADATA_MIT_ONLY');
    assert.equal(FINANCIAL_DATA_NET_PROVENANCE.codeVendored, false);
    assert.equal(FINANCIAL_DATA_NET_PROVENANCE.providerRightsStatus, 'CONTRACT_SCOPE_UNVERIFIED');
    assert.equal(FINANCIAL_DATA_NET_PROVENANCE.productionEligible, false);
  });

  it('catalogues REST, fdnpy, Universal Query and MCP without implying activation', () => {
    const ids = FINANCIAL_DATA_NET_CONNECTIONS.map(item => item.id);
    assert.ok(ids.includes('financialdatanet-rest'));
    assert.ok(ids.includes('fdnpy'));
    assert.ok(ids.includes('financialdatanet-universal-query'));
    assert.ok(ids.includes('financialdatanet-mcp'));
    assert.deepEqual(
      [...new Set(FINANCIAL_DATA_NET_CONNECTIONS.map(item => item.status))].sort(),
      ['CATALOGUED', 'EXCLUDED'],
    );
  });

  it('keeps every dataset family rights-unverified', () => {
    assert.ok(FINANCIAL_DATA_NET_DATASET_GROUPS.length >= 8);
    assert.ok(FINANCIAL_DATA_NET_DATASET_GROUPS.every(group => group.rightsStatus === 'CONTRACT_SCOPE_UNVERIFIED'));
    const summary = getFinancialDataNetIntegrationSummary();
    assert.equal(summary.decisionEligible, false);
    assert.ok(summary.methodCount > 50);
  });

  it('does not register the proprietary provider in the production adapter registry', () => {
    const registry = new ProviderAdapterRegistry();
    assert.equal(registry.getAllAdapters().length, 0);
    assert.throws(() => registry.getAdapter('financialdatanet'), /OPEN_DATA_SOURCE_NOT_CONFIGURED/);

  });
});
