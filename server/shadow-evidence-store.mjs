import { mkdir, open, link, unlink, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';

const ID = /^EVD-[a-f0-9]{64}$/;
const MAX_BYTES = 8 * 1024 * 1024;
/** Private offline/shadow store. No endpoint or production startup registration. */
export class FileShadowEvidenceStore {
  constructor(root) { this.root = resolve(root); }
  path(id) { if (!ID.test(id)) throw new Error('EVIDENCE_ID_INVALID'); return join(this.root, `${id}.json`); }
  verify(id, body) {
    if (typeof body !== 'string' || Buffer.byteLength(body) > MAX_BYTES) throw new Error('EVIDENCE_SIZE_INVALID');
    if (`EVD-${createHash('sha256').update(body).digest('hex')}` !== id) throw new Error('EVIDENCE_HASH_MISMATCH');
    JSON.parse(body);
  }
  async putImmutable(id, body) {
    const target = this.path(id); this.verify(id, body);
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const stat = await lstat(this.root);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error('EVIDENCE_DIRECTORY_NOT_PRIVATE');
    const temporary = join(this.root, `.pending-${randomUUID()}`);
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(body, 'utf8'); await handle.sync(); } finally { await handle.close(); }
    try {
      try { await link(temporary, target); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (await this.get(id) !== body) throw new Error('EVIDENCE_ID_REUSE');
      }
      const directory = await open(this.root, 'r');
      try { await directory.sync(); } finally { await directory.close(); }
    } finally { await unlink(temporary); }
  }
  async get(id) {
    const path = this.path(id);
    try {
      const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > MAX_BYTES || (stat.mode & 0o077)) throw new Error('EVIDENCE_FILE_INVALID');
        const body = await handle.readFile('utf8'); this.verify(id, body); return body;
      } finally { await handle.close(); }
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
}
