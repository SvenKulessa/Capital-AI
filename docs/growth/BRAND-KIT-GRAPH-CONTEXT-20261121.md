# Growth Intelligence · Universe Brand Kit + Graph Context Drafts

Stand 21.11.2026. Domain GROWTH mit TRUST / PRODUCT / PLATFORM. Repositoryweite Autorität: **Root AGENTS.md / SOLO_MAINTAINER_FLOW@2**. Dieses Dokument ist Evidence, kein neuer Required Check.

## Scope

- `scripts/growth/brand-kit-graph-drafts.mjs` baut deterministische **X**- und **Instagram**-Entwürfe aus dem bereits integrierten Growth-Intelligence-Snapshot (CAP-GROW-005 und CAP-GROW-007) und dessen vorhandenen `buildGrowthIntelligenceDraftBundle`-Contract.
- Das vorhandene `public/branding/asset-pack/meta/social-render-tokens.json` liefert exakt sieben Universe-Farbfamilien. Das vorhandene Owner-Logo `public/branding/capital-ai-logo.jpg` wird vor Einbettung bytegenau gegen SHA-256 `6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3` geprüft. Brand-Herkunft: `docs/licenses/Capital-AI-BRANDING.md`. Zusätzlich werden ausschließlich die zwei SHA-256-gepinnten, aus demselben Owner-Logo abgeleiteten Asset-Pack-Bilder `social/x-link-card-1200x675.jpg` und `social/instagram-portrait-1080x1350.jpg` als schwach eingeblendete Hintergrundbilder genutzt. Der konkrete Asset-Pack-Manifest-Eintrag, die Originalquelle, JPEG-Bytes und die Abwesenheit fremder Bildbestandteile werden vor Einbettung geprüft. Keine Drittlogos, heruntergeladenen Bilder, externen Ressourcen oder unbekannten Assets gelangen in SVG.
- Beide Bilder zeigen **QUELLE** (Datenherkunft / Zeitpunkt / Validierung), **ANNAHMEN** (Modelllogik / Parameter / Kontext) und **GRENZEN** (Unsicherheit / Risikofilter / Einsatzgrenze). X 1200×1200, Instagram 1080×1350. SVG enthält Bildtitel, Alt-Text-Basis, nur lokale Grafik und eine siebenfarbige Spektralleiste.
- Für den tatsächlich exportierten Social-PNG wird ein eigenständiges, bytegeprüftes `IMAGE`-Asset (`image/png`) **anstelle** des SVG-Zwischenassets in das bestehende Social-Manifest eingebunden. `asset.sha256`, `originalGraphic.sha256`, PNG-Bytes und Export-Receipt müssen übereinstimmen; beide Formate bleiben DRAFT_ONLY und ohne Owner-Grant oder Publishing-Freigabe.
- Die SVG-Bytes werden zu einem SHA-256-gebundenen `IMAGE`-Asset mit `OriginalGraphicAsset` (`AI_ASSISTED`, `FIRST_PARTY_TEMPLATE`) im **bestehenden** `buildDraftContentSocialPackage` zusammen mit dem ursprünglichen Text-Asset. Der `planContentCampaign` wird mit `IMAGE` aufgerufen. Es werden **keine** Approvals oder Deliveries erfunden, `graphicLicenses[0].state=REVIEW_REQUIRED`, `publicPublishAllowed=false`. Die grafische Markenherkunft bedeutet **keine** neue kommerzielle Asset-/Kanal-/Publikationslizenz. Jede weitere, zuvor separat genehmigte Grafik muss bei tatsächlicher Aufnahme mit exakten Bytes, OriginalGraphic-Owner-Grant und kanalbezogenem Rechtebeleg verifiziert werden.

## Kontext und selbstlernende Templates

- Maximal drei unabhängig für kommerzielle Paraphrasen belegte Zusammenfassungen werden als klar gekennzeichneter **Quellenkontext (redaktionell zu prüfen)** in den neuen TEXT-Draft übernommen; sein SHA-256 wird danach neu berechnet und mit dem bestehenden Social-Manifest synchronisiert. Abgelehnte Quellen beeinflussen weder Bild noch Text.
- `assessContext(records, trustedRights)` nimmt **nur schon erhobene** Quellzusammenfassungen (`CRAWLEE`, `FIRECRAWL`, `TINYFISH`, `LANGGRAPH`) entgegen. Für jeden Kandidaten sind HTTPS-Quelle ohne Credentials, Hash der exakten Zusammenfassung und **separater** vom vertrauenswürdigen Caller bereitgestellter Ledger-Beleg über kommerziell erlaubte Paraphrasen erforderlich. Ein Crawler oder Tool darf seine eigenen Rechte nicht behaupten. Das Programm führt **keinen** Crawl durch, besitzt keine Provider-/Kosten- oder Systemberechtigung und behandelt eingehende Texte als Daten, nicht als Anweisungen. Jeder akzeptierte Auszug bleibt redaktionell `REVIEW_REQUIRED`.
- `LANGGRAPH`-Einträge brauchen eine Run-Referenz, aber eine Run-ID allein beweist keinen Graph-Lauf: `graphExecution=NOT_PROVEN`. Der bereits vorhandene `scripts/growth-agent/auto_loop.py` bleibt einzige LangGraph-Orchestrierungsgrundlage. Es gibt weder eine neue Auto-Loop-Instanz noch einen autonomen Modellaufruf.
- Das bereits vorhandene `FeedbackLearningLoop.mjs` erstellt aus nachweislich einwilligungsbasierten anonymisierten Feedbackdaten oder zulässigen Quellen **`CANDIDATE_ONLY`**-Template-Vorschläge. Keine automatischen Modellgewicht-Updates, selbstständige Template-Promotion, Web-Veröffentlichung oder mutation einer Owner-Freigabe. Die Template-Auswahl bleibt reproduzierbar und versioniert.

## Open Source / kommerzielle Grenzen

| Baustein | Software-Lizenz | Bewertung |
| --- | --- | --- |
| `@resvg/resvg-wasm` | bestehende lokal installierte Render-Abhängigkeit, Lizenz/SBOM über aktuelle CI prüfen | Offline SVG→PNG, keine neue Providerintegration |
| `LangGraph` | MIT laut [Upstream](https://github.com/langchain-ai/langgraph/blob/main/LICENSE) | vorhandener Python-Stack, keine neuen Toolrechte |
| `Crawlee` | Apache-2.0 laut [Upstream](https://github.com/apify/crawlee/blob/master/LICENSE.md) | Kandidat; nicht neu installiert oder freigeschaltet |
| `Firecrawl` | AGPL-3.0 laut [Upstream](https://github.com/firecrawl/firecrawl/blob/main/LICENSE) | vorhandener Adapter, kommerzielle Hosted-/Quellenrechte bisher nicht nachgewiesen, keine Aktivierung |

Softwarelizenzen sind **keine** Rechte an gecrawlten Webseiten, Bildern oder Modell-Outputs. Robots-/Terms-/Privacy-/Datenquellen-/Attributionsgrenzen bleiben erhalten. Für Bild- oder Textassets unbekannter Herkunft gilt `NOT_PROVEN`, nicht `LICENSED`. Es wurde keine neue Cloud-Kostenquelle aktiviert.

Der vorhandene `EditorialStatusGraphicRenderer`, das Social-Pipeline-Bild, der Owner-Operations-Renderer und der Brand-Kit-Renderer verwenden eine gemeinsame, zwischengespeicherte `ensureResvgWasmInitialized()`-Promise. Hintergrund: `@resvg/resvg-wasm` erlaubt pro Node-Prozess nur einen `initWasm()`-Aufruf; vor dem Fix scheiterten zwei isolierte Growth-Tests nach dem Main-Merge #891. Der gemeinsame Initialisierungspfad ist eine technische Reparatur, keine neue Veröffentlichungskomponente. Fehler der WASM-Initialisierung bleiben FAIL-CLOSED.

## Lokale Reproduktion

Ab Repository-Root mit installierten bestehenden Abhängigkeiten:

```bash
node --import tsx --test scripts/growth/brand-kit-graph-drafts.test.mjs
node --import tsx scripts/growth/brand-kit-graph-drafts.mjs X
node --import tsx scripts/growth/brand-kit-graph-drafts.mjs INSTAGRAM
# Nur explizite lokale SVG/PNG/JSON-Draft-Dateien; keine Publisher-Ansteuerung:
node --import tsx scripts/growth/brand-kit-graph-drafts.mjs X /tmp/capital-ai-brand-drafts
```

Die vorhandene Growth-Intelligence-Testsuite importiert die neuen Positiv-/Negativtests, die bestehende Docker-Build-Stufe erhält beide Dateien via Dockerfile und `.dockerignore`. Prüfungen: Quellenrechte, SHA-256-/Content-Identity, Logo-Provenienz, sieben Farben, XML-/Prompt-Injection, URL-/Graph-IDs, Feedback-Consent, Bilddarstellung, Publisher-Sperren und lokale Resvg-PNG-Bytes.

**Sicherheit und Rollback:** Source-only, fail-closed, kein Secret, OAuth, DB-, Provider- oder Social-Publish-Eingriff. Merge nur nach dem bestehenden Ruleset und aktuellem Head-SHA; kein Status aus Commit-Nachricht oder Skripterfolg ableiten. Revert der PR stellt den vorherigen Zustand wieder her. `CI_VERIFIED` und `PRODUCTION_VERIFIED` sind getrennte Stati.


## Quellen- und Feedback-Intake v1 – Offline-Folge-Slice

- Implementierung: `buildLicensedContextRound(input, trustedScope)` in
  `scripts/growth/brand-kit-graph-drafts.mjs` sowie Positiv-/Negativtests in
  `scripts/growth/brand-kit-graph-drafts.test.mjs`. Bereits in der bestehenden
  `test:growth-intelligence`-Kette, `Dockerfile`-COPY und `.dockerignore` enthalten.
- Eingabe: höchstens drei bereits extrahierte, schlichte UTF-8-Webtexte
  (kein HTML und keine Live-Crawls). Exakter SHA-256-Text-Hash, Quellenkennung,
  HTTPS-Adresse und Werkzeug-Typ. Die Kurzfassung ist eine deterministische, **wörtlich-extraktive Textpassage** (keine automatische Paraphrase). Sie wird erneut
  durch `assessContext` auf Provenance, Source-SHA und Rechte gebunden.
- **Autorisierung**: Die vertrauenswürdige Server-Seite muss unabhängig vom
  Request `trustedScope` liefern und eine zuvor authentifizierte Tenant-ID,
  eine pro Quelle an Tenant/URL/Rohtext-SHA gebundene kommerzielle
  Paraphrasierungs- **und wörtliche Auszugsberechtigung** im Rechte-Ledger und einen
  an Tenant/Event/SHA gebundenen Consent-/Anonymisierungsbeleg liefern.
  Die hier geprüfte Strukturangabe `authenticated:true` allein ist **kein**
  Authentifizierungsnachweis. Deswegen wurde **keine HTTP-Route** freigeschaltet.
  Eine fremde oder fehlende Lizenz/Einwilligung führt zu einer Ablehnung.
- **Sicherheitsgrenzen**: Reject bei manipulierten Hashes, Prompt-Injection,
  URL-Credentials, ungeeigneten Hosts, doppelten Quellen-IDs,
  fremden Tenants und fehlenden Graph-Run-Referenzen. Ein LangGraph-Run-ID-Feld
  beweist keine tatsächliche Ausführung. Fremde Inhalte bleiben Daten;
  keine Provider-Calls, keine RAG-Vektorsuche, keine neuen Worker.
- **Ergebnis**: bestehendes first-party Logo/Asset-Pack und Social IMAGE/TEXT
  mit geprüfter SHA-256-Bindung; grafische Freigabe weiterhin REVIEW_REQUIRED,
  Publisher DRAFT_ONLY. Feedback erzeugt nur versionierte
  `1.0.1-candidate.<roundSha256>`-Vorschläge; die produktive Vorlage bleibt
  `1.0.0`. Kein Auto-Promotion, Weight-Update, Social Publish oder Kostenaufruf.
- **Nachweise / Reproduktion**:
  `npm run test:growth-intelligence`,
  `node --import tsx --test scripts/growth/brand-kit-graph-drafts.test.mjs`,
  anschließend die bestehenden Docker-/CodeQL-/Domain-Governance-Checks auf
  demselben Head. Der Rechte-Ledger muss selbst unabhängig aus echten
  Dokumenten/Verträgen befüllt werden: ein Test-Grünergebnis erteilt
  keine kommerziellen Rechte. Ebenso bleiben tatsächlicher Live-Crawl,
  LangGraph-Readback, Produktiv-Auth und RAG weiterhin NOT_PROVEN.
- **Rollback**: Revert des separaten GROWTH-Folge-PRs. Keine Datenmigration,
  Credentials, OAuth-Änderung, neuen Pakete, Scheduler oder Deploys.

Der Versionierungs-Hash bindet auch den vollständigen Rohtext-SHA, den getrennten Rechtebeleg, die akzeptierten Feedback-Bytes und den Auswertungszeitpunkt. Der Contract beweist nur die Validierung dieser übergebenen Belege, nicht deren externe Echtheit. Fehlende Auszugsrechte blockieren den Import auch dann, wenn eine Paraphrase erlaubt wäre.
