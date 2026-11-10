// Read-only receipt projection. Never grants access, charges, refunds or sends GA events.
import { createHmac } from 'node:crypto';
import { boundedJson, readJson } from './http-security.mjs';
import { BILLING_CATALOG } from './billing-catalog.mjs';
import { BLUEPRINT_PRODUCTS } from './blueprint-commerce.mjs';

export function createPurchaseReceipt({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const secret = env.STRIPE_SECRET_KEY || '';
  async function stripe(path) {
    const response = await fetchImpl('https://api.stripe.com/v1' + path, {
      headers: { Authorization: `Bearer ${secret}`, 'Stripe-Version': '2026-09-30.endive' }, redirect: 'error', signal: AbortSignal.timeout(7000),
    });
    const value = await boundedJson(response);
    if (!response.ok) throw Error('provider_unavailable');
    return value;
  }
  return { async handle(req, res, url, json) {
    if (url.pathname !== '/api/billing/purchase-receipt') return false;
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Vary', 'Cookie');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); json(res,405,{error:'method_not_allowed'}); return true; }
    if (!auth?.sameOrigin(req)) { json(res,403,{error:'forbidden_origin'}); return true; }
    const user = await auth.verify(req,res);
    if (!user?.userId) { json(res,401,{error:'authentication_required'}); return true; }
    let body;
    try { body = await readJson(req,1024); } catch { json(res,400,{error:'bad_request'}); return true; }
    if (!body || Object.keys(body).length !== 1 || !/^cs_(live|test)_[A-Za-z0-9]{8,240}$/.test(body.sessionId || '') || url.search) {
      json(res,400,{error:'invalid_session'}); return true;
    }
    if (!secret) { json(res,503,{error:'billing_unavailable'}); return true; }
    try {
      const session = await stripe('/checkout/sessions/' + encodeURIComponent(body.sessionId) + '?expand[]=payment_intent.latest_charge&expand[]=invoice');
      // Do not reveal whether another user's session exists.
      if (session.id !== body.sessionId || session.client_reference_id !== user.userId || session.metadata?.user_id !== user.userId) {
        json(res,404,{error:'receipt_unavailable'}); return true;
      }
      const live = /^(sk|rk)_live_/.test(secret);
      const discountedLearning = session.mode === 'payment' && session.metadata.sku === 'learning-portal' &&
        session.amount_total === 0 && session.amount_subtotal === 2500 && session.total_details?.amount_discount === 2500 &&
        session.payment_status === 'no_payment_required';
      if (!live || session.livemode !== true || session.status !== 'complete' || (!discountedLearning && session.payment_status !== 'paid') ||
          session.currency !== 'eur' || !Number.isSafeInteger(session.amount_total) || session.amount_total < 0 || (!discountedLearning && session.amount_total === 0)) {
        json(res,409,{error:'purchase_not_verified'}); return true;
      }
      let id, name, priceId, productId;
      if (session.mode === 'payment' && session.metadata.sku === 'learning-portal') {
        id = 'learning-portal'; name = 'Learning Portal';
        priceId = env.STRIPE_LEARNING_PORTAL_PRICE_ID; productId = env.STRIPE_LEARNING_PORTAL_PRODUCT_ID;
      } else if (session.mode === 'payment' && Object.hasOwn(BLUEPRINT_PRODUCTS, session.metadata.sku || '')) {
        id = session.metadata.sku;
        ({ name, priceId, productId } = BLUEPRINT_PRODUCTS[id]);
      } else if (session.mode === 'subscription' && !session.metadata.campaign) {
        const tier = String(session.metadata.plan_id || '').toLowerCase(), cycle = session.metadata.billing_cycle;
        const plan = Object.hasOwn(BILLING_CATALOG.tiers,tier) && BILLING_CATALOG.tiers[tier];
        if (plan && ['monthly','annual'].includes(cycle)) {
          id = `saas-${tier}-${cycle}`; name = `${tier} (${cycle})`;
          priceId = cycle === 'annual' ? plan.annualPriceId : plan.monthlyPriceId; productId = plan.productId;
        }
        const invoice = session.invoice;
        if (!invoice || invoice.status !== 'paid' || invoice.billing_reason !== 'subscription_create' ||
            invoice.livemode !== true || invoice.amount_paid !== session.amount_total || invoice.currency !== 'eur') throw Error('unverified_invoice');
      }
      if (!id || !priceId || !productId) throw Error('unrecognized_item');
      const lines = await stripe('/checkout/sessions/' + encodeURIComponent(body.sessionId) + '/line_items?limit=2');
      const line = lines.data?.[0], price = line?.price;
      if (lines.has_more !== false || lines.data?.length !== 1 || line.quantity !== 1 || price?.id !== priceId ||
          (price.product?.id || price.product) !== productId || price.currency !== 'eur' || !Number.isSafeInteger(price.unit_amount) ||
          line.amount_subtotal !== price.unit_amount || session.amount_subtotal !== price.unit_amount) throw Error('unverified_item');
      const discount = session.total_details?.amount_discount ?? 0;
      if (!Number.isSafeInteger(discount) || discount < 0 || discount > session.amount_subtotal) throw Error('invalid_total');
      // A completed session can remain paid after a refund; inspect the actual charge.
      let intent = session.payment_intent;
      if (session.mode === 'subscription') {
        const invoice = session.invoice;
        if (!/^in_[A-Za-z0-9]+$/.test(invoice.id || '') || !/^sub_[A-Za-z0-9]+$/.test(session.subscription || '')) throw Error('invalid_invoice');
        const invoiceSubscription = invoice.parent?.subscription_details?.subscription || invoice.subscription;
        if (invoiceSubscription !== session.subscription || invoice.customer !== session.customer) throw Error('invoice_identity_mismatch');
        const payments = await stripe('/invoice_payments?invoice=' + encodeURIComponent(invoice.id) + '&limit=2&expand[]=data.payment.payment_intent.latest_charge');
        if (payments.has_more !== false || payments.data?.length !== 1 || payments.data[0].status !== 'paid') throw Error('unverified_invoice_payment');
        intent = payments.data[0].payment?.payment_intent;
      }
      if (!discountedLearning) {
        const charge = intent?.latest_charge;
        if (intent?.status !== 'succeeded' || intent.livemode !== true || !charge || charge.paid !== true ||
            charge.refunded !== false || charge.amount_refunded !== 0 || charge.disputed !== false) throw Error('unverified_charge');
      }
      const value = (session.amount_subtotal - discount) / 100;
      json(res,200,{ transactionId: createHmac('sha256',secret).update('commerce-analytics:' + session.id).digest('hex'),
        value, currency:'EUR', items:[{item_id:id,item_name:name,price:value,quantity:1}] });
    } catch { json(res,409,{error:'purchase_not_verified'}); }
    return true;
  } };
}
