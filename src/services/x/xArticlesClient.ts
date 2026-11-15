/**
 * X (Twitter) Articles API Client – Draft creation only.
 * 
 * Status: DRAFT_ONLY. Never calls the publish endpoint.
 * Requires OAuth 2.0 User Context token with tweet.read, tweet.write, users.read.
 * Token must come from environment (X_ACCESS_TOKEN). Never hardcode.
 * 
 * Docs: https://docs.x.com/x-api/articles/create-draft-article
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
    entities?: Array<{
      key: string;
      value: {
        data: Record<string, unknown>;
      };
    }>;
  };
  cover_media?: string;
}

export interface XDraftArticleResponse {
  data: {
    id: string;
    title: string;
  };
}

export class XArticlesClient {
  private readonly baseUrl = 'https://api.x.com/2';
  private readonly accessToken: string;

  constructor(accessToken?: string) {
    const token = accessToken ?? process.env.X_ACCESS_TOKEN;
    if (!token) {
      throw new Error('X_ACCESS_TOKEN is required for draft article creation. Set it in the environment (OAuth 2.0 user context).');
    }
    this.accessToken = token;
  }

  /**
   * Creates a draft Article on X. Does NOT publish it.
   * Returns the draft ID for later manual review / publish via the X UI or a separate approved call.
   */
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
      throw new Error(`X Articles draft creation failed (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<XDraftArticleResponse>;
  }

  /**
   * Explicitly blocked. Publishing requires separate human approval and rights review.
   */
  publishArticle(): never {
    throw new Error('PUBLISH_BLOCKED: Public publishing of X Articles is disabled by policy (DRAFT_ONLY). Use the X UI after editorial review.');
  }
}
