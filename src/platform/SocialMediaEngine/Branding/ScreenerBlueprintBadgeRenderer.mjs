/** Offline deterministic CAPITAL-AI SocialMediaEngine badge renderer; no publication authority. */
export const SCREENER_BADGE_VARIANTS = Object.freeze(["data","scoring","bundle"]);
const SPECS = Object.freeze({"data":{"label":"DATA","sub":"BLUEPRINT","color":"cyan","tagline":"SOURCE  →  QUALITY","symbol":"database"},"scoring":{"label":"SCORING","sub":"BLUEPRINT","color":"primary","tagline":"FACTORS  →  SCORE","symbol":"sigma"},"bundle":{"label":"SCREENER","sub":"BUNDLE","color":"accent","tagline":"DATA  +  SCORING","symbol":"network"}});
function safeHex(s){if(typeof s!=="string"||!/^#[0-9a-fA-F]{6}$/.test(s))throw new Error("INVALID_BRAND_COLOR");return s;}
export function renderScreenerBlueprintBadge(variant,tokens){
const spec=SPECS[variant];
if(!spec)throw new Error("BADGE_VARIANT_UNSUPPORTED");
const bg=safeHex(tokens?.color?.background?.$value);
const fg=safeHex(tokens?.color?.foreground?.$value);
const accent=safeHex(tokens?.color?.brand?.[spec.color]?.$value);
const secondary=safeHex(tokens?.color?.brand?.cyan?.$value);
const glyph=spec.symbol==="database"
?`<g fill="none" stroke="${accent}" stroke-width="5"><ellipse cx="128" cy="79" rx="48" ry="17"/><path d="M80 79v67c0 11 21 19 48 19s48-8 48-19V79M80 113c0 11 21 19 48 19s48-8 48-19"/></g><circle cx="183" cy="141" r="9" fill="${secondary}"/>`
:spec.symbol==="sigma"
?`<circle cx="128" cy="117" r="60" fill="none" stroke="${accent}" stroke-width="4"/><path d="M154 86H104l29 31-29 32h50" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="179" cy="84" r="7" fill="${secondary}"/>`
:`<g stroke="${accent}" stroke-width="5" fill="none"><path d="M128 66L77 143 179 143Z"/><path d="M128 66v93M77 143l51 16 51-16"/></g><g fill="${secondary}"><circle cx="128" cy="66" r="12"/><circle cx="77" cy="143" r="12"/><circle cx="179" cy="143" r="12"/></g><circle cx="128" cy="159" r="12" fill="${accent}"/>`;
return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="badge-title badge-desc"><title id="badge-title">CAPITAL-AI ${spec.label} ${spec.sub}</title><desc id="badge-desc">Eigenständiges Produkt-Badge zur Vorschau, keine Zertifizierung und keine produktive Scoring-Freigabe.</desc><defs><linearGradient id="surface" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#171338"/></linearGradient></defs><rect width="256" height="256" rx="36" fill="url(#surface)"/><rect x="4" y="4" width="248" height="248" rx="32" stroke="${accent}" stroke-opacity="0.75" stroke-width="3" fill="none"/><text x="128" y="35" font-size="13" letter-spacing="3" font-weight="800" text-anchor="middle" font-family="Arial,sans-serif" fill="${fg}">CAPITAL-AI</text>${glyph}<path d="M43 180h170" stroke="${accent}" stroke-width="1" stroke-opacity=".45"/><text x="128" y="205" text-anchor="middle" font-size="22" font-weight="800" font-family="Arial,sans-serif" fill="${fg}">${spec.label}</text><text x="128" y="227" text-anchor="middle" font-size="13" letter-spacing="2" font-weight="800" font-family="Arial,sans-serif" fill="${accent}">${spec.sub}</text><text x="128" y="242" text-anchor="middle" font-size="7" letter-spacing="1" font-family="Arial,sans-serif" fill="#94A3B8">${spec.tagline}</text></svg>\n`;
}
