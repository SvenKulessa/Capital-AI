import { useRef, useState, type FormEvent } from 'react';
import { CONTROLLER } from '../../privacy/privacyPolicy';
import { useLocale } from '../../i18n/LocaleProvider';
import { cookieCopy } from '../../i18n/cookieCopy';
import { trackReceivedLearningInquiry } from '../../utils/analytics';

export function LearningInquiry() {
  const { locale } = useLocale();
  const copy = cookieCopy[locale];
  const [state, setState] = useState<'idle' | 'sending' | 'received' | 'error'>('idle');
  const requestId = useRef<string | null>(null);
  const locked = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || state === 'received') return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    locked.current = true;setState('sending');
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/api/public/learning-inquiry', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({ requestId: requestId.current, email: fields.get('email'), message: fields.get('message'), website: fields.get('website') }) });
      const result = await response.json();
      if (!response.ok || result.received !== true || result.receipt !== requestId.current || result.status !== 'MAIL_SERVER_ACCEPTED') throw new Error('not_received');
      setState('received');form.reset();
      trackReceivedLearningInquiry(result.receipt);
    } catch { setState('error'); } finally { locked.current = false; }
  }
  const subject = encodeURIComponent('Capital-AI Learning-/Kursanfrage');
  return <section aria-labelledby="learning-inquiry" className="my-6 rounded-2xl border border-amber-400/30 bg-slate-950 p-5 sm:p-6">
    <h2 id="learning-inquiry" className="text-xl font-semibold text-white">{copy.inquiryTitle}</h2>
    <form onSubmit={submit} className="mt-4 max-w-3xl space-y-4">
      <label className="block text-base text-slate-200">{copy.email}
        <input name="email" type="email" autoComplete="email" required maxLength={254} disabled={state === 'sending' || state === 'received'}
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-500 bg-slate-900 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-amber-300" />
      </label>
      <label className="block text-base text-slate-200">{copy.message}
        <textarea name="message" required minLength={10} maxLength={2000} rows={4} disabled={state === 'sending' || state === 'received'}
          className="mt-2 w-full rounded-xl border border-slate-500 bg-slate-900 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-amber-300" />
      </label>
      <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label></div>
      <p className="text-base leading-6 text-slate-300">{copy.contactPrivacy}</p>
      <button type="submit" disabled={state === 'sending' || state === 'received'} className="min-h-11 rounded-xl bg-amber-400 px-5 py-3 text-base font-semibold text-slate-950 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">{state === 'sending' ? copy.sending : copy.send}</button>
      <p role={state === 'error' ? 'alert' : 'status'} aria-live="polite" className="text-base text-slate-200">{state === 'received' ? copy.received : state === 'error' ? copy.sendError : ''}</p>
    </form>
    <a href={`mailto:${CONTROLLER.supportEmail}?subject=${subject}`} className="mt-4 inline-flex min-h-11 items-center text-base text-amber-200 underline underline-offset-4">{CONTROLLER.supportEmail}</a>
    <a href="/datenschutz#cookie-storage" className="mt-2 flex min-h-11 items-center text-base text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-200">{copy.privacy}</a>
  </section>;
}
