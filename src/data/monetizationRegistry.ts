export const MONETIZABLE_PRODUCTS = [
  { id:'saas', name:'[CAPITAL-AI-MARKET]SAAS-MEMBERSHIP', domain:'MARKET', state:'ACTIVE' },
  { id:'data-api', name:'[CAPITAL-AI-MARKET]B2B-DATA-API', domain:'MARKET', state:'PLANNED' },
  { id:'sentiment-api', name:'[CAPITAL-AI-MARKET]SENTIMENT-API', domain:'MARKET', state:'PROMPT-2 / 50-COMPONENTS' },
  { id:'white-label', name:'[CAPITAL-AI-MARKET]WHITE-LABEL-WIDGETS', domain:'MARKET', state:'PLANNED' },
  { id:'broker', name:'[CAPITAL-AI-MARKET]BROKER-AFFILIATE-ROUTING', domain:'MARKET', state:'PLANNED' },
  { id:'fee-share', name:'[CAPITAL-AI-MARKET]TRADING-FEE-REVENUE-SHARE', domain:'MARKET', state:'PLANNED' },
  { id:'pipeline-sim', name:'[CAPITAL-AI-MARKET]OSS-PIPELINE-SIMULATION-ENGINE', domain:'MARKET', state:'INTEGRATED' },
  { id:'cads-app', name:'[CAPITAL-AI-MARKET]CADS-BENCHMARK-MARKET-APP', domain:'MARKET', state:'PLANNED' },
  { id:'ghcr-app', name:'[CAPITAL-AI-MARKET]GHCR-DIGEST-BLUEPRINT-MARKETPLACE-APP', domain:'MARKET', state:'PLANNED' },
  { id:'cpt-stake', name:'[CAPITAL-AI-MARKET]CPT-STAKE-TO-ACCESS', domain:'MARKET', state:'PLANNED' },
  { id:'cpt-micro', name:'[CAPITAL-AI-MARKET]CPT-MICROPAYMENTS', domain:'MARKET', state:'PLANNED' },
  { id:'cpt-pay', name:'[CAPITAL-AI-MARKET]CPT-SUBSCRIPTION-PAYMENTS', domain:'MARKET', state:'PLANNED' },
  { id:'revenue', name:'[CAPITAL-AI-MARKET]REVENUE-SIMULATOR', domain:'MARKET', state:'INTEGRATED' },
  { id:'sponsorship', name:'[CAPITAL-AI-MARKET]SPONSORSHIP', domain:'GROWTH', state:'PLANNED' },
  { id:'seo', name:'[CAPITAL-AI-MARKET]SEO-GROWTH-ENGINE', domain:'GROWTH', state:'PLANNED' },
  { id:'social', name:'[CAPITAL-AI-MARKET]SOCIAL-MEDIA-ENGINE', domain:'GROWTH', state:'PLANNED' },
] as const;

// Orderbook, Market Depth, Sentiment and other analytical products are projected from
// the canonical 50-component MARKET registry / Prompt 2 instead of being duplicated here.
