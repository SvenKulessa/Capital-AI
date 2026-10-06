import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { boundedJson } from './http-security.mjs';
import { krakenSignature, nextKrakenNonce } from './user-provider-vault.mjs';

const MAX_BODY_BYTES = 8 * 1024;
const KRAKEN_ADD_ORDER_PATH = '/0/private/AddOrder';
const CONFIRMATION_TTL_MS = 2 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const QUOTE_CURRENCIES = new Set(['USD', 'EUR', 'USDT', 'USDC']);
const ORDER_TYPES = new Set(['market', 'limit']);
const SIDES = new Set(['buy', 'sell']);
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,64}$/;
const PAIR = /^[A-Z0-9/]{5,24}$/;
const DECIMAL = /^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,8})?$/;
const PREVIEW_FIELDS = new Set([
  'idempotencyKey',
  'pair',
  'quoteCurrency',
  'side',
  'orderType',
  'volume',
  'price',
  'riskQuoteAmount',
]);

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
  } catch {
    throw new Error('INVALID_JSON');
  }
}

function fixed8(value) {
  const text = String(value || '').trim();
  if (!DECIMAL.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const units = BigInt(whole) * 100000000n + BigInt((fraction + '00000000').slice(0, 8));
  return units > 0n ? units : null;
}

function decimalFromUnits(units) {
  const whole = units / 100000000n;
  const fraction = String(units % 100000000n).padStart(8, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function configuredMaxQuote(env) {
  return fixed8(env.KRAKEN_DRY_RUN_MAX_QUOTE_NOTIONAL || '1000');
}

function normalizeOrder(payload, maxQuoteUnits) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  if (Object.keys(payload).some(key => !PREVIEW_FIELDS.has(key))) return null;

  const idempotencyKey = String(payload.idempotencyKey || '').trim();
  const pair = String(payload.pair || '').trim().toUpperCase();
  const quoteCurrency = String(payload.quoteCurrency || '').trim().toUpperCase();
  const side = String(payload.side || '').trim().toLowerCase();
  const orderType = String(payload.orderType || '').trim().toLowerCase();
  const volume = String(payload.volume || '').trim();
  const price = payload.price == null ? null : String(payload.price).trim();
  const riskQuoteAmount = String(payload.riskQuoteAmount || '').trim();

  if (!IDEMPOTENCY_KEY.test(idempotencyKey) ||
      !PAIR.test(pair) ||
      !QUOTE_CURRENCIES.has(quoteCurrency) ||
      !SIDES.has(side) ||
      !ORDER_TYPES.has(orderType)) return null;

  const compactPair = pair.replaceAll('/', '');
  if (!compactPair.endsWith(quoteCurrency)) return null;

  const volumeUnits = fixed8(volume);
  const riskQuoteUnits = fixed8(riskQuoteAmount);
  if (!volumeUnits || !riskQuoteUnits || !maxQuoteUnits || riskQuoteUnits > maxQuoteUnits) return null;

  let priceUnits = null;
  let limitNotionalUnits = null;
  if (orderType === 'limit') {
    priceUnits = fixed8(price);
    if (!priceUnits) return null;
    limitNotionalUnits = (volumeUnits * priceUnits) / 100000000n;
    if (limitNotionalUnits > riskQuoteUnits || limitNotionalUnits > maxQuoteUnits) return null;
  } else if (price !== null && price !== '') {
    return null;
  }

  return {
    idempotencyKey,
    order: {
      pair,
      quoteCurrency,
      side,
      orderType,
      volume,
      ...(orderType === 'limit' ? { price } : {}),
      riskQuoteAmount,
    },
    risk: {
      decision: 'PASS_DRY_RUN_ONLY',
      liveExecutionEligible: false,
      quoteCurrency,
      configuredMaxQuoteNotional: decimalFromUnits(maxQuoteUnits),
      requestedRiskQuoteAmount: decimalFromUnits(riskQuoteUnits),
      calculatedLimitNotional: limitNotionalUnits === null ? null : decimalFromUnits(limitNotionalUnits),
      marketPriceBounded: orderType === 'limit',
      providerValidationRequired: true,
      persistentIdempotencyReady: false,
      persistentAuditReady: false,
    },
  };
}

function orderDigest(userId, normalized) {
  return createHash('sha256')
    .update('capital-ai/kraken-spot-dry-run/v1\0')
    .update(userId)
    .update('\0')
    .update(normalized.idempotencyKey)
    .update('\0')
    .update(JSON.stringify(normalized.order))
    .digest('hex');
}

function actorRef(userId) {
  return 'user:' + createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

function confirmationToken(secret, userId, digest, expiresAt) {
  const signature = createHmac('sha256', secret)
    .update(`${userId}\0${digest}\0${expiresAt}`)
    .digest('base64url');
  return `${expiresAt}.${digest}.${signature}`;
}

function confirmationValid(secret, userId, digest, token, nowMs) {
  const [expiresText, tokenDigest, supplied] = String(token || '').split('.');
  if (!/^\d{13}$/.test(expiresText) || !/^[0-9a-f]{64}$/.test(tokenDigest) || !supplied) return false;
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) ||
      expiresAt <= nowMs ||
      expiresAt - nowMs > CONFIRMATION_TTL_MS + 1000 ||
      tokenDigest !== digest) return false;
  const expected = createHmac('sha256', secret)
    .update(`${userId}\0${digest}\0${expiresAt}`)
    .digest('base64url');
  if (expected.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

function clientOrderId(userId, idempotencyKey) {
  return 'ca-' + createHash('sha256')
    .update(userId)
    .update('\0')
    .update(idempotencyKey)
    .digest('hex')
    .slice(0, 15);
}

function projectedProviderErrors(payload, status) {
  const errors = Array.isArray(payload?.error)
    ? payload.error.flat(2).filter(value => typeof value === 'string').map(value => value.slice(0, 160)).slice(0, 8)
    : [];
  return errors.length ? errors : [`HTTP_${status}`];
}

export function createKrakenOrderDryRun({
  env = process.env,
  fetchImpl = fetch,
  auth,
  vault,
  audit = () => {},
  now = () => Date.now(),
} = {}) {
  const confirmationSecret = String(env.TRADING_CONFIRMATION_SECRET || '');
  const maxQuoteUnits = configuredMaxQuote(env);
  const configured = confirmationSecret.length >= 32 && maxQuoteUnits !== null;
  const idempotency = new Map();

  function prune(nowMs) {
    for (const [key, value] of idempotency) {
      if (value.expiresAt <= nowMs) idempotency.delete(key);
    }
    while (idempotency.size > 1000) {
      const oldest = idempotency.keys().next().value;
      if (oldest === undefined) break;
      idempotency.delete(oldest);
    }
  }

  function auditEvent(eventType, userId, digest, requestId, result, metadata = {}) {
    audit({
      eventType,
      requestId,
      actorRef: actorRef(userId),
      domain: 'MARKET',
      authorizationDecision: 'USER_CONFIRMED_DRY_RUN',
      sanitizedActionHash: digest,
      result,
      metadata: {
        provider: 'kraken',
        venue: 'spot',
        mode: 'validate_only',
        liveExecution: false,
        ...metadata,
      },
    });
  }

  async function requireUser(req, res, json) {
    if (!auth?.sameOrigin?.(req)) {
      json(res, 403, { error: 'forbidden_origin' });
      return null;
    }
    const user = await auth.verify(req, res);
    if (!user?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return null;
    }
    return user;
  }

  async function parseOrder(req, res, json, includeToken = false) {
    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      json(res, error.message === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: 'bad_request' });
      return null;
    }
    const confirmation = includeToken ? String(body.confirmationToken || '') : null;
    if (includeToken) delete body.confirmationToken;
    const normalized = normalizeOrder(body, maxQuoteUnits);
    if (!normalized) {
      json(res, 400, { error: 'invalid_or_risky_order_request' });
      return null;
    }
    return { normalized, confirmation };
  }

  async function providerValidate(userId, normalized) {
    const state = await vault?.readKrakenSpotTradingCredential?.(userId);
    if (!state?.credentials?.apiKey || !state?.credentials?.apiSecret || state.capabilities?.orderCreate !== true) {
      const error = new Error('KRAKEN_SPOT_ORDER_CREATE_NOT_AUTHORIZED');
      error.code = 'KRAKEN_SPOT_ORDER_CREATE_NOT_AUTHORIZED';
      throw error;
    }

    const nonce = nextKrakenNonce();
    const deadline = new Date(now() + 10_000).toISOString();
    const form = {
      nonce,
      ordertype: normalized.order.orderType,
      type: normalized.order.side,
      volume: normalized.order.volume,
      pair: normalized.order.pair,
      cl_ord_id: clientOrderId(userId, normalized.idempotencyKey),
      deadline,
      validate: 'true',
    };
    if (normalized.order.orderType === 'limit') form.price = normalized.order.price;

    const body = new URLSearchParams(form).toString();
    const signature = krakenSignature(KRAKEN_ADD_ORDER_PATH, form, state.credentials.apiSecret);
    const response = await fetchImpl(new URL(KRAKEN_ADD_ORDER_PATH, 'https://api.kraken.com'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'API-Key': state.credentials.apiKey,
        'API-Sign': signature,
      },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(7000),
    });
    const payload = await boundedJson(response);
    if (!response.ok || !Array.isArray(payload?.error) || payload.error.length > 0 ||
        !payload?.result || typeof payload.result !== 'object') {
      const error = new Error('KRAKEN_SPOT_DRY_RUN_REJECTED');
      error.code = 'KRAKEN_SPOT_DRY_RUN_REJECTED';
      error.providerErrors = projectedProviderErrors(payload, response.status);
      throw error;
    }
    return {
      providerValidated: true,
      providerMode: 'validate_only',
      liveExecution: false,
      clientOrderId: form.cl_ord_id,
      providerDescription: typeof payload.result?.descr?.order === 'string'
        ? payload.result.descr.order.slice(0, 512)
        : null,
    };
  }

  async function handle(req, res, url, json, requestId = null) {
    if (url.pathname === '/api/market/trading/kraken/spot/readiness' && req.method === 'GET') {
      json(res, 200, {
        schema: 'CAPITAL_AI_KRAKEN_SPOT_ORDER_DRY_RUN@1',
        configured,
        previewEnabled: configured,
        providerValidationEnabled: configured,
        executionMode: 'KRAKEN_VALIDATE_ONLY',
        liveExecutionEnabled: false,
        persistentIdempotencyReady: false,
        persistentAuditReady: false,
        futuresExecutionEnabled: false,
      });
      return true;
    }

    if (url.pathname === '/api/market/trading/kraken/futures/readiness' && req.method === 'GET') {
      json(res, 200, {
        schema: 'CAPITAL_AI_KRAKEN_FUTURES_EXECUTION_READINESS@1',
        credentialCapabilitySupported: true,
        dryRunEnabled: false,
        liveExecutionEnabled: false,
        blocker: 'SEPARATE_FUTURES_RISK_IDEMPOTENCY_AUDIT_GATE_REQUIRED',
      });
      return true;
    }

    const previewPath = '/api/market/trading/kraken/spot/preview';
    const confirmPath = '/api/market/trading/kraken/spot/confirm';
    if (url.pathname !== previewPath && url.pathname !== confirmPath) return false;

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }
    if (!configured) {
      json(res, 503, { error: 'kraken_order_dry_run_not_configured' });
      return true;
    }

    const user = await requireUser(req, res, json);
    if (!user) return true;
    const parsed = await parseOrder(req, res, json, url.pathname === confirmPath);
    if (!parsed) return true;

    const digest = orderDigest(user.userId, parsed.normalized);
    if (url.pathname === previewPath) {
      const expiresAt = now() + CONFIRMATION_TTL_MS;
      auditEvent('market.kraken.spot.order_preview', user.userId, digest, requestId, 'PREVIEWED', {
        orderType: parsed.normalized.order.orderType,
        side: parsed.normalized.order.side,
        pair: parsed.normalized.order.pair,
      });
      json(res, 200, {
        schema: 'CAPITAL_AI_KRAKEN_SPOT_ORDER_PREVIEW@1',
        order: parsed.normalized.order,
        risk: parsed.normalized.risk,
        orderDigest: digest,
        confirmationExpiresAt: new Date(expiresAt).toISOString(),
        confirmationToken: confirmationToken(confirmationSecret, user.userId, digest, expiresAt),
        next: 'CONFIRM_FOR_PROVIDER_VALIDATE_ONLY',
        liveExecutionEnabled: false,
      });
      return true;
    }

    const nowMs = now();
    if (!confirmationValid(confirmationSecret, user.userId, digest, parsed.confirmation, nowMs)) {
      auditEvent('market.kraken.spot.order_confirmation', user.userId, digest, requestId, 'DENIED', {
        reason: 'INVALID_OR_EXPIRED_CONFIRMATION',
      });
      json(res, 409, { error: 'invalid_or_expired_order_confirmation' });
      return true;
    }

    prune(nowMs);
    const idempotencyKey = `${user.userId}:${parsed.normalized.idempotencyKey}`;
    const existing = idempotency.get(idempotencyKey);
    if (existing) {
      if (existing.digest !== digest) {
        json(res, 409, { error: 'idempotency_key_conflict' });
        return true;
      }
      if (existing.result) {
        auditEvent('market.kraken.spot.order_dry_run', user.userId, digest, requestId, 'IDEMPOTENT_REPLAY');
        json(res, 200, { ...existing.result, idempotentReplay: true });
        return true;
      }
      json(res, 409, { error: 'idempotency_request_in_progress' });
      return true;
    }

    idempotency.set(idempotencyKey, { digest, expiresAt: nowMs + IDEMPOTENCY_TTL_MS, result: null });
    try {
      const provider = await providerValidate(user.userId, parsed.normalized);
      const result = {
        schema: 'CAPITAL_AI_KRAKEN_SPOT_ORDER_DRY_RUN_RESULT@1',
        status: 'VALIDATED_NOT_SUBMITTED',
        orderDigest: digest,
        risk: parsed.normalized.risk,
        provider,
        idempotencyScope: 'PROCESS_LOCAL_DRY_RUN_ONLY',
        persistentIdempotencyReady: false,
        persistentAuditReady: false,
        liveExecutionEnabled: false,
      };
      idempotency.set(idempotencyKey, { digest, expiresAt: nowMs + IDEMPOTENCY_TTL_MS, result });
      auditEvent('market.kraken.spot.order_dry_run', user.userId, digest, requestId, 'VALIDATED_NOT_SUBMITTED', {
        orderType: parsed.normalized.order.orderType,
        side: parsed.normalized.order.side,
        pair: parsed.normalized.order.pair,
      });
      json(res, 200, result);
    } catch (error) {
      idempotency.delete(idempotencyKey);
      const code = typeof error?.code === 'string' ? error.code : 'KRAKEN_SPOT_DRY_RUN_UNAVAILABLE';
      auditEvent('market.kraken.spot.order_dry_run', user.userId, digest, requestId, 'REJECTED', { code });
      if (code === 'KRAKEN_SPOT_ORDER_CREATE_NOT_AUTHORIZED' ||
          code === 'KRAKEN_FUNDING_OR_WITHDRAWAL_PERMISSIONS_FORBIDDEN' ||
          code === 'KRAKEN_SPOT_CONNECTION_NOT_FOUND') {
        json(res, 403, { error: 'kraken_spot_trading_not_authorized', code });
        return true;
      }
      if (code === 'KRAKEN_SPOT_DRY_RUN_REJECTED') {
        json(res, 422, { error: 'kraken_spot_dry_run_rejected', providerErrors: error.providerErrors || [] });
        return true;
      }
      json(res, 503, { error: 'kraken_spot_dry_run_unavailable', code });
    }
    return true;
  }

  return { handle };
}
