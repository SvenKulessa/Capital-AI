# CAPITAL-AI PLATFORM – Worker-Readback und Prozessneustart (15.11.2026)

**Evidence baseline:** GitHub Main `d35a9d68f976500957e7bd9edd612b2e19b0bcdd`.
Diese Momentaufnahme ist keine Freigabe für später abweichende Main-SHAs.

## P0: Runtime und Berechtigungen

Das vorhandene Repo implementiert `scripts/growth-agent/run_reviewed_pr.py`
mit einem festgelegten lokalen Pfad `/var/lib/capital-ai-agent`. Das Programm
verlangt für einen Merge ein aktuelles, privates, auf PR und Head/Base-SHA
gebundenes Assessment und Zugriff auf GitHub. `provider_adapters.SafeHTTP`
bindet GitHub/Render an feste HTTPS-Hosts und erlaubt nur einen SHA-geprüften
GitHub-PR-Merge; der Render-Adapter liest bestehende Deployments und Health.
Der `execute_durable`-Pfad verwendet SQLite, single-writer-Locking und
private Dateiberechtigungen, keine neue Datenbank oder laufende Providerkosten.

Bei dem lesenden Render-Inventar am 15.11.2026 wurden `Capital-AI`
(Webservice), `capital-ai-provider-bridge` (bestehender Background-Worker)
und `capital-ai-market-events` (Private Service) beobachtet. Ein dedizierter
LangGraph-Agentenservice mit aktivem Entrypoint `run_reviewed_pr.py` war
nicht nachgewiesen. **Ein vorhandener Worker anderer Funktion ist kein
Beleg für einen aktiven LangGraph-Worker.** Die aktuellen
Dateiberechtigungen auf dessen Host und Token-Scopes bleiben `NOT_PROVEN`.

`python3 scripts/growth-agent/worker_readiness.py` ist eine *read-only*
Vor-Ort-Prüfung der privaten Worker-Verzeichnisse auf dem **autorisierten
Worker-Host**. Sie legt nichts an, enthält keine Tokens im Output und
behauptet weder Provider-Berechtigung noch laufenden Worker. Die
synthetischen Tests prüfen fehlende, öffentliche und symlink-basierte
Verzeichnisse. Auf einer fremden CI-VM ausgeführt ist der Befund
**keine** Abnahme des produktiven Hosts.

## P1: tatsächlich getrennte Python-Prozesse

`python3 -m unittest discover -s scripts/growth-agent -p 'test_*.py'`
enthält `test_process_restart.py`: Prozess A unterbricht nach
`MERGE_READY` und schreibt einen SQLite-Checkpoint; Prozess B startet
mit demselben Thread neu und führt den synthetischen Ablauf zu Ende;
Prozess C öffnet den abgeschlossenen Thread erneut und darf keine zweite
synthetische Mutation erzeugen. Negativtest: Wiederanlauf mit entzogener
Merge-Berechtigung führt zu `BLOCKED` statt Merge. Keine echten GitHub-
oder Render-Schreibaktionen. Diese Tests sind die **isolierte**
Wiederanlaufabnahme, nicht die Vor-Ort-Abnahme eines produktiven Workers.

## P1: Main/Render/BuildIdentity-Korrelation

Der letzte geprüfte Render-Webservice-Deploy
`dep-dbsveo95efls73f85sbg` war `live` und an Main
`d35a9d68f976500957e7bd9edd612b2e19b0bcdd` gebunden. Render
meldete Deploy-Ende am 15.11.2026 18:19:09 UTC.
Die Anwendungslogs der Instanz `srv-dau1rp893c1s73cdhm1g-88fd8`
enthielten denselben `sourceSha` und erfolgreiche HTTP-`GET` mit 200.
Dieser Log-Befund belegt **nicht automatisch**, dass der Pfad
`/healthz` separat über HTTP abgefragt wurde. Ohne einen passenden
Readback mit `buildIdentity.bound: true`, immutable OCI
`platformManifestDigest` sowie dazu korrelierbarer Registry-Attestation
bleibt vollständige Runtime-Provenance `NOT_PROVEN`.

## Rollback / Grenzen

Kein neues Required Gate, kein zweiter Scheduler, keine neuen Render-
Ressourcen, keine Secret-/OAuth-/SQL-Mutationen. Der isolierte Test-Slice
lässt sich durch Commit-Revert zurücknehmen. Bevor eine echte Worker-
Aktivierung erfolgt, müssen Host-/IAM-Scope, Kosten, Restart-Policy,
privates Volume und Recovery-Plan separat mit Echt-Evidence feststehen.
