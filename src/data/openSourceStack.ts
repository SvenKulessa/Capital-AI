export type OssLayer =
  | 'market_ingress'
  | 'event_bus'
  | 'cache'
  | 'analytics'
  | 'observability'
  | 'vector_search'
  | 'license_compliance'
  | 'simulation';

export type OssComponent = {
  id: string;
  name: string;
  layer: OssLayer;
  license: string;
  repository: string;
  interfaces: readonly string[];
  status: 'INTEGRATED' | 'ADAPTER_READY' | 'RESEARCH_ONLY' | 'EXISTING';
  dataRights: 'SOFTWARE_ONLY' | 'PROVIDER_TERMS_REQUIRED' | 'RESEARCH_ONLY';
  notes: string;
};

export const OPEN_SOURCE_STACK: readonly OssComponent[] = [
  { id:'ccxt', name:'CCXT', layer:'market_ingress', license:'MIT', repository:'https://github.com/ccxt/ccxt', interfaces:['REST','WebSocket via Pro-capable exchange methods'], status:'ADAPTER_READY', dataRights:'PROVIDER_TERMS_REQUIRED', notes:'Exchange abstraction; exchange data terms remain independent.' },
  { id:'hummingbot', name:'Hummingbot / Gateway', layer:'market_ingress', license:'Apache-2.0 / MIT by subproject', repository:'https://github.com/hummingbot', interfaces:['REST','WebSocket','DEX gateway'], status:'ADAPTER_READY', dataRights:'PROVIDER_TERMS_REQUIRED', notes:'Connector architecture and optional isolated service.' },
  { id:'cryptofeed', name:'Cryptofeed', layer:'market_ingress', license:'BSD-style upstream license with attribution conditions', repository:'https://github.com/bmoscon/cryptofeed', interfaces:['WebSocket','normalized market events'], status:'ADAPTER_READY', dataRights:'PROVIDER_TERMS_REQUIRED', notes:'Python sidecar candidate; preserve upstream attribution.' },
  { id:'openbb', name:'OpenBB', layer:'market_ingress', license:'Apache-2.0 (current V5 line)', repository:'https://github.com/OpenBB-finance/OpenBB', interfaces:['Python','REST/API','provider routers'], status:'ADAPTER_READY', dataRights:'PROVIDER_TERMS_REQUIRED', notes:'Multi-asset aggregation layer; underlying provider rights still apply.' },
  { id:'defillama-sdk', name:'DefiLlama API SDK', layer:'market_ingress', license:'MIT', repository:'https://github.com/DefiLlama/api-sdk', interfaces:['REST','TypeScript SDK'], status:'ADAPTER_READY', dataRights:'PROVIDER_TERMS_REQUIRED', notes:'DeFi fundamentals/TVL/yield metadata; not a tick-by-tick venue feed.' },
  { id:'yfinance', name:'yfinance', layer:'market_ingress', license:'Apache-2.0', repository:'https://github.com/ranaroussi/yfinance', interfaces:['REST-like downloader','WebSocket','AsyncWebSocket'], status:'RESEARCH_ONLY', dataRights:'RESEARCH_ONLY', notes:'Software is permissive; Yahoo data terms are a separate commercial-rights gate.' },

  { id:'nats', name:'NATS + JetStream', layer:'event_bus', license:'Apache-2.0', repository:'https://github.com/nats-io/nats-server', interfaces:['NATS','JetStream'], status:'EXISTING', dataRights:'SOFTWARE_ONLY', notes:'Canonical durable event/evidence transport already used by Capital-AI.' },
  { id:'valkey', name:'Valkey', layer:'cache', license:'BSD-3-Clause', repository:'https://github.com/valkey-io/valkey', interfaces:['RESP','Pub/Sub'], status:'EXISTING', dataRights:'SOFTWARE_ONLY', notes:'Canonical low-latency cache/projection layer already used by Capital-AI.' },
  { id:'duckdb', name:'DuckDB', layer:'analytics', license:'MIT', repository:'https://github.com/duckdb/duckdb', interfaces:['SQL','Parquet','WASM/Python/Node clients'], status:'ADAPTER_READY', dataRights:'SOFTWARE_ONLY', notes:'Embedded analytical engine for local/replay/benchmark workloads.' },
  { id:'clickhouse', name:'ClickHouse', layer:'analytics', license:'Apache-2.0 server code; docs/assets separately licensed', repository:'https://github.com/ClickHouse/ClickHouse', interfaces:['SQL','HTTP','Native'], status:'ADAPTER_READY', dataRights:'SOFTWARE_ONLY', notes:'Optional OLAP scale-out candidate; do not reuse separately licensed documentation assets.' },
  { id:'otel', name:'OpenTelemetry Collector', layer:'observability', license:'Apache-2.0', repository:'https://github.com/open-telemetry/opentelemetry-collector', interfaces:['OTLP','metrics','traces','logs'], status:'ADAPTER_READY', dataRights:'SOFTWARE_ONLY', notes:'Vendor-neutral telemetry pipeline.' },
  { id:'prometheus', name:'Prometheus', layer:'observability', license:'Apache-2.0', repository:'https://github.com/prometheus/prometheus', interfaces:['Prometheus exposition','HTTP'], status:'ADAPTER_READY', dataRights:'SOFTWARE_ONLY', notes:'Metrics and alerting candidate.' },
  { id:'qdrant', name:'Qdrant', layer:'vector_search', license:'Apache-2.0', repository:'https://github.com/qdrant/qdrant', interfaces:['REST','gRPC'], status:'ADAPTER_READY', dataRights:'SOFTWARE_ONLY', notes:'Optional vector retrieval for research/news/filing embeddings; never an authority for market facts.' },
  { id:'ort', name:'OSS Review Toolkit', layer:'license_compliance', license:'Apache-2.0', repository:'https://github.com/oss-review-toolkit/ort', interfaces:['CLI','JSON reports'], status:'EXISTING', dataRights:'SOFTWARE_ONLY', notes:'Already connected to the Capital-AI license engine via report adapter.' },
  { id:'scancode', name:'ScanCode Toolkit', layer:'license_compliance', license:'Apache-2.0', repository:'https://github.com/aboutcode-org/scancode-toolkit', interfaces:['CLI','JSON reports'], status:'EXISTING', dataRights:'SOFTWARE_ONLY', notes:'Already connected to the Capital-AI license engine via report adapter.' },
  { id:'pipeline-simulator', name:'Capital-AI OSS Pipeline Simulation Engine', layer:'simulation', license:'Repository license', repository:'https://github.com/SvenKulessa/Capital-AI', interfaces:['TypeScript','JSON evidence'], status:'INTEGRATED', dataRights:'SOFTWARE_ONLY', notes:'Deterministic architecture simulation and CADS evidence generator; simulated metrics are not live provider SLAs.' },
] as const;

export const OPEN_SOURCE_MARKET_INGRESS = OPEN_SOURCE_STACK.filter(component => component.layer === 'market_ingress');
