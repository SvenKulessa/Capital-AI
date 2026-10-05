import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareAuthenticationOptions,
  prepareRegistrationOptions,
  serializeAuthenticationCredential,
  serializeRegistrationCredential,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from './webauthn';

test('registration options decode challenge, user id and excluded credential ids from base64url', () => {
  const prepared = prepareRegistrationOptions({
    challenge: 'AQID_w',
    rp: { id: 'capital-ai.online', name: 'CAPITAL-AI' },
    user: { id: 'BAUG', name: 'owner@example.test', displayName: 'Owner' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    excludeCredentials: [{ type: 'public-key', id: 'BwgJ' }],
  } as PublicKeyCredentialCreationOptionsJSON);

  assert.deepEqual(Array.from(prepared.challenge as Uint8Array), [1, 2, 3, 255]);
  assert.deepEqual(Array.from(prepared.user.id as Uint8Array), [4, 5, 6]);
  assert.deepEqual(Array.from(prepared.excludeCredentials?.[0].id as Uint8Array), [7, 8, 9]);
});

test('authentication options decode paddingless base64url challenge and credential ids', () => {
  const prepared = prepareAuthenticationOptions({
    challenge: 'AAEC_f4',
    rpId: 'capital-ai.online',
    allowCredentials: [{ type: 'public-key', id: '-vv8' }],
  } as PublicKeyCredentialRequestOptionsJSON);

  assert.deepEqual(Array.from(prepared.challenge as Uint8Array), [0, 1, 2, 253, 254]);
  assert.deepEqual(Array.from(prepared.allowCredentials?.[0].id as Uint8Array), [250, 251, 252]);
  assert.equal(prepared.rpId, 'capital-ai.online');
});

test('registration credential serializes binary fields to unpadded base64url', () => {
  const credential = {
    id: 'registration-credential',
    rawId: Uint8Array.from([250, 251, 252]).buffer,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    getClientExtensionResults: () => ({ credProps: { rk: true } }),
    response: {
      clientDataJSON: Uint8Array.from([1, 2, 3]).buffer,
      attestationObject: Uint8Array.from([4, 5, 6]).buffer,
      getTransports: () => ['internal'],
    },
  } as unknown as PublicKeyCredential;

  assert.deepEqual(serializeRegistrationCredential(credential), {
    id: 'registration-credential',
    rawId: '-vv8',
    type: 'public-key',
    authenticatorAttachment: 'platform',
    clientExtensionResults: { credProps: { rk: true } },
    response: {
      clientDataJSON: 'AQID',
      attestationObject: 'BAUG',
      transports: ['internal'],
    },
  });
});

test('authentication credential serializes binary fields and preserves null userHandle', () => {
  const credential = {
    id: 'authentication-credential',
    rawId: Uint8Array.from([7, 8, 9]).buffer,
    type: 'public-key',
    authenticatorAttachment: null,
    getClientExtensionResults: () => ({}),
    response: {
      clientDataJSON: Uint8Array.from([1]).buffer,
      authenticatorData: Uint8Array.from([2]).buffer,
      signature: Uint8Array.from([3]).buffer,
      userHandle: null,
    },
  } as unknown as PublicKeyCredential;

  assert.deepEqual(serializeAuthenticationCredential(credential), {
    id: 'authentication-credential',
    rawId: 'BwgJ',
    type: 'public-key',
    authenticatorAttachment: null,
    clientExtensionResults: {},
    response: {
      clientDataJSON: 'AQ',
      authenticatorData: 'Ag',
      signature: 'Aw',
      userHandle: null,
    },
  });
});
