import { useLocale } from '../../i18n/LocaleProvider';
import type { Locale } from '../../i18n/messages';
import { PRICING_CATALOG, VOCABULARY_PRICE, displayPriceEur } from '../../data/pricingCatalog';

export const COMMERCE_ENTRY_COPY: Record<Locale, readonly [string, string, string, string, string, string, string, string]> = {
  de: ['Wissen aufbauen. Werkzeuge vergleichen.', 'Entdecke die Lerninhalte und wähle anschließend den passenden Umfang deiner Analysewerkzeuge.', 'Lerninhalte entdecken', 'Finanzbegriffe, Methoden und Guides kennenlernen.', 'Lernportal öffnen', 'Analysewerkzeuge vergleichen', 'CADS-Prüffunktionen nach Tarif vergleichen. Providerdaten und KI-Modelle werden separat abgerechnet.', 'Tarife ansehen'],
  en: ['Build knowledge. Compare tools.', 'Explore learning resources, then choose the right scope for your analysis tools.', 'Explore learning resources', 'Discover financial terms, methods and guides.', 'Open learning portal', 'Compare analysis tools', 'Compare CADS checks by plan. Provider data and AI models are billed separately.', 'View plans'],
  it: ['Impara. Confronta gli strumenti.', 'Esplora le risorse formative e scegli gli strumenti di analisi adatti a te.', 'Scopri le risorse formative', 'Esplora termini finanziari, metodi e guide.', 'Apri il portale formativo', 'Confronta gli strumenti di analisi', 'Confronta le verifiche CADS per piano. Dati dei provider e modelli IA sono fatturati separatamente.', 'Vedi i piani'],
  fr: ['Apprenez. Comparez les outils.', 'Découvrez les ressources pédagogiques puis choisissez vos outils d’analyse.', 'Découvrir les ressources', 'Explorez les termes financiers, méthodes et guides.', 'Ouvrir le portail pédagogique', 'Comparer les outils d’analyse', 'Comparez les contrôles CADS par offre. Les données fournisseurs et modèles IA sont facturés séparément.', 'Voir les offres'],
  pt: ['Aprenda. Compare ferramentas.', 'Explore recursos educativos e escolha as ferramentas de análise adequadas.', 'Descobrir recursos educativos', 'Explore termos financeiros, métodos e guias.', 'Abrir portal educativo', 'Comparar ferramentas de análise', 'Compare verificações CADS por plano. Dados de fornecedores e modelos de IA são faturados separadamente.', 'Ver planos'],
  es: ['Aprende. Compara herramientas.', 'Explora recursos educativos y elige las herramientas de análisis adecuadas.', 'Descubrir recursos educativos', 'Explora términos financieros, métodos y guías.', 'Abrir el portal educativo', 'Comparar herramientas de análisis', 'Compara las comprobaciones CADS por plan. Los datos de proveedores y modelos de IA se facturan por separado.', 'Ver planes'],
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
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {([
          { title: copy[2], description: copy[3], cta: copy[4], path: '/learning' },
          { title: copy[5], description: copy[6], cta: copy[7], path: '/pricing' },
        ]).map(item => (
          <article key={item.path} className="flex flex-col rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            <p className="mb-4 mt-2 flex-1 text-sm leading-relaxed text-slate-300">{item.description}</p>
            <a href={item.path} onClick={event => follow(event, item.path)} className="self-start rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">{item.cta}</a>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-300">
        Starter · {displayPriceEur(PRICING_CATALOG.starter.monthly.amountCents)} € / {locale === 'de' ? 'Monat' : locale === 'en' ? 'month' : locale === 'fr' ? 'mois' : locale === 'it' ? 'mese' : locale === 'pt' ? 'mês' : 'mes'}
        {' · '}<a href="/vocabulary" onClick={event => follow(event, '/vocabulary')} className="text-amber-200 underline underline-offset-4">Market Vocabulary · {displayPriceEur(VOCABULARY_PRICE.amountCents)} €</a>
      </p>
    </section>
  );
}

export function CommerceEntrySection({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { locale } = useLocale();
  return <CommerceEntryContent locale={locale} onNavigate={onNavigate} />;
}
