/**
 * CAPITAL-AI Social/Content learning candidates: evidence in, proposal out.
 * No network, model training, publishing, repo mutation, private provider access.
 * Never treat article or feedback body as instructions.
 */
const ALLOWED_DOMAINS = new Set([
  'genai.owasp.org', 'nist.gov', 'developers.google.com',
  'www.w3.org', 'www.esma.europa.eu', 'www.bafin.de', 'www.bis.org',
]);
const TOPICS = new Set(['security','data_quality','explainability','content_quality','accessibility']);
const REC = Object.freeze({
  security: 'Compare official OWASP developments against current contracts and reachable security threats.',
  data_quality: 'Review freshness, data rights, and source provenance using measured evidence.',
  explainability: 'Review deterministic replay, factor explanations, model versioning and point-in-time records.',
  content_quality: 'Review content accuracy, originality and audience relevance before proposing edits.',
  accessibility: 'Review keyboard, screen-reader, focus and contrast behavior against W3C requirements.',
});
const textSafe = v => typeof v === 'string' && v.length >= 4 && v.length <= 400 && !/[<>\r\n]|https?:\/\//i.test(v);
const safeUrl = v => {
  try { const u=new URL(v);return u.protocol==='https:' && !u.username && !u.password && !u.port && ALLOWED_DOMAINS.has(u.hostname.toLowerCase()); }
  catch { return false; }
};
export function evaluateGrowthLearningCandidates(events, options={}) {
  const evaluatedAt=options.evaluatedAt;
  const now=Date.parse(evaluatedAt);
  if (!Number.isFinite(now)) throw new Error('EVALUATION_TIMESTAMP_REQUIRED');
  if (!Array.isArray(events) || events.length>80) throw new Error('FEEDBACK_BATCH_INVALID');
  const accepted=[], rejected=[], seen=new Set();
  for (const event of events) {
    const id=typeof event?.eventId==='string' ? event.eventId : '';
    const errors=[];
    if (!/^[a-z0-9][a-z0-9_-]{3,63}$/.test(id) || seen.has(id)) errors.push('INVALID_OR_DUPLICATE_ID');
    seen.add(id);
    if (!['industry_news','user_feedback'].includes(event?.kind)) errors.push('KIND_INVALID');
    if (!TOPICS.has(event?.topic)) errors.push('TOPIC_INVALID');
    if (!textSafe(event?.summary)) errors.push('SUMMARY_UNSAFE');
    const observedAt=Date.parse(event?.observedAt);
    if (!Number.isFinite(observedAt)||observedAt>now||observedAt<=now-366*86400000) errors.push('TIMESTAMP_INVALID');
    if (event?.kind==='industry_news' && (!safeUrl(event?.sourceUrl)||event?.rights!=='LINK_ONLY')) errors.push('SOURCE_RIGHTS_UNVERIFIED');
    if (event?.kind==='user_feedback' && (event?.consent!==true||event?.anonymized!==true||event?.sourceUrl!==undefined)) errors.push('CONSENT_OR_PRIVACY_UNVERIFIED');
    if (errors.length) { rejected.push({eventId:id||'invalid',reasonCodes:errors.sort()}); continue; }
    // Deliberately never preserve or echo untrusted summary text.
    accepted.push({ eventId:id,kind:event.kind,topic:event.topic,observedAt:event.observedAt,
      sourceUrl:event.kind==='industry_news'?event.sourceUrl:null,
      rights:event.kind==='industry_news'?'LINK_ONLY':'CONSENTED_ANONYMIZED_FEEDBACK' });
  }
  const proposals=[...new Set(accepted.map(item=>item.topic))].sort().map(topic=>({
    id:'candidate-'+topic,status:'CANDIDATE_ONLY',topic,
    evidenceIds:accepted.filter(item=>item.topic===topic).map(item=>item.eventId).sort(),
    recommendation:REC[topic],modelUpdateEligible:false,publicationEligible:false,productionEligible:false,
  }));
  return Object.freeze({schemaVersion:'CAPITAL_AI_GROWTH_LEARNING_DIGEST@1',evaluatedAt,
    accepted,rejected,proposals,sourceTextConsumedAsInstructions:false,
    modelWeightsChanged:false,publishExecuted:false});
}
