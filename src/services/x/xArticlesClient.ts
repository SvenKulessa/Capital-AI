/**
 * X (Twitter) Articles & Posts API Client – Draft-first, full media support.
 *
 * Status: DRAFT_ONLY by default. All write paths require explicit review gate (--confirm or equivalent).
 * Requires OAuth 2.0 User Context token with scopes:
 *   tweet.read, tweet.write, users.read, media.write
 * (offline.access recommended for refresh). Token from X_ACCESS_TOKEN. Never hardcode.
 *
 * Supports:
 * - Draft Articles (POST /2/articles/draft)
 * - Simple image upload
 * - Full chunked video/GIF upload (initialize → append → finalize → status poll)
 * - Public posting intentionally blocked until a separately authorized publish integration
 *
 * Docs: https://docs.x.com/x-api/media/quickstart/media-upload-chunked
 */

export interface XDraftArticleRequest {
  title: string;
  content_state: {
    blocks: Array<{
      text: string;
      type?: string;
      key?: string;
      data?: Record<string, unknown>;
    }>;
    entities?: Array<{ key: string; value: { data: Record<string, unknown> } }>;
  };
  cover_media?: string;
}

export interface XDraftArticleResponse {
  data: { id: string; title: string };
}

export interface MediaUploadResult {
  mediaId: string;
  mediaKey?: string;
  expiresAfterSecs?: number;
  processingState?: string;
}

export class XArticlesClient {
  private readonly baseUrl = 'https://api.x.com/2';
  private readonly accessToken: string;

  constructor(accessToken?: string) {
    const token = accessToken ?? process.env.X_ACCESS_TOKEN;
    if (!token) {
      throw new Error('X_ACCESS_TOKEN is required. Scopes: tweet.read tweet.write users.read media.write');
    }
    this.accessToken = token;
  }

  private requireDraftApiEnabled(): void {
    if (process.env.SOCIAL_X_GROWTH_PILOT_ENABLED === 'true') throw new Error('X_GROWTH_UNBUDGETED_LANE_DISABLED');
    if (process.env.X_DRAFT_API_ENABLED !== 'true') {
      throw new Error('X_DRAFT_API_DISABLED: external X draft and media writes require separate authorization.');
    }
  }

  async createDraftArticle(request: XDraftArticleRequest): Promise<XDraftArticleResponse> {
    this.requireDraftApiEnabled();
    const response = await fetch(`${this.baseUrl}/articles/draft`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {

      throw new Error(`X draft article failed (${response.status})`);
    }
    return response.json() as Promise<XDraftArticleResponse>;
  }

  async uploadImageSimple(imageBuffer: Buffer, mediaType = 'image/jpeg'): Promise<MediaUploadResult> {
    this.requireDraftApiEnabled();
    const form = new FormData();
    form.append('media', new Blob([Uint8Array.from(imageBuffer)], { type: mediaType }), 'image.jpg');
    form.append('media_category', 'tweet_image');
    form.append('media_type', mediaType);

    const response = await fetch(`${this.baseUrl}/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
    });
    if (!response.ok) {

      throw new Error(`Image upload failed (${response.status})`);
    }
    const data = await response.json();
    return {
      mediaId: data.data?.id,
      mediaKey: data.data?.media_key,
      expiresAfterSecs: data.data?.expires_after_secs,
    };
  }

  /**
   * Full chunked upload for video or large media.
   * mediaCategory: 'tweet_video' | 'tweet_gif' | 'amplify_video'
   */
  async uploadMediaChunked(
    fileBuffer: Buffer,
    mediaType: string,
    mediaCategory: 'tweet_video' | 'tweet_gif' | 'amplify_video' = 'tweet_video',
    chunkSize = 4 * 1024 * 1024,
  ): Promise<MediaUploadResult> {
    this.requireDraftApiEnabled();
    if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 5 * 1024 * 1024 || fileBuffer.length < 1) {
      throw new Error('MEDIA_INPUT_INVALID: media bytes and chunk size must be valid.');
    }
    const totalBytes = fileBuffer.length;

    // 1. INITIALIZE
    const initRes = await fetch(`${this.baseUrl}/media/upload/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: mediaType,
        total_bytes: totalBytes,
        media_category: mediaCategory,
      }),
    });
    if (!initRes.ok) {

      throw new Error(`INIT failed (${initRes.status})`);
    }
    const initData = await initRes.json();
    const mediaId = initData.data?.id as string;
    if (!mediaId) throw new Error('INIT returned no media id');

    // 2. APPEND chunks
    let segmentIndex = 0;
    for (let offset = 0; offset < totalBytes; offset += chunkSize) {
      const chunk = fileBuffer.subarray(offset, offset + chunkSize);
      const form = new FormData();
      form.append('segment_index', String(segmentIndex));
      form.append('media', new Blob([Uint8Array.from(chunk)], { type: 'application/octet-stream' }), `chunk-${segmentIndex}`);

      const appendRes = await fetch(`${this.baseUrl}/media/upload/${mediaId}/append`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: form,
      });
      if (!appendRes.ok) {

        throw new Error(`APPEND segment ${segmentIndex} failed (${appendRes.status})`);
      }
      segmentIndex++;
    }

    // 3. FINALIZE
    const finRes = await fetch(`${this.baseUrl}/media/upload/${mediaId}/finalize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!finRes.ok) {

      throw new Error(`FINALIZE failed (${finRes.status})`);
    }
    const finData = await finRes.json();

    // 4. Status poll if needed
    let processingState = finData.data?.processing_info?.state as string | undefined;
    if (processingState && processingState !== 'succeeded') {
      processingState = await this.pollMediaStatus(mediaId);
      if (processingState !== 'succeeded') throw new Error(`MEDIA_PROCESSING_${processingState.toUpperCase()}`);
    }

    return {
      mediaId,
      mediaKey: finData.data?.media_key,
      expiresAfterSecs: finData.data?.expires_after_secs,
      processingState: processingState ?? 'succeeded',
    };
  }

  private async pollMediaStatus(mediaId: string, maxAttempts = 30): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const url = `${this.baseUrl}/media/upload?command=STATUS&media_id=${mediaId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!res.ok) {

        console.error(`STATUS poll failed (${res.status})`);
        break;
      }
      const data = await res.json();
      const state = data.data?.processing_info?.state as string | undefined;
      const checkAfter = data.data?.processing_info?.check_after_secs as number | undefined;

      if (state === 'succeeded' || state === 'failed') return state;

      const waitMs = (checkAfter && checkAfter > 0 ? checkAfter : 2) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
    }
    return 'timeout';
  }

  async createPostWithMedia(_text: string, _mediaIds: string[] = []): Promise<{ id: string; text: string }> {
    throw new Error('PUBLISH_BLOCKED: public X posts are not enabled in this draft-only integration.');
  }

  publishArticle(articleId: string): never {
    throw new Error(`PUBLISH_BLOCKED: Article ${articleId} cannot be published via this client. Use X UI after editorial + rights review.`);
  }
}
