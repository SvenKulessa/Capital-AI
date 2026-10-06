export function natsConnectionAuth(env = process.env) {
  const user = String(env.NATS_APP_USER || '').trim();
  const pass = String(env.NATS_APP_PASSWORD || '').trim();
  if (user || pass) {
    if (!user || !pass) throw new Error('NATS_SCOPED_CREDENTIALS_INCOMPLETE');
    return { user, pass, mode: 'scoped_user' };
  }
  const token = String(env.NATS_TOKEN || '').trim();
  if (token) return { token, mode: 'legacy_token' };
  throw new Error('NATS_CREDENTIALS_REQUIRED');
}
