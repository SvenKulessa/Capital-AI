// CAPITAL_AI_SOCIAL_PROVIDER_PUBLISH@1
// Server-only provider submissions. No HTTP route is registered here.
// Every provider remains disabled unless explicit server-side switches are set.
const MAX_MEDIA_BYTES_DEFAULT = 128 * 1024 * 1024;

function fail(code, attempted = false) {
  const error = new Error(code);
  error.providerAttempted = attempted;
  throw error;
}
function assert(ok, code) { if (!ok) fail(code, false); }
function enabled(env, key) { return env?.[key] === 'true'; }
function token(value) {
  assert(typeof value === 'string' && value.length >= 8 && value.length <= 8192,
    'SOCIAL_PROVIDER_ACCESS_TOKEN_REQUIRED');
  return value;
}
function boundedText(value, max, code) {
  assert(typeof value === 'string' && value.trim().length > 0 && value.length <= max, code);
  return value.trim();
}
function mediaBuffer(value, env) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value ?? []);
  const configured = Number(env?.SOCIAL_PROVIDER_MAX_MEDIA_BYTES);
  const max = Number.isFinite(configured) && configured > 0
    ? Math.min(configured, 512 * 1024 * 1024) : MAX_MEDIA_BYTES_DEFAULT;
  assert(bytes.length > 0 && bytes.length <= max, 'SOCIAL_PROVIDER_MEDIA_INVALID');
  return bytes;
}
async function json(response) {
  const body = await response.text();
  if (body.length > 131072) fail('SOCIAL_PROVIDER_RESPONSE_TOO_LARGE', true);
  try { return body ? JSON.parse(body) : {}; }
  catch { fail('SOCIAL_PROVIDER_INVALID_JSON', true); }
}
async function fetchAttempt(fetchImpl, url, init) {
  try {
    return await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(30_000), ...init });
  } catch {
    fail('SOCIAL_PROVIDER_NETWORK_AMBIGUOUS', true);
  }
}
function assertProviderEnabled(env, channel) {
  assert(enabled(env, 'SOCIAL_PROVIDER_PUBLISH_ENABLED'), 'SOCIAL_PROVIDER_PUBLISH_DISABLED');
  assert(enabled(env, `SOCIAL_${channel}_PUBLISH_ENABLED`),
    'SOCIAL_PROVIDER_CHANNEL_PUBLISH_DISABLED');
}
function trustedAssetUrl(value, env) {
  let url;
  try { url = new URL(value); } catch { fail('SOCIAL_PROVIDER_MEDIA_URL_INVALID'); }
  assert(url.protocol === 'https:' && !url.username && !url.password,
    'SOCIAL_PROVIDER_MEDIA_URL_INVALID');
  const hosts = String(env?.SOCIAL_MEDIA_ASSET_HOST_ALLOWLIST ?? '')
    .split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  assert(hosts.includes(url.hostname.toLowerCase()), 'SOCIAL_PROVIDER_MEDIA_URL_HOST_DENIED');
  return url.toString();
}
function metaBase(env) {
  const version = String(env?.SOCIAL_META_GRAPH_API_VERSION ?? '');
  assert(/^v\d+\.\d+$/.test(version), 'SOCIAL_META_GRAPH_VERSION_REQUIRED');
  return `https://graph.facebook.com/${version}`;
}
function receipt(channel, providerDeliveryId, evidenceRef) {
  assert(typeof providerDeliveryId === 'string' && providerDeliveryId.length > 0
    && providerDeliveryId.length <= 200, 'SOCIAL_PROVIDER_DELIVERY_ID_REQUIRED');
  return Object.freeze({ channel, providerDeliveryId, evidenceRef });
}

function youtubeMultipart(metadata, bytes) {
  const boundary = 'capital_ai_social_upload_v1';
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: video/*\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { body: Buffer.concat([head, bytes, tail]), boundary };
}

export function createSocialProviderPublishTransport({ env = process.env, fetchImpl = fetch } = {}) {
  assert(typeof fetchImpl === 'function', 'SOCIAL_PROVIDER_FETCH_REQUIRED');

  async function youtube(input) {
    assertProviderEnabled(env, 'YOUTUBE');
    const accessToken = token(input?.accessToken);
    const bytes = mediaBuffer(input?.mediaBytes, env);
    const title = boundedText(input?.metadata?.title, 100, 'SOCIAL_YOUTUBE_TITLE_REQUIRED');
    const description = typeof input?.metadata?.description === 'string'
      ? input.metadata.description.slice(0, 5000) : '';
    const requestedVisibility = input?.metadata?.visibility ?? 'private';
    assert(['private', 'unlisted', 'public'].includes(requestedVisibility),
      'SOCIAL_YOUTUBE_VISIBILITY_INVALID');
    if (requestedVisibility !== 'private') {
      assert(enabled(env, 'SOCIAL_YOUTUBE_PUBLIC_UPLOAD_APPROVED'),
        'SOCIAL_YOUTUBE_PUBLIC_UPLOAD_NOT_APPROVED');
    }
    const tags = Array.isArray(input?.metadata?.hashtags)
      ? input.metadata.hashtags.map(String).filter(Boolean).slice(0, 50) : [];
    const payload = youtubeMultipart({
      snippet: { title, description, ...(tags.length ? { tags } : {}) },
      status: { privacyStatus: requestedVisibility },
    }, bytes);
    const response = await fetchAttempt(fetchImpl,
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${payload.boundary}`,
        },
        body: payload.body,
      });
    const data = await json(response);
    if (!response.ok || typeof data.id !== 'string') fail('SOCIAL_YOUTUBE_SUBMISSION_REJECTED', true);
    return receipt('YOUTUBE', data.id, `provider-submit://youtube/${data.id}`);
  }

  async function tiktok(input) {
    assertProviderEnabled(env, 'TIKTOK');
    const accessToken = token(input?.accessToken);
    assert(input?.metadata?.creatorConsent === true, 'SOCIAL_TIKTOK_CREATOR_CONSENT_REQUIRED');
    const bytes = mediaBuffer(input?.mediaBytes, env);
    assert(bytes.length <= 64 * 1024 * 1024, 'SOCIAL_TIKTOK_SINGLE_CHUNK_LIMIT');
    const privacyLevel = boundedText(input?.metadata?.privacyLevel, 64,
      'SOCIAL_TIKTOK_PRIVACY_REQUIRED');
    const creatorRes = await fetchAttempt(fetchImpl,
      'https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
        body: '{}',
      });
    const creator = await json(creatorRes);
    const options = creator?.data?.privacy_level_options;
    if (!creatorRes.ok || creator?.error?.code !== 'ok' || !Array.isArray(options)
      || !options.includes(privacyLevel)) fail('SOCIAL_TIKTOK_CREATOR_INFO_REJECTED', true);

    const title = typeof input?.metadata?.caption === 'string'
      ? input.metadata.caption.slice(0, 2200) : '';
    const initRes = await fetchAttempt(fetchImpl,
      'https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({
          post_info: {
            title,
            privacy_level: privacyLevel,
            brand_organic_toggle: input?.metadata?.brandOrganic === true,
            is_aigc: input?.metadata?.aiGenerated === true,
            disable_comment: input?.metadata?.disableComment === true,
            disable_duet: input?.metadata?.disableDuet === true,
            disable_stitch: input?.metadata?.disableStitch === true,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: bytes.length,
            chunk_size: bytes.length,
            total_chunk_count: 1,
          },
        }),
      });
    const init = await json(initRes);
    const publishId = init?.data?.publish_id;
    let uploadUrl;
    try { uploadUrl = new URL(init?.data?.upload_url); } catch { uploadUrl = null; }
    if (!initRes.ok || init?.error?.code !== 'ok' || typeof publishId !== 'string'
      || !uploadUrl || uploadUrl.protocol !== 'https:'
      || uploadUrl.hostname !== 'open-upload.tiktokapis.com') {
      fail('SOCIAL_TIKTOK_INIT_REJECTED', true);
    }

    const uploadRes = await fetchAttempt(fetchImpl, uploadUrl.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(bytes.length),
        'Content-Range': `bytes 0-${bytes.length - 1}/${bytes.length}`,
      },
      body: bytes,
    });
    if (uploadRes.status !== 201) fail('SOCIAL_TIKTOK_UPLOAD_NOT_COMPLETE', true);
    return receipt('TIKTOK', publishId, `provider-submit://tiktok/${publishId}`);
  }

  async function instagram(input) {
    assertProviderEnabled(env, 'INSTAGRAM');
    const accessToken = token(input?.accessToken);
    const accountId = boundedText(input?.account?.externalAccountId, 200,
      'SOCIAL_INSTAGRAM_ACCOUNT_REQUIRED');
    const mediaUrl = trustedAssetUrl(input?.providerMediaUrl, env);
    const response = await fetchAttempt(fetchImpl, `${metaBase(env)}/${encodeURIComponent(accountId)}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: mediaUrl,
        caption: typeof input?.metadata?.caption === 'string' ? input.metadata.caption.slice(0, 2200) : '',
      }),
    });
    const data = await json(response);
    if (!response.ok || typeof data.id !== 'string') fail('SOCIAL_INSTAGRAM_CONTAINER_REJECTED', true);
    return receipt('INSTAGRAM', data.id, `provider-submit://instagram-container/${data.id}`);
  }

  async function instagramFinalize(input) {
    assertProviderEnabled(env, 'INSTAGRAM');
    const accessToken = token(input?.accessToken);
    const accountId = boundedText(input?.account?.externalAccountId, 200,
      'SOCIAL_INSTAGRAM_ACCOUNT_REQUIRED');
    const containerId = boundedText(input?.containerId, 200, 'SOCIAL_INSTAGRAM_CONTAINER_REQUIRED');
    const statusRes = await fetchAttempt(fetchImpl,
      `${metaBase(env)}/${encodeURIComponent(containerId)}?fields=status_code`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    const status = await json(statusRes);
    if (!statusRes.ok) fail('SOCIAL_INSTAGRAM_CONTAINER_STATUS_REJECTED', true);
    if (status.status_code !== 'FINISHED') {
      return Object.freeze({ channel: 'INSTAGRAM', providerDeliveryId: containerId,
        evidenceRef: `provider-submit://instagram-container/${containerId}`, pending: true });
    }
    const publishRes = await fetchAttempt(fetchImpl,
      `${metaBase(env)}/${encodeURIComponent(accountId)}/media_publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerId }),
      });
    const published = await json(publishRes);
    if (!publishRes.ok || typeof published.id !== 'string') {
      fail('SOCIAL_INSTAGRAM_PUBLISH_REJECTED', true);
    }
    return receipt('INSTAGRAM', published.id, `provider-submit://instagram/${published.id}`);
  }

  async function facebook(input) {
    assertProviderEnabled(env, 'FACEBOOK');
    const accessToken = token(input?.accessToken);
    const pageId = boundedText(input?.account?.externalAccountId, 200, 'SOCIAL_FACEBOOK_PAGE_REQUIRED');
    const mediaUrl = input?.providerMediaUrl ? trustedAssetUrl(input.providerMediaUrl, env) : null;
    const endpoint = mediaUrl ? 'videos' : 'feed';
    const body = mediaUrl
      ? { file_url: mediaUrl, description: typeof input?.metadata?.caption === 'string' ? input.metadata.caption : '' }
      : { message: boundedText(input?.metadata?.caption, 60000, 'SOCIAL_FACEBOOK_MESSAGE_REQUIRED') };
    const response = await fetchAttempt(fetchImpl,
      `${metaBase(env)}/${encodeURIComponent(pageId)}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const data = await json(response);
    if (!response.ok || typeof data.id !== 'string') fail('SOCIAL_FACEBOOK_SUBMISSION_REJECTED', true);
    return receipt('FACEBOOK', data.id, `provider-submit://facebook/${data.id}`);
  }

  async function x(input) {
    assertProviderEnabled(env, 'X');
    assert(enabled(env, 'SOCIAL_X_PAID_WRITE_APPROVED'), 'SOCIAL_X_PAID_WRITE_NOT_APPROVED');
    const accessToken = token(input?.accessToken);
    const text = boundedText(input?.metadata?.caption, 280, 'SOCIAL_X_TEXT_REQUIRED');
    const response = await fetchAttempt(fetchImpl, 'https://api.x.com/2/tweets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await json(response);
    if (!response.ok || typeof data?.data?.id !== 'string') fail('SOCIAL_X_SUBMISSION_REJECTED', true);
    return receipt('X', data.data.id, `provider-submit://x/${data.data.id}`);
  }

  const providers = Object.freeze({ YOUTUBE: youtube, TIKTOK: tiktok, INSTAGRAM: instagram,
    FACEBOOK: facebook, X: x });
  async function submit(input) {
    const channel = input?.channel;
    assert(typeof channel === 'string' && Object.hasOwn(providers, channel),
      'SOCIAL_PROVIDER_CHANNEL_UNSUPPORTED');
    return providers[channel](input);
  }

  return Object.freeze({ submit, instagramFinalize });
}
