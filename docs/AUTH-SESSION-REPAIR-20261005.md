# Auth-, Session- und Profil-Reparatur — 2026-10-05

## Scope

Branch: `capital-ai-trust/session-profile-repair-20261005`

Basis: `main@7b40e7ea66a44ace964ccb65844600307a5bcdb2`

## Ursachen

1. Authentifizierte GET-Reads für Passkeys und MFA-Faktoren wurden bei Browsern ohne `Origin`-Header fälschlich mit `403 forbidden_origin` abgewiesen.
2. `/login?mfa=1` blieb auch dann im TOTP-Modus, wenn nach einem Faktor-Reset kein zweiter Faktor mehr erforderlich war.
3. Im MFA-Modus gab es keinen sicheren Weg zurück zu den primären Methoden E-Mail, Google und Passkey.
4. Der Header rendert den Loginzustand statisch und hatte keinen Session-Readback.
5. Die Session lieferte keine RLS-gebundene Profil-/Abo-Projektion für Tarif- und Rollenbadges.

## Reparaturen

- Same-Site GET-Reads für `/api/auth/passkeys` und `/api/auth/mfa/factors` akzeptieren einen fehlenden Origin-Header, lehnen einen explizit fremden Origin bzw. Cross-Site-Read weiterhin ab.
- Mutierende Auth-Endpunkte bleiben strikt Same-Origin geschützt.
- Ein veralteter MFA-Routenzustand wird gegen `/api/auth/session` geprüft und bei `mfaRequired=false` auf `/profile` aufgelöst.
- „Andere Anmeldemethode wählen“ beendet die angefangene Session, bevor E-Mail, Google oder Passkey erneut angeboten werden; ein aktivierter TOTP-Faktor wird nicht umgangen.
- `/api/auth/session` liest Profil und Subscription ausschließlich mit dem verifizierten Benutzer-Access-Token über bestehende RLS-Policies.
- Im Session-Payload werden keine Stripe-IDs, Access-/Refresh-Tokens oder Supabase-Secrets ausgegeben.
- Header und Profil verwenden dieselbe autoritative Session-/Account-Projektion.

## TOTP-Reset

Owner-autorisierte Production-Mutation am 2026-10-05:

- vor Reset: 3 verifizierte TOTP-Faktoren
- gelöscht: 3 TOTP-Faktoren
- nach Reset: 0 MFA-Faktoren
- nicht gelöscht: Benutzer, Passkeys, Profile, Abonnements
- Passkeys bleiben getrennt von TOTP und werden nicht als TOTP-Bypass behandelt.

TOTP kann nach Auslieferung des reparierten Profilflows erneut über QR-Code oder Secret eingerichtet werden.

## PR-/Runner-Regel

`AGENTS.md` enthält jetzt die Owner-Entscheidung, dass Standard-GitHub-Hosted-Runner und automatisch ausgelöste Required Checks in diesem öffentlichen Repository kein Gate für das Erstellen oder Aktualisieren eines PRs sind. Security-, Lizenz-, Governance-, Merge- und Production-Gates bleiben separat.

## Abnahme

Ein Merge oder grüner Test allein ist keine Production-Freigabe. Erforderlich bleiben mindestens:

- TypeScript/Lint
- Auth-/Security-Regressionen
- CodeQL
- Docker Security Gate
- Mobile- und Desktop-Browser-Smoke
- reale Login-/Passkey-/TOTP-/Session-/Abo-Evidence nach Deployment
