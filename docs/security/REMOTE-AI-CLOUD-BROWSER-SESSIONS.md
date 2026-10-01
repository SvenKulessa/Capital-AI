# Remote AI Cloud Browser Session Evidence

Stand: 2026-10-01  
Status: verbindlich unterhalb der Root-Policy `AGENTS.md`

## Zweck

Jede Änderung an externen Systemen, die durch eine AI-gestützte Cloud-Browser-Sitzung im Namen des Owners durchgeführt wird, muss als **Remote AI basierte Cloud Browser Sitzung — durch den Owner freigegeben** dokumentiert werden.

Die Dokumentation ist Pflicht für schreibende oder zustandsverändernde Aktionen, insbesondere bei:

- GitHub-/GitHub-Enterprise-Einstellungen,
- Render-/Cloud-/Hosting-Konfiguration,
- DNS-/Domain-/Registrar-Einstellungen,
- Auth-/Identity-Providern,
- E-Mail-/SMTP-Konfiguration,
- Secrets-/Variablenverwaltung,
- CI/CD-/Ruleset-/Repository-Einstellungen,
- Security-/Compliance-/Billing-relevanten Provider-Einstellungen,
- sonstigen externen Admin- oder Control-Plane-Änderungen.

Reine Read-only-Recherche muss nicht als Änderungssitzung protokolliert werden, sofern dabei keinerlei zustandsverändernde Aktion erfolgt.

## Pflichtkennzeichnung

Jeder entsprechende Nachweis muss klar enthalten:

```text
Execution Mode: Remote AI basierte Cloud Browser Sitzung
Authorization: Durch den Owner freigegeben
Actor: AI-gestützte Remote-Sitzung im Auftrag des Owners
```

Die Kennzeichnung darf nicht so formuliert werden, als habe der Owner die konkrete UI-Aktion persönlich ausgeführt, wenn sie tatsächlich durch die AI-gestützte Sitzung vorgenommen wurde.

## Mindest-Evidenz pro Sitzung

Für jede zustandsverändernde Cloud-Browser-Sitzung sind mindestens zu dokumentieren:

- Datum und Zeitfenster,
- Zielsystem / Provider,
- betroffene Organisation, Workspace, Repository, Service oder Ressource,
- Anlass/Zweck der Sitzung,
- expliziter Owner-Freigabekontext,
- Ausgangszustand, soweit feststellbar,
- konkret ausgeführte Aktionen,
- geänderte Einstellungen/Werte ohne Offenlegung von Secrets,
- Ergebnis jeder Aktion,
- verifizierter Endzustand / Readback,
- relevante IDs, Referenzen, URLs oder Screenshots/Evidence, soweit sicher speicherbar,
- bekannte Restrisiken oder offene Punkte,
- Rollback-/Reversal-Möglichkeit,
- Verknüpfung zu Branch, PR, Issue, Change Request oder Release-Evidence, sofern vorhanden.

## Security- und Privacy-Regeln

- Keine Passwörter, Tokens, API Keys, Private Keys, Recovery Codes oder vollständigen Secret-Werte in die Evidence schreiben.
- Secret-Werte werden ausschließlich als gesetzt/nicht gesetzt, Secret-Name, Scope und gegebenenfalls Rotationsstatus dokumentiert.
- Session-Cookies, Browser-Storage, OAuth-Codes und temporäre Zugangsdaten dürfen nicht in Screenshots oder Logs persistiert werden.
- Screenshots sind vor Ablage auf personenbezogene Daten, Tokens, E-Mail-Adressen und andere nicht erforderliche Informationen zu prüfen.
- Eine Cloud-Browser-Sitzung erweitert keine Berechtigung. Sie darf nur innerhalb des vom Owner freigegebenen Scopes handeln.
- Kritische Änderungen an Auth, Billing, Domain/DNS, Produktionsdeployment, Branch Protection oder Security Controls müssen nach Möglichkeit durch providerseitigen Readback verifiziert werden.

## Change-Evidence-Template

```text
Session-ID / Referenz:
Execution Mode: Remote AI basierte Cloud Browser Sitzung
Authorization: Durch den Owner freigegeben
Datum / Zeit:
Zielsystem:
Ressource:
Zweck:
Freigegebener Scope:

Ausgangszustand:
- ...

Durchgeführte Aktionen:
1. ...
2. ...

Geänderte Werte:
- <Schlüssel/Einstellung>: <vorher> -> <nachher>
- Secrets: nur Name/Scope, niemals Secret-Wert

Readback / Endzustand:
- ...

Security-/Compliance-Auswirkung:
- ...

Rollback:
- ...

Verknüpfte Evidenz:
- Branch:
- PR:
- Issue/Change:
- Provider-ID / Deploy-ID / Ruleset-ID:
- Screenshot/Export:

Offene Punkte:
- ...

Status: VERIFIED | PARTIAL | BLOCKED | ESCALATED
```

## Repository-Ablage

Sitzungsnachweise werden unter einem passenden Evidence-Pfad versioniert, bevorzugt:

`docs/security/evidence/remote-ai-sessions/YYYY-MM-DD-<system>-<purpose>.md`

oder, falls ein bestehendes Release-/Audit-Evidence-Paket existiert, innerhalb dieses Pakets.

Bei mehreren logisch getrennten Änderungen in einer Sitzung dürfen separate Evidence-Dateien erstellt werden. Änderungen an mehreren kritischen Providern sollen nicht in einem unübersichtlichen Sammelprotokoll vermischt werden.

## Freigabegrenze

Die Dokumentation einer owner-freigegebenen Cloud-Browser-Sitzung ist **kein** Ersatz für:

- Required Checks,
- Security Gates,
- Lizenzfreigabe,
- Branch Protection,
- Production-Handoff,
- Provider-Readback,
- getrennte Freigaben für kosten- oder produktionsrelevante Aktionen.

Sie dokumentiert **wer bzw. in welchem Ausführungsmodus** eine Remote-Änderung vorgenommen hat und auf welcher Owner-Freigabe diese beruhte.
