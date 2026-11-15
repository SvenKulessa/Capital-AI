/**
 * X OAuth 2.0 Token Refresh helper.
 * Requires offline.access scope on the original token.
 * Refresh tokens are single-use: always persist the new refresh_token.
 *
 * Env vars:
 *   X_CLIENT_ID
 *   X_CLIENT_SECRET (for confidential clients)
 *   X_REFRESH_TOKEN
 */

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope?: string;
}

export async function refreshXAccessToken(): Promise<TokenRefreshResult> {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const refreshToken = process.env.X_REFRESH_TOKEN;

  if (!clientId || !refreshToken) {
    throw new Error('X_CLIENT_ID and X_REFRESH_TOKEN are required for token refresh.');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}
