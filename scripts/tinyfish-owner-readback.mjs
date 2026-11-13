#!/usr/bin/env node
/** Explicit operator-only CLI: never mounts a tenant/public HTTP endpoint. */
import { tinyfishOwnerReadback } from '../server/tinyfish-owner-readback.mjs';

const target = process.argv[2] ?? 'instagram';
try {
  const result = await tinyfishOwnerReadback({ target });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.status !== 'REPORTED') process.exitCode = 1;
} catch (error) {
  // Do not echo request inputs or upstream error messages.
  const allowed = new Set(['TINYFISH_DISABLED', 'TINYFISH_TARGET_DENIED', 'TINYFISH_KEY_MISSING', 'TINYFISH_PROFILE_DENIED']);
  const reason = allowed.has(error?.message) ? error.message : 'TINYFISH_READBACK_FAILED';
  process.stderr.write(`${JSON.stringify({ status: 'BLOCKED', reason })}\n`);
  process.exitCode = 1;
}
