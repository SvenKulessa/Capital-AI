/**
 * X (Twitter) Articles & Posts API Client – Draft-first, media-capable.
 *
 * Status: DRAFT_ONLY by default. Publish is gated and blocked unless explicitly approved.
 * Requires OAuth 2.0 User Context token with tweet.read, tweet.write, users.read, media.write.
 * Token from X_ACCESS_TOKEN. Never hardcode.
 *
 * Supports:
 * - Draft Articles (POST /2/articles/draft)
 * - Media upload (simple for images; chunked path noted for video)
 * - Posts with media (POST /2/tweets) after review gate
 *
 * Docs: https://docs.x.com/x-api/articles/create-draft-article
 *       https://docs.x.com/x-api/media/introduction
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
}

export class XArticlesClient {
  private readonly baseUrl = 'https://api.x.com/2';
  private readonly accessToken: string;

  constructor(accessToken?: string) {
    const token = accessToken ?? process.env.X_ACCESS_TOKEN;
    if (!token) {
      throw new Error('X_ACCESS_TOKEN is required. Set OAuth 2.0 user context token (scopes: tweet.read, tweet.write, users.read, media.write).');
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

  async uploadImageSimple(imageBuffer: Buffer, mediaType: string = 'image/jpeg'): Promise<MediaUploadResult> {
    const response = await fetch(`${this.baseUrl}/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media: imageBuffer.toString('base64'),
        media_category: 'tweet_image',
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Media upload failed (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    return {
      mediaId: data.data?.id,
      mediaKey: data.data?.media_key,
      expiresAfterSecs: data.data?.expires_after_secs,
    };
  }

  async createPostWithMedia(text: string, mediaIds: string[] = []): Promise<{ id: string; text: string }> {
    const body: any = { text };
    if (mediaIds.length > 0) {
      body.media = { media_ids: mediaIds };
    }
    const response = await fetch(`${this.baseUrl}/tweets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Post creation failed (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    return { id: data.data.id, text: data.data.text };
  }

  publishArticle(articleId: string): never {
    throw new Error(`PUBLISH_BLOCKED: Article ${articleId} cannot be published via this client. Use X UI or an approved publish path after editorial + rights review.`);
  }
}
