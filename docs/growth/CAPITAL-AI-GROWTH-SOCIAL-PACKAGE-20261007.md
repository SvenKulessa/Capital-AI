# CAPITAL-AI Growth / Social Package — Zielarchitektur

Stand: 2026-10-07  
Domain: GROWTH mit PRODUCT- und PLATFORM-Schnittstellen  
Status: geplant, noch keine gemeinsame Production-Runtime

## Zweck

Die bereits implementierte `CAPITAL_AI_CONTENT_ENGINE@1` wird später mit der migrierten Social Media Engine und dem Content Studio als **ein modular nutzbares Paket** zusammengeführt.

Dabei entstehen keine parallelen Authorities.

```text
Campaign Brief
      ↓
Content Engine
  ├─ Copy
  ├─ URL Context
  ├─ Image
  ├─ TTS
  ├─ Video
  └─ Attribution
      ↓
Content Studio
  ├─ Preview
  ├─ Quellen / Claims
  ├─ Rechte / Evidence
  ├─ Asset-Vergleich
  └─ Freigabe
      ↓
PUBLISHER Adapter
      ↓
Social Media Engine
  ├─ Scheduler
  ├─ Channel Adapter
  ├─ Delivery State
  ├─ Retry / Redelivery
  └─ Dedupe
      ↓
Attribution
  ├─ GSC
  ├─ Product Analytics
  └─ Social Provider
```

## Zuständigkeiten

### Content Engine

- komponiert bestehende Growth-Capabilities;
- erzeugt Drafts und Evidence;
- entscheidet nicht über Public Publish;
- behält Provider-, Kosten- und Rechte-Gates in den bestehenden Contracts.

### Content Studio

- ist die grafische Authoring-/Review-Schicht;
- zeigt Quellen, Claims, Rechte, Kosten, Assets und Kanal-Previews;
- bindet eine Freigabe an konkrete Asset-Hashes;
- führt keine eigene Provider- oder Publishing-Logik ein.

### Social Media Engine

- übernimmt Scheduling und kanalbezogene Publisher;
- verwaltet Provider-Delivery-IDs und Endzustände;
- behandelt Retries, Redelivery und Dublettenvermeidung;
- publiziert nur freigegebene, hashgebundene Assets.

### Attribution

- bleibt gemeinsame Messschicht;
- Search, Product und Social bleiben quellengetrennt;
- Korrelation erfolgt über Campaign-ID und Content-ID.

## Geplanter Package Contract

Der gemeinsame Paketvertrag soll mindestens enthalten:

- `campaignId`
- `contentId`
- `sourceSha`
- `canonicalUrl`
- `assetId`
- `assetSha256`
- `approvalRef`
- `channel`
- `scheduledAt`
- `providerDeliveryId`
- `deliveryState`
- `attributionRefs`

Die bestehende `CAPITAL_AI_CONTENT_ENGINE@1` bleibt dabei erhalten. Das Package ergänzt nur die Übergabe zwischen Engine, Studio, Publisher und Attribution.

## UI-Zielbild

Das spätere Content Studio soll dieselbe visuelle Sprache wie die öffentliche Content-Engine-Konzeptsektion verwenden:

- CAPITAL-AI Dark / Gold / Purple;
- Pipeline statt versteckter Automatisierung;
- Status pro Modul und Asset;
- Desktop und Mobile;
- kanalbezogene Preview-Rahmen;
- klare Trennung von Draft, Review, Scheduled, Published und Failed;
- sichtbare Evidence-/Rights-/Cost-Informationen.

## Integrationsreihenfolge

1. Landingpage-Konzept gegen Live-Render visuell abnehmen.
2. Social Media Engine Cutover abschließen.
3. Content Studio auf Campaign-/Content-/Asset-Verträge binden.
4. gemeinsamen Package Manifest Contract definieren.
5. PUBLISHER Adapter der Content Engine an Social Media Engine anschließen.
6. Asset-Freigabe an SHA-256 und Approval-Ref binden.
7. Scheduling/Delivery/Dedupe integrieren.
8. Attribution end-to-end auf Campaign-/Content-ID korrelieren.
9. Mobile/Desktop und kanalbezogene Preview prüfen.
10. erst danach automatisierten Social-Pilot abnehmen.

## Nicht Teil des aktuellen Stands

- kein automatisches Public Publishing aus der Content Engine;
- kein fertiges gemeinsames Content Studio Runtime Package;
- kein behaupteter Social-Media-Cutover;
- keine neue Provider- oder Rechte-Authority.
