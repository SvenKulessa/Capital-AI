import test from 'node:test';
import assert from 'node:assert/strict';
import { captureCheckoutConfirmation, checkoutConfirmationSession, forgetCheckoutConfirmation } from './checkoutConfirmation';
import { isAnalyticsMeasurable } from '../../shared/analytics-measurement-policy.mjs';
import { robotsDirectiveFor } from '../../shared/seo-indexing-policy.mjs';
test('public offers can be measured independently from NOINDEX; private content fails closed',()=>{
  for(const path of ['/pricing','/blueprints','/checkout/confirmation']) { assert.equal(isAnalyticsMeasurable(path),true);assert.match(robotsDirectiveFor(path),/noindex/); }
  for(const path of ['/profile','/profile/dashboard','/control-center','/admin','/studio','/dokumentation','/vocabulary/capital-eventmesh','/pricing?email=private']) assert.equal(isAnalyticsMeasurable(path),false,path);
});
test('confirmation removes all query and fragment values and holds the session only in memory',()=>{
  const old=globalThis.window;const paths:string[]=[];
  globalThis.window={location:{pathname:'/checkout/confirmation',search:'?session_id=cs_live_abcdefgh12345678&email=private',hash:'#private'},history:{replaceState(_state:unknown,_title:string,path:string){paths.push(path);}}} as any;
  try {captureCheckoutConfirmation();assert.deepEqual(paths,['/checkout/confirmation']);assert.equal(checkoutConfirmationSession(),'cs_live_abcdefgh12345678');forgetCheckoutConfirmation();assert.equal(checkoutConfirmationSession(),null);}finally{globalThis.window=old;}
});
