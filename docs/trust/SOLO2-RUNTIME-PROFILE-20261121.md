# SOLO2 Runtime-Profil @1 — CLI und Owner-Weboberfläche

**Scope:** ausschließlich \`SvenKulessa/Capital-AI\`. Root \`AGENTS.md\` / \`SOLO_MAINTAINER_FLOW@2\` bleibt autoritativ. Dieses Profil ist **DECLARATION_ONLY** und aktiviert keinerlei externe Aktionen, Account-Verknüpfung, zusätzliche Security-Gates oder Kundenworkloads.

## Ein gemeinsamer Vertrag

- \`shared/solo2-config.mjs\`: dieselbe strenge JSON-Validierung für Webimport/-export und CLI; keine Secrets, Tokens, Webhook-URLs, API-Keys oder vom Profil selbst behauptete Freigaben.
- \`scripts/solo2-config.mjs\`: lokale Datei mit Verzeichnis \`0700\` und Datei \`0600\`; atomare Updates. Kein Netzwerk, keine Prozessausführung, kein automatischer Cloud-Sync.
- \`src/components/Solo2RuntimeConfigurator.tsx\`: unter vorhandener Owner-Navigation **Control Center → Tools & Anwendungen → Skills & Orchestrierung**. UI speichert keinen Serverzustand oder Browser-Storage. Ein Webexport lässt sich im CLI verwenden; ein CLI-Export lokal wieder in das Webformular laden. Quelle ist der gelesene, nicht notwendigerweise produktiv ausgelieferte GitHub-SHA.

### Konfigurationsvariablen

| JSON-Feld | Bedeutung | Rechtegrenze |
|---|---|---|
| \`sourceSha\`, \`repository\`, \`tenantRef\` | Repository-Revision und **deklariertes** Tenant-Routing | keine IAM-/Owner-Autorität |
| \`mode\` | \`OFFLINE_LOCAL\` oder \`HYBRID_REVIEW\` | beide ohne Runtime-Aktivierung |
| \`offline.rootAgent\` | vorhandener Python-LangGraph (fixiert) | keine unbegrenzte Root-/Shell-Berechtigung |
| \`offline.modelRef\`, \`offline.ragRef\` | lokale Modell-/Wissensindex-Aliasse | Vorhandensein, Tenant-Rechte, Lizenz: NOT_PROVEN |
| \`online.enabled\`, \`online.ciPollSeconds\`, \`online.maxExternalCalls\` | verbindungsbezogene Variablen | \`false\`, mindestens 30 s, höchstens **0** Anrufe |
| \`domains\`, \`skills\` | deklarative Auswahl aus Registry | TRUST obligatorisch, keine Skill-Autorisierung |
| \`resources[].id/kind/owner/selected\` | Plugin, Engine, Orchestrator, Kunden-/Betreiberressource | **Auswahl ≠ Anschluss** |
| \`resources[].requestedRight\` | \`NONE\`, \`READ_REQUESTED\`, \`EXECUTE_REQUESTED\` | nur Anfrage, **nie** GitHub-/Providerrecht |
| \`resources[].licenseEvidence/rightsEvidence\` | \`NOT_PROVEN\` oder \`REVIEW_REQUIRED\` | \`VERIFIED\` lässt sich nicht per JSON erteilen |
| \`pipelines[].selected\` | Routingkandidaten für Growth, Media, CADS, CI, RAG, n8n, TinyFish | keine Pipeline-Ausführung |
| \`limits\`, \`safeguard\` | Retry, Budget, Publisher und tatsächliche Authority | 0 EUR, 0 Autorität, kein Publish |

### Quellen/Engine-Mapping

- Offline Root: \`scripts/growth-agent/auto_loop.py\`, \`scripts/growth-agent/agent_platform.py\` und vorhandener SQLite-Checkpoint.
- Growth Intelligence: \`src/contracts/growthIntelligenceContent.ts\`; Content/CADS: \`src/contracts/contentEngine.ts\`, \`packages/benchmark-core/growth-quality.mjs\`.
- Social: \`src/contracts/socialPublisherAdapter.ts\` (alle Adapter weiterhin \`IMPLEMENTED_DISABLED\`). Medien: \`scripts/growth/growth-intelligence-image-drafts.mjs\` (DRAFT_ONLY).
- n8n: **nur externer interner Orchestrator-Kandidat**. n8n ist fair-code / Sustainable Use License; das Einbetten als Kundenplattform-Feature kann eine gesonderte kommerzielle Vereinbarung erfordern. Nicht als Open-Source-Redistributionsfreigabe behandeln.
- TinyFish: **nur externer Browser-Agent-Kandidat**. Jede tatsächliche Sitzung braucht getrennte kundenseitige Autorisierung, Tenant-Bindung, erlaubte Ziele und beobachtbare Ausführung. Diese Konfiguration stellt keine Browser-Sitzung her.
- GitHub/Render, Metricool/Supermetrics: nur konfigurierbare Plugin-IDs; nichts wird verbunden oder freigeschaltet. Bereits existierende Plugins im Chat sind nicht gleichbedeutend mit produktiven Service-Credentials.

## Offline-CLI, ohne Credentials

Im vertrauenswürdigen Repo-Arbeitsverzeichnis mit Node.js:

\`\`\`bash
mkdir -p -m 700 "$HOME/.config/capital-ai/solo2"
FILE="$HOME/.config/capital-ai/solo2/profile.json"
MAIN_SHA="$(git rev-parse main)"   # tatsächlichen SHA vor Ort prüfen
node scripts/solo2-config.mjs init --file "$FILE" --source-sha "$MAIN_SHA"
node scripts/solo2-config.mjs set --file "$FILE" --key mode --value HYBRID_REVIEW
node scripts/solo2-config.mjs set --file "$FILE" --key resources.n8n.selected --value true
node scripts/solo2-config.mjs set --file "$FILE" --key resources.tinyfish.owner --value CUSTOMER_RESOURCE
node scripts/solo2-config.mjs set --file "$FILE" --key resources.tinyfish.requestedRight --value READ_REQUESTED
node scripts/solo2-config.mjs set --file "$FILE" --key offline.modelRef --value CUSTOMER_MODEL_NOT_PROVEN
node scripts/solo2-config.mjs set --file "$FILE" --key offline.ragRef --value CUSTOMER_RAG_NOT_PROVEN
node scripts/solo2-config.mjs validate --file "$FILE"
\`\`\`

Das lokale Profil kann über \`show\` als geprüftes JSON ausgegeben und im privaten Webformular importiert werden. Beim Profil-Import wird der \`sourceSha\` gegen den aktuellen Katalogstand geprüft.

## Akzeptanz, E2E und Grenzen

\`node --test scripts/solo2-config.test.mjs\` deckt Schema, Skill-Registry-Drift, fremdes Projekt, gefälschte Rechte und Lizenzen, Secret-Felder, zu kurze Poll-Intervalle, kostenpflichtige Calls, doppelte Ressourcen sowie private Dateien ab. Die neuen Tests hängen im bestehenden \`npm test\`-Weg; kein neuer Required Check.

**Status dieses Slices** ist \`CONTROL_PRESENT\`, nach erfolgreichem Repository-Test \`CONTROL_TESTED\`, bei erfolgreichem tatsächlich ausgeführtem GitHub-Check \`CI_VERIFIED\`. Kunden-Modelle, Worker-Host, echter RAG-Index, OAuth-Berechtigungen, Browser-Session, n8n-Lizenz, Produktiv-Readbacks und Kosten bleiben \`NOT_PROVEN\` oder \`BLOCKED\` bis separates Evidence-Readback. Der bestehende Python-Graph übernimmt **keine** Rechte aus dieser JSON-Datei.

**Rollback:** Feature-Commit/PR-Revert; keine neuen Datenbanken, Secrets, externen Accounts, produktiven Jobs, Provider-Aktivierungen oder migrationsbedingten Rücknahmen nötig.
