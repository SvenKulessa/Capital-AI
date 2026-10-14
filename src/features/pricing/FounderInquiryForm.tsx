import { useRef, useState, type FormEvent } from 'react';
import { FOUNDER_OFFER } from '../../data/founderOffer';

/** Only the private mail endpoint receives contact PII. Never use analytics, shared caches or public events. */
export function FounderInquiryForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'accepted' | 'error'>('idle');
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || state === 'accepted') return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const read = (field: string) => String(values.get(field) || '').trim();
    const email = read('email');
    const message = [
      'Founder / individuelle B2B-Anfrage',
      `Name: ${read('name')}`,
      `Organisation: ${read('organization') || 'Nicht angegeben'}`,
      `Anfragetyp: ${read('interest')}`,
      `Telefon / bevorzugtes Gesprächsfenster: ${read('callback') || 'Nicht angegeben'}`,
      '',
      read('details'),
    ].join('\n');
    if (message.length > 2000 || !values.has('privacyAcknowledged')) {
      setState('error');
      return;
    }
    inFlight.current = true;
    setState('sending');
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/api/public/founder-inquiry', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ requestId: requestId.current, email, message, website: read('website') }),
      });
      const result = await response.json();
      if (!response.ok || result.received !== true || result.receipt !== requestId.current ||
          result.status !== 'MAIL_SERVER_ACCEPTED') throw new Error('DELIVERY_NOT_CONFIRMED');
      setState('accepted');
      form.reset();
    } catch {
      setState('error');
    } finally {
      inFlight.current = false;
    }
  }
  const unavailable = state === 'sending' || state === 'accepted';
  return (
    <div className="mt-4 border-t border-amber-300/20 pt-4">
      <h4 className="text-sm font-bold text-amber-100">Vertrauliche Founder-Anfrage</h4>
      <p className="mt-1 text-xs text-slate-300">Privates Angebot und unverbindliches Telefonat anfragen. Keine Online-Zahlung und keine automatische Freischaltung.</p>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-200">Name *
          <input name="name" required maxLength={120} autoComplete="name" disabled={unavailable} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white" />
        </label>
        <label className="text-xs text-slate-200">E-Mail *
          <input name="email" required type="email" maxLength={254} autoComplete="email" disabled={unavailable} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white" />
        </label>
        <label className="text-xs text-slate-200">Organisation (optional)
          <input name="organization" maxLength={120} autoComplete="organization" disabled={unavailable} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white" />
        </label>
        <label className="text-xs text-slate-200">Interesse *
          <select name="interest" required disabled={unavailable} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white">
            <option value="Individuelle Kundenlösung">Individuelle Kundenlösung</option>
            <option value="Private Partnerschaft">Private Partnerschaft</option>
            <option value="Architektur und Integration">Architektur und Integration</option>
          </select>
        </label>
        <label className="sm:col-span-2 text-xs text-slate-200">Rückrufwunsch / bevorzugter Termin (optional, keine automatische Buchung)
          <input name="callback" maxLength={130} disabled={unavailable} placeholder="z. B. Mittwoch vormittags; Rufnummer nur falls gewünscht" className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white" />
        </label>
        <label className="sm:col-span-2 text-xs text-slate-200">Projektbeschreibung *
          <textarea name="details" required minLength={10} maxLength={1250} rows={3} disabled={unavailable} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white" />
        </label>
        <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label></div>
        <label className="sm:col-span-2 flex items-start gap-2 text-xs leading-5 text-slate-300">
          <input type="checkbox" name="privacyAcknowledged" required disabled={unavailable} className="mt-1 h-4 w-4 shrink-0 accent-amber-400" />
          <span>Ich habe die <a className="text-amber-200 underline" href={FOUNDER_OFFER.legalPath}>Datenschutzhinweise</a> zur Verarbeitung meiner Anfrage zur Kenntnis genommen. Keine Werbeeinwilligung.</span>
        </label>
        <button type="submit" disabled={unavailable} className="min-h-11 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{state === 'sending' ? 'Anfrage wird gesendet …' : 'Privat anfragen'}</button>
        <a className="flex min-h-11 items-center text-xs text-amber-200 underline" href={`mailto:${FOUNDER_OFFER.contactEmail}?subject=CAPITAL-AI%20Founder-Anfrage`}>Alternativ direkt per E-Mail</a>
      </form>
      {state === 'accepted' && <p role="status" className="mt-3 text-xs text-emerald-200">Anfrage vom Mailserver angenommen. Eine Terminbuchung wurde nicht automatisch vorgenommen.</p>}
      {state === 'error' && <p role="alert" className="mt-3 text-xs text-rose-200">Zustellung nicht bestätigt. Bitte Eingaben prüfen oder direkt per E-Mail anfragen.</p>}
    </div>
  );
}
