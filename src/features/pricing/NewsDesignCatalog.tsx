import { useId, useState } from 'react';
import { NEWS_DESIGN_OFFER } from '../../data/pricingCatalog';
import { catalogueLearningUniverseAssets } from '../../platform/SocialMediaEngine/Branding/learningUniverseAssetRegistry.mjs';
import { buildLearningUniverseCommercialDraft } from '../../platform/SocialMediaEngine/Branding/learningUniverseCommercialLicenseDrafts.mjs';

const layouts = [
  { id: 'hero', name: 'Titelbild', use: 'Für Produktstarts und einzelne Leitmeldungen',
    headline: 'Ein neuer Zahlungsweg', labels: ['Bank', 'Abwicklung', 'Empfang'], graphic: 'NETZWERK' },
  { id: 'briefing', name: 'Kurzbriefing', use: 'Für Änderungen an APIs, Regeln und Handelsplätzen',
    headline: 'Eine Schnittstelle ändert sich', labels: ['Betroffen', 'Auswirkung', 'Nächste Prüfung'], graphic: 'STATUS' },
  { id: 'timeline', name: 'Zeitachse', use: 'Für Rollouts, Fristen und angekündigte Ereignisse',
    headline: 'Ein Rollout in drei Schritten', labels: ['Ankündigung', 'Pilot', 'Freigabe'], graphic: 'ABLAUF' },
  { id: 'comparison', name: 'Vergleich', use: 'Für Methoden, Produkte und geänderte Bedingungen',
    headline: 'Zwei Abwicklungsmodelle', labels: ['Modell A', 'Modell B'], graphic: 'GEGENÜBERSTELLUNG' },
] as const;

export function NewsDesignCatalog() {
  const headingId = useId();
  const choiceId = useId();
  const [id, setId] = useState<string>(layouts[0].id);
  const item = layouts.find(layout => layout.id === id) ?? layouts[0];
  const figure = (
    <figure className="rounded-xl border border-slate-600 bg-slate-950 p-3">
      <figcaption className="mb-2 text-sm font-semibold tracking-wide text-cyan-200">{item.graphic}</figcaption>
      <ol className={`grid gap-2 ${item.id === 'comparison' ? 'grid-cols-2' :
        item.id === 'briefing' ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
        {item.labels.map((label, index) => (
          <li key={label} className={`min-w-0 break-words rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm
            ${item.id === 'hero' && index === 1 ? 'border-cyan-400 text-cyan-100' : 'text-slate-100'}`}>
            {item.id === 'timeline' && <span className="mr-1 text-amber-200">{index + 1}.</span>}{label}
          </li>
        ))}
      </ol>
    </figure>
  );
  const imageFirst = item.id === 'hero' || item.id === 'timeline';
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-amber-400/40 bg-brand-canvas p-4 text-slate-100 sm:p-6">
      <h3 id={headingId} className="text-2xl font-bold text-amber-100">{NEWS_DESIGN_OFFER.label}</h3>
      <p className="mt-2 text-base">{NEWS_DESIGN_OFFER.deliverables}</p>
      <p className="mt-1 text-base text-amber-200">{NEWS_DESIGN_OFFER.pricing} · Individuelles Angebot</p>
      <label htmlFor={choiceId} className="mt-4 block text-base font-semibold">Artikel-Design auswählen</label>
      <select id={choiceId} value={item.id} onChange={event => setId(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-lg border border-slate-500 bg-slate-900 px-2 text-base text-white focus-visible:outline-2 focus-visible:outline-cyan-300">
        {layouts.map(layout => <option key={layout.id} value={layout.id}>{layout.name}</option>)}
      </select>
      <article aria-label="Designvorschau" className="mt-3 grid gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 sm:p-4">
        <p className="text-sm font-semibold text-cyan-200">Musterartikel · {item.use}</p>
        <h4 className="text-xl font-bold">{item.headline}</h4>
        {imageFirst && figure}
        <p className="text-base leading-relaxed">Einordnung, betroffene Bereiche und ein Link zum ursprünglichen Bericht.</p>
        {!imageFirst && figure}
        <p className="border-t border-slate-600 pt-2 text-sm text-slate-300">Quellen- und Bildnachweis</p>
      </article>

      <section aria-labelledby="learning-universe-catalogue-title" className="mt-6 border-t border-slate-700 pt-5"
        data-learning-universe-catalogue="first-party-preview">
        <h4 id="learning-universe-catalogue-title" className="text-lg font-bold text-cyan-100">Learning Universe · Designvorschau</h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          SVG-Motive aus dem Learning Hub – als Designvorschau innerhalb von CAPITAL-AI.
          Keine separate Verkaufs-, Weitergabe- oder Publishing-Lizenz. Die MediaKit-v5-Übernahme
          bleibt bis zur unabhängigen Prüfung ein Entwurf.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {catalogueLearningUniverseAssets().map(asset => (
            <figure key={asset.id} data-learning-catalogue-asset={asset.id}
              className="min-w-0 overflow-hidden rounded-xl border border-slate-600 bg-slate-950 p-2">
              <img src={asset.publicUrl} width={asset.width} height={asset.height}
                loading="lazy" decoding="async" alt={'Designvorschau: ' + asset.alt}
                className="aspect-[420/260] w-full rounded-lg object-contain" />
              <figcaption className="mt-2 text-sm font-semibold text-slate-100">{asset.title}</figcaption>
              <p className="mt-1 break-all text-xs text-slate-400">SHA-256: {asset.sha256.slice(0, 16)}…</p>
            </figure>
          ))}
        </div>
      </section>
      <LearningUniverseB2BInquirySection />
      <p data-inquiry-delivery="BLOCKED_SMTP_550" role="status"
        className="mt-3 rounded-lg border border-amber-300/50 px-3 py-3 text-base text-amber-100">
        Angebot für {item.name}: Anfrage derzeit nicht verfügbar. Bitte keine vertraulichen Dokumente senden.
      </p>
    </section>
  );
}


/** Phase A: public-facing copy prepared only in the unmerged Draft PR.
 * No contact fields, backend write, price, checkout, license or entitlement.
 * External publication still needs the owner-approved release path. */
export function LearningUniverseB2BInquirySection() {
  const concepts = [
    { key: 'PUBLISHER', title: 'Publisher Pack · Konzept',
      description: 'Zehn Learning-Universe-Vektormotive als unverbindliche Designbeispiele. Nutzungsumfang und Rechte werden individuell geprüft.' },
    { key: 'STUDIO', title: 'Publisher Studio · Konzept',
      description: 'Mögliche Anpassung von Design und Endformaten nach Briefing und gesonderter Machbarkeits- und Rechteprüfung.' },
    { key: 'RESELLER', title: 'B2B-Partnerschaft · Konzept',
      description: 'Anfrage zu einer möglichen Zusammenarbeit für fertige Endprodukte. Keine Rohdatei-Weitergabe oder automatische Unterlizenzierung.' },
  ] as const;
  // Fail closed if the draft module becomes an authoritative sales/rights object.
  const drafts = concepts.map(concept => ({
    ...concept, draft: buildLearningUniverseCommercialDraft(concept.key),
  }));
  if (drafts.some(({ draft }) =>
    draft.status !== 'DRAFT_ONLY' || draft.salesMode !== 'INQUIRY_ONLY' ||
    draft.amountCents !== null || draft.publicPromotionAllowed !== false ||
    draft.licensedUseAllowed !== false || draft.publishingAllowed !== false ||
    draft.buyerEntitled !== false || draft.automaticFulfilmentAllowed !== false ||
    draft.rawAssetResaleAllowed !== false || draft.sublicensingAllowed !== false)) return null;

  return (
    <section aria-labelledby="learning-universe-b2b-heading"
      data-learning-universe-b2b-inquiry="DRAFT_ONLY"
      className="mt-6 rounded-xl border border-cyan-400/30 bg-slate-950/70 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">B2B · unverbindliche Anfrage</p>
      <h4 id="learning-universe-b2b-heading" className="mt-2 text-xl font-bold text-slate-100">
        Learning Universe für Unternehmen
      </h4>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Entdecken Sie mögliche Publisher- und Studio-Pakete oder eine Zusammenarbeit.
        Aktuell ausschließlich zur Bedarfsklärung: Es gibt kein verbindliches Angebot,
        keine bestätigte Drittvertriebslizenz und keine sofortige Buchung oder Auslieferung.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {drafts.map(concept => (
          <article key={concept.key} data-b2b-concept={concept.key}
            className="flex min-w-0 flex-col rounded-lg border border-slate-700 bg-slate-900 p-3">
            <h5 className="text-base font-semibold text-amber-100">{concept.title}</h5>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-300">{concept.description}</p>
            <p data-inquiry-delivery="BLOCKED_SMTP_550" role="status"
              className="mt-4 rounded-lg border border-cyan-300/40 px-3 py-3 text-center text-sm text-cyan-100">
              Anfrage derzeit nicht verfügbar
            </p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">
        Bitte zunächst keine vertraulichen Dokumente übermitteln.
        Eine Anfrage begründet weder einen Vertrag noch Nutzungs-, Wiederverkaufs- oder Veröffentlichungsrechte.
        Hinweise zur Verarbeitung Ihrer Anfrage finden Sie in der{' '}
        <a href="/datenschutz/" className="text-cyan-200 underline focus-visible:outline-2 focus-visible:outline-cyan-200">Datenschutzerklärung</a>.
        Verbindliche Konditionen und Nutzungsrechte werden vor einer möglichen Vereinbarung individuell geklärt.
      </p>
    </section>
  );
}
