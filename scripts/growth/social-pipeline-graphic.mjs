import { readFile } from 'node:fs/promises';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

export const PIPELINE_GRAPHIC_ALT = 'Fünf Schritte: Quellen prüfen, Inhalt entwerfen, Grafik rendern, Qualität prüfen und redaktionell freigeben.';
export const PIPELINE_GRAPHIC_WIDTH = 1440;
export const PIPELINE_GRAPHIC_HEIGHT = 810;
const fontName = 'Plus Jakarta Sans';
const wasm = new URL(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm'));
const font = new URL('../../public/fonts/PlusJakartaSans-Regular.ttf', import.meta.url);
const tokens = new URL('../../public/branding/asset-pack/meta/social-render-tokens.json', import.meta.url);
let renderer;

const stages = [
  ['Quellen', 'Fakten und Kontext', 'Öffentliche Primärquellen', 'Firecrawl · TinyFish'],
  ['Entwurf', 'Eine Geschichte', 'Themen und Kanalvarianten', 'Content Engine'],
  ['Medien', 'Eigene Grafiken', 'Vektorquelle zu PNG', 'resvg · Offline'],
  ['Prüfung', 'Messbare Qualität', 'Herkunft und Zugänglichkeit', 'CADS · Alt-Text'],
  ['Freigabe', 'Redaktion entscheidet', 'Rechte und Zielkanal', 'Social Media Engine'],
];

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function drawGraphic(colors) {
  const background = colors.background.$value;
  const foreground = colors.foreground.$value;
  const cyan = colors.brand.cyan.$value;
  const gold = colors.brand.primary.$value;
  const card = colors.print.surfaceLight.$value;
  const muted = colors.print.textSecondary.$value;
  const border = colors.print.borderLight.$value;
  const text = (x, y, size, fill, content) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${escapeXml(content)}</text>`;
  const panels = stages.map(([title, subtitle, description, tool], index) => {
    const x = 55 + 268 * index;
    const accent = index === stages.length - 1 ? gold : cyan;
    return `<rect x="${x}" y="334" width="254" height="258" rx="24" fill="${card}" stroke="${border}"/>
      <circle cx="${x + 32}" cy="372" r="7" fill="${accent}"/>
      ${text(x + 25, 437, 33, foreground, title)}
      ${text(x + 25, 477, 18, accent, subtitle)}
      ${text(x + 25, 508, 15, muted, description)}
      ${text(x + 25, 552, 17, foreground, tool)}`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIPELINE_GRAPHIC_WIDTH}" height="${PIPELINE_GRAPHIC_HEIGHT}" viewBox="0 0 1440 810" font-family="${fontName}" role="img" aria-labelledby="title description">
  <title id="title">CAPITAL-AI Social Media Content Engine</title>
  <desc id="description">${PIPELINE_GRAPHIC_ALT}</desc>
  <rect width="1440" height="810" fill="${background}"/>
  <path d="M55 106H1385 M55 635H1385" stroke="${border}"/>
  <path d="M87 372H1159" stroke="${cyan}" stroke-width="2" opacity=".65"/>
  ${text(55, 75, 24, gold, 'CAPITAL-AI / REDAKTION')}
  ${text(55, 204, 64, foreground, 'Social Media Content Engine')}
  ${text(55, 263, 30, muted, 'Von der öffentlichen Quelle zum freigabefähigen Entwurf')}
  ${panels}
  ${text(55, 693, 25, gold, 'ENTWURF · FREIGABE OFFEN')}
  ${text(55, 743, 23, muted, 'Website · LinkedIn · Video · Podcast')}
  </svg>\n`;
}

export async function renderSocialPipelineGraphic() {
  // The only SVG input is the fixed template. Fonts, palette and WASM are local.
  renderer ??= Promise.all([readFile(wasm), readFile(font), readFile(tokens, 'utf8')])
    .then(async ([binary, fontBytes, palette]) => {
      await initWasm(binary);
      return { fontBytes, svg: drawGraphic(JSON.parse(palette).color) };
    });
  const { fontBytes, svg } = await renderer;
  const drawing = new Resvg(svg, {
    font: { fontBuffers: [fontBytes], defaultFontFamily: fontName },
  });
  try {
    const image = drawing.render();
    try {
      if (image.width !== PIPELINE_GRAPHIC_WIDTH || image.height !== PIPELINE_GRAPHIC_HEIGHT) {
        throw new Error('SOCIAL_PIPELINE_PNG_DIMENSION_MISMATCH');
      }
      return { svg, png: Buffer.from(image.asPng()) };
    } finally {
      image.free();
    }
  } finally {
    drawing.free();
  }
}
