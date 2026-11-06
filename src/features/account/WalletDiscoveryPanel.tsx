/** Informational wallet roadmap only. No provider access, wallet signing, or payments. */
export function WalletDiscoveryPanel() {
  return (
    <section aria-labelledby="wallet-discovery-heading" className="rounded-2xl border border-slate-700 bg-brand-canvas p-5">
      <h2 id="wallet-discovery-heading" className="text-xl font-bold text-white">Wallet & Kryptowährungen</h2>
      <p className="mt-2 text-sm text-slate-300">
        Polygon, Solana und XRP Ledger sind als zukünftige Zahlungsoptionen geplant.
        Die Anmeldung und alle Berechtigungen bleiben an dein bestehendes Konto gebunden.
      </p>
      <p role="status" className="mt-3 text-sm text-amber-200">
        Wallet-Verbindung und Krypto-Zahlungen sind derzeit deaktiviert.
      </p>
    </section>
  );
}
