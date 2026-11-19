// Offline writer for a reviewed editorial transaction. No provider, scheduler or deployment action.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedNews, newsArchivePath, retireNews } from '../../shared/news-lifecycle.mjs';
import { assertHomeEditionAdmission } from './news-lifecycle-home-admission.mjs';
import { persistNewsFiles, recoverNewsLifecycle } from './news-lifecycle-transaction.mjs';

export const DEFAULT_NEWS_REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const editionFile = 'src/features/home/homeEditorialEdition.json';
const indexFile = 'src/features/analysis/newsLifecycleIndex.json';
const archiveRoot = 'data';

async function existing(file) {
  try { return await readFile(file, 'utf8'); }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
}
export function plannedNewsFiles(result) {
  if (!result || !Array.isArray(result.edition?.stories) || result.edition.stories.length !== 3 ||
      !Array.isArray(result.index?.overview) || result.index.overview.length > 3 ||
      !Array.isArray(result.index?.archive)) throw Error('Invalid lifecycle result');
  const news = [...result.index.overview, ...result.index.archive];
  // Never write license-unreviewed article snapshots into a public repo.
  if (publishedNews(news).length !== news.length) throw Error('NEWS_ARCHIVE_RIGHTS_NOT_ADMITTED');
  const paths = new Set();
  const files = [
    { path: editionFile, data: result.edition },
    { path: indexFile, data: result.index },
  ];
  for (const entry of news) {
    if (entry.archivePath !== newsArchivePath(entry)) throw Error('NEWS_ARCHIVE_PATH_INVALID');
    const name = archiveRoot + '/' + entry.archivePath;
    if (paths.has(name)) throw Error('NEWS_ARCHIVE_PATH_DUPLICATE');
    paths.add(name);
    files.push({ path: name, data: entry });
  }
  return files;
}
export async function writeNewsLifecycle(result, root = DEFAULT_NEWS_REPO_ROOT) {
  const dir = resolve(root);
  // Recover a crash-interrupted local transaction BEFORE reading either manifest.
  // An active writer or a corrupt journal blocks the operation (never fail open).
  await recoverNewsLifecycle(dir);
  const files = plannedNewsFiles(result);
  // Cross-check the existing edition/index pair. This is not publication authority.
  const currentEdition = await existing(resolve(dir, editionFile));
  const currentIndex = await existing(resolve(dir, indexFile));
  if ((currentEdition === null) !== (currentIndex === null)) throw Error('NEWS_LIFECYCLE_PARTIAL_STATE');
  if (currentEdition !== null) {
    const previous = JSON.parse(currentEdition);
    const index = JSON.parse(currentIndex);
    await assertHomeEditionAdmission(previous, result.edition);
    const expected = retireNews(previous, result.edition, index, result.edition.date);
    if (JSON.stringify(expected) !== JSON.stringify(result.index)) throw Error('NEWS_LIFECYCLE_STATE_MISMATCH');
  }
  // WAL + directory/file fsync + atomic journal marker. A concurrent writer
  // cannot commit over the preflight snapshot; a stale baseline fails closed.
  return persistNewsFiles(files.map(file => ({
    path: file.path, content: JSON.stringify(file.data, null, 2) + '\n',
  })), dir, { expected: { [editionFile]: currentEdition, [indexFile]: currentIndex },
    archiveImmutable: true });
}
