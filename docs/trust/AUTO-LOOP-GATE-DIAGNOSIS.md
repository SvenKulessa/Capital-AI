# CAPITAL_AI_AUTO_LOOP_GATE_DIAGNOSIS@1

Fehlgeschlagene Docker-Security-Gates stoppen den Agent Loop nicht mehr an einer Informationsluecke. Der Prozess bindet Run, offenen PR, exakten Head-SHA und fehlgeschlagenen Job fail-closed, laedt das exakte Job-Log, entfernt bekannte Credential-Muster und erzeugt eine deterministische Diagnose mit SHA-256-Fingerprint.

Nur belegte transiente Kategorien duerfen genau einmal automatisch mit Debug-Logging neu ausgefuehrt werden. Security-, Test-, Build- und Driftfehler werden niemals durch Reruns, Check-Manipulation oder Ruleset-Bypass verdeckt. Unbekannte Fehler bleiben `UNKNOWN_REPRODUCTION_REQUIRED`; der Loop darf parallel andere PRs bearbeiten.

Unveraenderliche Grenzen:
- `securityGateBypassAllowed=false`
- keine Abschwaechung von Required Checks oder Branch Protection
- keine Secrets in Kommentar oder Artefakt
- keine Produktions-, Provider-, Billing- oder Deployment-Autoritaet
- kein automatischer Patch allein aufgrund eines Textmusters
- jeder Reparaturcommit erfordert Current-HEAD, neue CI und atomaren Merge-Schutz
