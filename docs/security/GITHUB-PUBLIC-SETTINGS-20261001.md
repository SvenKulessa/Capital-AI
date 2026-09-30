# GitHub Public Security, Enterprise und Sponsorship
Stand: 01.10.2026 (Europe/Berlin). Source: Capital-AI main@c7eb9f235c661b229439f56f543acfaab5a50c41.
Teilprüfung von GitHub-Einstellungen; keine aktuelle Runtime-, DNS- oder Lizenzfreigabe.

## Beobachteter Zustand
- Repository öffentlich, Owner SvenKulessa; kein Enterprise-Transfer erfolgt.
- main-production-protection (24259174) aktiv, keine Bypass-Akteure; PR, Thread-Auflösung, Lösch-/Force-Push-Schutz und strikt aktueller Docker Security Gate erforderlich.
- required_linear_history fehlt live. Repository erlaubt nur Merge-Commits; Squash/Rebase sind aus. Zuerst Squash erlauben, danach lineare Historie aktivieren; Repo-Konfiguration allein verändert GitHub nicht.
- Dependabot-Konfiguration auf Main vorhanden; Einstellungen für Alerts/Security Updates und Secret Scanning/Push Protection sind mit dieser API nicht einzeln bestätigt.
- SECURITY.md und CODEOWNERS fehlen im gelesenen Capital-AI-Baum. Sicherheitskontakt vor Erstellung verifizieren. Reviewpflicht erst mit tatsächlich verfügbarem unabhängigen Reviewer aktivieren.
- Finance .github/FUNDING.yml verweist auf SvenKulessa. Sponsorships-Schalter wurde nicht gelesen oder geändert. Deaktivierung betrifft nur Finance, nicht das persönliche Sponsors-Profil oder bestehende Zahlungen.
- GitHub erkennt keine Root-Lizenz (license:null). Öffentlicher Zugriff ist keine Open-Source-Lizenzfreigabe; keine Lizenz ohne Rechteabnahme hinzufügen.

## Kostenfreie Optionen und Umsetzung
| Einstellung | Empfehlung | Status / Zusatzkosten |
|---|---|---|
| Dependency graph, SBOM-Export | aktivieren / prüfen | GitHub-Funktion kostenlos; Live-Einstellung ungeklärt |
| Dependabot alerts / security updates | aktivieren / prüfen | kostenlos; Update-PRs bleiben Review-/Testpflicht |
| Dependabot version updates | gruppiert und begrenzt betreiben | Datei vorhanden; keine pauschale Freigabe von Major-Upgrades |
| Secret Scanning / Push Protection | auf Repo-Ebene prüfen und aktivieren | öffentliche Repos kostenlos; keine neue kostenpflichtige Lizenz |
| Private vulnerability reporting, SECURITY.md | vertraulichen Meldeweg einrichten | kostenlose Funktion; Kontakt noch zu bestätigen |
| Dependency review | vor Merge verwundbare Versionen erkennen | öffentliche Repos kostenlos; Workflow-Storage separat |
| CodeQL / Code Scanning | nur Option dokumentieren | Public ohne Zusatzlizenz; gemäß bisheriger Owner-Vorgabe NICHT aktivieren |
| Branch-/Tag-Rulesets | Main und akzeptierte v*-Tags absichern | kostenlos für öffentliche Repos; signierte Commits erst nach Client-/Bot-Prüfung |
| PR-Review / CODEOWNERS | echte unabhängige Reviewer voraussetzen | keine künstliche Solo-Owner-Mergeblockade |
| Actions | read-only GITHUB_TOKEN als Default, SHA-Pinning, Allow-List, Fork-Freigaben, Secrets isolieren | zusätzliche Lizenz nicht erforderlich; Live-Policies ungeklärt |
| Attestations | bestehende digestgebundene Provenance/SBOM prüfen | Public verfügbar; kein Ersatz für Runtime-Abnahme |
| Allgemeine Einstellungen | Branchlöschung nach Merge beibehalten (an); unnötige Wiki/Pages aus (bereits aus); Issues/Projects beibehalten | keine zusätzliche Lizenz; Discussions erst bei Bedarf |
| Kostenkontrolle | Standard-Runner, kurze Artifact-Retention, Cache-Limit, verbindliche Budget-/Stop-Policy | größere Runner kostenpflichtig; Storage/Cache kann Kosten erzeugen |
| Enterprise | bestehende Zielorganisation, Typ, Seats und Policys prüfen | Enterprise-Abonnement/Seats nicht kostenlos; keine Bestellung oder Trial |
| Sponsors | Finance aus, Capital-AI erst nach Transfer mit geprüftem Empfänger | persönliche Sponsoren ohne GitHub-Gebühr; Organisationssponsoren bis 6 % |

## Aktivierungsfolge und Abnahme
1. Jetzt: kostenlose Baseline prüfen, Finance-Sponsorships-Schalter ausschalten; Squash auf Repo-Ebene erlauben und required_linear_history live aktivieren. Alle existierenden Sicherheitsgates beibehalten.
2. Vor Cutover: aktuelle Source SHA, attestierten GHCR-Digest, tatsächlich gestarteten Render-Digest und Deployment-ID korrelieren; Lizenz-/Production-Gates separat schließen. Backup/Restore-Drill bleibt eigenständige Abnahme.
3. Migration: IONOS-Webrecords und Render-Domainbindungen sichern/gezielt umstellen; MX/SPF/DKIM/DMARC und MTA-STS erhalten; DNS/TLS/ZITADEL/Export sowie IONOS-SMTP prüfen.
4. Nach dokumentierter Domain-/Auth-/Altdaten-Abnahme: Finance-Webservice suspendieren und Rückweg erhalten. Danach öffentliches Repo in die verifizierte GitHub-Enterprise-Cloud-Organisation übertragen; EMU ist für dieses Public-Ziel ungeeignet. Keine Zeitfreigabe allein durch Ablauf.
5. Nach Transfer: Owner-/Repo-URLs, OIDC-Subjekte, Secrets-/App-Zugriffe, GHCR-Namespace und Render-Imagequelle prüfen; alte attestierte Digests nicht umetikettieren. Danach Capital-AI-Sponsorbutton/Empfänger prüfen und aktivieren.

## Validierung und begrenzte Selbstheilung
Vier getrennte Nachweise: Source-/API-Readback, negativer Ruleset-Regressionstest, Live-Settings-Readback und Migration/Post-Transfer-Abnahme.
Erkanntes Muster: lineare Historie plus ausschließlich Merge-Commits blockiert Delivery. Die lokale Ruleset-Prüfung erkennt fehlende Historie und fehlende lineare Merge-Methode; Live-Repo-Mergeoptionen müssen zusätzlich gelesen werden.
Keine automatische DNS-, Billing-, Enterprise- oder Sponsorship-Ausführung. Ein lokaler Test ist keine Live-Freigabe. Erst nach drei voneinander unabhängigen positiven Live-Validierungen eine begrenzte Autofix-Regel für dieses Muster erwägen.

## Primärquellen
- https://docs.github.com/en/code-security/getting-started/github-security-features
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository
- https://docs.github.com/en/enterprise-cloud%40latest/admin/concepts/enterprise-fundamentals/choose-an-enterprise-type
