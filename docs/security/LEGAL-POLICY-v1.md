# CAPITAL-AI LEGAL_POLICY@1

Stand: 2026-10-01  
Status: REVIEW_DRAFT  
Domain: TRUST + PLATFORM  
Base: `main@2008cac17c8cabc98576d6b20a1ad56048c0028f`

## Zweck

`LEGAL_POLICY@1` präzisiert die bestehende Lizenz- und Redistribution-Governance. Sie ersetzt keine individuelle Rechtsberatung und schwächt keine Lizenzbedingungen ab. Sie soll dagegen verhindern, dass CAPITAL-AI unnötig streng oder unnötig pauschal blockiert, wenn eine Komponente technisch gar nicht verteilt wird oder eine konkrete gesetzliche bzw. lizenzvertragliche Erlaubnis einschlägig ist.

Grundregel:

```text
Candidate Digest
       │
 ┌─────┼───────────────┬──────────────┐
 ▼     ▼               ▼              ▼
Prov.  SBOM         Security       License/Legal
 ✓      ✓             ✓                 ✓
 └─────┴───────────────┴──────────────┘
                  │
             Policy Engine
                  │
          decisionEligible
            true / false
                  │
             Deployment
```

Ein numerischer Score oder ein grüner Build kann ein negatives Legal-/License-Gate nicht kompensieren.

## Rechtsquellen

Primäre Referenzen:

- §§ 69a–69g UrhG, insbesondere § 69c (ausschließliche Rechte), § 69d (bestimmungsgemäße Benutzung, Sicherungskopie, Beobachten/Untersuchen/Testen), § 69e (Interoperabilität) und § 69g Abs. 2 (Nichtigkeit entgegenstehender Vertragsbestimmungen).
- Richtlinie 2009/24/EG, insbesondere Art. 4–6 und Art. 8.
- BGH, Urteil vom 06.10.2016, I ZR 25/15 („World of Warcraft I“): § 69d Abs. 3 UrhG kann Programmanalyse zum Ermitteln von Funktionalität/Ideen/Grundsätzen erlauben, wenn die dafür vorgenommenen Handlungen selbst erlaubt sind; die Ausnahme ist auf Computerprogramme beschränkt.
- Für konkrete OSS-Komponenten gilt zusätzlich immer der Original-Lizenztext der verwendeten Version.

Die gesetzlichen Ausnahmen sind eng auszulegen. Sie erlauben insbesondere nicht pauschal die Weiterverteilung fremder Software unter abweichenden Bedingungen.

## Nutzungsklassen

Jede Komponente erhält vor der Policy-Entscheidung genau eine primäre Nutzungsklasse; zusätzliche Flags sind erlaubt.

### BUILD_ONLY
Tool oder Library wird nur im internen Build/CI verwendet und gelangt weder in Frontend-Artefakte noch Runtime-Image noch Download-Artefakte.

Default:
- keine Runtime-Redistribution-Pflicht nur wegen Build-Nutzung,
- dennoch Herkunft, Lizenz, Security und erlaubte Nutzung prüfen,
- Build-Image-Weitergabe separat klassifizieren.

### INTERNAL_RUNTIME
Komponente läuft nur in einer kontrollierten internen Umgebung und wird nicht an Dritte ausgeliefert.

Default:
- Lizenzbedingungen zur Nutzung bleiben relevant,
- Distribution-/Source-Offer-Pflichten nur bei tatsächlicher Überlassung einer Kopie an Dritte,
- Hosting-/Provider-Transfers werden nicht automatisch als „intern“ angenommen; die tatsächliche Überlassung ist zu dokumentieren.

### HOSTED_NETWORK_SERVICE
Serverseitige Komponente wird Nutzern nur als Funktionalität über das Netz angeboten, ohne Übertragung einer Kopie an Nutzer.

Default:
- bei GPLv2/v3 führt reine Netzwerkinteraktion grundsätzlich nicht allein zu „conveying“ nach GPLv3;
- AGPL und andere Network-Copyleft-Lizenzen sind separat zu behandeln;
- serverseitige MPL-Komponenten sind nach MPL-Begriffsverständnis nicht allein wegen Web-Nutzung an Endnutzer „distributed“;
- Provider-/Deployment-Kopien bleiben gesondert zu klassifizieren.

### BUNDLED_FRONTEND
Code, Font, Asset oder Datenbestand wird an den Browser übertragen.

Default:
- dies ist Distribution/Überlassung einer Kopie und aktiviert die einschlägigen Notice-, Attribution-, Source- oder Copyleft-Pflichten der konkreten Lizenz.

### DISTRIBUTED_BINARY
Binärartefakt, Container, CLI, App, Archiv oder anderes Artefakt wird Dritten zugänglich gemacht oder überlassen.

Default:
- vollständige Redistribution-Prüfung erforderlich,
- bei öffentlichem GHCR-Package wird von Distribution ausgegangen.

### MODIFIED_COMPONENT
Fremdkomponente wurde verändert.

Default:
- zusätzlich Änderungshinweise, Source-/Copyleft-Umfang und Lizenzkompatibilität prüfen,
- bei Apache-2.0 sind u. a. Änderungskennzeichnungen relevant,
- bei MPL-2.0 greifen file-level Copyleft-Pflichten für Covered Software/Modifications,
- bei GPL/LGPL ist der konkrete Combining-/Linking-/Derivative-Work-Scope gesondert zu analysieren.

## Gesetzliche Software-Ausnahmen

### § 69d Abs. 1 UrhG / Art. 5 Abs. 1 RL 2009/24/EG
Notwendige Handlungen für die bestimmungsgemäße Benutzung einschließlich Fehlerberichtigung können ohne Zustimmung zulässig sein, soweit keine besonderen vertraglichen Bestimmungen entgegenstehen.

Policy-Wirkung:
- darf interne technische Nutzung oder Fehleranalyse stützen,
- ist kein Ersatz für Redistribution-Rechte.

### § 69d Abs. 2 und 3 UrhG / Art. 5 Abs. 2 und 3
Notwendige Sicherungskopien und berechtigtes Beobachten/Untersuchen/Testen können privilegiert sein. Entgegenstehende Vertragsklauseln sind nach § 69g Abs. 2 bzw. Art. 8 in den dort genannten Fällen nichtig.

Policy-Wirkung:
- SECURITY-/BENCHMARK-/INTEROPERABILITY-Analyse darf nicht automatisch als Lizenzverletzung eingestuft werden, wenn die gesetzlichen Voraussetzungen erfüllt sind,
- die daraus gewonnenen Befugnisse erlauben nicht automatisch Weiterverteilung.

### § 69e UrhG / Art. 6
Dekompilierung kann für Interoperabilität erlaubt sein, aber nur wenn sie unerlässlich ist, Informationen nicht leicht verfügbar sind und die Handlung auf notwendige Teile beschränkt bleibt. Gewonnene Informationen dürfen nicht zweckfremd genutzt oder für im Wesentlichen gleichartige Ausdrucksformen missbraucht werden.

Policy-Wirkung:
- nur `LEGAL_BASIS_INTEROPERABILITY` nach dokumentiertem Tatbestandscheck,
- niemals pauschale Freigabe für Reverse Engineering oder Redistribution.

## OSS-Lizenzprofile

### PERMISSIVE_NOTICE
Beispiele: MIT, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, MIT-0, Zlib.

Regel:
- Nutzung/Änderung/Distribution typischerweise weit erlaubt,
- Copyright-/Lizenz-/Disclaimer-Hinweise müssen entsprechend Originaltext erhalten bleiben, soweit die jeweilige Lizenz dies verlangt,
- kein Source-Disclosure-Gate nur wegen dieser Lizenzfamilie.

Status kann auf `ALLOW_WITH_OBLIGATIONS` wechseln, wenn Notice-Evidence vollständig ist.

### APACHE_2_0
Regel:
- Kopie der Lizenz bei Redistribution,
- modifizierte Dateien kennzeichnen,
- relevante Copyright-/Patent-/Trademark-/Attribution-Hinweise erhalten,
- vorhandene NOTICE-Anforderungen erfüllen,
- Patent-Termination-Risiko als separates Rechtsrisiko erfassen.

### MPL_2_0
Regel:
- file-level Copyleft,
- bei Distribution von Executable Form muss Source Code Form der Covered Software verfügbar gemacht und der Empfänger darüber informiert werden,
- Larger Work darf unter anderen Bedingungen stehen, solange MPL-Rechte für Covered Software nicht beschränkt werden,
- serverseitige Nutzung ohne Übertragung einer Kopie an Nutzer ist nicht allein deshalb Distribution,
- minifiziertes Browser-JS gilt nach Mozilla-Guidance als Executable Form und ist daher bei ausgeliefertem MPL-Code distributionsrelevant.

### GPL_2_0_OR_3_0
Regel:
- reine interne Nutzung bzw. reine Netzwerkinteraktion ohne Kopienübertragung löst nicht automatisch Object-Code-Redistribution aus,
- bei Conveying/Distribution von Object Code müssen die konkreten Source-Bereitstellungspflichten erfüllt werden,
- separate und unabhängige Werke in einem bloßen Aggregate werden nicht allein durch gemeinsame Distribution GPL-pflichtig,
- ob ein Bestandteil noch „separate and independent“ ist, ist eine rechtliche/technische Grenzfrage und darf nicht durch Dateipfad oder Container-Layer allein entschieden werden.

Für CAPITAL-AI bedeutet dies:
- ein GPL-Tool im Build-Image macht die Webanwendung nicht automatisch GPL,
- ein GPL-Programm im Runtime-Container macht die übrige Anwendung nicht automatisch GPL, wenn es rechtlich/technisch ein separates unabhängiges Werk im Aggregate bleibt,
- trotzdem bleiben Lizenztext- und Source-Pflichten für das GPL-Programm selbst bestehen, sofern der Container verteilt wird.

### LGPL
Regel:
- Combined-Work-/Linking-Analyse erforderlich,
- zusätzliche Rechte gegenüber GPL beachten,
- Relinking/Minimal Corresponding Source/Corresponding Application Code je konkreter Version prüfen,
- keine pauschale „LGPL = immer unkritisch“-Freigabe.

### GCC_RUNTIME_EXCEPTION
Regel:
- zusätzliche Erlaubnis nur im konkreten Scope der GCC Runtime Library Exception,
- darf nicht pauschal auf andere GPL-Komponenten im Container übertragen werden,
- bei erfüllten Bedingungen kann die Exception die Copyleft-Wirkung für bestimmte Runtime-Kombinationen begrenzen.

### OFL_1_1
Regel:
- Nutzung und Einbettung zulässig nach OFL-Bedingungen,
- bei Distribution von Font-Dateien Copyright- und Lizenzhinweise beilegen,
- Reserved Font Names bei Modifikationen beachten,
- bloßes Verwenden unveränderter Fonts löst keine Pflicht aus, die Anwendung unter OFL zu stellen.

### CC_BY_4_0_DATA
Regel:
- Attribution, Lizenzhinweis, Änderungskennzeichnung und Link/Referenz auf Lizenz soweit anwendbar,
- Daten-/Content-Lizenz getrennt von Software-Lizenz behandeln,
- nur tatsächlich ausgelieferte Datenbestände aktivieren das Frontend-/Redistribution-Gate.

## Statusmodell

`LEGAL_POLICY@1` kennt:

- `ALLOW`
- `ALLOW_WITH_OBLIGATIONS`
- `LEGAL_REVIEW_REQUIRED`
- `BLOCKED`

### ALLOW
Rechtsgrundlage und Nutzungsscope sind dokumentiert; keine offenen obligations.

### ALLOW_WITH_OBLIGATIONS
Nutzung/Distribution ist zulässig, aber konkrete Pflichten wie LICENSE/NOTICE/Attribution/Source Offer müssen vor Release erfüllt sein.

### LEGAL_REVIEW_REQUIRED
Rechtslage hängt von ungeklärter Tatsachenfrage ab, z. B.:
- modified vs. unmodified,
- linking/combined work,
- public vs. private distribution,
- tatsächlich ausgelieferte Datei,
- zusätzliche Vertrags-/Providerbedingungen,
- AGPL/network copyleft,
- Marken-/Patent-/Datenbankrechte.

### BLOCKED
Keine ausreichende Rechtsgrundlage, inkompatible Lizenzbedingungen, nicht erfüllbare zwingende Distribution-Pflicht oder widersprüchliche Rights Evidence.

## Policy-Gates

Für einen Candidate Digest müssen mindestens bewertet werden:

1. `PROVENANCE_VERIFIED`
2. `SBOM_VERIFIED`
3. `SECURITY_GATES_PASS`
4. `LEGAL_USAGE_RIGHTS`
5. `LEGAL_DISTRIBUTION_CLASSIFIED`
6. `LICENSE_OBLIGATIONS_SATISFIED`
7. `SOURCE_OFFER_SATISFIED` — nur wenn tatsächlich erforderlich
8. `NOTICE_ATTRIBUTION_SATISFIED` — nur wenn tatsächlich erforderlich
9. `LEGAL_SCOPE_UNAMBIGUOUS`

`decisionEligible:true` ist nur zulässig, wenn keine Pflicht-Gates offen sind.

## Abschwächung gegenüber bisherigem Gate

Die bisherige Policy kann in folgenden Punkten sachlich präzisiert werden:

1. **Build-only ist nicht Runtime-Distribution.** Reine Build-Abhängigkeiten dürfen aus dem Runtime-Redistribution-Gate herausfallen, wenn nachgewiesen ist, dass sie nicht ausgeliefert werden.
2. **Server-only ist nicht automatisch Endnutzer-Distribution.** Eine über das Netz angebotene Funktionalität ist lizenzabhängig anders zu bewerten als ausgelieferter Browser-Code.
3. **Copyleft-Scope statt Container-Pauschalität.** GPL/LGPL/MPL werden nach tatsächlichem Werk-/Datei-/Linking-Scope bewertet, nicht allein nach „im Image gefunden“.
4. **Zusätzliche Permissions zählen.** GCC Runtime Library Exception, Dual-/Multi-Licensing oder explizite Zusatzrechte werden versionsgebunden berücksichtigt.
5. **Gesetzliche Befugnisse zählen.** § 69d/69e UrhG können Analyse, bestimmungsgemäße Nutzung oder Interoperabilität legitimieren, ersetzen aber keine Redistribution-Lizenz.
6. **Pflichten nur aktivieren, wenn Trigger vorliegt.** Source Offer, NOTICE oder Attribution werden nicht pauschal verlangt, sondern bei einschlägiger Lizenz und tatsächlicher Nutzung/Distribution.
7. **Unklarheit bleibt fail-closed.** Der präzisere Scope reduziert False Positives, nicht die Beweislast für reale Distribution.

## GHCR-spezifische Regel

Ein öffentlich zugängliches GHCR-Image ist als Distribution zu behandeln. Für jede im Image enthaltene Komponente wird daher geprüft:

- ist sie nur Aggregate-Bestandteil oder Teil eines kombinierten/abgeleiteten Werks,
- welche Lizenz gilt für genau die enthaltene Version,
- welche LICENSE/NOTICE/Attribution ist erforderlich,
- ob Corresponding Source angeboten werden muss,
- ob eine zusätzliche Permission/Exception greift,
- ob die Evidence exakt an den Image-Digest gebunden ist.

Für rein interne Build-Artefakte darf ein separater, engerer Scope gelten.

## Evidence

Jede Entscheidung muss mindestens enthalten:

- component
- exactVersion
- artifactIdentity
- licenseExpression
- selectedLicense
- usageClass
- distributedTo
- modified
- linkingMode
- legalBasis
- obligations
- evidenceRefs
- legalStatus
- reviewer
- reviewedAt
- reEvaluateOn

Die maschinenlesbare Fassung liegt in `docs/security/legal-policy-v1.json`.

## Grenzen

Diese Policy ist ein technisches Governance-Instrument. Sie darf Rechtsfragen strukturieren und belastbare Freigaben automatisieren, aber keine ungeklärte Rechtsfrage durch Modell- oder Policy-Text „entscheiden“. Bei ernsthaft streitigem Copyleft-Scope, Marken-, Patent-, Datenbank-, Provider- oder Vertragsrecht bleibt `LEGAL_REVIEW_REQUIRED`.
