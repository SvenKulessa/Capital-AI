import React from 'react';
import { ArrowLeft, BookOpen, Download, FileText, Printer, Scale } from 'lucide-react';
import { researchMetadata, researchProviders, RESEARCH_REVIEW_DATE, type ResearchRoute } from '../data/researchLicenses';

const linkStyle = 'text-cyan-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-400';
const cardStyle = 'rounded-2xl border border-slate-800 bg-[#090e21] p-5 space-y-3';
export function ResearchLicensePages({ route, onNavigate }: { route: ResearchRoute; onNavigate: (path: string) => void }) {
  const downloadReview = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ documentType: 'research-review-not-provider-certificate', reviewedAt: RESEARCH_REVIEW_DATE, projectApproval: false, providers: researchProviders }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'capital-ai-forschungspruefstand.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="research-report p-5 sm:p-8 text-slate-200 space-y-6" aria-labelledby="research-page-title">
    <button type="button" onClick={() => onNavigate('/')} className="inline-flex min-h-11 items-center gap-2 text-amber-300"><ArrowLeft size={18} />Zur Startseite</button>
    <header className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-purple-500/10 p-6 space-y-3">
      <p className="text-xs uppercase tracking-wider text-amber-300">Capital-AI · Forschung & Transparenz</p>
      <h1 id="research-page-title" className="text-2xl font-bold text-white">{researchMetadata[route].title.replace('Capital-AI | ', '')}</h1>
      <p className="text-sm">{researchMetadata[route].description}</p>
      <p className="text-xs text-slate-400">Dokumentationsstand {RESEARCH_REVIEW_DATE} · Projektbezogene Rechteprüfung offen</p>
    </header>
    <nav aria-label="Lizenz- und Forschungsseiten" className="flex flex-wrap gap-4 text-sm">
      {Object.entries(researchMetadata).map(([path, meta]) => <a key={path} href={path} aria-current={route === path ? 'page' : undefined} className={linkStyle} onClick={e => { e.preventDefault(); onNavigate(path); }}>{meta.title.replace('Capital-AI | ', '')}</a>)}
    </nav>
    {route === '/datenprovider-lizenzen' && <>
      <p className="text-sm text-amber-200">Forschungszweck, Förderung oder Sponsoring erteilen keine zusätzlichen Datenrechte. Hinweise erläutern Einschränkungen; sie ersetzen keine erforderliche Erlaubnis.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{researchProviders.map(provider => <article key={provider.id} className={cardStyle}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-white flex items-center gap-2"><Scale size={18} className="text-amber-300" />{provider.name}</h2><span className="rounded-full border border-amber-500/30 px-3 py-1 text-xs text-amber-200">{provider.status}</span></div>
        <p className="text-sm">{provider.research}</p><p className="text-sm text-slate-400">{provider.limits}</p>
        <ul className="space-y-2 text-xs">{provider.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className={linkStyle}>{source.label}</a></li>)}</ul>
      </article>)}</div>
      <div className="flex flex-wrap gap-4"><button type="button" onClick={downloadReview} className="min-h-11 inline-flex gap-2 items-center text-cyan-300"><Download size={18} />Prüfstand herunterladen (JSON)</button><button type="button" onClick={() => window.print()} className="min-h-11 inline-flex gap-2 items-center text-amber-300"><Printer size={18} />Prüfstand drucken / als PDF speichern</button></div>
      <p className="text-xs text-slate-400">Der Export ist ein Capital-AI-Prüfbericht. Er bestätigt keine Provider-Lizenz und keine behördliche Zertifizierung.</p>
    </>}
    {route === '/lizenz' && <article className={cardStyle}>
      <h2 className="font-bold text-white flex gap-2"><FileText size={20} />Design & Erdbild</h2>
      <p className="text-sm">Sven Kulessa bestätigt die Entstehung des Website-Mockups im ChatGPT-Projekt CAPITAL-AI-SOCIAL mit der eigenen Social Media Engine. Anschließend wurde das Design im Playground von Google AI Studio mit FRONTEND und Gemini weiterentwickelt und durch ChatGPT nach Capital-AI übertragen.</p>
      <p className="text-sm text-slate-400">Die Zuordnung des konkreten Erdbilds zur ursprünglichen Generierung und zu den damals geltenden Dienstbedingungen wird dokumentiert. Das bestehende Design und Bild bleiben erhalten. Fremde Markenzeichen benötigen eine gesonderte Prüfung.</p>
      <a className={linkStyle} href="https://github.com/SvenKulessa/Capital-AI/blob/main/docs/security/evidence/hero-owner-statement-20261001.json" target="_blank" rel="noopener noreferrer">Herkunftsangabe und Prüfgrenzen</a>
    </article>}
    {route === '/opensource-lizenzen' && <article className={cardStyle}>
      <h2 className="font-bold text-white">Anwendung, Abhängigkeiten & Container</h2>
      <p className="text-sm">Das FRONTEND-Verzeichnis beschreibt ausgewählte Kernbibliotheken. Der ausgelieferte Umfang umfasst zusätzlich transitive Pakete, Fonts und Betriebssystem-Komponenten. Die Containerprüfung enthält auch Copyleft-Befunde; eine pauschale GPL-Freiheit ist deshalb nicht belegt.</p>
      <p className="text-sm text-slate-400">Maßgeblich sind versionsgebundene Original-Lizenztexte, Copyright-Hinweise, vollständige Scans und die Zuordnung zum tatsächlichen Image. Allgemeine Mustertexte und erfolgreiche Builds sind keine Gesamtfreigabe.</p>
      <ul className="space-y-2 text-sm"><li><a className={linkStyle} href="/THIRD_PARTY_NOTICES.txt">Originalhinweise der ausgelieferten Frontend-Pakete</a></li><li><a className={linkStyle} href="/frontend-license-inventory.json">Buildbezogenes Frontend-Lizenzinventar (JSON)</a></li><li><a className={linkStyle} href="/fonts/OFL.txt">Original-OFL der lokal ausgelieferten Schrift</a></li><li><a className={linkStyle} href="https://github.com/SvenKulessa/Capital-AI/blob/main/docs/security/LICENSE-RIGHTS.md" target="_blank" rel="noopener noreferrer">Container- und Quellenprüfung</a></li><li><a className={linkStyle} href="https://github.com/SvenKulessa/Capital-AI/blob/main/OPEN_SOURCE_LICENSES.md" target="_blank" rel="noopener noreferrer">OSS-Prüfverzeichnis</a></li></ul>
    </article>}
    {route === '/forschung' && <ResearchProjectSummary onNavigate={onNavigate} />}
    <p className="text-xs text-slate-400">Keine Anlageberatung. Daten, Modelle und Scores können unvollständig, verzögert oder fehlerhaft sein. Quellen, Beobachtungszeitpunkte und Prüfstatus müssen beim jeweiligen Ergebnis ausgewiesen werden.</p>
  </section>;
}

export function ResearchProjectSummary({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <section className="mx-5 my-6 rounded-2xl border border-cyan-500/20 bg-[#090e21] p-5 space-y-3" aria-labelledby="research-project-heading">
    <h2 id="research-project-heading" className="text-lg font-bold text-white flex gap-2 items-center"><BookOpen size={20} className="text-cyan-300" />FinTech-Forschungsprojekt Capital-AI</h2>
    <p className="text-sm text-slate-300">Wir untersuchen, wie günstige gehostete Infrastruktur und nachvollziehbare Datenkonzepte heterogene FinTech-Datenströme in überprüfbare Scores überführen können. Im Mittelpunkt stehen Datenintegrität, Quellenherkunft, reproduzierbare Auswertung und robuste Verarbeitung.</p>
    <p className="text-sm text-slate-400">Forschungs- und Entwicklungsprojekt von Sven Kulessa. Eine Förderung über einen Innovationsgutschein und Sponsoring für Capital-AI sind geplant. Eine Förderzusage, Hochschulzugehörigkeit oder Provider-Partnerschaft wird damit nicht behauptet.</p>
    <a className={linkStyle} href="/datenprovider-lizenzen" onClick={e => { e.preventDefault(); onNavigate('/datenprovider-lizenzen'); }}>Forschungsbedingungen und Datenrechte ansehen</a>
  </section>;
}
