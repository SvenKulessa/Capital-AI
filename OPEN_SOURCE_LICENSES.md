# OSS-Verzeichnis — Umfang und Nachweisgrenzen

Stand: 01.10.2026. Quelle des Importentwurfs:
SvenKulessa/FRONTEND@b0e2ab3a5d02882e0fa099af6899ccfe41d2801a.

Das ursprüngliche Verzeichnis erfasst ausgewählte Kernbibliotheken. Es ist kein
vollständiges Inventar aller transitiven Pakete, Fonts, globalen Buildtools oder
OS-Binaries. Deren tatsächliche Versionen folgen dem jeweiligen Lockfile und
dem endgültigen Image-SBOM. Insbesondere wird TypeScript 7.0.2 aus FRONTEND
nicht als Version von Capital-AI übernommen; keine Dependencies werden geändert.

Die Behauptung „100 % permissiv / GPL-frei“ gilt nicht für den gesamten
Container. LICENSE-RIGHTS.md dokumentiert unter anderem BusyBox-, musl-utils-
und GCC-Befunde mit separaten Bedingungen. Copyleft bedeutet nicht automatisch
Unzulässigkeit von SaaS; für verteilte Binaries sind die jeweiligen Pflichten
versions- und dateibezogen zu erfüllen.

## Bestehende Nachweise

- docs/security/LICENSE-RIGHTS.md: Basisimage, OS-Rezepte und offene Quellenpflichten.
- docs/security/LICENSE-REVIEW.md: technischer Review und Abnahmegrenzen.
- docs/licenses/node-v24.19.0-LICENSE.txt: Originalhinweise zur Node-Version.
- public/fonts/OFL.txt und provenance.json: gepinnte Originalfonts und Herkunft.
- Workflow-Artefakte des endgültigen Kandidaten: vollständiges SBOM und Lizenzscan.

Der FRONTEND-Entwurf bleibt als ungeprüfte Originalquelle archiviert. Seine
Mustertexte ersetzen keine vollständigen paketbezogenen Originaltexte; sein
verkürzter Apache-Hinweis ist kein vollständiger Apache-2.0-Lizenztext.
Kein APPROVED-Vermerk und keine Änderung am Production-Handoff.
