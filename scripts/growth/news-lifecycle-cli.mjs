// Produces the next homepage edition and Analytics index together; no publishing or repo writes.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { advanceNewsEdition } from '../../shared/news-lifecycle.mjs';
import { selectHomeEdition } from './home-editorial-edition.mjs';
import { writeNewsLifecycle, DEFAULT_NEWS_REPO_ROOT } from './news-lifecycle-materialize.mjs';
import { recoverNewsLifecycle } from './news-lifecycle-transaction.mjs';
import { approvedHomeCandidates } from './news-lifecycle-home-admission.mjs';

export async function prepareNewsLifecycle(asOf, candidatesFile) {
  await recoverNewsLifecycle(DEFAULT_NEWS_REPO_ROOT);
  const [edition, index, candidates] = await Promise.all([
    readFile(new URL('../../src/features/home/homeEditorialEdition.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../src/features/analysis/newsLifecycleIndex.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(candidatesFile, 'utf8').then(JSON.parse),
  ]);
  const reviewedCandidates = await approvedHomeCandidates(candidates, asOf);
  return advanceNewsEdition(edition, index, selectHomeEdition(edition, reviewedCandidates, asOf), asOf);
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [, , asOf, candidatesFile, mode] = process.argv;
  if (asOf === '--recover' && !candidatesFile && !mode) {
    const recovery = await recoverNewsLifecycle(DEFAULT_NEWS_REPO_ROOT);
    process.stdout.write(JSON.stringify(recovery) + '\n');
    process.exit(0);
  }
  if (!asOf || !candidatesFile) throw new Error('Usage: node scripts/growth/news-lifecycle-cli.mjs YYYY-MM-DD reviewed-candidates.json [--write] | --recover');
  if (mode && mode !== '--write') throw Error('Unknown CLI mode');
  const result = await prepareNewsLifecycle(asOf, candidatesFile);
  if (mode === '--write') {
    const written = await writeNewsLifecycle(result);
    process.stdout.write(JSON.stringify({mode:'WRITTEN_LOCAL_REPO_ONLY',files:written},null,2)+'\n');
  } else {
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }
}
