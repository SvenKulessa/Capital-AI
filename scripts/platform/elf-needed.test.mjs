import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readElfNeeded } from './elf-needed.mjs';

function put(t, bytes) {
  const dir = mkdtempSync(join(tmpdir(), 'capital-elf-needed-'));
  t.after(() => rmSync(dir, { force: true, recursive: true }));
  const file = join(dir, 'libcandidate.so');
  writeFileSync(file, bytes);
  return file;
}
function sample() {
  const b = Buffer.alloc(512);
  Buffer.from([0x7f, 69, 76, 70, 2, 1, 1]).copy(b, 0);
  b.writeUInt16LE(3, 16); b.writeUInt16LE(62, 18);
  b.writeBigUInt64LE(64n, 32);
  b.writeUInt16LE(64, 52); b.writeUInt16LE(56, 54); b.writeUInt16LE(2, 56);
  // PT_LOAD maps 0x400000..400200 to bytes 0..512
  b.writeUInt32LE(1, 64); b.writeUInt32LE(4, 68);
  b.writeBigUInt64LE(0n, 72); b.writeBigUInt64LE(0x400000n, 80);
  b.writeBigUInt64LE(512n, 96); b.writeBigUInt64LE(512n, 104);
  // PT_DYNAMIC with two DT_NEEDED entries and a NULL terminator
  b.writeUInt32LE(2, 120); b.writeUInt32LE(4, 124);
  b.writeBigUInt64LE(256n, 128); b.writeBigUInt64LE(0x400100n, 136);
  b.writeBigUInt64LE(80n, 152); b.writeBigUInt64LE(80n, 160);
  const str = Buffer.from('\\0libcrypto.so.3\\0libc.musl-x86_64.so.1\\0'.replace(/\\0/g, '\0'));
  str.copy(b, 384);
  const records = [[5n,0x400180n],[10n,BigInt(str.length)],[1n,1n],[1n,BigInt(1+'libcrypto.so.3'.length+1)],[0n,0n]];
  records.forEach(([tag,val],i)=>{b.writeBigUInt64LE(tag,256+i*16);b.writeBigUInt64LE(val,264+i*16);});
  return b;
}

test('ELF64 little-endian: NEEDED is parsed byte-for-byte without running ELF', t => {
  const result = readElfNeeded(put(t,sample()));
  assert.deepEqual(result, {status:'ELF64_DT_NEEDED_PARSED',needed:['libc.musl-x86_64.so.1','libcrypto.so.3']});
});
test('missing or malformed string table cannot prove dynamic dependencies',t=>{
  const b=sample();b.writeBigUInt64LE(0x700000n,264);
  assert.deepEqual(readElfNeeded(put(t,b)),{status:'NOT_PROVEN',needed:[]});
});
test('truncated ELF and non-ELF input stay unproven',t=>{
  assert.equal(readElfNeeded(put(t,Buffer.from('plain text'))).status,'NOT_PROVEN');
  const b=sample().subarray(0,120);
  assert.equal(readElfNeeded(put(t,b)).status,'NOT_PROVEN');
});
test('unsupported endianness fails closed',t=>{
  const b=sample();b[5]=2;
  assert.deepEqual(readElfNeeded(put(t,b)),{status:'NOT_PROVEN',needed:[]});
});
test('ELF with no PT_DYNAMIC is scoped, never a negative UnRAR assurance',t=>{
  const b=sample();b.writeUInt32LE(1,120);
  assert.deepEqual(readElfNeeded(put(t,b)),{status:'ELF_NO_PT_DYNAMIC',needed:[]});
});
test('non-allowlisted library names cannot be promoted',t=>{
  const b=sample();b.write('bad/name',385,'ascii');
  assert.deepEqual(readElfNeeded(put(t,b)),{status:'NOT_PROVEN',needed:[]});
});
test('unrelated opaque dynamic tag values are ignored, not elevated',t=>{
  const b=sample();b.writeBigUInt64LE(0x6ffffef5n,256);
  b.writeBigUInt64LE(0xffffffffffffffffn,264);
  assert.deepEqual(readElfNeeded(put(t,b)),{status:'NOT_PROVEN',needed:[]});
});
