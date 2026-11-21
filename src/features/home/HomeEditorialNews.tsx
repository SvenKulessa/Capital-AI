import { useEffect, useState } from 'react';
import homeEditorialEdition from './homeEditorialEdition.json';
import { planContentCampaign } from '../../contracts/contentEngine.ts';
import { homeEditorialPngPath, projectHomeEditorial } from './homeEditorialAdmission.mjs';
import { verifyEditorialPng, type RenderedNewsGraphic } from './homeEditorialPng';
import './homeEditorialNews.css';

type ArticleGraphic =
  | { kind: 'network'; caption: string; center: string; labels: string[] }
  | { kind: 'status'; caption: string; rows: { label: string; outcome: string }[] }
  | { kind: 'flow'; caption: string; labels: string[] }
  | RenderedNewsGraphic;

type PresentedEditorialStory = {
  id: string; topic: string; title: string; summary: string; context: string;
  graphic: ArticleGraphic;
  source: {name: string; url: string; date: string; label: string};
  score: {version: string; value: number; ageDays: number};
};
type PresentedEditorialEdition = {
  status: 'READY' | 'RIGHTS_BLOCKED' | 'STALE_FALLBACK' | 'MISSING_DATA';
  date: string | null;
  label: string | null;
  stories: PresentedEditorialStory[];
};

function VerifiedNewsImage({ graphic }: { graphic: RenderedNewsGraphic }) {
  const [state, setState] = useState<{ graphic: RenderedNewsGraphic; url: string | null }>();
  useEffect(() => {
    const request = new AbortController();
    let objectUrl: string | undefined;
    const load = async () => {
      const response = await fetch(homeEditorialPngPath(graphic.asset.sha256), {
        signal: request.signal, redirect: 'error', credentials: 'omit',
      });
      if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'image/png' ||
          Number(response.headers.get('content-length')) > 2_000_000) throw Error('Editorial image unavailable');
      const buffer = await response.arrayBuffer();
      if (!await verifyEditorialPng(new Uint8Array(buffer), graphic)) throw Error('Editorial image mismatch');
      if (request.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/png' }));
      setState({ graphic, url: objectUrl });
    };
    load().catch(() => { if (!request.signal.aborted) setState({ graphic, url: null }); });
    return () => {
      request.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [graphic]);
  if (state?.graphic !== graphic) return <p role="status">Grafik wird geprüft …</p>;
  return state.url
    ? <img src={state.url} width={graphic.width} height={graphic.height} alt={graphic.altText} />
    : <p>{graphic.altText}</p>;
}

function NewsGraphic({ graphic }: { graphic: ArticleGraphic }) {
  return (
    <figure className={`editorial-graphic editorial-graphic--${graphic.kind}`}>
      <figcaption>{graphic.caption}</figcaption>
      {graphic.kind === 'rendered-png' && <VerifiedNewsImage graphic={graphic} />}
      {graphic.kind === 'network' && (
        <>
          <p className="editorial-node">{graphic.center}</p>
          <ul>{graphic.labels.map(label => <li key={label}>{label}</li>)}</ul>
        </>
      )}
      {graphic.kind === 'status' && (
        <dl>{graphic.rows.map(({ label, outcome }) => (
          <div key={label}><dt>{label}</dt><dd>{outcome}</dd></div>
        ))}</dl>
      )}
      {graphic.kind === 'flow' && (
        <ol>{graphic.labels.map(label => <li key={label}>{label}</li>)}</ol>
      )}
    </figure>
  );
}

export function HomeEditorialNews() {
  // The real Content Engine plan validates campaign identity/CADS; rights are a separate gate.
  // No feed request, price substitution, publisher call or production mutation occurs here.
  const edition = projectHomeEditorial(
    homeEditorialEdition,
    new Date().toISOString().slice(0, 10),
    planContentCampaign,
  ) as PresentedEditorialEdition;
  const fallback = edition.status === 'RIGHTS_BLOCKED'
    ? 'Für diese Ausgabe fehlen freigegebene Nutzungsrechte für Meldungen, Quellen oder Grafiken. Ungeprüfte Inhalte werden nicht angezeigt.'
    : edition.status === 'STALE_FALLBACK'
      ? 'Die zuletzt geprüften Meldungen sind nicht mehr aktuell. Neue, quellengeprüfte Inhalte stehen noch nicht bereit.'
      : 'Aktuell stehen keine vollständig geprüften Meldungs- und Grafikdaten bereit.';

  return (
    <section className="home-editorial" lang="de" aria-labelledby="home-editorial-title">
      <header className="editorial-header">
        <h2 id="home-editorial-title">Marktnews verstehen</h2>
        {edition.status === 'READY' && edition.date && (
          <p>Redaktionsstand <time dateTime={edition.date}>{edition.label}</time></p>
        )}
      </header>
      {edition.status !== 'READY' ? (
        <p className="editorial-fallback" role="status">{fallback}</p>
      ) : (
        <div className="editorial-grid">
          {edition.stories.map(({ id, topic, title, summary, context, graphic, source, score }) => {
            const textFirst = graphic.kind === 'rendered-png' && ['briefing', 'comparison'].includes(graphic.layout);
            return (
            <article className={`editorial-card${graphic.kind === 'rendered-png' ? ' editorial-card--' + graphic.layout : ''}`}
              key={id} aria-labelledby={`news-${id}`}>
              <div className="editorial-copy">
                <p className="editorial-topic">{topic}</p>
                <h3 id={`news-${id}`}>{title}</h3>
              </div>
              {!textFirst && <NewsGraphic graphic={graphic} />}
              <div className="editorial-text">
                <p>{summary}</p>
                <p className="editorial-context">{context}</p>
              </div>
              {textFirst && <NewsGraphic graphic={graphic} />}
              <footer>
                <time dateTime={source.date}>{source.label}</time>
                <span aria-label="Redaktioneller Score und Aktualität">
                  Score {score.value}/100 · {score.ageDays} Tage alt
                </span>
                <a href={source.url} rel="noopener noreferrer" aria-label={`Originalmeldung zu „${title}“ bei ${source.name}`}>
                  Quelle: {source.name} <span aria-hidden="true">↗</span>
                </a>
              </footer>
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
