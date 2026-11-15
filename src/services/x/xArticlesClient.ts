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
 * - Posts with media after review gate
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

  async createDraftArticle(request: XDraftArticleRequest): Promise<XDraftArticleResponse> {
    const response = await fetch(`${this.baseUrl}/articles/draft`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`X draft article failed (${response.status}): ${errorText}`);
    }
    return response.json() as Promise<XDraftArticleResponse>;
  }

  async uploadImageSimple(imageBuffer: Buffer, mediaType = 'image/jpeg'): Promise<MediaUploadResult> {
    const form = new FormData();
    form.append('media', new Blob([imageBuffer], { type: mediaType }), 'image.jpg');
    form.append('media_category', 'tweet_image');
    form.append('media_type', mediaType);

    const response = await fetch(`${this.baseUrl}/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image upload failed (${response.status}): ${errorText}`);
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
      throw new Error(`INIT failed (${initRes.status}): ${await initRes.text()}`);
    }
    const initData = await initRes.json();
    const mediaId = initData.data.id as string;

    // 2. APPEND chunks
    let segmentIndex = 0;
    for (let offset = 0; offset < totalBytes; offset += chunkSize) {
      const chunk = fileBuffer.subarray(offset, offset + chunkSize);
      const form = new FormData();
      form.append('segment_index', String(segmentIndex));
      form.append('media', new Blob([chunk], { type: 'application/octet-stream' }), `chunk-${segmentIndex}`);

      const appendRes = await fetch(`${this.baseUrl}/media/upload/${mediaId}/append`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: form,
      });
      if (!appendRes.ok) {
        throw new Error(`APPEND segment ${segmentIndex} failed (${appendRes.status}): ${await appendRes.text()}`);
      }
      segmentIndex++;
    }

    // 3. FINALIZE
    const finRes = await fetch(`${this.baseUrl}/media/upload/${mediaId}/finalize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!finRes.ok) {
      throw new Error(`FINALIZE failed (${finRes.status}): ${await finRes.text()}`);
    }
    const finData = await finRes.json();

    // 4. Optional status poll if processing_info present
    let processingState = finData.data?.processing_info?.state as string | undefined;
    if (processingState && processingState !== 'succeeded') {
      processingState = await this.pollMediaStatus(mediaId);
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
      const res = await fetch(`${this.baseUrl}/media/upload?media_id=${mediaId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!res.ok) break;
      const data = await res.json();
      const state = data.data?.processing_info?.state as string | undefined;
      if (state === 'succeeded' || state === 'failed') return state;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return 'timeout';
  }

  async createPostWithMedia(text: string, mediaIds: string[] = []): Promise<{ id: string; text: string }> {
    const body: any = { text };
    if (mediaIds.length > 0) body.media = { media_ids: mediaIds };
    const response = await fetch(`${this.baseUrl}/tweets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Post creation failed (${response.status}): ${await response.text()}`);
    }
    const data = await response.json();
    return { id: data.data.id, text: data.data.text };
  }

  publishArticle(articleId: string): never {
    throw new Error(`PUBLISH_BLOCKED: Article ${articleId} cannot be published via this client. Use X UI after editorial + rights review.`);
  }
}
