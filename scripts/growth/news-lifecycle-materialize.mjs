// Offline writer for a reviewed editorial transaction. No provider, scheduler or deployment action.
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { publishedNews, newsArchivePath } from '../../shared/news-lifecycle.mjs';

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
  const files = plannedNewsFiles(result);
  const dir = resolve(root);
  const writes = [];
  const rollback = [];
  // Never follow an existing symlink to a target outside the project tree.
  async function rejectSymlinks(pathname) {
    let cursor = dirname(pathname);
    while (cursor.startsWith(dir + sep)) {
      try { if ((await lstat(cursor)).isSymbolicLink()) throw Error('NEWS_ARCHIVE_SYMLINK'); }
      catch (error) { if (error?.code !== 'ENOENT') throw error; }
      cursor = dirname(cursor);
    }
    try { if ((await lstat(pathname)).isSymbolicLink()) throw Error('NEWS_ARCHIVE_SYMLINK'); }
    catch (error) { if (error?.code !== 'ENOENT') throw error; }
  }
  // Preflight: archive snapshots are immutable, mutable index and edition are versioned in Git.
  for (const file of files) {
    const destination = resolve(dir, file.path);
    if (!destination.startsWith(dir + sep)) throw Error('NEWS_ARCHIVE_TRAVERSAL');
    await rejectSymlinks(destination);
    const previous = await existing(destination);
    const content = JSON.stringify(file.data, null, 2) + '\n';
    if (file.path.startsWith(archiveRoot + '/') && previous !== null && previous !== content) throw Error('NEWS_ARCHIVE_IMMUTABLE');
    writes.push({ destination, previous, content });
  }
  try {
    for (const write of writes) {
      await mkdir(dirname(write.destination), { recursive: true });
      if (write.previous === write.content) continue;
      const tmp = write.destination + '.' + randomUUID() + '.tmp';
      await writeFile(tmp, write.content, { flag: 'wx', mode: 0o600 });
      try { await rename(tmp, write.destination); }
      finally { await rm(tmp, { force: true }); }
      rollback.push(write);
    }
  } catch (error) {
    for (const write of rollback.reverse()) {
      if (write.previous === null) await rm(write.destination, { force: true });
      else await writeFile(write.destination, write.previous, { flag: 'w' });
    }
    throw error;
  }
  return writes.map(item => item.destination);
}
