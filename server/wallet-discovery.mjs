/** Wallet discovery gate: read-only, no wallet login or payments. */
export const WALLET_DISCOVERY_CONTRACT = 'CAPITAL_AI_WALLET_DISCOVERY@1';
const CHAINS = Object.freeze(['polygon', 'solana', 'xrpl']);
export function walletDiscoveryCapabilities(env = process.env) {
  const enabled = env.CAPITAL_AI_WALLET_DISCOVERY_ENABLED === 'true';
  return Object.freeze({
    contract: WALLET_DISCOVERY_CONTRACT,
    enabled,
    chains: Object.freeze(CHAINS.map((chain) => Object.freeze({
      chain,
      connect: false,
      quote: false,
      checkout: false,
      subscription: false,
      mainnet: false,
    }))),
    paymentStatus: 'BLOCKED',
    entitlementAuthority: 'existing-server-verified-commerce-only',
  });
}
