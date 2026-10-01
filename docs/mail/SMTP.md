# SMTP mit Nodemailer

Nodemailer ist als Laufzeitabhängigkeit exakt auf `10.0.13` festgesetzt.
Quelle: offizielles Paket `nodemailer` aus `https://registry.npmjs.org`.
Die Installation führt keine Paketskripte aus. Das npm-Lockfile enthält
Tarball-URL und SHA-512-Integrität; der Original-Lizenztext liegt in
`docs/licenses/nodemailer-10.0.13-MIT-0.txt`. Die Lizenz ist MIT-0.
Der versionsbezogene Nachweis steht in `nodemailer-license-review.json`
im selben Ordner und wird im Runtime-Image unter `/app/licenses` mitgeführt.

## Konfiguration für IONOS, Port 465

Zugangsdaten ausschließlich aus den Render-Umgebungsvariablen beziehen.
Port 465 nutzt TLS direkt ab Verbindungsbeginn:

```js
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: { rejectUnauthorized: true },
  connectionTimeout: 30_000,
  greetingTimeout: 30_000,
  socketTimeout: 30_000,
  logger: false,
  debug: false,
  disableFileAccess: true,
  disableUrlAccess: true,
});
```

`SMTP_FROM` muss ein einzelnes gültiges Postfach enthalten, beispielsweise
`CAPITAL-AI <support@capital-ai.online>`. SMTP-Passwort und Authentifizierungs-
Dialoge niemals protokollieren. Bei unklarem Versandstatus nach der DATA-
Übertragung nicht blind erneut senden: zuerst Serverprotokolle prüfen.

Diese Änderung installiert das Paket und dokumentiert den Transport.
Sie startet keinen Mailversand und aktiviert keinen Report-Zeitplan.
Das nächste geprüfte Container-Image enthält die Abhängigkeit; eine Änderung
im laufenden Container wäre beim nächsten Deploy verloren.
Kraken-Marktdatarechte, andere Providerrechte und die Freigabe des gesamten
Container-Images werden durch diese Softwarelizenz nicht abgedeckt.
