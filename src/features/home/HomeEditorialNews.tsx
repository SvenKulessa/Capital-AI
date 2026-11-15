import homeEditorialEdition from './homeEditorialEdition.json';
import './homeEditorialNews.css';

type ArticleGraphic =
  | { kind: 'network'; caption: string; center: string; labels: string[] }
  | { kind: 'status'; caption: string; rows: { label: string; outcome: string }[] }
  | { kind: 'flow'; caption: string; labels: string[] };

function NewsGraphic({ graphic }: { graphic: ArticleGraphic }) {
  return (
    <figure className={`editorial-graphic editorial-graphic--${graphic.kind}`}>
      <figcaption>{graphic.caption}</figcaption>
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
  return (
    <section className="home-editorial" lang="de" aria-labelledby="home-editorial-title">
      <header className="editorial-header">
        <h2 id="home-editorial-title">Marktnews verstehen</h2>
        <p>Redaktionsstand <time dateTime={homeEditorialEdition.date}>{homeEditorialEdition.label}</time></p>
      </header>
      <div className="editorial-grid">
        {homeEditorialEdition.stories.map(({ id, topic, title, summary, context, graphic, source }) => (
          <article className="editorial-card" key={id} aria-labelledby={`news-${id}`}>
            <div className="editorial-copy">
              <p className="editorial-topic">{topic}</p>
              <h3 id={`news-${id}`}>{title}</h3>
            </div>
            <NewsGraphic graphic={graphic as ArticleGraphic} />
            <div className="editorial-text">
              <p>{summary}</p>
              <p className="editorial-context">{context}</p>
            </div>
            <footer>
              <time dateTime={source.date}>{source.label}</time>
              <a href={source.url} aria-label={`Originalmeldung zu „${title}“ bei ${source.name}`}>
                Quelle: {source.name} <span aria-hidden="true">↗</span>
              </a>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
