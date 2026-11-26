import { ContentEngineConcept } from '../home/ContentEngineConcept';
import { HubNavigationPanel } from '../../components/HubNavigationPanel';
import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import { BLOG_ARTICLES } from '../../../shared/blog-articles.mjs';
import { ArrowRight, BookOpen, FileCheck2, Image, Layers3, Newspaper, ShieldCheck, Sparkles, Workflow } from 'lucide-react';

const pipeline = [
  { title: 'Pre-Analyse', detail: 'Briefing · Rechte · Quellen', color: BRAND_COLORS.blue },
  { title: 'Engine', detail: 'Eigene Texte und Layouts', color: BRAND_COLORS.violet },
  { title: 'Enrichment', detail: 'Metadaten · Nachweise', color: BRAND_COLORS.green },
  { title: 'Qualität', detail: 'Fakten · Accessibility', color: BRAND_COLORS.cyan },
  { title: 'Lizenzierung', detail: 'Asset-Rechte · Freigabe', color: BRAND_COLORS.gold },
  { title: 'Publish', detail: 'Nur nach Admission', color: BRAND_COLORS.rose },
] as const;
const visualTypes = [
  { label: 'Frontend', detail: 'UI und Dashboard', color: BRAND_COLORS.cyan },
  { label: 'Backend', detail: 'Datenfluss und Schema', color: BRAND_COLORS.gold },
  { label: 'Trust / Security', detail: 'Sicherheit und Belege', color: BRAND_COLORS.green },
  { label: 'Market', detail: 'Wissen und Research', color: BRAND_COLORS.violet },
  { label: 'Growth', detail: 'Content und Kampagnen', color: BRAND_COLORS.rose },
  { label: 'Platform', detail: 'Architektur und Betrieb', color: BRAND_COLORS.blue },
  { label: 'Product', detail: 'Features und Roadmap', color: BRAND_COLORS.pink },
] as const;
const licensing = [
  'Asset-Herkunft, Urheber und erlaubte Bearbeitungen nachweisen',
  'Original-Lizenztexte und kommerzielle Nutzungsrechte prüfen',
  'Metadaten, Hash und Quellenbezug dokumentieren',
  'Fakten, Barrierefreiheit und personenbezogene Daten prüfen',
  'CADS-/Qualitätsbefunde mit tatsächlichen Nachweisen verifizieren',
  'Freigabe erst vor einem ausdrücklich autorisierten Publisher-Lauf',
] as const;

/** Responsive reconstruction of the supplied Engine-Asset overview, not an approved asset export. */
export function SocialHubPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const page = typeof window === 'undefined' ? 'uebersicht' : window.location.pathname.split('/')[2] || 'uebersicht';
  return <main lang="de" className="mx-auto max-w-7xl px-3 pb-12 pt-5 text-slate-100 sm:px-6">
    <header className="rounded-3xl border border-pink-300/35 bg-[radial-gradient(ellipse_at_75%_15%,rgba(249,168,212,.19),transparent_55%),linear-gradient(130deg,#071226,#0b0b22)] p-5 sm:p-8">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-pink-200"><Sparkles className="h-4 w-4" aria-hidden="true" /> Visual Intelligence · Social Hub</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Engine Asset-Konzept</h1>
      <p className="mt-2 max-w-2xl text-base text-slate-200">Visuals mit System. Wirkung mit Vertrauen. Social Content Engine, eigene Visual Assets und nachweisbare Lizenzierung in einer Oberfläche.</p>
      <p className="mt-3 text-xs text-slate-300">Responsive Konzeptübersicht nach der bereitgestellten Designvorlage · kein Nachweis produktiv freigegebener Publishing-Rechte.</p>
    </header>
    <HubNavigationPanel hubId="social" onNavigate={onNavigate} />
    {page === 'studio' ? <section aria-label="Content Studio" className="space-y-5">
      <div className="rounded-2xl border border-pink-400/30 bg-[#0b152c] p-5">
        <h2 className="text-xl font-bold">Content Studio</h2>
        <p className="mt-2 text-sm text-slate-300">Ein neuer GUI-Editor mit individuellen Assets, Quellenbelegen und Freigabeworkflow ist in Vorbereitung. Vorhandene Entwurfsfunktionen bleiben zugänglich.</p>
        <button type="button" onClick={() => onNavigate('/studio?tab=content')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink-300 px-4 text-sm font-bold text-slate-950">Bestehendes Content Studio öffnen <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <ContentEngineConcept onNavigate={onNavigate} />
    </section> : page === 'news' ? <section aria-labelledby="social-news-title" className="rounded-2xl border border-slate-700 bg-[#0b1527] p-5">
      <h2 id="social-news-title" className="flex items-center gap-2 text-xl font-bold"><Newspaper className="h-5 w-5 text-pink-300" aria-hidden="true" /> News & Blog</h2>
      <p className="mt-2 text-sm text-slate-300">Bestehende eigene redaktionelle Beiträge. Keine ungeprüften Fremdtexte oder automatische Veröffentlichung.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{BLOG_ARTICLES.map(article => <article key={article.id} className="rounded-xl border border-pink-300/20 p-4">
        <p className="text-xs text-slate-400"><time dateTime={article.date}>{article.date}</time> · Eigene Redaktion</p>
        <h3 className="mt-2 text-base font-bold"><a href={article.path} className="underline-offset-4 hover:underline">{article.title}</a></h3>
        <p className="mt-2 text-sm text-slate-300">{article.description}</p>
      </article>)}</div>
    </section> : page === 'lizenzen' ? <section aria-labelledby="social-license-title" className="rounded-2xl border border-amber-400/30 bg-[#0b1527] p-5">
      <h2 id="social-license-title" className="flex items-center gap-2 text-xl font-bold"><FileCheck2 className="h-5 w-5 text-amber-300" aria-hidden="true"/> Lizenzierungsprozess</h2>
      <p className="mt-2 text-sm text-slate-300">Rechteprüfung und dokumentierte Freigabe gehen jedem Export und jedem Publishing voraus.</p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2">{licensing.map((step,index)=><li key={step} className="rounded-xl border border-white/10 p-4"><span className="text-xs font-bold text-amber-200">Schritt {index+1}</span><p className="mt-1 text-sm">{step}</p></li>)}</ol>
      <p className="mt-4 text-sm font-semibold text-amber-200">Ohne belastbaren Rechte- und CADS-Nachweis: HOLD, nicht publishen.</p>
    </section> : <div className="space-y-5">
      <section aria-labelledby="social-pipeline-title" className="rounded-2xl border border-cyan-300/25 bg-[#081a2d] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Transparenz · Auditierbarkeit · Reproduzierbarkeit</p>
        <h2 id="social-pipeline-title" className="mt-2 flex items-center gap-2 text-xl font-bold"><Workflow className="h-5 w-5 text-cyan-300" aria-hidden="true" /> Engine Pipeline</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{pipeline.map((step,index)=><div key={step.title} className="min-w-0 rounded-xl border p-3" style={{borderColor:step.color+'77',backgroundColor:step.color+'12'}}>
          <p className="text-xs font-bold" style={{color:step.color}}>{index+1} · {step.title}</p>
          <p className="mt-3 text-xs leading-5 text-slate-200">{step.detail}</p>
        </div>)}</div>
        <p className="mt-4 flex items-center gap-2 text-xs text-amber-200"><ShieldCheck className="h-4 w-4" aria-hidden="true"/> Engine- und Lizenzstatus sind als Konzept dargestellt, nicht als bestätigte Freigabe.</p>
      </section>
      <section aria-labelledby="social-colors-title" className="rounded-2xl border border-white/10 bg-[#0a1226] p-5">
        <h2 id="social-colors-title" className="flex items-center gap-2 text-xl font-bold"><Image className="h-5 w-5 text-pink-300" aria-hidden="true" /> Sieben Brandingfarben · sieben Asset-Kategorien</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">{visualTypes.map(item=><article key={item.label} className="min-w-0 rounded-xl border p-3" style={{borderColor:item.color+'90',backgroundColor:item.color+'12'}}>
          <div className="mb-3 h-1.5 w-14 rounded-full" style={{backgroundColor:item.color}} aria-hidden="true" />
          <h3 className="break-words text-sm font-semibold" style={{color:item.color}}>{item.label}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-300">{item.detail}</p>
        </article>)}</div>
      </section>
      <section className="grid gap-4 md:grid-cols-2" aria-label="Weiterarbeiten und Freigaben">
        <div className="rounded-2xl border border-pink-300/25 bg-[#0b1527] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Layers3 className="h-5 w-5 text-pink-300" aria-hidden="true" /> Eigenen Content planen</h2>
          <p className="mt-2 text-sm text-slate-300">Texte, Grafiken, Videos und Kampagnen später per GUI erstellen. Das vorhandene Content Studio ist bereits separat erreichbar.</p>
          <button type="button" onClick={() => onNavigate('/social/studio')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-pink-300/40 px-4 text-sm font-semibold">Studio ansehen <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        <div className="rounded-2xl border border-amber-300/25 bg-[#0b1527] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen className="h-5 w-5 text-amber-300" aria-hidden="true" /> Rechte vor Reichweite</h2>
          <p className="mt-2 text-sm text-slate-300">Quellen, Lizenztexte, Eigenleistung, Metadaten, Freigaben und CADS-Evidence bleiben getrennte Prüfungen.</p>
          <button type="button" onClick={() => onNavigate('/social/lizenzen')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/40 px-4 text-sm font-semibold">Lizenzierungsprozess <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </section>
    </div>}
  </main>;
}
