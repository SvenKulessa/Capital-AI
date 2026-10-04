#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

function tokenFilePath() {
  return process.env.GSC_TOKEN_FILE ?? join(homedir(), '.config', 'google-search-console-mcp', 'tokens.json');
}

function openBrowser(url) {
  let command;
  let args;
  if (process.platform === 'win32') {
    command = 'rundll32';
    args = ['url.dll,FileProtocolHandler', url];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }
  try {
    spawn(command, args, { stdio: 'ignore', detached: true }).unref();
  } catch {
    // The URL is printed to stderr as the manual fallback.
  }
}

async function readOAuthClient(file) {
  const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
  const keys = parsed.installed ?? parsed.web;
  const clientId = keys?.client_id;
  const clientSecret = keys?.client_secret;
  if (!clientId || !clientSecret) {
    throw new Error('OAuth client JSON must contain installed/web client_id and client_secret.');
  }
  return { clientId, clientSecret };
}

async function authorize(clientFile) {
  const { clientId, clientSecret } = await readOAuthClient(clientFile);
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not bind OAuth loopback listener.');
  const redirectUri = `http://127.0.0.1:${address.port}`;

  const authUrl = new URL(AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('scope', READONLY_SCOPE);

  const codePromise = new Promise((resolveCode, rejectCode) => {
    server.on('request', (req, res) => {
      const callback = new URL(req.url ?? '/', redirectUri);
      const oauthError = callback.searchParams.get('error');
      const code = callback.searchParams.get('code');
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      if (oauthError) {
        res.end('Authorization failed. You can close this tab.');
        rejectCode(new Error(`Google OAuth returned: ${oauthError}`));
        return;
      }
      if (!code) {
        res.end('Waiting for the OAuth authorization code.');
        return;
      }
      res.end('Authorized read-only Search Console access. You can close this tab.');
      resolveCode(code);
    });
  });

  console.error(`Open this Google authorization URL if the browser does not open automatically:\n${authUrl}`);
  openBrowser(authUrl.toString());

  let code;
  try {
    code = await codePromise;
  } finally {
    server.close();
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const token = await response.json();
  if (!response.ok) throw new Error(`Google OAuth token exchange failed with HTTP ${response.status}.`);
  if (!token.refresh_token) {
    throw new Error('Google returned no refresh token. Revoke the app grant and authorize again with prompt=consent.');
  }

  const target = tokenFilePath();
  await fs.mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await fs.writeFile(
    target,
    `${JSON.stringify({ clientId, clientSecret, refreshToken: token.refresh_token }, null, 2)}\n`,
    { mode: 0o600 },
  );
  await fs.chmod(target, 0o600);
  console.error(`Saved read-only GSC credentials to ${target}`);
}

const clientFile = process.argv[2] ?? process.env.GSC_OAUTH_CLIENT_FILE;
if (!clientFile) {
  console.error('Usage: node scripts/gsc-auth-readonly.mjs <oauth-client.json>');
  process.exit(2);
}

await authorize(resolve(clientFile));
