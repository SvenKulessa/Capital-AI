# Frontend-Struktur von CAPITAL-AI

Stand: 2026-10-04  
Domain: PRODUCT mit Schnittstellen zu MARKET, PLATFORM, TRUST und GROWTH.

## Ziel

Die React-Anwendung wird schrittweise aus dem bisherigen zentralen `src/App.tsx`
in klar begrenzte Schichten zerlegt. Die Migration bleibt bewusst inkrementell:
bestehende Fachlogik, Source-Admission, Runtime-Verträge und Provider-Gates werden
durch reine Strukturarbeiten nicht verändert.

## Verbindliche Schichten

```text
src/
├── app/                 # Composition Root, Provider, Shell und Routing
│   └── routing/
├── features/            # Nutzerfähigkeiten und fachliche UI-Slices
├── entities/            # künftige stabile UI-/Domainmodelle
├── shared/              # wiederverwendbare, fachlich neutrale UI/Utilities
├── platform/            # Analytics, Observability und technische Adapter
├── services/            # bestehende Service-/Datenzugriffe; schrittweise migrieren
├── components/          # Legacy-/Kompatibilitätsschicht während der Migration
└── main.tsx             # Bootstrap
```

## Import-Richtung

- `app` darf `features`, `entities`, `shared` und `platform` orchestrieren.
- `features` dürfen `entities`, `shared` und freigegebene Service-Adapter nutzen.
- `entities` dürfen nicht von `features` oder `app` abhängen.
- `shared` bleibt fachlich neutral und darf weder `features` noch `app` importieren.
- MARKET-Datenrechte, Source-Admission und Scoring-Verträge bleiben außerhalb
  reiner PRODUCT-Kompositionslogik authoritative.
- PLATFORM-Runtime, NATS, JetStream, Valkey, Render und Container-Handoff werden
  durch Frontend-Strukturänderungen nicht automatisch neu deployed.

## Erste Migration

- `src/App.tsx` ist nur noch Composition Root.
- Provider liegen in `src/app/AppProviders.tsx`.
- globale Shell-/UI-Orchestrierung liegt in `src/app/AppShell.tsx`.
- Route-Views und Lazy Boundaries liegen unter `src/app/routing/`.
- Landingpage-Komposition liegt in `src/features/home/`.
- SEO/Analytics-Seiteneffekte liegen in `src/platform/analytics/`.
- globale Modals liegen in einem separat lazy geladenen Overlay-Bundle.
- neutrale Loading-UI liegt unter `src/shared/ui/`.

## Migrationsregel für neue Arbeiten

Neue Features werden nicht mehr direkt in `App.tsx` implementiert. Bestehende
Komponenten werden nur dann in `features`, `entities` oder `shared` verschoben,
wenn sie ohnehin geändert werden oder ein eigener, überprüfbarer Migrations-PR
dafür vorgesehen ist. Dadurch bleiben Diffs klein, reversibel und mit offenen PRs
korrelierbar.

## Bundle-Regel

Das bestehende 500-kB-Gate wird nicht angehoben. Route-spezifische Ansichten
bleiben lazy geladen. Die globale Modal-Schicht wird erst geladen, wenn tatsächlich
ein Overlay geöffnet werden muss.


## Migrationsphase 2 — Boundary Enforcement

Ab `capital-ai-product/frontend-boundaries-20261004` gelten zusätzlich:

- stabile Marktmodelle liegen authoritative unter `src/entities/market/model.ts`;
- stabile Modulmodelle liegen authoritative unter `src/entities/module/model.ts`;
- bestehende Exporte aus `src/types.ts` bleiben als Kompatibilitätsgrenze erhalten;
- Screener-/Explainability-Implementierungen liegen unter `src/features/screener/`;
- Market-Sentiment und Sector-UI liegen unter `src/features/market/`;
- neutrale Bootstrap-, Status- und Data-Unavailable-UI liegt unter `src/shared/ui/`;
- Browser-History/Popstate/App-Navigation liegt in `src/app/routing/useBrowserRoute.ts`;
- `features -> app`, `entities -> app|features` und `shared -> app|features|entities`
  werden durch `scripts/validate-frontend-boundaries.mjs` fail-closed geprüft;
- alte `src/components/*`-Pfade bleiben vorläufig als reine Re-Export-Shims bestehen
  und dürfen keine neue Fachlogik aufnehmen.
