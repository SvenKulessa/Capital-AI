PROMPT START

Du bist ein Senior‑Developer‑Agent, der produktionsreifen Code für ein bestehendes SaaS‑Repo generiert.
Die Aufgabe: Implementiere eine zuverlässige E‑Mail‑Benachrichtigung nach erfolgreichem Abschluss einer Stripe‑Checkout‑Session für ein Abonnement.

Ziel:
- Nach erfolgreichem Checkout (Event: `checkout.session.completed`) soll
  1. der Abonnement‑Kunde eine Bestätigungs‑E-Mail erhalten
  2. die Owner‑Adresse `sven.kulessa@gmx.net` ebenfalls eine Benachrichtigung erhalten

Wähle eine der beiden Optionen und implementiere sie vollständig im produktiven Repo:

------------------------------------------------------------
Option A — Backend‑Variante (empfohlen)
------------------------------------------------------------
Nutze Stripe Webhooks (`checkout.session.completed`) und sende danach zwei E‑Mails:
- an `session.customer_details.email`
- an `sven.kulessa@gmx.net`

Anforderungen:
- Verwende den bestehenden SMTP‑Mailer des Projekts (IONOS SMTP).
- Erstelle eine Funktion `sendSubscriptionConfirmation(customerEmail, ownerEmail, subscriptionData)`.
- Die Funktion muss deterministisch, idempotent und side‑effect‑safe sein.
- Logging: Erfolgreiche und fehlgeschlagene E‑Mail‑Sendungen müssen geloggt werden.
- Fehler dürfen den Webhook nicht blockieren → immer `200 OK` zurückgeben.

------------------------------------------------------------
Option B — Frontend‑Variante (falls kein Webhook vorhanden)
------------------------------------------------------------
- Nach erfolgreichem Redirect (`success_url`) rufe ein Backend‑Endpoint `/api/send-subscription-email` auf.
- Dieser Endpoint sendet zwei E‑Mails:
  - an den Kunden
  - an `sven.kulessa@gmx.net`
- Der Endpoint muss gegen Replay‑Attacks geschützt sein (z. B. durch `session_id`‑Verification via Stripe API).

------------------------------------------------------------
Wichtige technische Details:
------------------------------------------------------------
- Stripe Checkout Session enthält die E‑Mail unter `session.customer_details.email`.
- Falls `customer_email` beim Erstellen der Session gesetzt wurde, ist sie garantiert vorhanden.
- Falls nicht, muss der Checkout die E‑Mail einsammelt (Contact Details Element oder `customer_email`).

------------------------------------------------------------
Output‑Format:
------------------------------------------------------------
- Liefere produktionsreifen Code (keine Demo‑Daten, keine Platzhalter).
- Liefere alle benötigten Dateien, Funktionsdefinitionen und Änderungen.
- Liefere eine kurze technische Erklärung der Implementierung.

PROMPT END
