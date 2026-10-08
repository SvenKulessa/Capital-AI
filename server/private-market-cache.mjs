// SPDX-License-Identifier: MIT
// Encrypted tenant/connection-bound Valkey cache. No pubsub, shared quotes or JetStream.
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';
const TTL = 30000;
const MAX_BYTES = 65536;
export function createPrivateMarketCache({ env = process.env, getRedis, now = Date.now } = {}) {
  function context({ userId, provider, fingerprint, category }) {
    if (typeof userId !== 'string' || !/^[a-f0-9-]{36}$/i.test(userId)
      || !['kraken', 'massive'].includes(provider) || !/^[a-f0-9]{16,64}$/.test(fingerprint || '')
      || !['KRYPTO', 'AKTIEN', 'INDIZIES', 'FOREX', 'ROHSTOFFE'].includes(category)) {
      throw new Error('PRIVATE_MARKET_CACHE_IDENTITY_INVALID');
    }
    const secret = env.PRIVATE_PROVIDER_QUERY_SIGNING_SECRET;
    if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('PRIVATE_MARKET_CACHE_KEY_REQUIRED');
    const aad = Buffer.from(JSON.stringify(['capital-private-market-cache-v1', userId, provider, fingerprint, category]));
    return { aad, key: Buffer.from(hkdfSync('sha256', secret, aad, 'aes-256-gcm', 32)),
      cacheKey: 'capital:private:market:v1:' + createHmac('sha256', secret).update(aad).digest('hex') };
  }
  function validate(value, identity) {
    return value?.dataScope === 'USER_PRIVATE_MARKET_DATA' && value.provider === identity.provider
      && value.category === identity.category && value.publicDisplayAllowed === false
      && value.redistributionAllowed === false && value.sharedCacheAllowed === false
      && value.jetStreamPublicationAllowed === false && Array.isArray(value.assets) && value.assets.length <= 50
      && Number.isSafeInteger(value.receivedAt) && Number.isSafeInteger(value.expiresAt)
      && value.receivedAt <= now() && value.expiresAt > now() && value.expiresAt <= value.receivedAt + TTL;
  }
  async function read(identity) {
    const cfg = context(identity), redis = getRedis();
    const encrypted = await redis.get(cfg.cacheKey);
    if (encrypted == null) return null;
    try {
      if (typeof encrypted !== 'string' || encrypted.length > MAX_BYTES * 2) throw new Error();
      const parts = JSON.parse(encrypted);
      const iv = Buffer.from(parts.iv, 'base64'), tag = Buffer.from(parts.tag, 'base64');
      if (iv.length !== 12 || tag.length !== 16) throw new Error();
      const decipher = createDecipheriv('aes-256-gcm', cfg.key, iv);
      decipher.setAAD(cfg.aad); decipher.setAuthTag(tag);
      const raw = Buffer.concat([decipher.update(Buffer.from(parts.data, 'base64')), decipher.final()]);
      if (raw.length > MAX_BYTES) throw new Error();
      const value = JSON.parse(raw.toString('utf8'));
      if (!validate(value, identity)) throw new Error();
      return { ...value, cache: 'USER_PRIVATE_HIT' };
    } catch { throw new Error('PRIVATE_MARKET_CACHE_INTEGRITY_FAILED'); }
  }
  async function write(identity, value) {
    const cfg = context(identity), redis = getRedis();
    if (!validate(value, identity)) throw new Error('PRIVATE_MARKET_CACHE_VALUE_INVALID');
    const raw = Buffer.from(JSON.stringify(value));
    if (raw.length > MAX_BYTES) throw new Error('PRIVATE_MARKET_CACHE_VALUE_TOO_LARGE');
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', cfg.key, iv);
    cipher.setAAD(cfg.aad);
    const data = Buffer.concat([cipher.update(raw), cipher.final()]);
    const ttl = value.expiresAt - now();
    if (ttl <= 0) throw new Error('PRIVATE_MARKET_CACHE_VALUE_EXPIRED');
    await redis.set(cfg.cacheKey, JSON.stringify({ iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }), { PX: Math.min(TTL, ttl) });
  }
  async function consumeBudget(identity) {
    const cfg = context(identity), redis = getRedis();
    // Same connection budget across all classes and replicas; no unbounded polling.
    const budgetKey = cfg.cacheKey.slice(0, cfg.cacheKey.lastIndexOf(':') + 1) + 'budget:' +
      createHmac('sha256', env.PRIVATE_PROVIDER_QUERY_SIGNING_SECRET)
        .update(JSON.stringify([identity.userId, identity.provider, identity.fingerprint])).digest('hex');
    const limit = identity.provider === 'massive' ? 5 : 10;
    const granted = await redis.eval(`local count = tonumber(redis.call('GET', KEYS[1]) or '0')
      if count >= tonumber(ARGV[1]) then return 0 end
      local value = redis.call('INCR', KEYS[1])
      if value == 1 then redis.call('PEXPIRE', KEYS[1], 60000) end
      return 1`, { keys: [budgetKey], arguments: [String(limit)] });
    if (granted !== 1) throw new Error('PRIVATE_MARKET_PROVIDER_RATE_LIMITED');
  }
  return Object.freeze({ read, write, consumeBudget });
}
