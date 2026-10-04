import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Docker inspect .Id may identify an index with the containerd image store.
// Hash the actual configuration bytes from the same exported, scanned image.
export function archiveConfigDigest(archive, readMember = member =>
  execFileSync('tar', ['-xOf', archive, '--', member], { maxBuffer: 4 * 1024 * 1024 })) {
  const manifests = JSON.parse(readMember('manifest.json').toString());
  if (!Array.isArray(manifests) || manifests.length !== 1) {
    throw new Error('Expected exactly one exported image');
  }
  const member = manifests[0]?.Config;
  if (typeof member !== 'string' || !/^(?:[a-f0-9]{64}\.json|blobs\/sha256\/[a-f0-9]{64})$/.test(member)) {
    throw new Error('Invalid configuration member');
  }
  const bytes = readMember(member);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const expectedHash = member.startsWith('blobs/') ? member.split('/').at(-1) : member.slice(0, -5);
  if (hash !== expectedHash) throw new Error('Configuration bytes do not match their digest');
  const config = JSON.parse(bytes.toString());
  if (config.os !== 'linux' || config.architecture !== 'amd64' || config.rootfs?.type !== 'layers') {
    throw new Error('Expected linux/amd64 image configuration');
  }
  return 'sha256:' + hash;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Expected Docker archive path');
  console.log(archiveConfigDigest(process.argv[2]));
}
