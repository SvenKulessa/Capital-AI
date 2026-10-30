import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import test from 'node:test';
import { MerkleTree, sha256Sync } from './merkleTree.ts';

const reference = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

test('SHA-256 agrees with fixed standard vectors, including multi-block input', () => {
  const vectors = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['hello world', 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'],
    ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
    ['a'.repeat(1_000_000), 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0'],
  ];
  for (const [input, expected] of vectors) assert.equal(sha256Sync(input), expected);
});

test('SHA-256 matches Node at padding/block boundaries and hashes UTF-8 bytes', async () => {
  const inputs = [0, 1, 2, 55, 56, 63, 64, 65, 119, 120, 127, 128, 129, 255, 256, 4096]
    .map(length => 'a'.repeat(length));
  inputs.push('Grüße 🌍', '中文', '\0\u00ff', '\ud800', '€'.repeat(43));
  for (const input of inputs) {
    assert.equal(sha256Sync(input), reference(input), `UTF-8 length ${new TextEncoder().encode(input).length}`);
    const browserDigest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    assert.equal(sha256Sync(input), Buffer.from(browserDigest).toString('hex'));
  }
});

test('Merkle roots and odd-leaf proofs agree with independent standard hashes', () => {
  const inputs = ['a', 'Grüße 🌍', { currency: '€', synthetic: true }];
  const leaves = inputs.map(input => reference(typeof input === 'string' ? input : JSON.stringify(input)));
  const expectedRoot = reference(reference(leaves[0] + leaves[1]) + reference(leaves[2] + leaves[2]));
  const tree = new MerkleTree(inputs);
  assert.equal(tree.getRoot(), expectedRoot);
  for (let i = 0; i < inputs.length; i++) {
    const proof = tree.getProof(i);
    assert.equal(proof.leaf, leaves[i]);
    assert.equal(proof.verified, true);
    assert.equal(MerkleTree.verifyProof(reference('tampered'), proof.root, proof.path), false);
    assert.equal(MerkleTree.verifyProof(proof.leaf, reference('wrong root'), proof.path), false);
    const changed = proof.path.map((step, index) => index ? step : { ...step, hash: reference('wrong sibling') });
    assert.equal(MerkleTree.verifyProof(proof.leaf, proof.root, changed), false);
  }
  assert.equal(new MerkleTree(['abc']).getRoot(), reference('abc'));
});
