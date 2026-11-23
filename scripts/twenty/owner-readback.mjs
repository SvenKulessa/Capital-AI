#!/usr/bin/env node
/**
 * Owner-operated, server-side Twenty metadata readback. No HTTP listener,
 * no mutations, no secret output. Run only in an authorized server runtime.
 */
import { TwentyCloudMetadataReadonlyClient, TWENTY_WORKSPACE_ORIGIN } from '../../server/twenty/cloud-readonly.mjs';

export async function runTwentyReadback({
  env = process.env, output = console.log, errorOutput = console.error,
  fetchImpl = fetch,
} = {}) {
  if (env.TWENTY_READBACK_ENABLED !== 'true') {
    errorOutput('TWENTY_READBACK_DISABLED');
    return 2;
  }
  const token = env.TWENTY_API_KEY;
  if (typeof token !== 'string' || token.length < 12 || token.length > 4096) {
    errorOutput('TWENTY_AUTH_NOT_CONNECTED');
    return 2;
  }
  // Do not include provider response text, exceptions, request headers or token
  // in output. This is intentionally not an HTTP endpoint or automated job.
  try {
    const client = new TwentyCloudMetadataReadonlyClient({
      workspaceUrl: TWENTY_WORKSPACE_ORIGIN, accessToken: token, fetchImpl,
    });
    const result = await client.readProductsObject();
    output(JSON.stringify({
      contract: 'TWENTY_OWNER_READBACK@1',
      workspaceId: result.workspaceId, objectId: result.objectId,
      objectName: result.objectName, apiOrigin: result.apiOrigin,
      workspaceOrigin: result.workspaceOrigin,
      metadata: 'VERIFIED_BY_RUNTIME_READBACK',
      fields: 'NOT_PROVEN', record: 'NOT_READ', role: 'NOT_PROVEN',
      writeAllowed: false, mergeAllowed: false, deployAllowed: false,
    }));
    return 0;
  } catch {
    errorOutput('TWENTY_READBACK_FAILED');
    return 1;
  }
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  process.exitCode = await runTwentyReadback();
}
