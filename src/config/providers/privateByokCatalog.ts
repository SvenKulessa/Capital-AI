/**
 * Personal BYOK catalog. 'active' means the existing private server-side adapter
 * and database allowlist support saving and verifying credentials. 'planned'
 * must NEVER accept or persist secrets. No entry grants redistributable data rights.
 */
export const PRIVATE_BYOK_PROVIDERS = [
  {
    "id": "kraken",
    "label": "Kraken",
    "category": "Crypto-Börsen",
    "description": "Private Kraken Spot/Futures-Konten. Server-verifizierter HMAC-Key; Withdrawal/Transfers gesperrt.",
    "availability": "active"
  },
  {
    "id": "binance",
    "label": "Binance",
    "category": "Crypto-Börsen",
    "description": "Private Binance Spot/Futures-Konten. Server-verifizierter HMAC-Key; Withdrawal/Transfers gesperrt.",
    "availability": "active"
  },
  {
    "id": "coinbase",
    "label": "Coinbase Advanced",
    "category": "Crypto-Börsen",
    "description": "Privater Coinbase-Account. CDP-Authentifizierung und Read-only-Adapter noch zu prüfen.",
    "availability": "planned"
  },
  {
    "id": "bitstamp",
    "label": "Bitstamp",
    "category": "Crypto-Börsen",
    "description": "Privater Börsenzugang; signierte Authentifizierung noch nicht implementiert.",
    "availability": "planned"
  },
  {
    "id": "bybit",
    "label": "Bybit",
    "category": "Crypto-Börsen",
    "description": "Privater Börsenzugang; Berechtigungsprüfung und Signaturen noch nicht implementiert.",
    "availability": "planned"
  },
  {
    "id": "okx",
    "label": "OKX",
    "category": "Crypto-Börsen",
    "description": "Privater Börsenzugang; Passphrase- und Signaturprüfung noch nicht implementiert.",
    "availability": "planned"
  },
  {
    "id": "alpha_vantage",
    "label": "Alpha Vantage",
    "category": "Aktien & Marktdaten",
    "description": "BYOK-Marktdatenzugang. Vertrags-, Kosten- und Read-only-Probe ausstehend.",
    "availability": "planned"
  },
  {
    "id": "twelve_data",
    "label": "Twelve Data",
    "category": "Aktien & Marktdaten",
    "description": "BYOK-Aktien-, ETF- und FX-Daten. Daten- und Anzeigerechte ausstehend.",
    "availability": "planned"
  },
  {
    "id": "finnhub",
    "label": "Finnhub",
    "category": "Aktien & Marktdaten",
    "description": "BYOK-Finanzdaten. Nutzungsbudget und Lizenzrechte ausstehend.",
    "availability": "planned"
  },
  {
    "id": "financial_modeling_prep",
    "label": "Financial Modeling Prep",
    "category": "Aktien & Marktdaten",
    "description": "BYOK-Fundamentaldaten. API-Vertrag und Planumfang ausstehend.",
    "availability": "planned"
  },
  {
    "id": "massive",
    "label": "Massive (Polygon.io)",
    "category": "Aktien & Marktdaten",
    "description": "Privater Polygon/Massive-REST-Adapter für bis zu 50 Werte je Klasse. Tarifrechte werden beim Abruf geprüft; keine öffentliche Weitergabe.",
    "availability": "active"
  },
  {
    "id": "tiingo",
    "label": "Tiingo",
    "category": "Aktien & Marktdaten",
    "description": "BYOK-EOD-/Marktdaten. Vertrag und Read-only-Verifikation ausstehend.",
    "availability": "planned"
  },
  {
    "id": "eodhd",
    "label": "EODHD",
    "category": "Aktien & Marktdaten",
    "description": "BYOK-EOD-/Fundamentaldaten. API-Plan und Lizenzgrenzen ausstehend.",
    "availability": "planned"
  },
  {
    "id": "marketstack",
    "label": "Marketstack",
    "category": "Aktien & Marktdaten",
    "description": "BYOK-Aktienmarktdaten. API-Plan und Rate Limits ausstehend.",
    "availability": "planned"
  },
  {
    "id": "fred",
    "label": "FRED",
    "category": "Makro & Referenzdaten",
    "description": "Privater FRED-API-Schlüssel. Quellenbedingungen und read-only Adapter ausstehend.",
    "availability": "planned"
  },
  {
    "id": "nasdaq_data_link",
    "label": "Nasdaq Data Link",
    "category": "Makro & Referenzdaten",
    "description": "BYOK-Datensatzabfragen; Rechte hängen vom jeweiligen Datensatz ab.",
    "availability": "planned"
  },
  {
    "id": "coingecko",
    "label": "CoinGecko",
    "category": "Crypto-Daten",
    "description": "BYOK-Crypto-Marktdaten. Demo-/Pro-Key- und Tarifprüfung ausstehend.",
    "availability": "planned"
  },
  {
    "id": "coinmarketcap",
    "label": "CoinMarketCap",
    "category": "Crypto-Daten",
    "description": "BYOK-Crypto-Marktdaten. API-Kontingent und Rechte ausstehend.",
    "availability": "planned"
  },
  {
    "id": "cryptocompare",
    "label": "CryptoCompare",
    "category": "Crypto-Daten",
    "description": "BYOK-Crypto-Marktdaten. Lizenz- und Kontingentprüfung ausstehend.",
    "availability": "planned"
  },
  {
    "id": "alchemy",
    "label": "Alchemy",
    "category": "Web3 / RPC",
    "description": "Persönlicher Web3-RPC-Key. Private Endpoint- und Egress-Prüfung ausstehend.",
    "availability": "planned"
  }
] as const;

export type PrivateByokProviderId = (typeof PRIVATE_BYOK_PROVIDERS)[number]['id'];
export type PrivateByokProvider = (typeof PRIVATE_BYOK_PROVIDERS)[number];

export function isPrivateByokEnabled(id: string): boolean {
  return PRIVATE_BYOK_PROVIDERS.some(provider => provider.id === id && provider.availability === 'active');
}
