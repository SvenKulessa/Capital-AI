// Read-only, bounded ELF64-little-endian DT_NEEDED fallback. No ELF execution,
// loader invocation or install. Unsupported/malformed layouts stay NOT_PROVEN.
import { openSync, closeSync, readSync, statSync } from 'node:fs';

const unresolved = () => ({ status: 'NOT_PROVEN', needed: [] });
const MAX_FILE = 250 * 1024 * 1024;
const MAX_PH = 128;
const MAX_DYNAMIC = 1024 * 1024;
const MAX_STRTAB = 1024 * 1024;
const MAX_NAMES = 128;
const stringName = /^[a-zA-Z0-9_+.-]+$/;

export function readElfNeeded(filePath) {
  let fd;
  try {
    const size = statSync(filePath).size;
    if (!Number.isSafeInteger(size) || size < 64 || size > MAX_FILE) return unresolved();
    fd = openSync(filePath, 'r');
    const range = (offset, length) => {
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) ||
          offset < 0 || length < 0 || offset + length > size) {
        throw new Error('ELF read exceeds file bounds');
      }
      const bytes = Buffer.alloc(length);
      if (readSync(fd, bytes, 0, length, offset) !== length) throw new Error('Truncated ELF');
      return bytes;
    };
    const integer = value => {
      if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Oversize ELF offset');
      return Number(value);
    };
    const h = range(0, 64);
    if (!h.subarray(0, 4).equals(Buffer.from([0x7f, 69, 76, 70]))) {
      return { status: 'NOT_ELF_OR_HEADER_UNREADABLE', needed: [] };
    }
    if (h[4] !== 2 || h[5] !== 1 || h[6] !== 1) return unresolved();
    const phoff = integer(h.readBigUInt64LE(32));
    const entrySize = h.readUInt16LE(54), count = h.readUInt16LE(56);
    if (entrySize < 56 || entrySize > 256 || count < 1 || count > MAX_PH ||
        phoff < 64 || phoff + count * entrySize > size) return unresolved();

    const loads = [];
    const dynamics = [];
    for (let i = 0; i < count; i++) {
      const p = range(phoff + i * entrySize, 56);
      const type = p.readUInt32LE(0);
      if (type !== 1 && type !== 2) continue;
      const offset = integer(p.readBigUInt64LE(8));
      const vaddr = integer(p.readBigUInt64LE(16));
      const fileSize = integer(p.readBigUInt64LE(32));
      if (offset + fileSize > size) return unresolved();
      const section = { offset, vaddr, fileSize };
      if (type === 1) loads.push(section);
      else dynamics.push(section);
    }
    if (!dynamics.length) return { status: 'ELF_NO_PT_DYNAMIC', needed: [] };
    if (dynamics.length !== 1 || !loads.length) return unresolved();
    const dynamic = dynamics[0];
    if (dynamic.fileSize < 16 || dynamic.fileSize > MAX_DYNAMIC ||
        dynamic.fileSize % 16 !== 0) return unresolved();

    let strAddress = null, strSize = null;
    const neededOffsets = [];
    let terminated = false;
    for (let i = 0; i < dynamic.fileSize / 16; i++) {
      const record = range(dynamic.offset + i * 16, 16);
      const tag = record.readBigUInt64LE(0);
      if (tag === 0n) { terminated = true; break; }
      if (tag !== 1n && tag !== 5n && tag !== 10n) continue;
      const value = integer(record.readBigUInt64LE(8));
      if (tag === 1n) {
        if (neededOffsets.length >= MAX_NAMES) return unresolved();
        neededOffsets.push(value);
      }
      if (tag === 5n) {
        if (strAddress !== null) return unresolved();
        strAddress = value;
      }
      if (tag === 10n) {
        if (strSize !== null) return unresolved();
        strSize = value;
      }
    }
    if (!terminated) return unresolved();
    if (!neededOffsets.length) return { status: 'ELF_DYNAMIC_WITHOUT_DT_NEEDED', needed: [] };
    if (strAddress === null || strSize === null || strSize < 1 || strSize > MAX_STRTAB) return unresolved();
    const segment = loads.find(p => strAddress >= p.vaddr &&
      strAddress + strSize <= p.vaddr + p.fileSize);
    if (!segment) return unresolved();
    const data = range(segment.offset + strAddress - segment.vaddr, strSize);
    const needed = [];
    for (const offset of neededOffsets) {
      if (offset < 0 || offset >= data.length) return unresolved();
      const end = data.indexOf(0, offset);
      if (end < 0 || end - offset < 1 || end - offset > 256) return unresolved();
      const name = data.toString('utf8', offset, end);
      if (!stringName.test(name)) return unresolved();
      needed.push(name);
    }
    return { status: 'ELF64_DT_NEEDED_PARSED', needed: [...new Set(needed)].sort() };
  } catch {
    return unresolved();
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
