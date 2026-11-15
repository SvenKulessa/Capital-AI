// Produces the next homepage edition and Analytics index together; no publishing or repo writes.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { advanceNewsEdition } from '../../shared/news-lifecycle.mjs';
import { selectHomeEdition } from './home-editorial-edition.mjs';
import { writeNewsLifecycle } from './news-lifecycle-materialize.mjs';

export async function prepareNewsLifecycle(asOf, candidatesFile) {
  const [edition, index, candidates] = await Promise.all([
    readFile(new URL('../../src/features/home/homeEditorialEdition.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../src/features/analysis/newsLifecycleIndex.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(candidatesFile, 'utf8').then(JSON.parse),
  ]);
  return advanceNewsEdition(edition, index, selectHomeEdition(edition, candidates, asOf), asOf);
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [, , asOf, candidatesFile, mode] = process.argv;
  if (!asOf || !candidatesFile) throw new Error('Usage: node scripts/growth/news-lifecycle-cli.mjs YYYY-MM-DD reviewed-candidates.json');
  if (mode && mode !== '--write') throw Error('Unknown CLI mode');
  const result = await prepareNewsLifecycle(asOf, candidatesFile);
  if (mode === '--write') {
    const written = await writeNewsLifecycle(result);
    process.stdout.write(JSON.stringify({mode:'WRITTEN_LOCAL_REPO_ONLY',files:written},null,2)+'\\n');
  } else {
    process.stdout.write(JSON.stringify(result,null,2)+'\\n');
  }
}
