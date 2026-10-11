## Primary Domain
<!-- PRODUCT | MARKET | PLATFORM | TRUST | GROWTH -->
Domain:

## Change Type
<!-- Labels remain functional, not domain-based: Bug, Fix, Patch, Security, Feature, Docs, Dependencies, Release, Breaking -->
Type:

## Decision
Was wird geändert und warum?

## Evidence
Welche Tests, Dateien, Provider-Readbacks oder Runtime-Nachweise belegen den Zustand?

## Technical Evidence
- Source SHA:
- Betroffene Komponente(n):
- Contract-/Schema-Auswirkung:
- Deploy erforderlich: ja/nein
- Falls Deploy: App / NATS / andere:

## Cross-Domain Impact
Welche anderen Domains werden berührt? Jeder Domain-Chat darf die gesamte Änderung übernehmen. Die Primary Domain beschreibt den Schwerpunkt von Branch und PR. Organisatorische Chat-Handoffs und separate Domain-Abnahmen sind nicht erforderlich; technische Security-, Lizenz- und Production-Gates gelten unverändert.

## Chat-Auftrag → abnahmefähige Wirkung
<!-- Kein zusätzlicher Gate: dient einer prüfbaren, vollständigen PR-Beschreibung. -->
- Nutzerziel und tatsächliches Verhalten nach Merge:
- Betroffener Scope / bewusst unveränderter Scope:
- Beobachtbare Akzeptanzkriterien (möglichst mit Testpfad):
- Rückverfolgbare Folgeaufgaben (nur echte, nicht in dieser PR versteckte Arbeit):

## Ausführung und Qualität
- Konkrete geänderte Pfade und Ergebnis:
- Ausgeführte Tests (Befehl, Ergebnis, getesteter SHA):
- GitHub Required Checks: Docker Security Gate = PENDING / PASS / FAIL / NOT_PROVEN; Domain Governance = PENDING / PASS / FAIL / NOT_PROVEN
- Pipeline-Laufzeit gegen vergleichbaren Lauf (gemessen / NOT_PROVEN):
- Status getrennt: CODE_PRESENT / TEST_PASS / RUNTIME_VERIFIED / PRODUCTION_READY / NOT_PROVEN

## Website- und Monetarisierungs-Plausibilität (nur falls betroffen)
- Angebot, CTA, tatsächlicher Preis, Checkout-/Entitlement-Pfad:
- SEO, Navigation, Mobile, Accessibility und reale Browser-Evidence:
- Claims, Nutzungsrechte, Lizenz-/Datenherkunft und Legal-Receipt:
- Nicht nachgewiesene Aussagen ausdrücklich als NOT_PROVEN kennzeichnen.

## Release, Dokumentation und Rücknahme
- VERSION / CHANGELOG / Release-Note relevant: ja / nein; begründet:
- Living Docs, Verträge, Migrationen und erwartete Versionsänderungen:
- Production-/Runtime-Nachweis erforderlich: ja / nein; konkreter Readback:
- Rollback: betroffene Komponente und sichere Rücknahme ohne andere Services:
- Sicherheits-/Secrets-/Kostenfolgen und ggf. Owner-Handlung:

<!-- Jeder berechtigte Agent darf erst nach vollständiger reproduzierbarer fachlicher Evidence, konfliktfreiem aktuellem Head, allen erfolgreichen anwendbaren Checks und GitHub-Ruleset-Konformität selbst mergen. Keine zusätzliche Owner-Einzelfreigabe und keine neuen Gates. Live-Wirkung separat nachweisen. -->
