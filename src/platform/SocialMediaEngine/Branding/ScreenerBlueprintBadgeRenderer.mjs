/** Offline deterministic CAPITAL-AI SocialMediaEngine badge renderer; no publication authority. */
export const SCREENER_BADGE_VARIANTS = Object.freeze(["data","scoring","bundle"]);
const SPECS = Object.freeze({"data":{"label":"DATA","sub":"BLUEPRINT","color":"cyan","tagline":"SOURCE  →  QUALITY","symbol":"database"},"scoring":{"label":"SCORING","sub":"BLUEPRINT","color":"primary","tagline":"FACTORS  →  SCORE","symbol":"sigma"},"bundle":{"label":"SCREENER","sub":"BUNDLE","color":"accent","tagline":"DATA  +  SCORING","symbol":"network"}});
const UNIVERSE_HUES = Object.freeze(['cyan','violet','gold','pink','rose','blue','green']);
function universeSpectrum(tokens){
const palette=tokens?.color?.universe;
if(!palette||Object.keys(palette).length!==7||UNIVERSE_HUES.some(name=>!(name in palette))) throw new Error('UNIVERSE_PALETTE_SEVEN_REQUIRED');
const values=UNIVERSE_HUES.map(name=>safeHex(palette[name]?.$value));
if(new Set(values.map(x=>x.toLowerCase())).size!==7) throw new Error('UNIVERSE_PALETTE_SEVEN_REQUIRED');
return values.map((color,index)=>`<circle cx="${53+25*index}" cy="53" r="3.5" fill="${color}" opacity=".95"/>`).join('');
}
function safeHex(s){if(typeof s!=="string"||!/^#[0-9a-fA-F]{6}$/.test(s))throw new Error("INVALID_BRAND_COLOR");return s;}
export function renderScreenerBlueprintBadge(variant,tokens){
const spec=SPECS[variant];
if(!spec)throw new Error("BADGE_VARIANT_UNSUPPORTED");
const bg=safeHex(tokens?.color?.background?.$value);
const fg=safeHex(tokens?.color?.foreground?.$value);
const accent=safeHex(tokens?.color?.brand?.[spec.color]?.$value);
const secondary=safeHex(tokens?.color?.brand?.cyan?.$value);
const spectrum=universeSpectrum(tokens);
const glyph=spec.symbol==="database"
?`<g fill="none" stroke="${accent}" stroke-width="5"><ellipse cx="128" cy="79" rx="48" ry="17"/><path d="M80 79v67c0 11 21 19 48 19s48-8 48-19V79M80 113c0 11 21 19 48 19s48-8 48-19"/></g><circle cx="183" cy="141" r="9" fill="${secondary}"/>`
:spec.symbol==="sigma"
?`<circle cx="128" cy="117" r="60" fill="none" stroke="${accent}" stroke-width="4"/><path d="M154 86H104l29 31-29 32h50" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="179" cy="84" r="7" fill="${secondary}"/>`
:`<g stroke="${accent}" stroke-width="5" fill="none"><path d="M128 66L77 143 179 143Z"/><path d="M128 66v93M77 143l51 16 51-16"/></g><g fill="${secondary}"><circle cx="128" cy="66" r="12"/><circle cx="77" cy="143" r="12"/><circle cx="179" cy="143" r="12"/></g><circle cx="128" cy="159" r="12" fill="${accent}"/>`;
return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="badge-title badge-desc"><title id="badge-title">CAPITAL-AI ${spec.label} ${spec.sub}</title><desc id="badge-desc">Eigenständiges Produkt-Badge zur Vorschau, keine Zertifizierung und keine produktive Scoring-Freigabe.</desc><defs><linearGradient id="surface" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#171338"/></linearGradient></defs><rect width="256" height="256" rx="36" fill="url(#surface)"/><rect x="4" y="4" width="248" height="248" rx="32" stroke="${accent}" stroke-opacity="0.75" stroke-width="3" fill="none"/><text x="128" y="35" font-size="13" letter-spacing="3" font-weight="800" text-anchor="middle" font-family="Arial,sans-serif" fill="${fg}">CAPITAL-AI</text>${spectrum}${glyph}<path d="M43 180h170" stroke="${accent}" stroke-width="1" stroke-opacity=".45"/><text x="128" y="205" text-anchor="middle" font-size="22" font-weight="800" font-family="Arial,sans-serif" fill="${fg}">${spec.label}</text><text x="128" y="227" text-anchor="middle" font-size="13" letter-spacing="2" font-weight="800" font-family="Arial,sans-serif" fill="${accent}">${spec.sub}</text><text x="128" y="242" text-anchor="middle" font-size="7" letter-spacing="1" font-family="Arial,sans-serif" fill="#94A3B8">${spec.tagline}</text></svg>\n`;
}

/** First-party compact hub icon renderer; offline, no model calls or publication permission. */
export function renderHubIdentityIcon(variant,tokens){
  const accentName=variant==='learning'?'gold':variant==='marketscreener'?'violet':null;
  if(!accentName)throw new Error('HUB_ICON_VARIANT_UNSUPPORTED');
  const families=['cyan','violet','gold','pink','rose','blue','green'];
  const palette=tokens?.color?.universe;
  if(!palette||Object.keys(palette).length!==7)throw new Error('UNIVERSE_PALETTE_SEVEN_REQUIRED');
  const hues=families.map(name=>palette[name]?.$value);
  if(hues.some(c=>typeof c!=='string'||!/^#[0-9a-fA-F]{6}$/.test(c))||new Set(hues.map(c=>c.toLowerCase())).size!==7)throw new Error('UNIVERSE_PALETTE_SEVEN_REQUIRED');
  const accent=palette[accentName].$value;
  const label=variant==='learning'?'Learning Hub':'Analytics Hub';
  const glyph=variant==='learning'
    ? `<g fill="none" stroke="${accent}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M64 76C52 64 37 66 25 69v29c15-5 28-2 39 7 11-9 24-12 39-7V69C90 66 76 64 64 76v29"/><path d="M35 79q12-3 20 4m18 0q10-7 20-4M45 35l19-10 19 10 8 18-15 9-12-11-12 11-15-9zM45 35l19 16 19-16M64 25v26"/></g><g fill="${accent}"><circle cx="45" cy="35" r="3.8"/><circle cx="64" cy="25" r="3.8"/><circle cx="83" cy="35" r="3.8"/><circle cx="64" cy="51" r="3.8"/></g>`
    : `<g fill="none" stroke="${accent}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M27 91V44m0 47h75"/><rect x="35" y="70" width="12" height="20" rx="2" fill="${accent}" fill-opacity=".25"/><rect x="54" y="55" width="12" height="35" rx="2" fill="${accent}" fill-opacity=".4"/><rect x="73" y="38" width="12" height="52" rx="2" fill="${accent}" fill-opacity=".6"/><path d="M34 58l20-15 18-12 19 7" stroke="${palette.cyan.$value}"/><circle cx="85" cy="73" r="17" fill="#101329"/><path d="M97 85l14 15" stroke-width="5"/></g><path d="m77 74 6 6 11-14" fill="none" stroke="${palette.cyan.$value}" stroke-width="2.4" stroke-linecap="round"/>`;
  const spectrum=hues.map((color,i)=>`<circle cx="${34+10*i}" cy="117" r="2" fill="${color}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-labelledby="title"><title id="title">CAPITAL-AI ${label}</title><defs><radialGradient id="space"><stop stop-color="${accent}" stop-opacity=".23"/><stop offset="1" stop-color="#080D1B"/></radialGradient></defs><rect x="2" y="2" width="124" height="124" rx="24" fill="url(#space)" stroke="${accent}" stroke-opacity=".64"/><g fill="none" stroke="${accent}" stroke-opacity=".28"><ellipse cx="64" cy="62" rx="55" ry="34" transform="rotate(-28 64 62)"/><ellipse cx="64" cy="62" rx="55" ry="34" transform="rotate(28 64 62)"/><circle cx="64" cy="62" r="51" stroke-dasharray="2 8"/></g>${glyph}${spectrum}</svg>\n`;
}
