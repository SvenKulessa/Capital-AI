#!/usr/bin/env node
/**
 * Review-Gate script for X content.
 * 
 * Usage:
 *   node scripts/growth/review-gate-x-publish.mjs --template evidence-first-scoring --confirm
 *   node scripts/growth/review-gate-x-publish.mjs --template supabase-rls --media ./video.mp4 --confirm
 * 
 * Without --confirm the script only prints the draft and exits (DRAFT_ONLY safety).
 * Media path optional. Supports image or video (chunked for video).
 * 
 * Token scopes required: tweet.read tweet.write users.read media.write
 */

import { readFileSync } from 'node:fs';
import { XArticlesClient } from '../../src/services/x/xArticlesClient.ts';
import { X_DRAFT_TEMPLATES } from '../../src/data/xDraftTemplates.ts';

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const hasFlag = (name) => args.includes(name);

const templateId = getArg('--template') ?? 'evidence-first-scoring';
const mediaPath = getArg('--media');
const confirmed = hasFlag('--confirm');

const template = X_DRAFT_TEMPLATES.find((t) => t.id === templateId);
if (!template) {
  console.error(`Template not found: ${templateId}`);
  console.error('Available:', X_DRAFT_TEMPLATES.map((t) => t.id).join(', '));
  process.exit(1);
}

console.log('=== X DRAFT REVIEW GATE ===');
console.log('Template:', template.id);
console.log('Title:', template.title);
console.log('Suggested media:', template.suggestedMedia ?? 'none');
console.log('Disclaimer:', template.disclaimer);
console.log('');
console.log('Content blocks:');
template.blocks.forEach((b) => console.log(`- ${b.text}`));
console.log('');

if (!confirmed) {
  console.log('NO ACTION TAKEN.');
  console.log('Only an authorized, explicitly enabled draft is supported; public posting is blocked.');
  console.log('This is the review gate. Publishing remains blocked by policy.');
  process.exit(0);
}

if (process.env.X_DRAFT_API_ENABLED !== 'true') {
  console.error('X_DRAFT_API_DISABLED: external drafts require explicitly enabled and authorized API access.');
  process.exit(1);
}

if (!process.env.X_ACCESS_TOKEN) {
  console.error('X_ACCESS_TOKEN missing. Set OAuth 2.0 user token with scopes: tweet.read tweet.write users.read media.write');
  process.exit(1);
}

const client = new XArticlesClient();

async function run() {
  let mediaId = null;
  if (mediaPath) {
    console.log(`Uploading media from ${mediaPath}...`);
    const buf = readFileSync(mediaPath);
    const ext = mediaPath.toLowerCase();
    const isVideo = ext.endsWith('.mp4') || ext.endsWith('.mov') || ext.endsWith('.webm');
    const mime = ext.endsWith('.mov') ? 'video/quicktime' : ext.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    if (isVideo) {
      const result = await client.uploadMediaChunked(buf, mime, 'tweet_video');
      mediaId = result.mediaId;
      console.log('Video upload completed for draft; processing state:', result.processingState);
    } else {
      const result = await client.uploadImageSimple(buf);
      mediaId = result.mediaId;
      console.log('Image uploaded. mediaId:', mediaId);
    }
  }

  const contentState = {
    blocks: template.blocks.map((b) => ({ key: b.key, text: b.text, type: b.type ?? 'unstyled' })),
    entities: [],
  };

  const draft = await client.createDraftArticle({
    title: template.title,
    content_state: contentState,
    cover_media: mediaId ?? undefined,
  });

  console.log('DRAFT CREATED (not published).');
  console.log('Draft ID:', draft.data.id);
  console.log('Title:', draft.data.title);
  if (mediaId) console.log('Cover/media attached:', mediaId);
  console.log('');
  console.log('Next: Review in X UI. Public publish remains blocked until separate approval.');
}

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
