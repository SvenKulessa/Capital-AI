// CAPITAL_AI_SOCIAL_PROVIDER_EXECUTION@1
// Binds provider submission to the durable claim/UNKNOWN/readback state machine.
function assert(ok, code) { if (!ok) throw new Error(code); }

export function createSocialProviderExecution({ store, transport, tokenResolver } = {}) {
  assert(store && typeof store.noteUnknownDelivery === 'function',
    'SOCIAL_PROVIDER_EXECUTION_STORE_REQUIRED');
  assert(transport && typeof transport.submit === 'function',
    'SOCIAL_PROVIDER_EXECUTION_TRANSPORT_REQUIRED');
  assert(typeof tokenResolver === 'function', 'SOCIAL_PROVIDER_TOKEN_RESOLVER_REQUIRED');

  async function submit({ plan, mediaBytes = null, providerMediaUrl = null, metadata = {} } = {}) {
    assert(plan?.contractVersion === 'CAPITAL_AI_CONTENT_SOCIAL_PROVIDER_BRIDGE@1'
      && plan?.jobId && plan?.userId && plan?.accountId && plan?.channel,
      'SOCIAL_PROVIDER_EXECUTION_PLAN_REQUIRED');

    const secret = await tokenResolver({
      userId: plan.userId,
      accountId: plan.accountId,
      channel: plan.channel,
      platform: plan.platform,
    });
    assert(secret && typeof secret.accessToken === 'string' && secret.accessToken.length > 0,
      'SOCIAL_PROVIDER_TOKEN_RESOLUTION_FAILED');

    try {
      const receipt = await transport.submit({
        channel: plan.channel,
        accessToken: secret.accessToken,
        account: {
          externalAccountId: secret.externalAccountId ?? null,
          accountUserId: secret.accountUserId ?? null,
          accountHandle: secret.accountHandle ?? null,
        },
        mediaBytes,
        providerMediaUrl,
        metadata,
      });
      const unknown = await store.noteUnknownDelivery({
        plan,
        providerDeliveryId: receipt.providerDeliveryId ?? null,
        evidenceRef: receipt.evidenceRef,
      });
      return Object.freeze({ ...unknown, channel: plan.channel });
    } catch (error) {
      if (error?.providerAttempted === true) {
        const unknown = await store.noteUnknownDelivery({
          plan,
          providerDeliveryId: null,
          evidenceRef: `provider-submit://${String(plan.channel).toLowerCase()}/ambiguous`,
        });
        return Object.freeze({ ...unknown, channel: plan.channel, ambiguous: true });
      }
      throw error;
    }
  }

  return Object.freeze({ submit });
}
