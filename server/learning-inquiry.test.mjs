import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { createLearningInquiry, learningMeasurementId } from './learning-inquiry.mjs';
const env = { SMTP_HOST: 'smtp.example.test', SMTP_USER: 'private-user', SMTP_PASSWORD: 'private-password', GA4_NEASUREMENT_ID: 'G-0542DT2HCE', GA4_ENHANCED_MEASUREMENT_VERIFIED: 'true' };
const payload = () => ({ requestId: randomUUID(), email: 'learner@example.test', message: 'Please explain the course learning goals.', website: '' });
function fixture(sendMail = async () => ({ accepted: ['support@capital-ai.online'], rejected: [] }), suppliedEnv = env) {
  const mails = [];
  const handler = createLearningInquiry({ env: suppliedEnv, auth: { sameOrigin() { throw Error('Course enquiries must not require Supabase auth'); } }, sendMail: async mail => { mails.push(mail); return sendMail(mail); } });
  return { mails, async run(body = payload(), headers = {}, method = 'POST', path = '/api/public/learning-inquiry') {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]);req.method = method;
    req.headers = { 'content-type': 'application/json', origin: 'https://capital-ai.online', ...headers };req.socket = { remoteAddress: '192.0.2.1' };
    const out = { headers: {} };const res = { setHeader(k,v) { out.headers[k] = v; } };
    await handler.handle(req, res, new URL('https://capital-ai.online' + path), (_res, status, data) => Object.assign(out, { status, data }));
    return out;
  } };
}
test('only accepted SMTP delivery confirms a learning request; retries do not send twice', async () => {
  const f = fixture(), body = payload();
  const result = await f.run(body);
  assert.equal(result.status, 200);assert.equal(result.data.status, 'MAIL_SERVER_ACCEPTED');
  assert.equal(result.data.receipt, body.requestId);assert.equal(f.mails[0].to, 'support@capital-ai.online');
  assert.equal(f.mails[0].replyTo, body.email);
  assert.match(f.mails[0].html, /capital-ai-avatar-120x120\.png/);
  assert.match(f.mails[0].text, /Learning-\/Kursanfrage/);assert.doesNotMatch(JSON.stringify(result), /learner|learning goals|private-password/);
  await Promise.all([f.run(body), f.run(body)]);assert.equal(f.mails.length, 1);
});
test('rejection, unavailable SMTP and forged origins cannot generate successful receipts', async () => {
  assert.equal((await fixture(async () => ({ accepted: [], rejected: ['support@capital-ai.online'] })).run()).status, 502);
  assert.equal((await fixture(async () => { throw Error('private-provider-error'); }).run()).data.error, 'inquiry_delivery_failed');
  const disabled = fixture(undefined, {});assert.equal((await disabled.run()).status, 503);assert.equal(disabled.mails.length, 0);
  const f = fixture();assert.equal((await f.run(payload(), { origin: 'https://attacker.test' })).status, 403);assert.equal(f.mails.length, 0);
});
test('header injection, recipient override, honeypot and malformed inputs are rejected before sending', async () => {
  const f = fixture();
  for (const changes of [{ email: 'test@example.test\r\nBcc:attacker@test.test' }, { to: 'attacker@test.test' }, { website: 'spam.test' }, { message: 'short' }, { requestId: 'not-a-uuid' }]) {
    assert.equal((await f.run({ ...payload(), ...changes })).status, 400);
  }
  assert.equal(f.mails.length, 0);
});
test('bounded mail budget and IP limiter reject further unique requests', async () => {
  const f = fixture();for(let i=0;i<3;i++) assert.equal((await f.run()).status, 200);
  assert.equal((await f.run()).status, 429);assert.equal(f.mails.length, 3);
});
test('public configuration discloses only the bound stream and availability after privacy verification', async () => {
  assert.equal(learningMeasurementId(env), 'G-0542DT2HCE');
  assert.equal(learningMeasurementId({ ...env, GA4_ENHANCED_MEASUREMENT_VERIFIED: '' }), null);
  assert.equal(learningMeasurementId({ ...env, GA4_MEASUREMENT_ID: 'G-OTHER' }), null);
  const result = await fixture().run({}, {}, 'GET', '/api/public/learning-config');
  assert.deepEqual(result.data, { measurementId: 'G-0542DT2HCE', inquiryAvailable: true });
  assert.doesNotMatch(JSON.stringify(result), /private-user|private-password|SMTP/);
});

test('generic contact route retains server-side SMTP, reply-to, validation and branded receipt', async () => {
  const f = fixture();
  const input = { ...payload(), message: 'General question with <untrusted> input.' };
  const response = await f.run(input, {}, 'POST', '/api/public/contact');
  assert.equal(response.status, 200);
  assert.equal(response.data.receipt, input.requestId);
  assert.equal(response.data.status, 'MAIL_SERVER_ACCEPTED');
  assert.equal(f.mails.length, 1);
  assert.equal(f.mails[0].subject, 'CAPITAL-AI Kontaktanfrage');
  assert.equal(f.mails[0].replyTo, input.email);
  assert.match(f.mails[0].html, /&lt;untrusted&gt;/);
  assert.doesNotMatch(JSON.stringify(response), /untrusted|example.test/);
  const tampered = await f.run({ ...payload(), website: 'spam.test' }, {}, 'POST', '/api/public/contact');
  assert.equal(tampered.status, 400);
  assert.equal(f.mails.length, 1);
  const forged = await f.run(payload(), { origin: 'https://attacker.test' }, 'POST', '/api/public/contact');
  assert.equal(forged.status, 403);
  assert.equal(f.mails.length, 1);
});


test('Founder inquiries reach only the private controller address and leak no contact data in HTTP receipt', async () => {
  const owner = 'sven.kulessa@capital-ai.online';
  const f = fixture(async () => ({ accepted: [owner], rejected: [] }));
  const request = { ...payload(), message: 'Founder inquiry for a private institutional collaboration.' };
  const answer = await f.run(request, {}, 'POST', '/api/public/founder-inquiry');
  assert.equal(answer.status, 200);
  assert.equal(answer.data.status, 'MAIL_SERVER_ACCEPTED');
  assert.equal(f.mails.length, 1);
  assert.equal(f.mails[0].to, owner);
  assert.equal(f.mails[0].replyTo, request.email);
  assert.match(f.mails[0].subject, /Kontaktanfrage/);
  assert.doesNotMatch(JSON.stringify(answer.data), /sven|institutional|learner@example/);
  const spoofed = await f.run({ ...payload(), to: 'attacker.example' }, {}, 'POST', '/api/public/founder-inquiry');
  assert.equal(spoofed.status, 400);
  assert.equal((await f.run(payload(), { origin: 'https://attacker.example' }, 'POST', '/api/public/founder-inquiry')).status, 403);
  assert.equal(f.mails.length, 1);
});
