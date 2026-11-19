import { useRef, useState, type FormEvent } from 'react';
import { CONTROLLER } from '../../privacy/privacyPolicy';

const OFFER_PATH = '/governance-evidence-sprint';
const INQUIRY_PREFIX = '[Governance & Evidence Sprint | B2B-Anfrage]\n';

type SubmissionState = 'idle' | 'sending' | 'received' | 'error';

/** No marketing subscription, CRM storage or contact-field analytics are triggered by this form. */
export function GovernanceSprintInquiry() {
  const [state, setState] = useState<SubmissionState>('idle');
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!privacyAcknowledged || inFlight.current || state === 'received') return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const message = String(fields.get('message') || '').trim();
    if (message.length < 10 || message.length > 1800) return;

    requestId.current ||= crypto.randomUUID();
    inFlight.current = true;
    setState('sending');
    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          requestId: requestId.current,
          email: fields.get('email'),
          message: INQUIRY_PREFIX + message,
          website: fields.get('website'),
        }),
      });
      const result = await response.json();
      if (!response.ok || result.received !== true || result.receipt !== requestId.current ||
          result.status !== 'MAIL_SERVER_ACCEPTED') throw new Error('inquiry_not_accepted');
      setState('received');
      form.reset();
      setPrivacyAcknowledged(false);
    } catch {
      setState('error');
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <section id="anfrage" aria-labelledby="sprint-inquiry-heading" className="rounded-3xl border border-amber-300/35 bg-slate-950/90 p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">Unverbindlich · B2B</p>
      <h2 id="sprint-inquiry-heading" className="mt-2 text-2xl font-bold text-white">Evidence Sprint anfragen</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
        Beschreibe nur die gewünschte Prüfung, ohne Zugangsdaten, Tokens, Kundendaten oder vertrauliche Logs einzufügen.
        Die Anfrage ist keine Buchung und löst keine Zahlung aus.
      </p>
      <form onSubmit={submit} className="mt-5 max-w-2xl space-y-4">
        <label className="block text-sm font-semibold text-white">Geschäftliche Antwortadresse
          <input name="email" type="email" autoComplete="email" required maxLength={254}
            disabled={state === 'sending' || state === 'received'}
            className="mt-2 block min-h-11 w-full rounded-xl border border-slate-500 bg-slate-900 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-amber-200" />
        </label>
        <label className="block text-sm font-semibold text-white">Prüfgegenstand und gewünschtes Ergebnis
          <textarea name="message" required minLength={10} maxLength={1800} rows={5}
            placeholder="Beispiel: Ein GitHub-Repository mit zwei CI-Workflows; gewünscht ist eine priorisierte Evidence- und Risikoliste."
            disabled={state === 'sending' || state === 'received'}
            className="mt-2 block w-full rounded-xl border border-slate-500 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-amber-200" />
        </label>
        <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label></div>
        <label className="flex items-start gap-3 text-sm leading-6 text-slate-200">
          <input type="checkbox" required checked={privacyAcknowledged} onChange={event => setPrivacyAcknowledged(event.target.checked)}
            disabled={state === 'sending' || state === 'received'} className="mt-1 h-5 w-5 shrink-0 accent-amber-300" />
          <span>Ich habe die <a className="font-semibold text-amber-200 underline underline-offset-4" href="/datenschutz">Datenschutzhinweise zu Kontaktanfragen</a> gelesen
            und bitte um Rückmeldung zu meiner Anfrage. Das ist keine Einwilligung in Newsletter oder Werbemails.</span>
        </label>
        <p className="text-xs leading-5 text-slate-300">
          Zur Bearbeitung werden die angegebene E-Mail-Adresse und Nachricht an das Supportpostfach übermittelt.
          Keine Speicherung in einer neuen Lead-Datenbank; keine Übermittlung von Kontaktangaben oder Nachrichten an GA4.
          Die Bearbeitung ist unabhängig von einer Analytics-Einwilligung möglich.
        </p>
        <button type="submit" disabled={!privacyAcknowledged || state === 'sending' || state === 'received'}
          className="min-h-11 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200">
          {state === 'sending' ? 'Anfrage wird gesendet …' : 'Unverbindliche Anfrage senden'}
        </button>
        <div role={state === 'error' ? 'alert' : 'status'} aria-live="polite" aria-atomic="true" className="text-sm text-slate-100">
          {state === 'received'
            ? 'Der Mailserver hat die Anfrage angenommen. Eine Zustellung oder Rückmeldung ist damit noch nicht bestätigt.'
            : state === 'error'
              ? 'Die Anfrage konnte nicht bestätigt werden. Bitte versuche es erneut oder nutze den E-Mail-Kontakt.'
              : ''}
        </div>
      </form>
      <a className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-amber-200 underline underline-offset-4" href={'mailto:' + CONTROLLER.supportEmail + '?subject=CAPITAL-AI%20Governance%20%26%20Evidence%20Sprint'}>
        Alternativ per E-Mail anfragen
      </a>
    </section>
  );
}

export function GovernanceEvidenceSprintPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 pb-14 pt-8 text-slate-100 sm:px-6">
      <header className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-slate-950 via-cyan-950/30 to-slate-950 p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">CAPITAL-AI · Governance & Evidence Sprint</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-white sm:text-5xl">Weniger unbelegte Sicherheitsannahmen. Mehr prüfbare Entscheidungen.</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200">
          Ein kompakter, manuell durchgeführter B2B-Review für Softwareteams und IT-Dienstleister:
          Vorhandene CI-, Supply-Chain- und Governance-Nachweise werden strukturiert,
          offene Risiken gekennzeichnet und nächste Maßnahmen priorisiert.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href="#anfrage" className="inline-flex min-h-11 items-center rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-200">Unverbindlich anfragen</a>
          <a href="#musterbericht" className="inline-flex min-h-11 items-center rounded-xl border border-cyan-300/50 px-5 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-950/60">Musterbericht ansehen</a>
        </div>
        <p className="mt-4 text-sm text-slate-300">
          Preisindikation für einen eng abgegrenzten Pilot: 690 € netto zzgl. anwendbarer Umsatzsteuer;
          unverbindliche Kalkulationshypothese, kein verbindliches Online-Angebot und kein Checkout.
          Leistungsumfang und Preis werden vor Auftragserteilung schriftlich vereinbart.
        </p>
      </header>

      <section aria-labelledby="scope-heading">
        <h2 id="scope-heading" className="text-2xl font-bold text-white">Was ein Pilot umfasst</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h3 className="font-semibold text-cyan-100">1. Evidence erfassen</h3>
            <p className="mt-2 text-sm leading-6 text-slate-200">Ein vereinbartes GitHub-Repository und bis zu zwei bestehende CI-Workflows: zugängliche Run-Links, Commit-Bezug, Status und Lücken erfassen.</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h3 className="font-semibold text-cyan-100">2. Risiken zuordnen</h3>
            <p className="mt-2 text-sm leading-6 text-slate-200">Verfügbare Security-, Supply-Chain- und Governance-Nachweise prüfen; VERIFIED, BLOCKED und NOT_PROVEN explizit trennen.</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h3 className="font-semibold text-cyan-100">3. Bericht übergeben</h3>
            <p className="mt-2 text-sm leading-6 text-slate-200">Priorisierte Feststellungen, Quellen-/Evidence-Links, Maßnahmenvorschläge und ein Ergebnisgespräch bis 30 Minuten.</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="limits-heading" className="rounded-2xl border border-amber-200/30 bg-amber-950/10 p-5 sm:p-7">
        <h2 id="limits-heading" className="text-xl font-bold text-white">Leistungsgrenzen und Voraussetzungen</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-200">
          <li>Kein Penetrationstest, keine laufende SOC-Überwachung, keine garantierte Schwachstellenfreiheit und kein Zertifikat nach ISO 27001, DORA, DSGVO oder BaFin.</li>
          <li>Kein automatisierter Microsoft-365-Tenant-Scan. M365-/Azure-Checks sind nur nach gesondert vereinbartem Umfang und sicheren Berechtigungen möglich.</li>
          <li>Keine produktiven Änderungen, Secret-Übernahme oder Zugriffsausweitung im Basispilot. Für private Repositories werden Bereitstellung und Zugriff individuell und datensparsam abgestimmt.</li>
          <li>Fehlende oder nicht überprüfbare Artefakte werden als NOT_PROVEN ausgewiesen, nicht als erfolgreich getestet. Ergebnisse beziehen sich ausschließlich auf den vereinbarten Prüfzeitpunkt und Scope.</li>
        </ul>
      </section>

      <section id="musterbericht" aria-labelledby="sample-heading" className="rounded-3xl border border-violet-300/30 bg-slate-950 p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-200">Muster · ausschließlich Strukturbeispiel · keine Kunden-Evidence</p>
        <h2 id="sample-heading" className="mt-2 text-2xl font-bold text-white">So sieht ein Evidence-Bericht aus</h2>
        <p className="mt-3 text-sm leading-6 text-slate-200">Alle Werte unten sind illustrative Platzhalter. Sie belegen weder einen durchgeführten Audit noch eine vorhandene Sicherheitsfreigabe.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <caption className="mb-3 text-left text-slate-300">Illustrative Evidence-Matrix ohne reale Projektdaten</caption>
            <thead><tr className="border-b border-slate-700 text-cyan-100"><th scope="col" className="p-3">Prüffeld</th><th scope="col" className="p-3">Musterstatus</th><th scope="col" className="p-3">Erforderlicher Nachweis</th></tr></thead>
            <tbody>
              <tr className="border-b border-slate-800"><td className="p-3">CI-Build am Commit</td><td className="p-3">NOT_PROVEN</td><td className="p-3">Run-URL, SHA, Job-Exit-Code</td></tr>
              <tr className="border-b border-slate-800"><td className="p-3">Container-/Dependency-Scan</td><td className="p-3">NOT_PROVEN</td><td className="p-3">Scannerbericht mit Version und Zeitpunkt</td></tr>
              <tr><td className="p-3">Runtime-Korrelation</td><td className="p-3">NOT_PROVEN</td><td className="p-3">Deployment-ID, Image-Digest, Readback</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-300">Musterempfehlung: Zuerst fehlende CI- und Build-Identitätsnachweise erfassen; erst danach über Freigaben entscheiden. Keine Sicherheitsbewertung ohne reale Evidenz.</p>
        <a href="https://github.com/SvenKulessa/Capital-AI/blob/main/docs/growth/GOVERNANCE-EVIDENCE-SPRINT-MUSTERBERICHT-20261119.md"
          target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-amber-200 underline underline-offset-4">
          Aufbau des Musterberichts im Repository
        </a>
      </section>

      <GovernanceSprintInquiry />

      <p className="text-sm leading-6 text-slate-300">
        Hinweis: Der Sprint ist eine technische Bestandsaufnahme auf Basis der vereinbarten Quellen,
        keine Rechtsberatung oder regulatorische Konformitätsbescheinigung.
        <a href="/impressum" className="ml-1 text-amber-200 underline">Impressum</a> ·
        <a href="/datenschutz" className="ml-1 text-amber-200 underline">Datenschutz</a>
      </p>
      <a href="/" className="inline-flex min-h-11 items-center text-cyan-200 underline underline-offset-4">Zur CAPITAL-AI-Startseite</a>
    </main>
  );
}

export const GOVERNANCE_SPRINT_ROUTE = OFFER_PATH;
