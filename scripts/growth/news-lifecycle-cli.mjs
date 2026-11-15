// Produces the next homepage edition and Analytics index together; no publishing or repo writes.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { advanceNewsEdition } from '../../shared/news-lifecycle.mjs';
import { selectHomeEdition } from './home-editorial-edition.mjs';

export async function prepareNewsLifecycle(asOf, candidatesFile) {
  const [edition, index, candidates] = await Promise.all([
    readFile(new URL('../../src/features/home/homeEditorialEdition.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../src/features/analysis/newsLifecycleIndex.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(candidatesFile, 'utf8').then(JSON.parse),
  ]);
  return advanceNewsEdition(edition, index, selectHomeEdition(edition, candidates, asOf), asOf);
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [, , asOf, candidatesFile] = process.argv;
  if (!asOf || !candidatesFile) throw new Error('Usage: node scripts/growth/news-lifecycle-cli.mjs YYYY-MM-DD reviewed-candidates.json');
  process.stdout.write(JSON.stringify(await prepareNewsLifecycle(asOf, candidatesFile), null, 2) + '\n');
}
