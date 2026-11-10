# Exakte OS-Quellen-Evidence für PR #624 (read-only)

Evidence: GitHub Actions #42795508369, Artifact #13753449500; historisches lokales Runtime-Image `sha256:239009f5bcf4261131246715d101a0d8792c6ae6e353272fd745a63bf60312db`, nicht der OCI-Registry-Manifest-Digest.

Der Lock bindet 34 installierte Alpine-Binärpakete an 21 versionsgleiche `main/<quellpaket>/APKBUILD`-Dateien im offiziellen `alpinelinux/aports`-Repository. Alle 21 APKBUILD-Versionen und Git-Blob-Identitäten wurden gegen ihre `c:`-Build-Commits geprüft. Reproduzierbare Quellenbereitstellung erfordert zusätzlich die echten externen Archive und Alpine-Patches mit vollständigen SHA-512-Prüfungen.

## Reproduzierbarer Offline-Check

Nach beschränkter Beschaffung in einem isolierten, netzwerkfähigen Source-Runner (ohne Secrets und ohne Veröffentlichung) das folgende Layout bereitstellen:

```text
mirror/<sourcePackage>/APKBUILD
mirror/<sourcePackage>/<lokale Alpine-Patches und Config-Dateien>
mirror/<sourcePackage>/distfiles/<externe Quellarchive>
```

Die APKBUILD-Datei **muss** aus dem im Lock genannten unveränderlichen `aportsCommit` stammen. Für die jeweilige Buildumgebung ist `abuild fetch verify` im isolierten Alpine-SDK-Container eine mögliche Beschaffungs-/Prüfmethode; externe APKBUILDs sind Shell-Code und dürfen nicht auf privilegierten Produktionsrunnern oder mit Secrets ausgeführt werden.

Danach (mit der unveränderten Original-`os-source-inventory.json` aus Artifact #13753449500):

```sh
node scripts/verify-os-source-mirror.mjs \
  docs/security/evidence/os-aports-recipe-lock-20261110.json \
  os-source-inventory.json mirror os-source-verification.json
```

Der Prüfer führt keinerlei Netzwerk- oder Shell-Operationen aus, kontrolliert die Git-Blob-SHA-1-Identitäten der Rezepte und die deklarierten SHA-512-Dateihashes. Fehlende Dateien oder abweichende Digests bleiben BLOCKED. Auch ein vollständiger SHA-512-Check beweist ohne separate rechtliche/technische Prüfung **noch keine** vollständigen Corresponding Sources, sämtliche Original-Notices oder Weiterverteilungsrechte. Für Alpine-Quellrezeptdateien ohne `sha512sums` ist die abweichende Beschaffungsmethode gesondert zu dokumentieren.

Dieser Lock ist nur auf die bereits geprüfte lokale Image-Config-ID bezogen. Für eine spätere unveränderliche öffentliche Image-Lieferung ist ein **separater** Registry-Manifest-Digest samt Export- und Bundle-Bindung nachzuweisen. Der existierende Publish-Guard bleibt `REVIEW_OPEN`, `deployEligible:false`.

## Noch offen

- Externe Quellarchive aus den gepinnten Rezepten tatsächlich beschaffen, Hashes prüfen und zusammen mit allen zur Build-Reproduktion erforderlichen Inputs archivieren.
- Gegen die tatsächlichen Binärdateien und deren Lizenzen die vollständigen Corresponding Sources/Notices mit Lizenzfachprüfung abgleichen.
- Nach einer zulässigen Veröffentlichung das Quellen-/Notice-Paket an den echten OCI-Manifest-Digest binden.
- Brand-/Bild-/Marktdaten-Redistributionsrechte separat dokumentieren, ohne die Paketprovenienz als Zustimmung umzudeuten.
