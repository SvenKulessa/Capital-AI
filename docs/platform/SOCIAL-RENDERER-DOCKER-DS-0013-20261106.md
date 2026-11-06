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
