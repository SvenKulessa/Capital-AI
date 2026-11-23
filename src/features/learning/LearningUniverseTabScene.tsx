import type { CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import type { LearningPortalTab } from './LearningPortalPage';

type SubTab = Exclude<LearningPortalTab, 'overview'>;

type TabScene = Readonly<{
  title: string;
  eyebrow: string;
  detail: string;
  accent: string;
  art: string;
}>;

/** First-party illustration identities; no remote image, tracking, stock or generated financial data. */
export const LEARNING_TAB_SCENES: Readonly<Record<SubTab, TabScene>> = Object.freeze({
  glossar: {
    title: 'Begriffe verstehen.',
    eyebrow: 'WISSEN · GLOSSAR',
    detail: 'Definitionen, Thesaurus und nachvollziehbare Praxisbeispiele erkunden.',
    accent: BRAND_COLORS.gold,
    art: 'offenes Wissensbuch',
  },
  flashcards: {
    title: 'Wissen festigen.',
    eyebrow: 'ÜBEN · KARTEIKARTEN',
    detail: 'Mit bestehenden Lernkarten Begriffe wiederholen und Zusammenhänge festigen.',
    accent: BRAND_COLORS.cyan,
    art: 'schwebende Karteikarten',
  },
  guides: {
    title: 'Methodik durchdringen.',
    eyebrow: 'METHODEN · ANALYSE',
    detail: 'Analysewege und Datenprovenienz einordnen. Zugangsrechte bleiben unverändert.',
    accent: BRAND_COLORS.blue,
    art: 'verbundene Datenknoten',
  },
  patterns: {
    title: 'Chartmuster erkennen.',
    eyebrow: 'CHARTS · LERNATLAS',
    detail: 'Diagramme lesen lernen. Der geschützte Atlas bleibt zugangsgebunden.',
    accent: BRAND_COLORS.green,
    art: 'Marktchart mit Datenpunkten',
  },
  videos: {
    title: 'Visuell weiterlernen.',
    eyebrow: 'MEDIEN · LERNVIDEOS',
    detail: 'Die vorhandenen Videovorschauen entdecken, ohne unbestätigte Produktionsangaben.',
    accent: BRAND_COLORS.rose,
    art: 'Videofenster mit Play-Symbol',
  },
  quiz: {
    title: 'Dein Wissen prüfen.',
    eyebrow: 'SKILL-CHECK · QUANT',
    detail: 'Tagesfragen mit bestehenden Login- und Zugangsprüfungen beantworten.',
    accent: BRAND_COLORS.violet,
    art: 'Wissenskompass mit Fragezeichen',
  },
  quizzes: {
    title: 'Lernen durch Anwenden.',
    eyebrow: 'QUIZZES · PORTFOLIORISIKO',
    detail: 'Interaktive Fragen und Risikobeispiele im bestehenden Lernangebot.',
    accent: BRAND_COLORS.pink,
    art: 'Checkliste mit Lernmarkierungen',
  },
  news: {
    title: 'Lernimpulse entdecken.',
    eyebrow: 'CONTENT ENGINE · WISSEN',
    detail: 'Bereits veröffentlichte Lernbeiträge mit nachvollziehbarer Einordnung.',
    accent: BRAND_COLORS.blue,
    art: 'redaktionelle Wissensseite',
  },
  kontakt: {
    title: 'Fragen stellen.',
    eyebrow: 'LEARNING HUB · KONTAKT',
    detail: 'Die vorhandene Kontaktfunktion für Fragen zum Lernangebot nutzen.',
    accent: BRAND_COLORS.cyan,
    art: 'Nachrichtenumschlag',
  },
  simulator: {
    title: 'Szenarien erforschen.',
    eyebrow: 'SIMULATOR · PORTFOLIO',
    detail: 'Synthetische Risikoszenarien betrachten – ohne Renditeversprechen oder Live-Kurse.',
    accent: BRAND_COLORS.violet,
    art: 'Portfolio-Risikorad und Regler',
  },
});

const MOTIFS: Readonly<Record<SubTab, readonly string[]>> = {
  glossar: [
    'M145 91 Q181 71 215 94 L215 178 Q182 157 145 176 Z',
    'M215 94 Q251 72 286 91 L286 176 Q248 158 215 178 Z',
    'M163 113 L197 109 M163 130 L197 126 M233 109 L268 113 M233 126 L268 130',
  ],
  flashcards: [
    'M156 105 L255 80 L273 159 L174 183 Z',
    'M169 90 L265 85 L272 159',
    'M181 114 L239 102 M188 134 L248 122 M197 153 L234 146',
  ],
  guides: [
    'M153 119 L214 92 L280 125 L214 163 Z',
    'M214 92 L214 163 M153 119 L153 161 L214 192 L280 161 L280 125',
    'M175 130 L214 113 L255 132 M175 157 L214 177 L255 157',
  ],
  patterns: [
    'M145 175 L145 89 M145 175 L291 175',
    'M160 154 L187 139 L208 151 L234 112 L254 125 L280 89',
    'M160 163 L187 158 L208 165 L234 155 L254 143 L280 148',
  ],
  videos: [
    'M146 91 Q146 81 158 81 L274 81 Q286 81 286 93 L286 174 Q286 183 274 183 L158 183 Q146 183 146 174 Z',
    'M196 114 L196 154 L235 134 Z',
    'M157 97 L273 97 M162 169 L270 169',
  ],
  quiz: [
    'M216 79 L228 112 L264 112 L235 133 L247 169 L216 147 L185 169 L196 133 L167 112 L203 112 Z',
    'M208 112 Q210 102 219 107 Q226 112 218 120 L215 127',
    'M215 136 L215 138',
  ],
  quizzes: [
    'M161 91 L276 91 L276 182 L161 182 Z',
    'M175 112 L182 119 L193 106 M203 114 L260 114',
    'M175 141 L182 148 L193 134 M203 143 L260 143',
    'M175 166 L182 173 L193 159 M203 168 L260 168',
  ],
  news: [
    'M152 89 L276 89 L276 181 L152 181 Z',
    'M165 104 L263 104 M165 116 L263 116',
    'M165 133 L205 133 L205 164 L165 164 Z',
    'M218 134 L263 134 M218 148 L263 148 M218 161 L263 161',
  ],
  kontakt: [
    'M150 101 L282 101 L282 176 L150 176 Z',
    'M151 103 L216 147 L281 103',
    'M151 175 L195 133 M281 175 L237 133',
  ],
  simulator: [
    'M176 164 A62 62 0 1 1 258 105',
    'M216 101 L216 145 L253 164',
    'M155 186 L281 186 M165 194 L165 178 M205 194 L205 178 M255 194 L255 178',
  ],
};

const ORBIT_COLORS = Object.values(BRAND_COLORS);
const ORBIT_POINTS = [
  [48, 76], [88, 188], [144, 47], [337, 42], [362, 113], [330, 213], [68, 221],
] as const;

/** Custom geometry authored for CAPITAL-AI; every tab has a distinct inline SVG motif. */
export function LearningUniverseTabArtwork({ tab }: { tab: SubTab }) {
  const theme = LEARNING_TAB_SCENES[tab];
  return (
    <svg className="lhu-tab-art" viewBox="0 0 420 260" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="lhu-tab-art-glow"><stop offset="0" stopColor={theme.accent} stopOpacity=".26" /><stop offset="1" stopColor={theme.accent} stopOpacity="0" /></radialGradient>
        <linearGradient id="lhu-tab-art-glass" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={theme.accent} stopOpacity=".28" />
          <stop offset="1" stopColor="#101a3a" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <circle cx="215" cy="132" r="123" fill="url(#lhu-tab-art-glow)" />
      <ellipse cx="210" cy="132" rx="171" ry="73" transform="rotate(-23 210 132)" stroke={theme.accent} strokeOpacity=".64" fill="none" strokeWidth="1.7" />
      <ellipse cx="210" cy="132" rx="171" ry="73" transform="rotate(27 210 132)" stroke="#B794F4" strokeOpacity=".45" fill="none" strokeWidth="1.5" />
      <circle cx="216" cy="134" r="91" fill="url(#lhu-tab-art-glass)" stroke={theme.accent} strokeOpacity=".65" strokeWidth="2" />
      <circle cx="216" cy="134" r="76" fill="none" stroke="#d7f2ff" strokeOpacity=".20" strokeWidth="1" strokeDasharray="4 7" />
      {ORBIT_POINTS.map(([x, y], index) => (
        <g key={index}><circle cx={x} cy={y} r="8" fill={ORBIT_COLORS[index]} fillOpacity=".15" />
          <circle cx={x} cy={y} r="4" fill={ORBIT_COLORS[index]} /></g>
      ))}
      <g fill="none" stroke={theme.accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {MOTIFS[tab].map((path, index) => <path key={index} d={path} />)}
      </g>
    </svg>
  );
}

export function LearningUniverseTabScene({
  tab, onOpen,
}: {
  tab: LearningPortalTab;
  onOpen: (next: LearningPortalTab) => void;
}) {
  if (tab === 'overview') return null;
  const theme = LEARNING_TAB_SCENES[tab];
  const styles = { '--lhu-tab-accent': theme.accent } as CSSProperties;

  return (
    <section className="lhu-tab-scene" data-learning-universe-tab={tab}
      style={styles} aria-labelledby="lhu-tab-scene-title">
      <div className="lhu-tab-copy">
        <p className="lhu-tab-eyebrow"><Sparkles aria-hidden="true" size={17} /> {theme.eyebrow}</p>
        <h2 id="lhu-tab-scene-title">{theme.title}</h2>
        <p className="lhu-tab-description">{theme.detail}</p>
        <button type="button" onClick={() => onOpen('overview')} className="lhu-tab-overview-link">
          <ArrowLeft aria-hidden="true" size={17} /> Zur Learning-Übersicht <ArrowRight aria-hidden="true" size={17} />
        </button>
      </div>
      <div className="lhu-tab-art-frame" role="img" aria-label={'Originalillustration: ' + theme.art}>
        <LearningUniverseTabArtwork tab={tab} />
      </div>
    </section>
  );
}
