import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CONTROLLER } from '../privacy/privacyPolicy';
import { useLocale } from '../i18n/LocaleProvider';
import { cookieCopy } from '../i18n/cookieCopy';

export function ContactForm() {
  const { locale } = useLocale();
  const copy = cookieCopy[locale];
  const [state, setState] = useState<'idle' | 'sending' | 'received' | 'error'>('idle');
  const requestId = useRef<string | null>(null);
  const locked = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state === 'received') feedback.current?.scrollIntoView({ block: 'nearest' });
  }, [state]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || state === 'received') return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    locked.current = true;setState('sending');
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/api/public/contact', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({ requestId: requestId.current, email: fields.get('email'), message: fields.get('message'), website: fields.get('website') }) });
      const result = await response.json();
      if (!response.ok || result.received !== true || result.receipt !== requestId.current || result.status !== 'MAIL_SERVER_ACCEPTED') throw new Error('not_received');
      setState('received');form.reset();
    } catch { setState('error'); } finally { locked.current = false; }
  }
  const subject = encodeURIComponent('Capital-AI Kontaktanfrage');
  return <section aria-labelledby="contact-form" className="my-6 rounded-2xl border border-[#F5C453]/35 bg-[#0b1830] p-5 sm:p-6 shadow-[0_0_35px_rgba(245,196,83,0.06)]">
    <h2 id="contact-form" className="text-xl font-semibold text-white">{copy.inquiryTitle}</h2>
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
      <div ref={feedback} role={state === 'error' ? 'alert' : 'status'} aria-live="polite" aria-atomic="true"
        className={state === 'received' ? 'rounded-xl border border-emerald-400 bg-emerald-950 p-4 text-base text-emerald-100' : 'text-base text-slate-200'}>
        {state === 'received' ? <>
          <p className="flex items-center gap-2 font-semibold"><span aria-hidden="true">✓</span>{copy.emailSent}</p>
          <p className="mt-1 leading-6">{copy.received}</p>
        </> : state === 'error' ? copy.sendError : ''}
      </div>
    </form>
    <a href={`mailto:${CONTROLLER.supportEmail}?subject=${subject}`} className="mt-4 inline-flex min-h-11 items-center text-base text-amber-200 underline underline-offset-4">{CONTROLLER.supportEmail}</a>
    <a href="/datenschutz/" className="mt-2 flex min-h-11 items-center text-base text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-200">{copy.privacy}</a>
  </section>;
}
