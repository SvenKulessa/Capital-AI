import { useState } from 'react';

const button = 'min-h-11 rounded-lg border border-indigo-400/40 px-3 py-2 text-sm font-semibold text-indigo-100 disabled:opacity-50';

type OpenAiStatus = {
  connection: string;
  productionKeyPresent: boolean;
  personalKeyPresent: boolean;
  modelAvailable: boolean | null;
  modelConfigured: boolean;
  budget: {
    permitsRequest: boolean;
    inputTokens: number;
    outputTokens: number;
    capMicroUsd: number | null;
  };
};

export function OpenAiProviderStatus() {
  const [status, setStatus] = useState<OpenAiStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function readStatus() {
    setStatus(null);
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch('/api/profile/growth-intelligence/openai-status', {
        credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(18000),
      });
      if (!response.ok) throw Error('OpenAI status unavailable');
      setStatus(await response.json());
    } catch {
      setStatus(null);
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return <section className="rounded-xl border border-indigo-400/30 p-3" aria-label="OpenAI-Provider">
    <h3 className="font-semibold">OpenAI-Provider</h3>
    <button type="button" className={button + ' mt-2'} disabled={pending} onClick={() => void readStatus()}>
      {pending ? 'Verbindung wird geprüft …' : 'Verbindung und Modell prüfen'}
    </button>
    <div className="mt-2 text-sm text-slate-300" aria-live="polite">
      {failed && <p>Provider-Status nicht verfügbar.</p>}
      {status && <dl>
        <div><dt className="inline font-semibold">Verbindung </dt><dd className="inline">{status.connection}</dd></div>
        <div><dt className="inline font-semibold">Produktionsschlüssel </dt><dd className="inline">{status.productionKeyPresent ? 'Vorhanden' : 'Fehlt'}</dd></div>
        <div><dt className="inline font-semibold">Personal-Schlüssel </dt><dd className="inline">{status.personalKeyPresent ? 'Vorhanden · vom Provider-Aufruf ausgeschlossen' : 'Fehlt'}</dd></div>
        <div><dt className="inline font-semibold">Modell </dt><dd className="inline">{!status.modelConfigured ? 'Nicht konfiguriert' : status.modelAvailable === null ? 'Nicht nachgewiesen' : status.modelAvailable ? 'Verfügbar laut Modellmetadaten' : 'Kein Zugriff auf das konfigurierte Modell'}</dd></div>
        <div><dt className="inline font-semibold">Kostenkontrolle </dt><dd className="inline">{status.budget.permitsRequest && status.budget.capMicroUsd !== null ? `Pro Entwurfsaufruf maximal ${status.budget.inputTokens} Eingabe- und ${status.budget.outputTokens} Ausgabetokens bei konfigurierter Obergrenze von ${status.budget.capMicroUsd / 1_000_000} USD` : 'Inferenz gesperrt durch Konfiguration'}</dd></div>
      </dl>}
    </div>
  </section>;
}
