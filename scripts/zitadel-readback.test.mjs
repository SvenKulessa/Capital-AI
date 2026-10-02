import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeZitadelReadback } from './zitadel-readback.mjs';

const discovery={issuer:'https://capital-ai-hhxh4i.us1.zitadel.cloud',code_challenge_methods_supported:['S256']};
const loginSettings={allowUsernamePassword:true,allowLocalAuthentication:true,allowRegister:true,forceMfa:false,forceMfaLocalOnly:false,passkeysType:'PASSKEYS_TYPE_ALLOWED',hidePasswordReset:false,disableLoginWithEmail:false,disableLoginWithPhone:false};
const app={redirectUris:['https://capital-ai.online/api/auth/callback'],postLogoutRedirectUris:['https://capital-ai.online/'],responseTypes:['OIDC_RESPONSE_TYPE_CODE'],grantTypes:['OIDC_GRANT_TYPE_AUTHORIZATION_CODE'],appType:'OIDC_APP_TYPE_WEB',authMethodType:'OIDC_AUTH_METHOD_TYPE_BASIC'};

test('verified readback requires policy, bounded OIDC and authenticated reader',()=>assert.equal(summarizeZitadelReadback({discovery,loginSettings,app,auth:{serviceAccountAuthenticated:true}}).state,'VERIFIED'));
test('passkeys disabled fails closed',()=>assert.equal(summarizeZitadelReadback({discovery,loginSettings:{...loginSettings,passkeysType:'PASSKEYS_TYPE_NOT_ALLOWED'},app,auth:{serviceAccountAuthenticated:true}}).state,'BLOCKED'));
test('foreign redirect origin fails closed',()=>assert.equal(summarizeZitadelReadback({discovery,loginSettings,app:{...app,redirectUris:['https://evil.example/callback']},auth:{serviceAccountAuthenticated:true}}).state,'BLOCKED'));
test('missing reader authentication fails closed',()=>assert.equal(summarizeZitadelReadback({discovery,loginSettings,app,auth:{}}).state,'BLOCKED'));
