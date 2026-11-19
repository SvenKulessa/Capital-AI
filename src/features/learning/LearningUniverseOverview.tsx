import React, { useMemo, useState, type CSSProperties } from 'react';
import {
  ArrowRight, BarChart3, Bitcoin, BookOpen, Bookmark, BrainCircuit, Compass,
  GraduationCap, Landmark, Layers, Newspaper, PlayCircle, Search, ShieldCheck,
  Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import { BRAND_GLOBE } from '../../platform/SocialMediaEngine/Visualization/BrandGlobeSpec';
import { LEARNING_ARTICLES } from '../../data/learningArticles';
import { LEARNING_JOURNEY } from '../../../shared/learning-journey.mjs';
import { LEARNING_UNIVERSE_ATOMS, filterLearningUniverseAtoms } from './learningUniverseModel.mjs';
import type { LearningPortalTab } from './LearningPortalPage';
import './learningUniverseOverview.css';

const ICONS = {
  aktien: TrendingUp, krypto: Bitcoin, makro: Landmark, risiko: ShieldCheck,
  portfolios: Layers, charts: BarChart3, ki: BrainCircuit,
} as const;

const PATHS: ReadonlyArray<{ label: string; description: string; tab: LearningPortalTab; icon: typeof BookOpen }> = [
  { label: 'Grundlagen verstehen', description: 'Finanzbegriffe, Faustformeln und Marktmechanismen', tab: 'glossar', icon: BookOpen },
  { label: 'Wissen ausprobieren', description: 'Interaktive Tests und Portfoliorisiko', tab: 'quizzes', icon: GraduationCap },
  { label: 'Szenarien erkunden', description: 'Synthetische Portfoliobeispiele durchspielen', tab: 'simulator', icon: Compass },
  { label: 'Charts lesen lernen', description: 'Muster und Methoden im Lernatlas', tab: 'patterns', icon: TrendingUp },
];

const FORMATS: ReadonlyArray<{ label: string; detail: string; tab: LearningPortalTab; icon: typeof BookOpen }> = [
  { label: 'Glossar', detail: 'Begriffe nachschlagen', tab: 'glossar', icon: BookOpen },
  { label: 'Karteikarten', detail: 'Wissen festigen', tab: 'flashcards', icon: Layers },
  { label: 'Quiz', detail: 'Wissen testen', tab: 'quizzes', icon: GraduationCap },
  { label: 'Simulator', detail: 'Szenarien vergleichen', tab: 'simulator', icon: Compass },
  { label: 'Lernvideos', detail: 'Visuell verstehen', tab: 'videos', icon: PlayCircle },
  { label: 'Lernimpulse', detail: 'Beiträge entdecken', tab: 'news', icon: Newspaper },
];

export function LearningUniverseOverview({
  onOpen, favoritesCount, favoritesAvailable,
}: {
  onOpen: (tab: LearningPortalTab) => void;
  favoritesCount: number | null;
  favoritesAvailable: boolean;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => filterLearningUniverseAtoms(query), [query]);

  return (
    <div className="learning-universe" data-learning-overview="v1">
      <section className="lhu-hero" aria-labelledby="lhu-title">
        <div className="lhu-intro">
          <p className="lhu-eyebrow"><Sparkles aria-hidden="true" size={16} /> CAPITAL-AI LEARNING HUB</p>
          <h2 id="lhu-title">Finanzwissen <span>klar und interaktiv</span> verstehen.</h2>
          <p>Erkunde Finanzmärkte, prüfe dein Wissen und finde einen passenden Einstieg – mit nachvollziehbaren Lerninhalten statt Renditeversprechen.</p>
          <div className="lhu-hero-actions">
            <button type="button" className="lhu-primary" onClick={() => onOpen('glossar')}>
              Jetzt lernen <ArrowRight aria-hidden="true" size={19} />
            </button>
            <a className="lhu-secondary" href="#lhu-lernpfade">Lernwege entdecken</a>
          </div>
        </div>
        <div className="lhu-system">
          <div className="lhu-orbit-ring lhu-orbit-ring--a" aria-hidden="true" />
          <div className="lhu-orbit-ring lhu-orbit-ring--b" aria-hidden="true" />
          <img className="lhu-globe" src={BRAND_GLOBE.asset} width="400" height="400"
            alt="" loading="eager" decoding="async" />
          <span className="lhu-globe-caption">7 Themen · ein Learning Hub</span>
          <nav className="lhu-atoms" aria-label="Sieben interaktive Lernbereiche">
            {LEARNING_UNIVERSE_ATOMS.map((atom, index) => {
              const Icon = ICONS[atom.id as keyof typeof ICONS];
              return (
                <button key={atom.id} type="button" className="lhu-atom" data-orbit={index}
                  style={{ '--atom': atom.color } as CSSProperties}
                  onClick={() => onOpen(atom.target as LearningPortalTab)}
                  aria-label={atom.label + ': ' + atom.summary}>
                  <Icon aria-hidden="true" size={18} /><span>{atom.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      <section className="lhu-discover" aria-labelledby="lhu-topics-title">
        <form className="lhu-search" role="search" onSubmit={event => {
          event.preventDefault();
          if (results.length === 1) onOpen(results[0].target as LearningPortalTab);
        }}>
          <Search aria-hidden="true" size={20} />
          <label htmlFor="learning-topic-search" className="sr-only">Lernthemen suchen</label>
          <input id="learning-topic-search" type="search" autoComplete="off" value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Thema suchen, z. B. Aktien, Risiko oder Charts …" />
          <button type="submit" disabled={results.length !== 1}
            aria-label="Einziges passendes Thema öffnen">Öffnen</button>
        </form>
        <div className="lhu-section-heading">
          <div><p className="lhu-kicker">DEIN EINSTIEG</p><h3 id="lhu-topics-title">Themen im Überblick</h3>
            <p>Wähle ein Themenatom und öffne die bereits verfügbaren Lernwerkzeuge.</p></div>
          <span className="lhu-count" role="status">{results.length} von 7 Themen</span>
        </div>
        {results.length ? (
          <div className="lhu-topic-grid">
            {results.map(atom => {
              const Icon = ICONS[atom.id as keyof typeof ICONS];
              return (
                <button key={atom.id} type="button" className="lhu-topic" style={{ '--atom': atom.color } as CSSProperties}
                  onClick={() => onOpen(atom.target as LearningPortalTab)}>
                  <span className="lhu-topic-icon"><Icon size={25} aria-hidden="true" /></span>
                  <span className="lhu-topic-label">{atom.label}</span>
                  <span className="lhu-topic-summary">{atom.summary}</span>
                  <span className="lhu-topic-link">Lernangebot öffnen <ArrowRight size={16} aria-hidden="true" /></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="lhu-empty" role="status">Kein Thema gefunden. Versuche einen anderen Suchbegriff.</div>
        )}
      </section>

      <section className="lhu-dashboard" aria-label="Persönliche Lernübersicht">
        <div className="lhu-info-card">
          <div className="lhu-card-heading"><GraduationCap aria-hidden="true" /><h3>Dein Lernweg</h3></div>
          <p>{LEARNING_JOURNEY.length} frei zugängliche Lernschritte zur Marktanalyse</p>
          <a href="#learning-methodology">Lernschritte ansehen <ArrowRight aria-hidden="true" size={16} /></a>
        </div>
        <div className="lhu-info-card">
          <div className="lhu-card-heading"><Zap aria-hidden="true" /><h3>Heute lernen</h3></div>
          <p>{LEARNING_JOURNEY[0]?.title ?? 'Grundlagen der Marktanalyse'}</p>
          <a href="#learning-methodology">Kostenlos beginnen <ArrowRight aria-hidden="true" size={16} /></a>
        </div>
        <div className="lhu-info-card">
          <div className="lhu-card-heading"><Bookmark aria-hidden="true" /><h3>Mein Lernfeld</h3></div>
          <p>{favoritesAvailable ? (favoritesCount === null ? 'Lernfeld wird geladen …' : favoritesCount + ' gespeicherte Begriffe') : 'Speichern ist nach der Anmeldung möglich.'}</p>
          <button type="button" onClick={() => onOpen('flashcards')}>Karteikarten öffnen <ArrowRight aria-hidden="true" size={16} /></button>
        </div>
      </section>

      <section id="lhu-lernpfade" className="lhu-content" aria-labelledby="lhu-paths-title">
        <div className="lhu-section-heading">
          <div><p className="lhu-kicker">SCHRITT FÜR SCHRITT</p><h3 id="lhu-paths-title">Lernwege</h3>
          <p>Klare Einstiege für Einsteiger und Fortgeschrittene. Zugangsbedingungen gelten je Lernwerkzeug.</p></div>
        </div>
        <div className="lhu-path-grid">
          {PATHS.map((path, index) => {
            const Icon = path.icon;
            return <button type="button" key={path.label} onClick={() => onOpen(path.tab)} className="lhu-path">
              <span className="lhu-path-order">0{index + 1}</span><Icon aria-hidden="true" size={25} />
              <strong>{path.label}</strong><span>{path.description}</span>
              <span className="lhu-path-open">Öffnen <ArrowRight aria-hidden="true" size={15} /></span>
            </button>;
          })}
        </div>
      </section>

      <section className="lhu-content" aria-labelledby="lhu-formats-title">
        <div className="lhu-section-heading">
          <div><p className="lhu-kicker">AKTIV LERNEN</p><h3 id="lhu-formats-title">Interaktive Formate</h3></div>
        </div>
        <div className="lhu-format-grid">
          {FORMATS.map(format => {
            const Icon = format.icon;
            return <button key={format.label} type="button" className="lhu-format" onClick={() => onOpen(format.tab)}>
              <Icon aria-hidden="true" size={23} /><strong>{format.label}</strong><span>{format.detail}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="lhu-content lhu-editorial" aria-labelledby="lhu-editorial-title">
        <div className="lhu-section-heading">
          <div><p className="lhu-kicker">AUS DER CONTENT ENGINE</p><h3 id="lhu-editorial-title">Lernimpulse</h3>
          <p>Bereits veröffentlichte redaktionelle Lernbeiträge. Keine Live-Kurse oder Handelssignale.</p></div>
          <button type="button" className="lhu-text-button" onClick={() => onOpen('news')}>
            Alle Beiträge <ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>
        <div className="lhu-article-grid">
          {LEARNING_ARTICLES.slice(0, 3).map(article => (
            <article key={article.id} className="lhu-article">
              <span className="lhu-article-category"><Newspaper aria-hidden="true" size={16} /> Lernbeitrag</span>
              <h4>{article.title}</h4>
              <a href={'/learning?tab=news#' + article.id}>Beitrag lesen <ArrowRight aria-hidden="true" size={16} /></a>
            </article>
          ))}
        </div>
      </section>
      <p className="lhu-disclaimer">Bildwelt: bestehendes CAPITAL-AI-Universe-Asset. Lerninhalte dienen der Bildung, nicht der persönlichen Anlageberatung.</p>
    </div>
  );
}
