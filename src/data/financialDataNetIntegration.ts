export type FinancialDataNetConnectionKind =
  | 'provider_rest'
  | 'python_sdk'
  | 'universal_query'
  | 'mcp_server'
  | 'spreadsheet_addin';

export type FinancialDataNetDatasetGroup = {
  id: string;
  label: string;
  methods: readonly string[];
  capitalAiUse: readonly string[];
  rightsStatus: 'CONTRACT_SCOPE_UNVERIFIED';
};

export const FINANCIAL_DATA_NET_PROVENANCE = Object.freeze({
  providerId: 'financialdatanet',
  providerName: 'FinancialData.Net',
  apiBaseUrl: 'https://financialdata.net/api/v1/',
  sdkRepository: 'https://github.com/financialdatanet/fdnpy',
  sdkCommit: 'e46103c95ba04927057609268765a5711b3ad656',
  sdkVersion: '0.6.0',
  sdkLicense: 'MIT',
  sdkLicenseEvidence: 'PyPI metadata and setup.py classifier; repository root has no LICENSE file in the reviewed snapshot',
  codeVendored: false,
  providerRightsStatus: 'CONTRACT_SCOPE_UNVERIFIED',
  productionEligible: false,
});

export const FINANCIAL_DATA_NET_CONNECTIONS: readonly {
  id: string;
  label: string;
  kind: FinancialDataNetConnectionKind;
  interface: string;
  status: 'ADAPTER_READY' | 'CATALOGUED';
  notes: string;
}[] = [
  {
    id: 'financialdatanet-rest',
    label: 'FinancialData.Net REST API v1',
    kind: 'provider_rest',
    interface: 'HTTPS REST',
    status: 'ADAPTER_READY',
    notes: 'Primary provider surface. API-key and provider/dataset rights remain separate activation gates.',
  },
  {
    id: 'fdnpy',
    label: 'fdnpy Python SDK',
    kind: 'python_sdk',
    interface: 'Python / requests',
    status: 'ADAPTER_READY',
    notes: 'Optional sidecar integration only; no SDK source is vendored into the Node runtime.',
  },
  {
    id: 'financialdatanet-universal-query',
    label: 'FinancialData.Net Universal Query',
    kind: 'universal_query',
    interface: 'REST query builder',
    status: 'CATALOGUED',
    notes: 'Field/filter projection surface. Dataset-specific rights and schema mapping are required before activation.',
  },
  {
    id: 'financialdatanet-mcp',
    label: 'FinancialData.Net MCP Server',
    kind: 'mcp_server',
    interface: 'MCP',
    status: 'CATALOGUED',
    notes: 'AI-agent integration surface. It is not an authority for market-data rights or canonical evidence.',
  },
  {
    id: 'financialdatanet-excel',
    label: 'FinancialData.Net Excel Add-in',
    kind: 'spreadsheet_addin',
    interface: 'Excel add-in',
    status: 'CATALOGUED',
    notes: 'Research/analyst workflow connection; not part of the production market-ingress runtime.',
  },
] as const;

export const FINANCIAL_DATA_NET_DATASET_GROUPS: readonly FinancialDataNetDatasetGroup[] = [
  {
    id: 'symbols-reference',
    label: 'Symbol & instrument reference',
    methods: ['get_stock_symbols','get_international_stock_symbols','get_etf_symbols','get_commodity_symbols','get_otc_symbols','get_index_symbols','get_futures_symbols','get_crypto_symbols','get_forex_symbols','get_mutual_fund_symbols'],
    capitalAiUse: ['canonical instrument mapping','coverage discovery'],
    rightsStatus: 'CONTRACT_SCOPE_UNVERIFIED',
  },
  {
    id: 'market-prices-quotes',
    label: 'Market prices & quotes',
    methods: ['get_stock_quotes','get_stock_prices','get_international_stock_prices','get_minute_prices','get_latest_prices','get_commodity_prices','get_otc_prices','get_index_quotes','get_index_prices','get_crypto_quotes','get_crypto_prices','get_crypto_minute_prices','get_forex_quotes','get_forex_prices','get_forex_minute_prices','get_etf_quotes','get_etf_prices','get_etf_minute_prices'],
    capitalAiUse: ['canonical market observations','historical/replay candidates'],
    rightsStatus: 'CONTRACT_SCOPE_UNVERIFIED',
  },
  {
    id: 'derivatives',
    label: 'Derivatives',
    methods: ['get_option_chain','get_option_prices','get_option_greeks','get_futures_prices'],
    capitalAiUse: ['options/futures research','risk feature candidates'],
    rightsStatus: 'CONTRACT_SCOPE_UNVERIFIED',
  },
  {
    id: 'fundamentals',
    label: 'Company fundamentals, statements & ratios',
    methods: ['get_company_information','get_international_company_information','get_key_metrics','get_international_key_metrics','get_market_cap','get_employee_count','get_executive_compensation','get_securities_information','get_income_statements','get_balance_sheet_statements','get_cash_flow_statements','get_international_income_statements','get_international_balance_sheet_statements','get_international_cash_flow_statements','get_liquidity_ratios','get_solvency_ratios','get_efficiency_ratios','get_profitability_ratios','get_valuation_ratios'],
    capitalAiUse: ['Buffett Value Check','fundamental feature candidates'],
    rightsStatus: 'CONTRACT_SCOPE_UNVERIFIED',
  },
  {
    id: 'news-events-macro',
    label: 'News, events & macro',
    methods: ['get_latest_news','get_press_releases','get_sec_press_releases','get_fed_press_releases','get_earnings_calendar','get_ipo_calendar','get_splits_calendar','get_dividends_calendar','get_economic_calendar','get_economic_indicators','get_economic_indicator_values'],
    capitalAiUse: ['event evidence','macro context','news research'],
    rightsStatus: 'CONTRACT_SCOPE_UNVERIFIED',
  },
  {
    id: 'insider-institutional',
    label: 'Insider, legislative & institutional activity',
    methods: ['get_insider_transactions','get_proposed_sales','get_senate_trading','get_house_trading','get_institutional_investors','get_institutional_holdings','get_institutional_portfolio_statistics'],
    capitalAiUse: ['institutional-flow research','governance/event features'],
    rightsStatus: 'CONTRACT_SCOPE_UNVERIFIED',
  },
  {
    id: 'funds-esg-advisers',
    label: 'Funds, ESG & investment advisers',
    methods: ['get_etf_holdings','get_mutual_fund_holdings','get_mutual_fund_statistics','get_esg_scores','get_esg_ratings','get_industry_esg_scores','get_investment_adviser_names','get_investment_adviser_information'],
    capitalAiUse: ['fund exposure research','ESG research','adviser reference'],
    rightsStatus: 'CONTRACT_SCOPE_UNVERIFIED',
  },
  {
    id: 'corporate-actions-consensus',
    label: 'Corporate actions & analyst data',
    methods: ['get_analyst_consensus','get_earnings_releases','get_initial_public_offerings','get_stock_splits','get_dividends','get_short_interest'],
    capitalAiUse: ['corporate-action evidence','consensus/short-interest research'],
    rightsStatus: 'CONTRACT_SCOPE_UNVERIFIED',
  },
] as const;

export function getFinancialDataNetIntegrationSummary() {
  return {
    provider: FINANCIAL_DATA_NET_PROVENANCE,
    connections: FINANCIAL_DATA_NET_CONNECTIONS,
    datasetGroups: FINANCIAL_DATA_NET_DATASET_GROUPS,
    methodCount: FINANCIAL_DATA_NET_DATASET_GROUPS.reduce((sum, group) => sum + group.methods.length, 0),
    decisionEligible: false as const,
  };
}
