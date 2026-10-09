import { BILLING_CATALOG } from './billing-catalog.mjs';
import { boundedJson, secureUrl } from './http-security.mjs';
export const ENTERPRISE_TRIAL_CODE = 'ENTERPRISE3';
export const ENTERPRISE_TRIAL_CAMPAIGN = 'enterprise-learning-3-days';
export function createEnterpriseTrial({env=process.env,fetchImpl=fetch}={}) {
  let config;
  try {const url=secureUrl(env.SUPABASE_URL||env.VITE_SUPABASE_URL);const key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY||'';if(url.href===url.origin+'/'&&key.length>=32) config={url:url.origin,key};} catch {}
  async function state(userId,action,sessionId=null,endsAt=null) {
    if(!config) throw new Error('trial_store_unavailable');
    const headers={Accept:'application/json','Content-Type':'application/json',apikey:config.key};
    if(config.key.startsWith('eyJ')) headers.Authorization=`Bearer ${config.key}`;
    const response=await fetchImpl(new URL('/rest/v1/rpc/capital_ai_enterprise_trial',config.url),{method:'POST',headers,body:JSON.stringify({_user_id:userId,_action:action,_session_id:sessionId,_ends_at:endsAt}),redirect:'error',signal:AbortSignal.timeout(7000)});
    if(!response.ok) throw new Error('trial_store_rejected');return boundedJson(response);
  }
  async function stripe(path) {
    const response=await fetchImpl(`https://api.stripe.com/v1${path}`,{headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY||''}`},redirect:'error',signal:AbortSignal.timeout(7000)});
    if(!response.ok) throw new Error('trial_readback_rejected');return boundedJson(response);
  }
  return { state,
    async activate(userId,sessionId) {
      if(!/^cs_[A-Za-z0-9_]{1,250}$/.test(sessionId||'')) return false;
      const session=await stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
      if(session.status!=='complete'||session.mode!=='subscription'||session.client_reference_id!==userId||session.metadata?.user_id!==userId||session.metadata?.campaign!==ENTERPRISE_TRIAL_CAMPAIGN||!/^sub_[A-Za-z0-9]+$/.test(session.subscription||'')) return false;
      const subscription=await stripe(`/subscriptions/${session.subscription}`);
      const items=subscription.items?.data;
      const enterprise=BILLING_CATALOG.tiers.enterprise;
      if(!Array.isArray(items)||items.length!==1||![enterprise.monthlyPriceId,enterprise.annualPriceId].includes(items[0]?.price?.id)) return false;
      const start=Number(subscription.trial_start),end=Number(subscription.trial_end);
      if(subscription.status!=='trialing'||subscription.metadata?.user_id!==userId||subscription.metadata?.campaign!==ENTERPRISE_TRIAL_CAMPAIGN||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start!==3*86400||end*1000<=Date.now()) return false;
      return (await state(userId,'activate',sessionId,new Date(end*1000).toISOString()))?.activated===true;
    },
  };
}
