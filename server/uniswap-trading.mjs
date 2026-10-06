import { boundedJson } from './http-security.mjs';

const MAX_BODY_BYTES = 8 * 1024;
const UNISWAP_QUOTE_URL = 'https://trade-api.gateway.uniswap.org/v1/quote';
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const INTEGER = /^[1-9][0-9]{0,77}$/;

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

function normalizeQuoteRequest(payload) {
  const tokenIn = String(payload?.tokenIn || '');
  const tokenOut = String(payload?.tokenOut || '');
  const swapper = String(payload?.swapper || '');
  const amount = String(payload?.amount || '');
  const tokenInChainId = Number(payload?.tokenInChainId);
  const tokenOutChainId = Number(payload?.tokenOutChainId);
  const slippageTolerance = Number(payload?.slippageTolerance ?? 0.5);

  if (!ADDRESS.test(tokenIn) || !ADDRESS.test(tokenOut) || tokenIn.toLowerCase() === tokenOut.toLowerCase()) return null;
  if (!ADDRESS.test(swapper) || !INTEGER.test(amount)) return null;
  if (!Number.isSafeInteger(tokenInChainId) || tokenInChainId <= 0 ||
      !Number.isSafeInteger(tokenOutChainId) || tokenOutChainId <= 0) return null;
  if (!Number.isFinite(slippageTolerance) || slippageTolerance < 0.01 || slippageTolerance > 5) return null;

  return {
    tokenIn,
    tokenOut,
    tokenInChainId,
    tokenOutChainId,
    type: 'EXACT_INPUT',
    amount,
    swapper,
    slippageTolerance,
  };
}

function boundedText(value, max = 256) {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

function projectedAmount(value) {
  if (!value || typeof value !== 'object') return null;
  const amount = boundedText(value.amount, 96);
  const token = boundedText(value.token, 96);
  if (!amount || !token) return null;
  const projection = { amount, token };
  const minimumAmount = boundedText(value.minimumAmount, 96);
  const maximumAmount = boundedText(value.maximumAmount, 96);
  const recipient = boundedText(value.recipient, 96);
  if (minimumAmount) projection.minimumAmount = minimumAmount;
  if (maximumAmount) projection.maximumAmount = maximumAmount;
  if (recipient && ADDRESS.test(recipient)) projection.recipient = recipient;
  return projection;
}

export function projectUniswapQuote(payload) {
  if (!payload || typeof payload !== 'object' || !payload.quote || typeof payload.quote !== 'object') return null;
  const input = projectedAmount(payload.quote.input);
  const output = projectedAmount(payload.quote.output);
  if (!input || !output) return null;

  const quote = { input, output };
  const quoteId = boundedText(payload.quote.quoteId, 256);
  const gasFeeUSD = boundedText(payload.quote.gasFeeUSD, 64);
  const gasUseEstimate = boundedText(payload.quote.gasUseEstimate, 64);
  const slippage = Number(payload.quote.slippage);
  const priceImpact = Number(payload.quote.priceImpact);
  if (quoteId) quote.quoteId = quoteId;
  if (gasFeeUSD) quote.gasFeeUSD = gasFeeUSD;
  if (gasUseEstimate) quote.gasUseEstimate = gasUseEstimate;
  if (Number.isFinite(slippage) && slippage >= 0 && slippage <= 100) quote.slippage = slippage;
  if (Number.isFinite(priceImpact) && priceImpact >= -100 && priceImpact <= 100) quote.priceImpact = priceImpact;

  return {
    requestId: boundedText(payload.requestId, 256),
    routing: boundedText(payload.routing, 64),
    quote,
  };
}

export function createUniswapTrading({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const apiKey = String(env.UNISWAP_API_KEY || '');
  const quoteEnabled = env.UNISWAP_QUOTE_ENABLED === 'true' && apiKey.length >= 8;

  async function handle(req, res, url, json) {
    if (url.pathname === '/api/market/trading/capabilities' && req.method === 'GET') {
      json(res, 200, {
        schema: 'CAPITAL_AI_TRADING_CAPABILITIES@1',
        venues: {
          krakenSpot: {
            credentialSource: 'USER_PRIVATE_VAULT',
            orderTypes: ['market', 'limit'],
            executionEnabled: false,
          },
          krakenFutures: {
            credentialSource: 'USER_PRIVATE_VAULT',
            instruments: ['futures', 'perpetuals'],
            orderTypes: ['market', 'limit'],
            executionEnabled: false,
          },
          uniswap: {
            quoteEnabled,
            quoteSource: 'UNISWAP_TRADE_API',
            walletSignatureRequired: true,
            executionEnabled: false,
            arbitrageExecutionEligible: false,
          },
        },
      });
      return true;
    }

    if (url.pathname === '/api/market/arbitrage/uniswap/readiness' && req.method === 'GET') {
      json(res, 200, {
        schema: 'CAPITAL_AI_UNISWAP_READINESS@1',
        quoteEnabled,
        executionEnabled: false,
        walletSignatureRequired: true,
        apiKeyConfigured: apiKey.length >= 8,
      });
      return true;
    }

    if (url.pathname !== '/api/market/arbitrage/uniswap/quote') return false;
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }
    if (!quoteEnabled) {
      json(res, 503, { error: 'uniswap_quote_not_enabled' });
      return true;
    }
    if (!auth?.sameOrigin?.(req)) {
      json(res, 403, { error: 'forbidden_origin' });
      return true;
    }
    const user = await auth.verify(req, res);
    if (!user?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return true;
    }

    let quoteRequest;
    try {
      quoteRequest = normalizeQuoteRequest(await readJson(req));
    } catch (error) {
      json(res, error.message === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: 'bad_request' });
      return true;
    }
    if (!quoteRequest) {
      json(res, 400, { error: 'invalid_uniswap_quote_request' });
      return true;
    }

    try {
      const response = await fetchImpl(UNISWAP_QUOTE_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'X-Agent-Info': 'Capital-AI/market-screener',
        },
        body: JSON.stringify(quoteRequest),
        redirect: 'error',
        signal: AbortSignal.timeout(7000),
      });
      const payload = await boundedJson(response);
      const projected = response.ok ? projectUniswapQuote(payload) : null;
      if (!projected) {
        json(res, 502, { error: 'uniswap_quote_rejected' });
        return true;
      }
      json(res, 200, {
        provider: 'uniswap',
        dataScope: 'USER_PRIVATE_TRADING_QUOTE',
        requestId: projected.requestId,
        routing: projected.routing,
        quote: projected.quote,
        executionPayloadStripped: true,
        executionEnabled: false,
        walletSignatureRequired: true,
        arbitrageExecutionEligible: false,
      });
    } catch {
      json(res, 502, { error: 'uniswap_quote_unavailable' });
    }
    return true;
  }

  return { handle };
}
