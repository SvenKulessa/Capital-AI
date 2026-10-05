# Auth Passkey / TOTP / Mailer – TRUST Evidence

Stand: 2026-10-05

## Scope

Dieser Nachweis gehört zu PR #179 `[CAPITAL-AI-TRUST] Passkey, TOTP und gebrandete Auth-Mails`.
Ausgangs-Head vor Hardening: `4606ef3b13f27cc7e1fc72da9983d3c40846b0e5`.
Basis: `main@08b230eea2e099787162af4777512359ea219f0c`.

## Security-Hardening

- Clientseitige Auth-Weiterleitungen werden nicht mehr aus Query- oder API-Werten übernommen; erfolgreiche Login-, Passkey- und MFA-Flows navigieren ausschließlich auf `/profile`.
- Absolute URLs in Auth-Mail-HTML werden mit `URL` geparst und müssen exakt `https://capital-ai.online` als Origin besitzen.
- Hostname-Substring-Prüfungen sind kein Security-Gate.
- Access-/Refresh-Tokens verbleiben in serverseitig gesetzten HttpOnly/Secure-Cookies.

## WebAuthn Regression Scope

Dedizierte Tests decken ab:

- Challenge: base64url → `Uint8Array`
- `user.id`: base64url → `Uint8Array`
- Credential IDs: base64url → `Uint8Array`
- Registration Credential: Binärwerte → unpadded base64url
- Authentication Credential: Binärwerte → unpadded base64url
- `userHandle=null` bleibt `null`
- paddinglose base64url-Eingaben

## Desired Supabase Auth Contract

Der gewünschte Contract umfasst ausschließlich explizit benannte Auth-Konfiguration:

- `mfa_totp_enroll_enabled=true`
- `mfa_totp_verify_enabled=true`
- `passkey_enabled=true`
- `webauthn_rp_display_name=CAPITAL-AI`
- `webauthn_rp_id=capital-ai.online`
- `webauthn_rp_origins=https://capital-ai.online`
- sieben `mailer_notifications_*_enabled=true`
- 13 CAPITAL-AI Subjects/Templates

Das Skript gibt beim Remote-Readback nur geprüfte Key-Namen und Drift-Keys aus. Secrets oder Remote-Werte werden nicht geloggt.

## Production-Gates

Ein erfolgreicher lokaler Test oder CI-Lauf ist keine Production-Freigabe.

Vor Auth-Production-Admission erforderlich:

1. neuer Exact Head korreliert,
2. CodeQL ohne neue High/Medium Findings,
3. Docker Security / Domain Governance / technische Validation terminal erfolgreich,
4. Management-API GET read-only gegen den gewünschten Contract,
5. kontrolliertes PATCH nur nach vollständigem Readback,
6. sofortiger Post-Apply-Readback mit `remainingMismatches=[]`,
7. reale E2E-Evidence für Registration, Recovery, Google, Passkey und TOTP,
8. Desktop- und Mobile-Browser-Smoke.

Merge, Render-Deploy und Production-Handoff bleiben separate Entscheidungen.
