/**
 * CAPITAL_AI_X_URL_CONTEXT@1
 * Exact user-supplied public X Post URLs only: no searches, account discovery,
 * timelines, recursive links, follows, replies or publication.
 * Used by the Content Engine URL_CONTEXT source policy AND the server-owned
 * X OAuth read adapter. A URL alone provides no truth or redistribution rights.
 */
import { createHash } from 'node:crypto';
const POST_ID = /^[0-9]{1,25}$/;
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const X_HOSTS = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']);

export function parseXPostUrl(raw) {
  if (typeof raw !== 'string' || raw.length < 27 || raw.length > 220) {
    throw Error('GROWTH_X_CONTEXT_URL_INVALID');
  }
  let url;
  try { url = new URL(raw); } catch { throw Error('GROWTH_X_CONTEXT_URL_INVALID'); }
  if (url.protocol !== 'https:' || !X_HOSTS.has(url.hostname.toLowerCase())
      || url.port || url.username || url.password || url.search || url.hash) {
    throw Error('GROWTH_X_CONTEXT_URL_NOT_ALLOWED');
  }
  const match = /^\/([A-Za-z0-9_]{1,15})\/status\/([0-9]{1,25})\/?$/.exec(url.pathname);
  if (!match || !HANDLE.test(match[1]) || !POST_ID.test(match[2])) {
    throw Error('GROWTH_X_CONTEXT_POST_URL_REQUIRED');
  }
  const [, username, postId] = match;
  return Object.freeze({
    provider: 'X',
    postId,
    username,
    canonicalUrl: 'https://x.com/' + username + '/status/' + postId,
    contentType: 'POST',
  });
}

export function normalizeXPostContext(sourceUrl, response, retrievedAt = new Date().toISOString()) {
  const parsed = parseXPostUrl(sourceUrl);
  const post = response?.data;
  if (!post || post.id !== parsed.postId || !POST_ID.test(post.author_id ?? '')
      || typeof post.text !== 'string' || post.text.length > 32000
      || !post.text.trim() || post.possibly_sensitive === true || post.withheld) {
    throw Error('GROWTH_X_CONTEXT_POST_READBACK_INVALID');
  }
  const author = response?.includes?.users?.find(x => x.id === post.author_id);
  if (!author || typeof author.username !== 'string'
      || author.username.toLowerCase() !== parsed.username.toLowerCase()
      || author.protected === true || !Number.isFinite(Date.parse(retrievedAt))) {
    throw Error('GROWTH_X_CONTEXT_AUTHOR_UNVERIFIED');
  }
  const text = typeof post.note_tweet?.text === 'string' && post.note_tweet.text.length > 0
    ? post.note_tweet.text : post.text;
  if (!text.trim() || text.length > 32000) throw Error('GROWTH_X_CONTEXT_TEXT_INVALID');
  // Inbound text is transient and untrusted: no external content is persisted,
  // indexed or promoted to a CAPITAL-AI claim without a later editorial review.
  const snippet = text.slice(0, 1500);
  return Object.freeze({
    schema: 'CAPITAL_AI_X_URL_CONTEXT@1',
    role: 'URL_CONTEXT',
    source: parsed.canonicalUrl,
    sourceProvider: 'X',
    sourcePostId: parsed.postId,
    author: '@' + author.username,
    retrievedAt,
    textExcerpt: snippet,
    truncated: text.length > snippet.length,
    excerptSha256: createHash('sha256').update(snippet, 'utf8').digest('hex'),
    contentState: 'UNTRUSTED_EXTERNAL_CONTEXT',
    claimsStatus: 'REVIEW_REQUIRED',
    rightsStatus: 'REVIEW_REQUIRED',
    publicPublishAllowed: false,
    canAutoContactAuthor: false,
    canAutoFollowAuthor: false,
  });
}
