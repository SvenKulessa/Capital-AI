/**
 * Offline SocialMediaEngine renderer for a *presentation card*, not a new product credential.
 * The licensed 256x256 canonical badge and the server-side entitlement gate stay unchanged.
 * No network fetches, fonts, remote icons, arbitrary user text or publishing authority.
 */
export const LEARNING_MASTERMIND_CARD_SIZES = Object.freeze({
  small: [240, 80],
  medium: [300, 100],
  large: [600, 200],
});
export const LEARNING_MASTERMIND_STATUSES = Object.freeze(['aktiv', 'inaktiv']);
const UNIVERSE_HUES = Object.freeze(['cyan','violet','gold','pink','rose','blue','green']);

function hex(value) {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error('INVALID_BRAND_COLOR');
  return value;
}
function universe(tokens) {
  if (tokens?.schemaVersion !== 'CAPITAL_AI_SOCIAL_RENDER_TOKENS@1' ||
      tokens?.publishReady !== false || tokens?.universeDesign?.publicationAuthority !== 'UNCHANGED_DRAFT_ONLY') {
    throw new Error('BRAND_TOKENS_NOT_ADMITTED');
  }
  const colors = tokens?.color?.universe;
  if (!colors || Object.keys(colors).length !== 7 || UNIVERSE_HUES.some(x => !Object.hasOwn(colors, x))) {
    throw new Error('UNIVERSE_PALETTE_SEVEN_REQUIRED');
  }
  const values = UNIVERSE_HUES.map(name => hex(colors[name]?.$value));
  if (new Set(values.map(x => x.toLowerCase())).size !== 7) throw new Error('UNIVERSE_PALETTE_SEVEN_REQUIRED');
  return values;
}
/**
 * @param {{size:'small'|'medium'|'large',glowLevel:number,status:'aktiv'|'inaktiv'}} options
 * @param {object} tokens Canonical offline SocialMediaEngine render tokens
 * @returns {string} Strictly presentational SVG; entitlement must be resolved by server independently
 */
export function renderLearningMastermindCard(options, tokens) {
  const size = LEARNING_MASTERMIND_CARD_SIZES[options?.size];
  if (!size) throw new Error('BADGE_SIZE_UNSUPPORTED');
  if (!LEARNING_MASTERMIND_STATUSES.includes(options?.status)) throw new Error('BADGE_STATUS_UNSUPPORTED');
  if (!Number.isInteger(options?.glowLevel) || options.glowLevel < 0 || options.glowLevel > 10) {
    throw new Error('BADGE_GLOW_UNSUPPORTED');
  }
  const spectral = universe(tokens);
  const fg = hex(tokens.color.foreground.$value);
  const bg = hex(tokens.color.background.$value);
  const accent = options.status === 'aktiv' ? spectral[6] : spectral[4];
  const gold = spectral[2], violet = spectral[1];
  const glow = (options.glowLevel * 0.06).toFixed(2);
  const spectrum = spectral.map((color, index) => 
    `<circle cx="${150 + index * 14}" cy="76" r="2.5" fill="${color}"/>`).join('');
  const status = options.status === 'aktiv' ? 'Lernzugang aktiv' : 'Lernzugang inaktiv';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size[0]}" height="${size[1]}" viewBox="0 0 300 100" role="img" aria-labelledby="learning-title learning-desc"><title id="learning-title">CAPITAL-AI LEARNING MASTERMIND</title><desc id="learning-desc">Learning Hub · ${status} · Darstellungsvorschau, keine eigenständige Rechteprüfung.</desc><metadata>CAPITAL_AI_UNIVERSE@1; LicenseRef-CAPITAL-AI-PROPRIETARY-BADGE-1.0; preview only; publicationAuthority=false; not an external certification.</metadata><defs><linearGradient id="master-card" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#24143D"/></linearGradient><filter id="master-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter></defs><rect width="300" height="100" rx="16" fill="url(#master-card)"/><rect x="3" y="3" width="294" height="94" rx="14" fill="none" stroke="${violet}" stroke-opacity=".6" stroke-width="2"/><rect x="13" y="13" width="72" height="74" rx="12" fill="#170C2B" stroke="${gold}" stroke-width="2"/><circle cx="49" cy="45" r="23" fill="none" stroke="${accent}" stroke-opacity="${glow}" stroke-width="9" filter="url(#master-glow)"/><path d="M49 21l7 12 14 2-10 10 3 14-14-7-13 7 3-14-10-10 14-2z" fill="none" stroke="${gold}" stroke-width="2"/><circle cx="49" cy="41" r="5" fill="${accent}"/><text x="49" y="76" text-anchor="middle" fill="${fg}" font-family="Arial,sans-serif" font-size="7" font-weight="700">CAPITAL-AI</text><text x="100" y="33" fill="${fg}" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing=".4">LEARNING MASTERMIND</text><text x="100" y="55" fill="${accent}" font-family="Arial,sans-serif" font-size="12" font-weight="700">${status}</text><text x="100" y="68" fill="${fg}" font-family="Arial,sans-serif" font-size="8">Learning Hub · Vorschau</text>${spectrum}</svg>\n`;
}
