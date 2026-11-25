import { useLocale } from '../../i18n/LocaleProvider';
import type { Locale } from '../../i18n/messages';
import { PRICING_CATALOG, displayPriceEur } from '../../data/pricingCatalog';
import { VOCABULARY_OFFER } from '../../data/vocabularyOffer';

export const COMMERCE_ENTRY_COPY: Record<Locale, readonly [string, string, string, string, string, string, string, string]> = {
  de: ['Angebote und Preise', 'Wähle den Zugang, der zu deinem Lern- oder Analysebedarf passt.', 'Kostenlose Lerninhalte', 'Öffentliche Begriffe, Lernbeispiele und Methoden kennenlernen.', 'Kostenlos lernen', 'Analyse- und Tool-Angebote', 'Sieh, welche Funktionen im jeweiligen Tarif enthalten sind. Anbieterdaten und KI-Modelle werden separat abgerechnet.', 'Tarife vergleichen'],
  en: ['Build knowledge. Compare tools.', 'Explore learning resources, then choose the right scope for your analysis tools.', 'Explore learning resources', 'Discover financial terms, methods and guides.', 'Open learning portal', 'Compare analysis tools', 'Compare checks by plan. Provider data and AI models are billed separately.', 'View plans'],
  it: ['Impara. Confronta gli strumenti.', 'Esplora le risorse formative e scegli gli strumenti di analisi adatti a te.', 'Scopri le risorse formative', 'Esplora termini finanziari, metodi e guide.', 'Apri il portale formativo', 'Confronta gli strumenti di analisi', 'Confronta le verifiche per piano. Dati dei provider e modelli IA sono fatturati separatamente.', 'Vedi i piani'],
  fr: ['Apprenez. Comparez les outils.', 'Découvrez les ressources pédagogiques puis choisissez vos outils d’analyse.', 'Découvrir les ressources', 'Explorez les termes financiers, méthodes et guides.', 'Ouvrir le portail pédagogique', 'Comparer les outils d’analyse', 'Comparez les contrôles par offre. Les données fournisseurs et modèles IA sont facturés séparément.', 'Voir les offres'],
  pt: ['Aprenda. Compare ferramentas.', 'Explore recursos educativos e escolha as ferramentas de análise adequadas.', 'Descobrir recursos educativos', 'Explore termos financeiros, métodos e guias.', 'Abrir portal educativo', 'Comparar ferramentas de análise', 'Compare verificações por plano. Dados de fornecedores e modelos de IA são faturados separadamente.', 'Ver planos'],
  es: ['Aprende. Compara herramientas.', 'Explora recursos educativos y elige las herramientas de análisis adecuadas.', 'Descubrir recursos educativos', 'Explora términos financieros, métodos y guías.', 'Abrir el portal educativo', 'Comparar herramientas de análisis', 'Compara las comprobaciones por plan. Los datos de proveedores y modelos de IA se facturan por separado.', 'Ver planes'],
};

export function CommerceEntryContent({ locale, onNavigate }: { locale: Locale; onNavigate: (path: string) => void }) {
  const copy = COMMERCE_ENTRY_COPY[locale];
  // Preserve real links for new tabs and assistive navigation; intercept ordinary app navigation only.
  const follow = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(path);
  };
  return (
    <section aria-labelledby="commerce-entry-title" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 id="commerce-entry-title" className="text-2xl font-bold text-white sm:text-3xl">{copy[0]}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{copy[1]}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {([
          { title: copy[2], description: copy[3], cta: copy[4], path: '/learning', price: locale === 'de' ? 'Kostenlos' : '' },
          { title: VOCABULARY_OFFER.name, description: locale === 'de' ? 'Kostenpflichtiges Lernangebot. Details und Kaufbedingungen im Learning Hub.' : '', cta: copy[4], path: '/learning', price: displayPriceEur(VOCABULARY_OFFER.amountCents) + ' €' },
          { title: copy[5], description: copy[6], cta: copy[7], path: '/pricing', price: 'Starter · ' + displayPriceEur(PRICING_CATALOG.starter.monthly.amountCents) + ' € / ' + (locale === 'de' ? 'Monat' : locale === 'en' ? 'month' : locale === 'fr' ? 'mois' : locale === 'it' ? 'mese' : locale === 'pt' ? 'mês' : 'mes') },
          { title: locale === 'de' ? 'Für Unternehmen' : 'Enterprise', description: locale === 'de' ? 'Individuelle Anfrage zum vorhandenen B2B-Angebot.' : '', cta: locale === 'de' ? 'B2B-Angebot ansehen' : 'Enterprise inquiry', path: '/governance-evidence-sprint', price: locale === 'de' ? 'Preis auf Anfrage' : '' },
        ]).map(item => (
          <article key={item.title} className="flex flex-col rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            {item.price && <p className="mt-3 text-lg font-semibold text-amber-200">{item.price}</p>}
            {item.description && <p className="mb-4 mt-2 flex-1 text-sm leading-relaxed text-slate-300">{item.description}</p>}
            <a href={item.path} onClick={event => follow(event, item.path)} className={item.path === '/learning'
              ? "self-start rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
              : "self-start rounded-xl px-4 py-3 text-sm font-semibold text-amber-200 underline underline-offset-4 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"}>{item.cta}</a>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{locale === 'de' ? 'Verbindliche Leistungs- und Vertragsinformationen findest du beim jeweiligen Angebot. Externe Anbieterdaten und KI-Modelle sind nicht im Abo enthalten.' : copy[6]}</p>
    </section>
  );
}

export function CommerceEntrySection({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { locale } = useLocale();
  return (
    <>
      <CommerceEntryContent locale={locale} onNavigate={onNavigate} />
      <section aria-labelledby="governance-sprint-cta" className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="rounded-2xl border border-cyan-300/25 bg-slate-950/80 p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">CAPITAL-AI · B2B-Angebot</p>
          <h2 id="governance-sprint-cta" className="mt-2 text-xl font-bold text-white">Governance &amp; Evidence Sprint</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
            Ein begrenzter, manuell erbrachter CI-/Security-Evidence-Review mit Musterbericht,
            klaren Grenzen und unverbindlicher Anfrage. Kein automatischer Tenant-Scan oder Zertifikat.
          </p>
          <a href="/governance-evidence-sprint"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-cyan-300/60 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-950/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">
            B2B-Angebot und Musterbericht ansehen
          </a>
        </div>
      </section>
    </>
  );
}
