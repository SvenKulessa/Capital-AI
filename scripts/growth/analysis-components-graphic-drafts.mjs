import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analysisArticles } from '../../shared/analysis-documentation.mjs';
import { EDITORIAL_STATUS_RENDERER_VERSION, renderEditorialStatusGraphic } from '../../src/platform/SocialMediaEngine/Branding/EditorialStatusGraphicRenderer.mjs';

const target = process.argv[2];
if (!target) throw new Error('Ausgabeordner für redaktionelle Entwürfe erforderlich.');
const output = resolve(target);
const sha256 = data => createHash('sha256').update(data).digest('hex');
const drafts = [];
await mkdir(output, { recursive: true });
for (const article of analysisArticles) {
  const format = 'landscape';
  const altText = article.rows.map(({ title, lines }) => title + ' – ' + lines.join(', ')).join('. ');
  const { png, width, height } = await renderEditorialStatusGraphic({
    format, title: article.title, subtitle: article.subtitle, rows: article.rows, altText,
    eyebrow: 'DOKUMENTATION · ANALYSE KOMPONENTEN',
    sourceLabel: 'CAPITAL-AI · Architektur-Verträge und Learning Journey',
    note: 'Methodik und Systemgrenzen · Konzeptdarstellung',
  });
  const file = article.id + '.png';
  await writeFile(resolve(output, file), png);
  drafts.push({ file, articleId: article.id, altText, width, height, sha256: sha256(png),
    contentDigest: sha256(JSON.stringify(article)), status: 'DRAFT_ONLY', publicationAllowed: false });
}
await writeFile(resolve(output, 'manifest.json'), JSON.stringify({
  source: 'shared/analysis-documentation.mjs', renderer: EDITORIAL_STATUS_RENDERER_VERSION, drafts,
}, null, 2) + '\n');
