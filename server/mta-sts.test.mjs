import test from 'node:test';
import assert from 'node:assert/strict';
import { serveMtaSts, mtaStsPolicy } from './mta-sts.mjs';
function response() { return { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = body; } }; }
test('MTA-STS preserves the existing IONOS policy as plain text', () => {
 const res = response();
 assert.equal(serveMtaSts({method:'GET'}, res, new URL('https://mta-sts.capital-ai.online/.well-known/mta-sts.txt')), true);
 assert.equal(res.status, 200);
 assert.equal(res.headers['Content-Type'], 'text/plain; charset=utf-8');
 assert.equal(res.body, 'version: STSv1\nmode: testing\nmx: mx00.emig.kundenserver.de\nmx: mx01.emig.kundenserver.de\nmax_age: 86400\n');
 assert.equal(res.headers['Content-Length'], Buffer.byteLength(mtaStsPolicy));
});
test('HEAD returns policy headers without a body', () => {
 const res = response(); serveMtaSts({method:'HEAD'}, res, new URL('https://example.org/.well-known/mta-sts.txt'));
 assert.equal(res.status, 200); assert.equal(res.body, undefined);
});
test('policy cannot be changed through HTTP methods', () => {
 for (const method of ['POST','PUT','DELETE']) {
 const res = response(); serveMtaSts({method}, res, new URL('https://example.org/.well-known/mta-sts.txt'));
 assert.equal(res.status, 405); assert.equal(res.headers.Allow, 'GET, HEAD');
 }
});
test('only the exact policy path receives this exception', () => {
 for (const pathname of ['/.well-known/secret', '/.well-known/mta-sts.txt/', '/.well-known/mta-sts.txt.bak', '/.env']) {
 assert.equal(serveMtaSts({method:'GET'}, response(), new URL(pathname, 'https://example.org')), false);
 }
});
