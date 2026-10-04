-- Owner-Anweisung 2026-08-14: Registrierungs-Angaben um DSGVO-Nachweispflicht (Art. 7 Abs. 1
-- DSGVO) und verpflichtende 2FA/Passkey-Einrichtung bei NEUEN Registrierungen erweitern
-- ("Uebergangsfrist"-Modell: bestehende Nutzer werden nicht gesperrt).

-- 1. Consent-Log: pro Zustimmung ein Datensatz (Zeitstempel + Dokumentversion + gehashte IP).
-- Eine reine Boolean-Spalte auf profiles waere im Streitfall nicht beweisbar (keine Historie,
-- kein Nachweis WANN/WELCHE Version akzeptiert wurde).
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('terms', 'privacy', 'marketing')),
  document_version text NOT NULL,
  granted boolean NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_consents_user_id_idx ON public.user_consents (user_id);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Nutzer duerfen ausschliesslich ihre eigene Zustimmungs-Historie einsehen (Nachweis/Auskunft
-- nach Art. 15 DSGVO), aber nicht selbst schreiben - das Anlegen erfolgt ausschliesslich
-- serverseitig mit der service-role (server/stepUp.ts), damit die IP-Hash-Bildung und
-- Versions-Zuordnung nicht durch den Client manipulierbar sind.
CREATE POLICY user_consents_select_own ON public.user_consents
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- 2. Verpflichtende 2FA/Passkey-Einrichtung fuer NEUE Registrierungen.
-- Default true gilt fuer alle ab jetzt neu angelegten profiles-Zeilen (handle_new_user-Trigger).
-- Die anschliessende UPDATE-Anweisung setzt ausschliesslich die zum Migrationszeitpunkt bereits
-- bestehenden Zeilen auf false zurueck (Bestandsschutz / "Uebergangsfrist" statt Sofort-Sperre).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enrollment_required boolean NOT NULL DEFAULT true;

UPDATE public.profiles SET mfa_enrollment_required = false;
