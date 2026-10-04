-- Honeytoken: eigener Ereignistyp in security_events.
--
-- Der bisherige CHECK-Constraint kannte nur sechs Typen; ein Honeytoken-Treffer haette als
-- 'suspicious_request' zwischen CORS-Blocks und Scanner-Rauschen abgelegt werden muessen.
-- Genau das wuerde die definierende Eigenschaft eines Honeytokens zerstoeren: er hat keine
-- False Positives. Ein Treffer ist immer ein Vorfall und muss als solcher abfragbar sein.
--
-- Rein additiv: der Constraint wird geweitet, kein bestehender Datensatz verletzt ihn.

alter table public.security_events
  drop constraint if exists security_events_event_type_check;

alter table public.security_events
  add constraint security_events_event_type_check
  check (event_type = any (array[
    'failed_login',
    'unauthorized_access',
    'invalid_token',
    'rate_limit_exceeded',
    'permission_denied',
    'suspicious_request',
    'honeytoken_touched'
  ]));

comment on constraint security_events_event_type_check on public.security_events is
  'honeytoken_touched: Verwendung eines ausgelegten Decoy-Credentials. Null False Positives - jeder Treffer ist ein Vorfall.';