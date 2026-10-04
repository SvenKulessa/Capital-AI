-- Owner-Policy 2026-08-14: kein Notfall-Bypass-Code in der Anwendung. Der Anwendungscode
-- (server/stepUp.ts: /break-glass/redeem) wurde bereits im selben Arbeitszyklus entfernt
-- (siehe docs/evidence/m5a/M5A_REPOSITORY_IMPLEMENTATION_EVIDENCE.md, Nachtrag). Dieser Migration
-- vollzieht den vom Owner direkt angewiesenen Datenanteil nach ("Lösche alle Bypass Codes in
-- supabase"): alle 20 unbenutzten Legacy-Break-Glass-Codes werden entfernt.
--
-- Bewusst nicht Teil dieser Migration: das Löschen der Tabelle selbst. Der Owner hat ausdrücklich
-- nur die Codes (Daten) adressiert, nicht das Schema; ein DROP TABLE ist eine separate
-- Entscheidung.
DELETE FROM public.break_glass_codes;
