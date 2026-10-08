# SEO-03 — öffentlicher HTTP- und Commerce-Readback

Baseline: `main@dfb633012b0e2ac681eaf11127b008c3419c2b00` (PR #307).
Prüfung: 2026-10-09, Europe/Berlin. Render meldete Deploy `dep-db42burncjis738h893g` für diese Baseline als `live`.

## Reproduzierbare Prüfung

```bash
npm run test:seo
npm run seo:readback -- --origin https://capital-ai.online --output /tmp/public-readback.json
# Optional: alle Manifest-Seiten seriell, maximal ein laufender Request.
npm run seo:readback -- --full --output /tmp/public-full-readback.json
```

Der Readback verwendet ausschließlich anonyme GETs, folgt keinen Redirects und begrenzt jeden Request auf 15 Sekunden und 2 MiB. Keine Käufe, Providerabfragen, Veröffentlichungen oder Search-Console-Schreibaktionen. Der Report speichert nur Prüfstatus und minimale öffentliche Zustandsprojektionen, keine Antwortkörper oder Secrets. Kosten: keine neue Ressource; zusätzliche normale HTTP-Anfragen an den bestehenden Webservice. Keine Aussage über verbleibende Hosting-Quotas.

## Tatsächliche Evidence

`evidence/public-readback-20261009.json`: alle 142 Manifest-Seiten mit 868 erfolgreichen Einzelprüfungen, HTML-Inhalt ohne JavaScript, Canonicals, JSON-LD-Syntax, Indexierung, exakte Sitemap-Allowlist, robots.txt, llms.txt, sitemap.md und Login-Noindex: PASS. Die Sitemap wird vollständig gegen das Manifest verglichen; die HTML-Seitenprüfung deckt das vollständige Manifest ab, bleibt aber kein Browser- oder vollständiger ausgehender Link-Crawl.

- Subscription-Checkout: öffentlich als konfiguriert gemeldet; Kauf, Webhook, Entitlement und Kündigung bleiben NOT_PROVEN.
- CADS Marketplace: `runtimeReady=false`; keine Verkaufsfreigabe aus dieser Prüfung.
- `/healthz`: `status=ok`, aber `buildIdentity.bound=false`. Der Render-Deploy-SHA ist Control-Plane-Evidence, keine eingebettete Image-/Runtime-Identität.
- `capital-ai.ai.studio` lieferte beim separaten GET noch ältere Metadaten und Canonical `capital-ai.finance`; diese Domain ist nicht Teil des PASS auf `capital-ai.online`. Domain-Zuordnung/Redirect vor weiteren SEO-Veröffentlichungen klären.
- NATS/Valkey meldeten connected; kein privater Provider-Roundtrip und kein NATS-Redeploy.
- PR #247: Run 37774285376, Job 113301148623, 44 blockierende Security-Befunde, keine Secrets; kein Merge.

## Nächste Umsetzung

Vollständige HTML-/Link-Abdeckung, Runtime-Quellenidentität ohne Aufwertung bloßer Umgebungswerte zu Attestation, Domain-Konvergenz und drei Testmode-Käufe mit Entitlement-Lifecycle. Danach SEO-04 mit belegten Content-Clustern. Keine Ranking-, Umsatz- oder Produktionsreifebehauptung aus dem technischen PASS.

Rollback: den PR-Commit revertieren; der Readback ändert keinen produktiven Daten- oder Providerpfad. Die lokalen Regressionstests sind Bestandteil des bestehenden Docker Security Gate, kein neuer Required Check.

## Stripe-Katalog und Produktprojektion

`evidence/stripe-catalog-readback-20261009.json`: alle sieben kanonischen Live-Preise, Produkt-IDs, EUR-Beträge und Abrechnungsintervalle stimmen mit dem Bestand überein; vier Produkte sind aktiv. Nur lesende Stripe-GETs. Der Connector bietet derzeit keine Testumgebung. Keine Zahlung oder Preisänderung. Abo-Preise melden `tax_behavior=unspecified`; der separate steuerliche Gesamtzustand ist NOT_PROVEN und wurde nicht verändert. Vocabulary- und Social-Projektionen unterscheiden nun belegten Katalog bzw. vorhandenen Publishing-Code von Käufer-/Distributions-E2E.
