import { readFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-wasm';
import { ensureResvgWasmInitialized } from './ResvgWasmRuntime.mjs';

export const EDITORIAL_STATUS_RENDERER_VERSION = 'CAPITAL_AI_EDITORIAL_STATUS_GRAPHIC@1';
export const EDITORIAL_STATUS_SIZES = Object.freeze({ landscape: [1440, 960], portrait: [1080, 1350] });
const fontName = 'Plus Jakarta Sans';
let resources;
const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

function label(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error('EDITORIAL_GRAPHIC_TEXT_INVALID');
  }
  return escapeXml(value);
}

/** Fixed local template. Source facts are escaped data and never executable SVG. */
export async function renderEditorialStatusGraphic(input) {
  const size = EDITORIAL_STATUS_SIZES[input?.format];
  if (!size || !Array.isArray(input?.rows) || input.rows.length !== 3) throw new Error('EDITORIAL_GRAPHIC_INPUT_INVALID');
  const title = label(input.title, 70);
  const eyebrow = label(input.eyebrow, 60);
  const subtitle = label(input.subtitle, 95);
  const note = label(input.note, 100);
  const sourceLabel = label(input.sourceLabel, 95);
  const altText = label(input.altText, 500);
  const rows = input.rows.map(row => {
    if (!Array.isArray(row?.lines) || row.lines.length < 1 || row.lines.length > 3) throw new Error('EDITORIAL_GRAPHIC_ROWS_INVALID');
    return { title: label(row.title, 32), lines: row.lines.map(line => label(line, 38)) };
  });
  resources ??= Promise.all([
    ensureResvgWasmInitialized(),
    readFile(new URL('../../../../public/fonts/PlusJakartaSans-Regular.ttf', import.meta.url)),
    readFile(new URL('../../../../public/branding/asset-pack/meta/social-render-tokens.json', import.meta.url), 'utf8'),
  ]).then(async ([, fontBytes, raw]) => {
    const tokens = JSON.parse(raw);
    if (tokens.schemaVersion !== 'CAPITAL_AI_SOCIAL_RENDER_TOKENS@1' || tokens.publishReady !== false) throw new Error('EDITORIAL_GRAPHIC_TOKENS_INVALID');
    const palette = ['cyan', 'violet', 'gold', 'pink', 'rose', 'blue', 'green'].map(name => tokens.color.universe[name].$value);
    if (palette.some(color => !/^#[a-fA-F0-9]{6}$/.test(color))) throw new Error('EDITORIAL_GRAPHIC_PALETTE_INVALID');
    return { fontBytes, palette };
  });
  const { fontBytes, palette } = await resources;
  const portrait = input.format === 'portrait';
  const [width, height] = size;
  const margin = 64;
  const panelWidth = portrait ? width - margin * 2 : (width - margin * 2 - 40) / 3;
  const text = (x, y, fontSize, fill, content, extra = '', availableWidth = width - margin - x) => {
    const probe = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="8192" height="256"><text y="100" font-family="${fontName}" font-size="${fontSize}">${content}</text></svg>`, {
      font: { fontBuffers: [fontBytes], defaultFontFamily: fontName },
    });
    try {
      const bounds = probe.innerBBox();
      try {
        const fittedSize = bounds?.width ? Math.min(fontSize, fontSize * availableWidth / (bounds.width + 4)) : fontSize;
        if (fittedSize < 14) throw new Error('EDITORIAL_GRAPHIC_TEXT_TOO_WIDE');
        return `<text x="${x}" y="${y}" font-size="${fittedSize.toFixed(2)}" fill="${fill}" ${extra}>${content}</text>`;
      } finally { bounds?.free(); }
    } finally { probe.free(); }
  };
  const panels = rows.map((row, index) => {
    const x = portrait ? margin : margin + index * (panelWidth + 20);
    const y = portrait ? 350 + index * 244 : 370;
    const panelHeight = portrait ? 220 : 340;
    const accent = [palette[0], palette[2], palette[1]][index];
    return `<g transform="translate(${x},${y})">
      <rect width="${panelWidth}" height="${panelHeight}" rx="28" fill="url(#panel)" stroke="#344860"/>
      <path d="M30 1H${panelWidth - 30}" stroke="${accent}" stroke-width="3"/>
      <circle cx="38" cy="49" r="7" fill="${accent}"/>
      ${text(62, 58, portrait ? 29 : 26, accent, row.title, '', panelWidth - 92)}
      ${row.lines.map((line, i) => text(30, (portrait ? 111 : 138) + i * 43, portrait ? 31 : 29, '#F5F8FF', line, '', panelWidth - 60)).join('')}
    </g>`;
  }).join('');
  const spectrum = palette.map((color, i) => `<stop offset="${i / 6}" stop-color="${color}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${fontName}" role="img" aria-labelledby="title description">
    <title id="title">${title}</title><desc id="description">${altText}</desc>
    <metadata>${EDITORIAL_STATUS_RENDERER_VERSION}; AI_ASSISTED; LicenseRef-CapitalAI-Owned; graphic license only; publicationAllowed=false</metadata>
    <defs><linearGradient id="background" x2="1" y2="1"><stop stop-color="#101D37"/><stop offset="1" stop-color="#050B18"/></linearGradient><linearGradient id="panel" x2="1" y2="1"><stop stop-color="#1B2C48"/><stop offset="1" stop-color="#0C1426"/></linearGradient><linearGradient id="spectrum" gradientUnits="userSpaceOnUse" x1="64" x2="${width - 64}" y1="105" y2="105">${spectrum}</linearGradient></defs>
    <rect width="${width}" height="${height}" rx="32" fill="url(#background)"/>
    <circle cx="${width - 85}" cy="130" r="235" fill="none" stroke="${palette[1]}" stroke-opacity=".18" stroke-width="2"/>
    <circle cx="${width - 85}" cy="130" r="180" fill="none" stroke="${palette[0]}" stroke-opacity=".16"/>
    <path d="M64 105H${width - 64}" stroke="url(#spectrum)" stroke-width="4"/>
    ${text(margin, 73, 22, '#BFCBDD', 'CAPITAL-AI · CONTENT ENGINE', 'letter-spacing="3"')}
    ${text(margin, 179, 24, palette[0], eyebrow)}
    ${text(margin, 248, portrait ? 49 : 59, '#F5F8FF', title)}
    ${text(margin, 303, portrait ? 26 : 30, '#BECDE0', subtitle)}
    ${panels}
    <path d="M64 ${height - 210}H${width - 64}" stroke="#344860"/>
    ${text(margin, height - 159, portrait ? 22 : 26, '#D9E3F1', note)}
    ${text(margin, height - 113, 21, '#BFCBDD', sourceLabel)}
    ${text(margin, height - 60, 17, '#9EADC3', 'Eigene Gestaltung · AI-assisted · CAPITAL-AI · 2026')}
    ${text(width - margin, height - 60, 17, palette[2], 'ENTWURF', 'text-anchor="end"', 150)}
  </svg>\n`;
  const renderer = new Resvg(svg, { font: { fontBuffers: [fontBytes], defaultFontFamily: fontName } });
  try {
    const image = renderer.render();
    try { return { svg, png: Buffer.from(image.asPng()), width, height, altText: input.altText }; }
    finally { image.free(); }
  } finally { renderer.free(); }
}
