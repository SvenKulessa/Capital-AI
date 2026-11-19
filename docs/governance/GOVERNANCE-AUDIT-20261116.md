# Governance-Baseline – Audit vom 16.11.2026

**Status: NON-AUTHORIZING / dokumentarische Referenz.** Quelle: Governance-Paket vom 16.11.2026, abgeglichen gegen `main@6af7a4fc05259664f3a9b61d2f023b38efa3ff62` und Root-`AGENTS.md` (`SOLO_MAINTAINER_FLOW@2`).

**Vorrang:** Allein die aktuelle Root-`AGENTS.md` ist repositoryweit autorisierend. Dieser Audit fügt weder Required Checks noch Pflichtreviews, Freigaben, Admissions, Handoffs, Mergebedingungen, Schreibverbote oder Produktionsrechte hinzu. Bestehende delegierte Agenten-Merge-Rechte und der Main-Produktionspfad bleiben unverändert. Die fünf unten genannten Perspektiven sind keine Gates.

## Bestandsabgleich

| Bereich | Bereits vorhanden | Offener Nachweis |
|---|---|---|
| Maintainer | `AGENTS.md`, `ACTIVE_CONSERVATIVE` | effektive Rechte jedes Tool-Actors |
| Branch/CI | aktives Main-Ruleset 24259174; `Docker Security Gate`, `Domain Governance` | aktueller Run je PR-Head |
| Supply Chain | `package-lock.json`, Lizenztests, CycloneDX-SBOM und Attestations im bestehenden Security-Workflow | Digest-Korrelation zum jeweiligen LIVE-Deployment |
| History | `VERSION`, Git-SHAs, CI- und OCI-Evidence | vollständiger Runtime-Readback |
| MCP | `.mcp.json`: `capital-ai-gsc`, `capital-ai-google-maintenance` | tatsächliche Providerrechte |
| Azure SQL / Cosmos DB | Architekturabsicht | aktiver Provider, Rollen und technische Schreibgrenzen nicht nachgewiesen |

## Fünf unverbindliche Analyseperspektiven

1. **Scope:** Akteur, Skill, Ziel, Datenklasse, erlaubte Wirkung.
2. **Supply:** Bibliothek, Version/Lock, Herkunft, Lizenz und bestehende SBOM-Evidence.
3. **Quality:** echte Positiv-/Negativtests, Exit-Codes, vorhandene CI-Links.
4. **Authority:** tatsächliche Tool-/Providerrechte, separate Owner-Autorisierung nur wo `AGENTS.md` oder der konkrete Auftrag sie fordert.
5. **Evidence:** Baseline-/Head-SHA, Run-URL, Artefakt-Hash, anwendbarer Runtime-Readback.

Diese fünf Perspektiven sind **kein behaupteter Gartner-Standard** und **keine neuen Prüfbedingungen**. Bereits bestehende Evidence wird verlinkt, nicht kopiert. Fehlende Daten in Audit-Tabellen erhalten `NOT_PROVEN`, statt einen erfolgreichen Lauf zu behaupten.

## Historie und technische Schutzmodelle

- **Historie:** Git-Commit, CI-Run, SHA-256, SBOM/Attestation und gegebenenfalls Runtime-Digest getrennt benennen. Kein Build-0-Label ohne konkretes Artefakt.
- **Technik:** effektiv durchgesetzte GitHub-Rulesets, Provider-IAM und vorhandene Trust-Boundary-Tests sind maßgeblich. Dokumente oder Prompts erzeugen keine Berechtigungen.
- **Kosten und Secrets:** vorhandene `AGENTS.md`-Grenzen bleiben maßgeblich. Kein Abruf von Secret-Werten; nur bereinigte Metadaten.
- **Social/SEO und MCP:** als getrennte Berechtigungs- und Datenflussbereiche inventarisieren; keine neue Integration oder Rechtevergabe durch diese Notiz.
- **Azure SQL:** nur geplantes Rollenmodell (separate Dienstidentität, minimale Tabellenrechte), keine Aussage über bereits eingerichtete Azure-Ressourcen.

Optionale Referenzvorlagen in diesem Verzeichnis: `MAINTAINERS.reference.yaml`, `AGM.template.yaml`, `requirements.toml.example` und `BUILD-HISTORY-20261116.md`. Keine Datei wird von bestehenden Workflows als neues Gate eingebunden.
