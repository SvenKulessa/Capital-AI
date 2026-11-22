import test from 'node:test';
import assert from 'node:assert/strict';
import { renderEditorialStatusGraphic } from '../../src/platform/SocialMediaEngine/Branding/EditorialStatusGraphicRenderer.mjs';

const input = {
  format: 'landscape', eyebrow: 'TEST ARTICLE', title: 'A factual status graphic', subtitle: 'Three reviewed states',
  note: 'Synthetic test data', sourceLabel: 'Synthetic source', altText: 'Three synthetic states.',
  rows: [
    { title: 'Design', lines: ['Available'] },
    { title: 'Pilot', lines: ['Planned', 'Conditions apply'] },
    { title: 'Delivery', lines: ['Not evidenced'] },
  ],
};

test('offline renderer produces deterministic, dimensioned PNGs with accessible vector source', async () => {
  for (const [format, width, height] of [['landscape', 1440, 960], ['portrait', 1080, 1350]]) {
    const first = await renderEditorialStatusGraphic({ ...input, format });
    const second = await renderEditorialStatusGraphic({ ...input, format });
    assert.deepEqual(first.png, second.png);
    assert.equal(first.png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(first.png.readUInt32BE(16), width);
    assert.equal(first.png.readUInt32BE(20), height);
    assert.match(first.svg, /aria-labelledby="title description"/);
    assert.match(first.svg, /LicenseRef-CapitalAI-Owned/);
    assert.doesNotMatch(first.svg, /AKASH|<image|<script|<foreignObject|href=/);
  }
});

test('source strings cannot insert executable markup or external images', async () => {
  const result = await renderEditorialStatusGraphic({ ...input, title: '<script>alert("x")</script>' });
  assert.match(result.svg, /&lt;script&gt;/);
  assert.doesNotMatch(result.svg, /<script/);
  await assert.rejects(renderEditorialStatusGraphic({ ...input, rows: [] }), /INPUT_INVALID/);
  await assert.rejects(renderEditorialStatusGraphic({ ...input, rows: [{ title: 'Bad', lines: null }, ...input.rows.slice(1)] }), /ROWS_INVALID/);
  await assert.rejects(renderEditorialStatusGraphic({ ...input, format: 'remote-svg' }), /INPUT_INVALID/);
});
