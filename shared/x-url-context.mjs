/**
 * CAPITAL_AI_X_URL_CONTEXT@1
 * Exact user-supplied public X Post URLs only: no searches, account discovery,
 * timelines, recursive links, follows, replies or publication.
 * Used by the Content Engine URL_CONTEXT source policy AND the server-owned
 * X OAuth read adapter. A URL alone provides no truth or redistribution rights.
 */
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

