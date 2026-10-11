import React, { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, FileText, LockKeyhole, Search } from 'lucide-react';
import { BLUEPRINT_DELIVERY_POLICY } from '../../data/blueprintDeliveryPolicy';
import {
  ARCHITECTURE_CATALOGS, ARCHITECTURE_PRODUCT_PATHS,
  architectureCatalogUrl, filterArchitectureCatalogs,
} from './architectureViewModel';

type Props = { onNavigate?: (path: string) => void };
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

/** Public-safe navigation, never an entitlement/rights assessment or private download. */
export function ArchitectureCatalogExplorer({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => filterArchitectureCatalogs(query), [query]);
  const internalNavigation = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(path);
  };

  return <section aria-label="Financial Intelligence Kataloge" className="space-y-5">
    <div className="rounded-2xl border border-cyan-400/25 bg-[#0a1630]/90 p-5">
      <div className="flex items-start gap-3">
        <FileText className="mt-1 shrink-0 text-cyan-200" aria-hidden="true" size={22} />
        <div>
          <h2 className="text-xl font-bold">Fünf Evidence-Kataloge</h2>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Dokumentierte Architektur aus dem öffentlichen Repository: Komponenten, Provider, Scores, Blueprints und Learning.
            Alle Verweise öffnen aktuelle Markdown-Dateien in GitHub, keine privaten Kunden- oder Providerdaten.
          </p>
        </div>
      </div>
      <label htmlFor="architecture-catalog-filter" className="mt-4 block text-sm font-semibold">Kataloge durchsuchen</label>
      <div className="relative mt-2">
        <Search size={18} aria-hidden="true" className="absolute left-3 top-3.5 text-slate-400" />
        <input id="architecture-catalog-filter" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Beispiel: Gewichtung, Rechte, Evidence…" className={`min-h-11 w-full rounded-xl border border-slate-500 bg-slate-950 pl-10 pr-3 text-white sm:max-w-lg ${focus}`} />
      </div>
      <p role="status" className="mt-3 text-sm text-slate-300">{results.length} von {ARCHITECTURE_CATALOGS.length} Dokumenten</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {results.map((entry) => {
          const url = architectureCatalogUrl(entry.file);
          return <article key={entry.id} className="flex flex-col rounded-xl border border-slate-700 bg-slate-950/80 p-4">
            <h3 className="text-lg font-semibold text-white">{entry.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-200">{entry.scope}</p>
            <p className="mt-3 break-all font-mono text-xs text-slate-400">{entry.file}</p>
            {url && <a className={`mt-4 inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-cyan-400/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 ${focus}`}
              href={url} target="_blank" rel="noopener noreferrer" aria-label={`${entry.title} auf GitHub öffnen (neuer Tab)`}>
              Dokument lesen <ArrowUpRight size={16} aria-hidden="true" />
            </a>}
          </article>;
        })}
      </div>
      {results.length === 0 && <p className="mt-4 text-sm text-slate-200">Keine Treffer. Suchbegriff anpassen.</p>}
    </div>

    <section aria-labelledby="architecture-offer-path" className="rounded-2xl border border-amber-300/25 bg-[#0a1630]/90 p-5">
      <div className="flex items-center gap-3"><BookOpen className="text-amber-200" aria-hidden="true" size={22} />
        <h2 id="architecture-offer-path" className="text-xl font-bold">Vom Lernpfad zum Produkt</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-200">
        Kostenloses Wissen führt zu bestehenden Angeboten oder unverbindlichen Architekturvorschauen.
        Nur ein serverseitig bestätigtes Entitlement kann einen Lernzugang freischalten.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {ARCHITECTURE_PRODUCT_PATHS.map((path) => <article key={path.id} className="flex flex-col rounded-xl border border-slate-700 bg-slate-950 p-4">
          <p className="text-xs font-semibold text-amber-200">{path.state === 'PUBLIC_EDUCATION' ? 'KOSTENLOS' : path.state === 'DELIVERY_BLOCKED' ? 'KONZEPT · NICHT KAUFBAR' : path.state === 'INQUIRY_ONLY' ? 'ANFRAGE · KEIN KAUF' : 'BESTEHENDES ANGEBOT · ZUGANGSPRÜFUNG'}</p>
          <h3 className="mt-2 font-semibold text-white">{path.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-6 text-slate-200">{path.detail}</p>
          <a href={path.path} onClick={(event) => internalNavigation(event, path.path)}
            className={`mt-4 inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold text-white hover:border-amber-300 ${focus}`}>
            {path.state === 'INQUIRY_ONLY' ? 'Unverbindlich anfragen' : path.state === 'DELIVERY_BLOCKED' ? 'Konzept ansehen' : 'Angebot prüfen'} <ArrowRight size={16} aria-hidden="true" />
          </a>
        </article>)}
      </div>
      {!BLUEPRINT_DELIVERY_POLICY.currentCommerceAdmission && <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-300/5 p-3 text-sm leading-6 text-amber-100">
        <LockKeyhole size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        Blueprint-Commerce und private Downloads sind aktuell BLOCKED. Es werden keine Marktdatenlizenzen,
        Provider-Keys, Live-Scores oder produktiven Deployments verkauft.
      </p>}
      <p className="mt-3 text-xs leading-5 text-slate-300">
        Keine Anlageberatung. Produktkatalog und Lizenzlage sind von operativer Freigabe und kaufrechtlichen Angaben im Checkout getrennt.
      </p>
    </section>
  </section>;
}
