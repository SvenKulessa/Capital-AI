/** Informational only: no wallet provider access, transaction requests or identity linking. */
export function WalletDiscoveryPanel({ userId }: { userId: string }) {
  if (!userId) return null;
  return (
    <section aria-labelledby="wallet-discovery-heading" className="rounded-2xl border border-slate-700 bg-brand-canvas p-5">
      <h2 id="wallet-discovery-heading" className="text-xl font-bold text-white">Wallet & Kryptowährungen</h2>
      <p className="mt-2 text-sm text-slate-300">
        MetaMask und Zahlungen über Polygon, Solana und XRP Ledger befinden sich in Vorbereitung.
        Die Anmeldung erfolgt weiterhin über dein bestehendes Konto.
      </p>
      <p role="status" className="mt-3 text-sm text-amber-200">
        Wallet-Verbindung und Krypto-Zahlungen sind derzeit nicht verfügbar.
      </p>
      <p className="mt-2 text-sm text-slate-300">
        Es werden keine Wallet-Adressen abgefragt, Transaktionen ausgelöst oder Abonnements verändert.
      </p>
    </section>
  );
}
