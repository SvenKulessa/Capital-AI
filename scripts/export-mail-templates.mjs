import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderSupportMail } from '../shared/mail-templates.mjs';

const [, , flag, path] = process.argv;
if (flag !== '--out-dir' || !path) {
  console.error('Usage: node scripts/export-mail-templates.mjs --out-dir <directory>');
  process.exit(2);
}
const output = resolve(path);
await mkdir(output, { recursive: true });
for (const [type, name] of [['signature', 'signatur'], ['reply', 'antwortvorlage'], ['absence', 'abwesenheitsnotiz']]) {
  const { html, text } = renderSupportMail(type);
  await writeFile(resolve(output, name + '.html'), html, { flag: 'w' });
  await writeFile(resolve(output, name + '.txt'), text + '\n', { flag: 'w' });
}
console.log(JSON.stringify({ status: 'PASS', generatedTemplates: 3, output, sendsMail: false }));
