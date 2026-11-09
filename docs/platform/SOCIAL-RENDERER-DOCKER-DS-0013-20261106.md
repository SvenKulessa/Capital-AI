# Social Renderer Docker – DS-0013 / DS-0026

Stand: 2026-11-06 · Primary Domain PLATFORM, related GROWTH/TRUST  
Status: **IN_PROGRESS – PR CI/Renderer build evidence pending**.

## Ausgangslage

Der aktive, getrennt vom Web-Image gebaute Social-Media-Renderer `deploy/social-media/Dockerfile.renderer` verwendete im FFmpeg-Source-Build `&& cd "ffmpeg-${FFMPEG_VERSION}"`, was den nicht blockierenden Trivy-Konfigurationshinweis `DS-0013` (MEDIUM, WORKDIR statt RUN cd) auslösen kann. Die produktive App (`Dockerfile`), das Security-Image (`Dockerfile.security`) und der PR-Agent haben bereits geeignete HEALTHCHECKs; die deaktivierte NATS/Provider-Bridge wird nicht geprüft oder aktiviert.

## Änderung

- Die per `ARG FFMPEG_VERSION` benannte Source-Workdir wird ausdrücklich als `WORKDIR /tmp/ffmpeg-${FFMPEG_VERSION}` deklariert.
- Das SHA-256-geprüfte offizielle FFmpeg-Quellarchiv bleibt dieselbe immutable Quellversion aus `deploy/social-media/ffmpeg-build-profile.json`; `tar -xJf ffmpeg.tar.xz --strip-components=1` entfernt lediglich das äußere `ffmpeg-VERSION/`-Verzeichnis beim Entpacken in die aktuelle Workdir.
- `configure`-Flags für die LGPL-only Shared-Build-Variante, dynamische Laufzeitbibliotheken, nicht-root Runtime UID 10001, offline Smoketests und sämtliche Rechte bleiben unverändert.
- Der bestehende `Social Renderer Worker Evidence`-Workflow führt den neuen gezielten Dockerfile-Regressionstest aus und baut danach das reale Image, überprüft FFmpeg/ffprobe/Encoding, LGPL-Profil, Source-Hash, Runtime- und Supply-Chain-Scans.

## DS-0026 – begründete Nichtänderung

Das Renderer-Runtime-Image ist kein dauerhaft bereitgestellter Service. Es läuft als bedarfsweise gestarteter, nicht-root Offline-Medienjob und beendet sich nach der Arbeit. Ein periodischer Docker-`HEALTHCHECK` würde für diesen einmaligen Job keinen aussagekräftigen Dienst-Gesundheitszustand abbilden; ein solcher Check wird **nicht** nur zum Unterdrücken von LOW-Scannerhinweisen ergänzt. Bei einer späteren dauerhaft laufenden Worker-Architektur ist ein echter funktionaler Healthcheck neu zu bewerten.

## Abnahme / Nichtbehauptung

- Statischer Repository-Readback: WORKDIR, SHA-256-Verifikation, Archivpfad, kein RUN cd und UID 10001: **VERIFIED for inspected source**.
- `node --test scripts/social-renderer-dockerfile.test.mjs`, echte `docker build`-Ausführung, Trivy und Lizenz-/Render-Smoke: **NOT_PROVEN bis CI-Ergebnis**.
- Kein NATS-Image-Build, keine NATS-Tests, kein Broker-Enablement, keine neue CI-Pflichtstufe oder kostenpflichtige Aktivierung.
- Rollback über geschützten Revert-PR. Für den Bereich NATS gilt ausschließlich die separate Pausierung aus PR #591.

Referenzen: https://avd.aquasec.com/misconfig/dockerfile/general/ds-0013/ und https://avd.aquasec.com/misconfig/dockerfile/general/ds-0026/.

## Security-Gate-Follow-up 2026-11-06

Echter `Social Renderer Worker Evidence`-PR-CI-Run 42291228594 (Job 128144866489) hat FFmpeg 9.0.2 kompiliert, Source-Integrität, LGPL-Profil, Binary-Identität und non-root Offline-Runtime-Smoke erfolgreich geprüft. Anschließend meldete Trivy auf dem tatsächlichen Runtime-Image **zwei HIGH-Findings** `CVE-2026-107891`: Alpine `musl 1.2.5-r12` und `musl-utils 1.2.5-r12`, jeweils `fixed=1.2.5-r13`; `blocking=2` führte korrekt zu **FAIL**. Der erste CI-Lauf ist deshalb ausdrücklich kein Security-PASS.

Der Scope-PR ergänzt im **aktiven Renderer-Runtime-Stage** `apk add --no-cache 'musl>=1.2.5-r13' 'musl-utils>=1.2.5-r13'` und Regression-Assertions. Die neue Untergrenze ist fail-closed, falls Alpine noch keine gepatchten Pakete bereitstellt. Es wurden keine Ignore-/Severity-Ausnahmen hinzugefügt. Der aktualisierte exakte Kandidat muss im bestehenden CI noch gebaut und mit Trivy/SBOM, Lizenzprofil und Runtime erneut erfolgreich geprüft werden; bis dahin `REVIEW_REQUIRED`. Die weiterhin pausierte NATS-Komponente wurde nicht geprüft oder aktiviert.

## CI-Follow-up 2026-11-06: temporärer Upstream-TLS-Fehler

Der zweite Renderer-CI-Run 42293313857 scheiterte **vor Build und Trivy-Scan** am offiziellen FFmpeg-Source-Download mit `curl: (35) Recv failure: Connection reset by peer`. Dieses Ereignis ist kein Sicherheits-PASS, sondern ein temporärer, belegter Netzwerkfehler; Lizenz und Paket-Fix wurden dadurch nicht erneut validiert. Um Wiederholungsfehler ohne Quellenwechsel zu begrenzen, wurde im selben Dockerfile `curl --retry 4 --retry-all-errors --retry-delay 2 --retry-max-time 90 --connect-timeout 15` ergänzt. Der unveränderte offizielle HTTPS-Download wird weiterhin per **exaktem SHA-256** geprüft. Kein Mirror, kein `--insecure`, keine Hash-Abschaltung. Nächster CI-Lauf muss beide HIGH-Pakete in der realen Runtime als gepatcht bestätigen; vor diesem Nachweis bleibt der Scope `REVIEW_REQUIRED`.
