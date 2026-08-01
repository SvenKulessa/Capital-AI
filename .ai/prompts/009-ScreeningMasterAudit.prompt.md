```
# CAPITAL-AI Enterprise Screening & Scoring â€“ Master-Architektur-Prompt
```

```
> Kopierbarer Prompt zur Generierung eines anwendungsunabhÃ¤ngigen Enterprise-Berichts.
Der Prompt leitet Perplexity an, zuerst alle bestehenden FinTech-Komponenten aus der
Produktivumgebung systematisch auszulesen und als Ãœbergabe-Material zu erfassen, dann
abgekoppelt von der Produktivumgebung das Screening und Scoring eigenstÃ¤ndig zu
erweitern.
```

```
---
```

# `## PROMPT` 

```
```
```

```
Du bist Enterprise-FinTech-Architekt, Quant-Researcher und Screening-Systemdesigner.
```

```
Deine Aufgabe besteht aus zwei Phasen:
```

```
PHASE 1 â€“ ERFASSUNG: Lese alle bestehenden FinTech-Komponenten fÃ¼r Screening und
Bewertungslogiken aus der Produktivumgebung aus. Erfasse sie vollstÃ¤ndig, strukturiert
und neutral â€“ ohne sie als verbindlich oder final zu betrachten. Diese Erfassung
dient als Ãœbergabe-Material, nicht als festgeschriebene Architektur.
```

```
PHASE 2 â€“ ERWEITERUNG: Nutze das erfasste Material als Ausgangspunkt, um abgekoppelt
von der Produktivumgebung ein unabhÃ¤ngiges, erweitertes Enterprise-Screening mit
tieferen Schichten pro Assetklasse zu definieren. Bestehende Logiken dÃ¼rfen
hinterfragt, umstrukturiert, verbessert oder ersetzt werden. Die einzige harte
Anforderung ist KompatibilitÃ¤t mit dem Universal Asset Interface (Abschnitt 4) und dem
Scoring-Kontrakt (Abschnitt 6.2).
```

```
Dieser Bericht dient als Blaupause, damit nachfolgende Sessions einzelne Assetklassen
und deren tiefe Schichten (Kategorien, Subkategorien, Scoring-Formeln, Metriken,
Risikofaktoren, Datenquellen, Normalisierung, Gewichtung, Ranking-Regeln) unabhÃ¤ngig
und isoliert erweitern kÃ¶nnen, ohne die Produktivumgebung, das Kernsystem oder andere
Assetklassen zu beeinflussen.
```

```
---
```

```
## 1. ARBEITSPRINZIPIEN
```

```
- Produktiv-Entkopplung: Die bestehende Produktivumgebung ist Material, nicht
Architekturvorgabe. Keine Logik aus der Produktivumgebung wird als unverÃ¤nderlich
vorausgesetzt. Gewichtungen, Formeln, Modelle und Schwellenwerte dÃ¼rfen neu definiert
werden.
```

```
- Applikationsentkopplung: Keine AbhÃ¤ngigkeit von spezifischen Frameworks, UI-
Libraries oder Laufzeitumgebungen. Die Architektur definiert fachliche VertrÃ¤ge und
Schnittstellen, keine Implementierungsdetails.
```

```
- Modulare Asset-Class-Engines: Jede Assetklasse ist ein eigenstÃ¤ndiges Modul mit
eigener Metrikliste, eigener Gewichtung, eigener Normalisierung und eigenem
Bewertungsmodell.
```

```
- Versionierbarkeit: Jede Scoring-Regel, jede Gewichtung und jede Klassifizierung ist
versionierbar und auditierbar.
```

```
- Fehlende Daten werden als `missing`, `unknown` oder `not_applicable` markiert,
niemals als 0 oder NULL stillschweigend verrechnet.
```

```
- Confidence-First: Jeder Score trÃ¤gt einen Confidence-Wert und einen DatenqualitÃ¤ts-
Indikator.
```

```
- BaFin-konforme Standards: Auditierbarkeit, Nachvollziehbarkeit, Transparenz jeder
Score-Komponente.
- Keine widersprÃ¼chlichen Ergebnisse: Bei Konflikten priorisiert der Supervisor
DatenqualitÃ¤t, Confidence und Tiering.
- Erweiterbarkeit: Neue Assetklassen kÃ¶nnen hinzugefÃ¼gt werden, ohne bestehende
Module zu verÃ¤ndern.
```

```
- NeutralitÃ¤t gegenÃ¼ber bestehenden Modellen: Wenn eine bestehende Formel aus der
Produktivumgebung Ã¼bernommen wird, ist das eine bewusste Entscheidung, die begrÃ¼ndet
werden muss. Wenn sie ersetzt wird, muss die neue Formel dokumentiert und begrÃ¼ndet
werden.
```

```
---
```

- ``scripts/` â€“ Hilfsskripte` 

```
   - `data/` â€“ Datendateien
4. Erfasse alle Package-Manager-Dateien: `package.json`, `requirements.txt`,
`pyproject.toml`, `go.mod`, `Cargo.toml` etc.
5. Erfasse Build-Konfigurationen: `tsconfig.json`, `webpack.config.js`,
`vite.config.js`, `Dockerfile`, `docker-compose.yml` etc.
6. Erfasse Environment-Beispiele: `.env.example`, `.env.template`, `.env.local` etc.
```

```
Ausgabeformat:
```

```
```
```

```
VERZEICHNISSTRUKTUR:
[VollstÃ¤ndiger Baum, mindestens 3 Ebenen tief]
```

```
PACKAGE-DATEIEN:
```

```
| Datei | Pfad | Inhalt (zusammengefasst) |
```

```
BUILD-KONFIGURATIONEN:
```

```
| Datei | Pfad | Zweck |
```

```
ENVIRONMENT-TEMPLATES:
| Datei | Pfad | Enthaltene Variablen |```
```

```
### 0.3 Schritt 2 â€“ Agenten und Orchestratoren erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller Agenten, deren Rollen, Schnittstellen und
Aufruflogik.
```

```
Suchanweisung:
1. Suche in folgenden Verzeichnissen nach Agenten-Dateien:
   - `agents/`, `orchestrator/`, `supervisor/`
   - Alle Dateien mit Namen, die enthalten: `agent`, `orchestrator`, `supervisor`,
`master`, `coordinator`
   - Markdown-Dateien (`.md`), die Agenten-Prompts oder Rollenbeschreibungen enthalten
2. Suche nach TypeScript/JavaScript-Dateien: `*.ts`, `*.js`, die Klassen oder
Funktionen exportieren, deren Namen `Agent`, `Orchestrator`, `Supervisor` enthalten.
3. Suche nach Python-Dateien: `*.py`, die Klassen oder Funktionen mit Ã¤hnlichen Namen
enthalten.
4. FÃ¼r JEDEN gefundenen Agenten erfasse:
   - Name (Dateiname und interner Name)
   - Pfad (vollstÃ¤ndiger Dateipfad)
   - Rolle (aus Code-Kommentaren, Klassenname oder Prompt-Text)
   - Eingaben (welche Parameter, Payloads oder Events werden empfangen?)
   - Ausgaben (welche Return-Werte, Events oder Payloads werden erzeugt?)
   - Downstream (welche anderen Agenten oder Services werden aufgerufen?)
   - Entscheidungslogik (welche Verzweigungen, Bedingungen, Modell-Auswahlen
existieren?)
5. Suche nach der Supervisor- bzw. Master-Orchestrator-Logik:
   - Wie wird entschieden, welcher Agent angesprochen wird?
   - Welche Priorisierung oder KonfliktlÃ¶sung existiert?
   - Welche ModellbegrÃ¼ndung wird ausgegeben?
6. Suche nach Prompt-Dateien (`.md`, `.txt`, `.prompt`), die Agenten-Verhalten
definieren.
```

```
Ausgabeformat:
```

```
```
```

```
AGENTEN-INVENTAR:
| Agent | Pfad | Rolle | Eingaben | Ausgaben | Downstream | Entscheidungslogik |
```

```
SUPERVISOR-LOGIK:
```

- `Modellauswahl: [wie wird das Bewertungsmodell gewÃ¤hlt?]` 

- `KonfliktlÃ¶sung: [wie werden Konflikte gelÃ¶st?] - Priorisierung: [welche PrioritÃ¤ten existieren?] - Quelle: [Dateipfad]` 

```
PROMPT-DATEIEN:
| Prompt | Pfad | ZugehÃ¶riger Agent | Zweck |
```

```
```
```

```
### 0.4 Schritt 3 â€“ Scoring-Modelle und Formeln erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller Scoring-Modelle, Formeln, Gewichte, Subscores und
Normalisierungsregeln.
```

```
Suchanweisung:
1. Suche nach Scoring-Dateien:
   - Verzeichnis `services/`, `scoring/`, `scoring-engine/`
   - Dateien mit Namen: `scoring`, `score`, `valuation`, `ranking`, `weights`, `config`
   - Dateiformate: `*.ts`, `*.js`, `*.py`, `*.json`, `*.yaml`, `*.yml`
2. Suche nach Weight-Konfigurationen:
   - JSON-Dateien mit Key-Value-Paaren, deren Values Zahlen zwischen 0 und 1 sind
   - YAML-Dateien mit `weights`, `scoring`, `model` SchlÃ¼sseln
   - TypeScript-Dateien mit `const weights`, `export const weights`, `Weights`,
`baseWeights`, `defiWeights` etc.
3. Suche nach Formel-Implementierungen:
   - Funktionen, die `score`, `calculate`, `compute`, `evaluate`, `rank` im Namen
tragen
   - AusdrÃ¼cke mit Multiplikation und Addition von Subscores (z. B. `0.10 *
marketScore + 0.14 * liquidityScore`)
   - `clamp`, `normalize`, `weightedAvg`, `weightedSum` Hilfsfunktionen
4. FÃ¼r JEDES gefundene Scoring-Modell erfasse:
   - Modellname
   - Dateipfad
   - Asset-Typ / Asset-Klasse, fÃ¼r die das Modell gilt
   - Alle Subscores mit individuellen Gewichtungen (als Tabelle)
   - Summe der Gewichtungen (prÃ¼fe, ob sie 1.0 ergibt)
   - Normalisierungsregeln (welche Transformationen werden angewendet?)
   - Risikoadjustierung (wie wird RiskScore invertiert oder adjustiert?)
   - Threshold-Werte und Schwellenbedingungen
   - VollstÃ¤ndige Formel als mathematischer Ausdruck
5. Suche nach Normalisierungsfunktionen:
   - Funktionen wie `normalize`, `clamp`, `scale`, `minMax`, `zScore`
   - Bereichsdefinitionen (min/max, 0-100, 0-1)
6. Suche nach Manipulationsschutz-Logik:
   - VWAP-Berechnungen
   - Outlier-Detection
   - Volumen-Validierung
   - LiquiditÃ¤ts-Filter
```

```
Ausgabeformat:
```

```
```
```

```
SCORING-MODELL-INVENTAR:
```

```
Modell: [Name]
Dateipfad: [Pfad]
Asset-Typ: [Typ]
| Subscore | Gewicht | Berechnungsgrundlage | Normalisierung |
|---|---|---|---|
Gewichtsumme: [Wert, Soll: 1.0]
Risikoadjustierung: [Beschreibung]
Thresholds: [Liste]
Formel: [VollstÃ¤ndiger mathematischer Ausdruck]
```

```
---
[wiederholen fÃ¼r jedes Modell]
```

```
NORMALISIERUNGSREGELN:
```

```
| Regel | Funktion | Eingabebereich | Ausgabebereich | Quelle |
```

```
MANIPULATIONSSCHUTZ:
| Mechanismus | Implementierung | Quelle |```
```

```
### 0.5 Schritt 4 â€“ Ranking- und Tiering-Logik erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung der Ranking-Formel, Eligibility-Kriterien, Tiering-Regeln
und Top-10-Modi.
```

```
Suchanweisung:
1. Suche nach Ranking-Dateien:
   - Dateien mit Namen: `ranking`, `rank`, `tier`, `tiering`, `top10`, `leaderboard`
   - Verzeichnis: `services/ranking*`, `routes/top10*`
2. Suche nach Ranking-Formeln:
   - Funktionen, die `rankScore`, `rank`, `sortRank`, `computeRank` heiÃŸen
   - AusdrÃ¼cke, die `FinalScore`, `DataQualityScore`, `TierScore`,
`LiquidityStability` kombinieren
3. Suche nach Eligibility-Filtern:
   - Bedingungen mit `confidence >=`, `liquidity >=`, `data_quality !=`
   - Filter-Funktionen wie `isEligible`, `filterEligible`, `canRank`
4. Suche nach Tiering-Definitionen:
   - Typdefinitionen: `Tier`, `CryptoTier`, `AssetTier`
   - Bedingungen fÃ¼r Tier 1, Tier 2, Tier 3
   - Tier-spezifische Score-Anpassungen oder AbschlÃ¤ge
5. Suche nach Top-10-Logik:
   - Funktionen wie `top10`, `getTopN`, `computeRanking`
   - Modi wie `overall`, `byCategory`, `byTier`, `byMarketQuality`, `byGrowth`
   - Sortierlogik und Tie-Breaking-Regeln
```

```
Ausgabeformat:
```

```
```
```

```
RANKING-LOGIK:
Formel: [vollstÃ¤ndiger Ausdruck]
Eligibility-Kriterien:
- [Kriterium 1]
- [Kriterium 2]
Quelle: [Dateipfad]
```

```
TIERING-LOGIK:
| Tier | Bedingung | Score-Anpassung | Quelle |
```

```
TOP-10-MODI:
| Modus | Berechnung | Filter | Sortierung | Quelle |
```

```
TIE-BREAKING-REGELN:
1. [Regel 1]
2. [Regel 2]```
```

```
### 0.6 Schritt 5 â€“ Wertkorridor-Logik erfassen
Ziel: VollstÃ¤ndige Erfassung der Wertkorridor-Berechnung
(Conservative/Neutral/Optimistic) und FairValueGap.
```

```
Suchanweisung:
1. Suche nach Wertkorridor-Dateien:
   - Dateien mit Namen: `valuation`, `corridor`, `fairvalue`, `value`
   - Funktionen wie `calculateCorridor`, `computeValue`, `fairValueGap`
2. Suche nach Korridor-Formeln:
   - AusdrÃ¼cke mit `FinalScore * 0.85`, `* 1.00`, `* 1.15` oder Ã¤hnlichen
Multiplikatoren
   - Modellspezifische Anpassungen (z. B. DeFi: 0.82 / 1.18)
3. Suche nach FairValueGap-Berechnung:
   - `(NeutralValue - ReferenceValue) / ReferenceValue * 100`
   - Alternative Berechnungen
4. Suche nach RevenueMultiple- oder HybridValue-Berechnungen.
```

```
Ausgabeformat:
```

```
```
```

```
WERTKORRIDOR-LOGIK:
| Modell | Conservative | Neutral | Optimistic | Quelle |
```

```
|---|---|---|---|---|
```

```
FAIRVALUEGAP:
Formel: [Ausdruck]
Quelle: [Dateipfad]
HYBRIDVALUE (falls vorhanden):
Formel: [Ausdruck]
Quelle: [Dateipfad]```
```

```
### 0.7 Schritt 6 â€“ DatenqualitÃ¤ts- und Confidence-Modell erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung der DataQualityScore-Berechnung, Confidence-Berechnung
und Schwellenwerte.
```

```
Suchanweisung:
1. Suche nach DatenqualitÃ¤ts-Dateien:
   - Dateien mit Namen: `validation`, `quality`, `confidence`, `dataquality`
   - Funktionen wie `computeDataQuality`, `calculateConfidence`, `validateData`
2. Suche nach DataQualityScore-Berechnung:
   - Welche Faktoren flieÃŸen ein? (source_coverage, freshness, supply_transparency,
exchange_breadth, outlier_stability)
   - Wie werden sie gewichtet?
   - Welche Level existieren? (low/medium/high/unknown)
   - Welche Schwellenwerte gelten?
3. Suche nach Confidence-Berechnung:
   - Basis-Confidence
   - Multiplikatoren (data_quality_multiplier, source_count_multiplier,
freshness_multiplier)
   - Schwellenwerte fÃ¼r Ranking-Zulassung
4. Suche nach Missing-Field-Logik:
   - Wie werden fehlende Felder behandelt?
```

- `Wie wird Confidence bei fehlenden Daten reduziert?` 

```
Ausgabeformat:
```

```
```
```

```
DATAQUALITYSCORE:
Faktoren:
| Faktor | Gewicht | Berechnung | Quelle |
Level:
| Level | Bereich | Quelle |
Schwellenwerte: [Liste]
Quelle: [Dateipfad]
```

```
CONFIDENCE-SCORE:
Formel: [Ausdruck]
Multiplikatoren:
| Multiplikator | Wert | Quelle |
Schwellenwert fÃ¼r Ranking-Zulassung: [Wert]
Quelle: [Dateipfad]
```

```
MISSING-FIELD-BEHANDLUNG:
| Szenario | Verhalten | Quelle |```
```

```
### 0.8 Schritt 7 â€“ Datenquellen und API-AbhÃ¤ngigkeiten erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller angebundenen Datenquellen, API-Provider und deren
Konfigurationen.
```

```
Suchanweisung:
```

`1. Suche nach API-Konfigurationen:` 

- ``.env`, `.env.example`, `.env.local` Dateien` 

- ``config/api*`, `config/datasource*`, `config/sources*`` 

- `TypeScript-Konstanten mit API-URLs, API-Keys (nur Variablennamen, keine Werte)` 

`2. Suche nach API-Client-Implementierungen:` 

- `Dateien mit Namen: `api`, `client`, `fetch`, `service`, `provider`, `datasource`,` 

- ``feed`` 

   - `Fetch-/Axios-/HTTP-Aufrufe` 

- `WebSocket-Verbindungen 3. Suche nach On-Chain-Datenquellen:` 

   - `RPC-Endpoints, Blockchain-Node-URLs` 

- `Contract-Addresses, ABI-Dateien - Subgraph-URLs 4. FÃ¼r JEDE gefundene Datenquelle erfasse: - Name` 

   - `Typ (REST API, WebSocket, On-Chain, File-Feed, Database)` 

   - `Assetklasse (welche Assetklasse bedient diese Quelle?)` 

```
   - Endpunkt-URL (nur Host/Path, keine API-Keys)
   - Authentifizierungsmethode (API-Key, OAuth, none)
```

   - `Rate-Limit (falls konfiguriert oder dokumentiert)` 

   - `Failover-Strategie (falls vorhanden) - Datenfrequenz (real-time, 1min, 5min, daily etc.)` 

- `Dateipfad der Implementierung 5. Suche nach Datenbank-Konfigurationen: - Connection-Strings (nur Variablennamen) - ORM-Konfigurationen (Prisma, TypeORM, Sequelize etc.)` 

- `Migration-Dateien 6. Suche nach Caching-Layer: - Redis-, Memcached- Konfigurationen - In-Memory-Caches` 

```
Ausgabeformat:
```

```
```
```

```
DATENQUELLEN-INVENTAR:
| Name | Typ | Assetklasse | Endpunkt | Auth | Rate-Limit | Frequenz | Failover | Pfad
|
```

```
ON-CHAIN-DATEN:
```

- `| Chain | RPC-Endpoint | Contract-Addresses | Subgraph | Pfad |` 

```
DATENBANKEN:
```

- `| Typ | Verbindung (Variablenname) | ORM | Pfad |` 

```
CACHING:
```

```
| Cache-Typ | Konfiguration | Pfad |```
```

```
### 0.9 Schritt 8 â€“ Konfigurationsdateien erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller Konfigurationsdateien mit Inhalten, die Scoring,
Ranking, Tiering oder DatenqualitÃ¤t steuern.
```

```
Suchanweisung:
```

```
1. Suche nach JSON-Konfigurationen:
```

- `Alle `*.json` Dateien in `config/` oder Root-Verzeichnis` 

```
   - Dateien mit Namen: `weights`, `thresholds`, `tiers`, `scoring`, `ranking`,
`config`, `settings`
```

`2. Suche nach YAML-Konfigurationen:` 

- `Alle `*.yaml`, `*.yml` Dateien` 

```
   - Docker-Compose, CI/CD, Kubernetes-Manifeste
```

```
3. Suche nach TypeScript-Konfigurations-Konstanten:
```

- ``export const weights`, `export const config`, `export const thresholds`` 

- ``export const DEFAULT_`, `export const MODEL_`` 

`4. FÃ¼r JEDE gefundene Konfigurationsdatei erfasse: - Dateipfad` 

- `Zweck (welche Komponente wird konfiguriert?)` 

- `VollstÃ¤ndiger Inhalt (als JSON oder YAML formatiert)` 

- `Version (falls vorhanden)` 

`5. PrÃ¼fe auf Umgebungs-spezifische Konfigurationen:` 

- ``config/development.json`, `config/production.json`, `config/staging.json` - `.env.development`, `.env.production`` 

```
Ausgabeformat:
```

```
```
KONFIGURATIONSDATEIEN:
```

```
Datei: [Pfad]
Zweck: [Beschreibung]
Version: [falls vorhanden]
Inhalt:
```json
[VollstÃ¤ndiger Inhalt]```
```

```
---
[wiederholen fÃ¼r jede Datei]```
```

```
### 0.10 Schritt 9 â€“ Skill-Architektur und Skill-Layer erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller Skill-Layer, deren ZustÃ¤ndigkeiten, Events und
Downstream-Beziehungen.
```

```
Suchanweisung:
1. Suche nach Skill-Dateien:
   - Verzeichnis: `skills/`, `.skills/`, `agent-skills/`
   - Dateien mit Namen: `skill`, `layer`, `validation`, `audit`, `reporting`
   - Markdown-Dateien (`.md`), die Skill-Definitionen enthalten (YAML-Frontmatter,
JSON-BlÃ¶cke)
2. Suche nach Event-Schema-Definitionen:
   - Event-Namen wie `data.validated`, `score.approved`, `report.completed`
   - Event-Typ-Definitionen in TypeScript (`type Event`, `interface Event`)
   - Event-Emitter- oder Event-Listener-Implementierungen
3. FÃ¼r JEDEN gefundenen Skill-Layer erfasse:
   - Name
   - Layer-Nummer (falls vorhanden)
   - Zweck / Verantwortung
   - Eingaben (erforderliche Felder)
   - Ausgaben (erzeugte Felder)
   - Emittierte Events
   - Downstream-Layer (welche Layer folgen?)
   - Dateipfad
4. Suche nach Workflow- oder Pipeline-Definitionen:
   - Sequenzielle Agenten- oder Skill-Aufrufe
   - Event-Ketten
   - Orchestrierungs-Skripte
```

```
Ausgabeformat:
```

```
```
```

```
SKILL-LAYER-INVENTAR:
| Layer | Name | Zweck | Eingaben | Ausgaben | Events | Downstream | Pfad |
```

```
EVENT-SCHEMA:
| Event | AuslÃ¶ser | Payload | Consumer | Pfad |
```

```
WORKFLOW-PIPELINE:
```

```
1. [Schritt 1] â†’ Event: [Event-Name]
```

```
2. [Schritt 2] â†’ Event: [Event-Name]
[wiederholen]
```
```

```
### 0.11 Schritt 10 â€“ Assetklassen-Abdeckung erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung, welche Assetklassen, Kategorien, Unterkategorien und
Asset-Typen bereits implementiert sind.
```

```
Suchanweisung:
```

`1. Suche nach Assetklassen-Definitionen:` 

- `TypeScript-Types: `type AssetClass`, `type CryptoCategory`, `type CryptoSubCategory`, `type EquityCategory`` 

- `Enums oder Union-Types mit Assetklassen-Namen` 

- `JSON-Schemas mit Assetklassen 2. Suche nach Klassifizierungs-Logik: - Dateien mit Namen: `classification`, `categorization`, `universe` - Funktionen wie `classify`, `categorize`, `assignCategory`, `assignTier` 3. FÃ¼r JEDE gefundene Assetklasse erfasse: - Assetklasse (Crypto, Equity, Forex, Index, Bond, Commodity, ETF, Derivative) - Alle definierten Hauptkategorien - Alle definierten Unterkategorien - Alle definierten Asset-Typen - Tier-Zuweisungs-Logik - Dateipfad 4. Identifiziere LÃ¼cken: - Welche Assetklassen sind definiert, aber nicht implementiert? - Welche Assetklassen fehlen vollstÃ¤ndig? - Welche Kategorien sind unvollstÃ¤ndig?` 

```
Ausgabeformat:
```

```
```
```

```
ASSETKLASSEN-ABDECKUNG:
```

```
Assetklasse: [Name]
Implementierungsstatus: [fully_implemented | partial | defined_only | not_found]
Kategorien: [Liste]
Unterkategorien: [Liste]
Asset-Typen: [Liste]
Tier-Logik: [Beschreibung]
Pfad: [Dateipfad]
```

```
---
[wiederholen fÃ¼r jede Assetklasse]
```

```
LÃœCKEN-ANALYSE:
| Assetklasse | Status | Fehlende Kategorien | Fehlende Metriken | Fehlende Modelle |```
```

```
### 0.12 Schritt 11 â€“ Typdefinitionen und Schemas erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller TypeScript-Typen, Interfaces, JSON-Schemas und
Datenmodelle.
```

```
Suchanweisung:
1. Suche nach Typ-Dateien:
   - Verzeichnis: `types/`, `schemas/`, `interfaces/`, `models/`
   - Dateien: `*.types.ts`, `*.interfaces.ts`, `*.schema.ts`, `*.schema.json`
2. Erfasse ALLE Typdefinitionen, die mit Scoring, Ranking, Assets, Classification oder
DataQuality zusammenhÃ¤ngen:
   - Interface-Namen und Felder
   - Enum-Werte und Union-Types
   - JSON-Schema-Definitionen
3. Suche nach Request/Response-Schemas fÃ¼r API-Endpunkte:
   - Route-Dateien in `routes/`
   - Schema-Validierungen (z. B. mit Joi, Zod, Yup, express-validator)
```

```
Ausgabeformat:
```

```
```
```

```
TYPDEFINITIONEN:
```

```
Typ: [Name]
Dateipfad: [Pfad]
Felder:
| Feld | Typ | Erforderlich | Beschreibung |
---
[wiederholen fÃ¼r jeden relevanten Typ]
```

```
JSON-SCHEMAS:
| Schema | Pfad | Zweck |
```

```
[VollstÃ¤ndiger Inhalt falls < 50 Zeilen, sonst Zusammenfassung]```
```

```
### 0.13 Schritt 12 â€“ API-Routen und Endpunkte erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller API-Endpunkte, deren Request/Response-Formate und
Logik.
```

```
Suchanweisung:
1. Suche nach Route-Dateien:
   - Verzeichnis: `routes/`, `api/`, `controllers/`
   - Dateien: `*.route.ts`, `*.controller.ts`, `*.router.ts`
2. FÃ¼r JEDEN gefundenen Endpunkt erfasse:
   - HTTP-Methode (GET, POST, PUT, DELETE)
```

- `Request-Body-Schema - Response-Body-Schema - Aufgerufene Services` 

```
   - Authentifizierung erforderlich?
```

- `Dateipfad 3. Suche nach Middleware: - Auth-Middleware` 

   - `Validation-Middleware` 

   - `Logging-Middleware` 

   - `Rate-Limiting-Middleware` 

```
Ausgabeformat:
```

```
```
```

```
API-ENDPUNKTE:
| Methode | Pfad | Request-Schema | Response-Schema | Services | Auth | Pfad |
```

```
MIDDLEWARE:
```

```
| Middleware | Zweck | Pfad |
```

```
```
```

```
### 0.14 Schritt 13 â€“ Audit- und Compliance-Komponenten erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller Audit-Trail-Implementierungen, Event-Logs und
Compliance-Konfigurationen.
```

```
Suchanweisung:
1. Suche nach Audit-Dateien:
   - Dateien mit Namen: `audit`, `logging`, `trail`, `compliance`, `bafin`
   - Funktionen wie `audit`, `logEvent`, `trail`, `record`
2. Suche nach Logging-Konfigurationen:
   - Winston, Pino, Morgan, oder Custom-Logger-Konfigurationen
```

```
   - Log-Level-Definitionen
   - Log-Format (JSON, structured, plain text)
3. Suche nach Audit-Trail-Formaten:
   - Was wird im Audit-Trail gespeichert?
   - Welche Felder sind Pflicht?
   - Wo wird gespeichert (Datei, Datenbank, externer Service)?
4. Suche nach Compliance-Konfigurationen:
   - BaFin-relevante Einstellungen
   - Data-Retention-Policies
```

- `Privacy- oder DSGVO-Konfigurationen` 

```
Ausgabeformat:
```

```
```
```

```
AUDIT-TRAIL:
Format: [Beschreibung]
Pflichtfelder: [Liste]
Speicherung: [Ort]
Quelle: [Dateipfad]
```

```
LOGGING:
| Logger | Level | Format | Pfad |
```

```
COMPLIANCE:
```

```
| Komponente | Konfiguration | Pfad |```
```

```
### 0.15 Schritt 14 â€“ Dokumentation erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller vorhandenen Dokumentationsdateien.
```

- `Suchanweisung: 1. Suche nach Dokumentations-Dateien:` 

   - ``README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `BACKLOG.md`` 

- ``docs/` Verzeichnis: alle `*.md` Dateien - API-Dokumentation: `swagger.json`, `openapi.yaml`, `api-doc.md` 2. FÃ¼r JEDE gefundene Dokumentationsdatei erfasse:` 

   - `Titel / Ãœberschrift` 

   - `Zusammenfassung des Inhalts (3-5 SÃ¤tze)` 

   - `Letztes Aktualisierungsdatum (falls im Dokument angegeben)` 

   - `Abweichungen zur Implementierung (falls erkennbar)` 

```
Ausgabeformat:
```

```
```
```

```
DOKUMENTATIONS-INVENTAR:
| Datei | Titel | Zusammenfassung | Aktualisiert | Abweichung zur Implementierung |```
```

```
### 0.16 Schritt 15 â€“ Test- und Backtesting-Komponenten erfassen
```

```
Ziel: VollstÃ¤ndige Erfassung aller Test-Dateien, Test-Konfigurationen und Backtesting-
Implementierungen.
```

- `Suchanweisung: 1. Suche nach Test-Dateien: - Verzeichnis: `tests/`, `__tests__/`, `test/`, `spec/` - Dateien: `*.test.ts`, `*.spec.ts`, `*.test.js`, `*.spec.js`, `test_*.py` 2. Suche nach Backtesting-Dateien: - Dateien mit Namen: `backtest`, `backtesting`, `walkforward`, `simulation` - Historische Daten-Dateien 3. FÃ¼r jede gefundene Test-Datei erfasse: - Dateipfad - Was wird getestet? (welche Komponente, welche Logik) - Test-Anzahl (falls zÃ¤hlbar) - Coverage-Berichte (falls vorhanden) 4. Suche nach CI/CD-Konfigurationen: - `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile` - Test-Scripts in `package.json` oder `Makefile`` 

```
Ausgabeformat:
```

```
```
```

```
TEST-INVENTAR:
| Datei | Getestete Komponente | Test-Anzahl | Pfad |
```

```
BACKTESTING:
```

```
| Komponente | Implementierung | Datenquelle | Pfad |
```

```
CI/CD:
| Pipeline | Trigger | Test-Step | Pfad |```
```

```
### 0.17 Zusammenfassende Bestands-Tabelle
```

```
Nach Abschluss aller Schritte (0.2 â€“ 0.16) ist eine zusammenfassende Bestands-Tabelle
zu erstellen, die alle erfassten Komponenten auf einen Blick zeigt:
```

```
| Komponente | Typ | Status | Quelle | Gefunden? | VollstÃ¤ndig? |
|---|---|---|---|---|---|
```

```
Status-Werte: `implemented` | `partial` | `defined_only` | `not_found`
```

```
### 0.18 Bewertungsrahmen fÃ¼r das erfasste Material
```

```
Nach der Erfassung ist fÃ¼r jede Komponente eine kurze EinschÃ¤tzung abzugeben:
```

```
| Komponente | Erfasster Zustand | Geeignet fÃ¼r erweitertes Screening? |
Anpassungsbedarf | Empfohlene Aktion |
```

```
MÃ¶gliche Empfohlene Aktionen:
```

```
- `keep_as_is`: Komponente ist robust und kann unverÃ¤ndert Ã¼bernommen werden.
- `extend`: Komponente ist gut, muss aber fÃ¼r das erweiterte Screening ergÃ¤nzt
werden.
- `refactor`: Komponente funktioniert, aber Struktur oder Logik sollte neu aufgebaut
werden.
```

- ``replace`: Komponente ist nicht geeignet und sollte durch eine neue Implementierung ersetzt werden.` 

- ``new`: Komponente existiert noch nicht und muss neu erstellt werden.` 

```
Diese EinschÃ¤tzung ist Grundlage fÃ¼r alle nachfolgenden Abschnitte. Wo `replace` oder
`new` empfohlen wird, ist in den jeweiligen Abschnitten die neue Definition zu
erstellen.
```

```
### 0.19 Erfassungs-QualitÃ¤tskriterien
```

```
Die Erfassung muss folgende QualitÃ¤tskriterien erfÃ¼llen:
```

```
- VollstÃ¤ndigkeit: Alle 15 Schritte (0.2 â€“ 0.16) sind durchzufÃ¼hren. Kein Schritt
darf Ã¼bersprungen werden. Wenn ein Schritt keine Ergebnisse liefert, ist dies explizit
als `no_results` zu dokumentieren.
```

- `Nachvollziehbarkeit: Jede erfasste Komponente hat einen Dateipfad oder eine Quelle. Nichts wird aus dem GedÃ¤chtnis oder aus Kontext rekonstruiert.` 

```
- Roh-Erfassung: Es werden die tatsÃ¤chlichen Implementierungen erfasst, nicht die
Dokumentation. Bei Abweichungen ist die Implementierung fÃ¼hrend und die Abweichung ist
zu notieren.
```

```
- NeutralitÃ¤t: Die Erfassung enthÃ¤lt keine Bewertungen oder Empfehlungen â€“ diese
folgen erst in Abschnitt 0.18.
```

```
- Struktur: Jeder Schritt hat das definierte Ausgabeformat einzuhalten.
- LÃ¼cken-Transparenz: Nicht gefundene Komponenten sind als `not_found` markiert.
UnvollstÃ¤ndige Komponenten als `partial` mit Angabe der fehlenden Teile.
- Keine Modifikation: Die Erfassung ist rein lesend. Es werden keine Dateien
verÃ¤ndert, erstellt oder gelÃ¶scht.
```

```
---
```

```
## 3. CORE ARCHITECTURE â€“ KOMPONENTENREGISTER
```

```
Erfasse alle Systemkomponenten in einer Komponenten-Tabelle mit folgenden Spalten:
```

```
| Komponente | Rolle | Eingaben | Ausgaben | Downstream | Versionierbar | Auditierbar |
Quelle: Produktivumgebung oder neu |
```

```
### 3.1 Master Supervisor / Orchestrator
```

- `Koordiniert alle Analysepfade.` 

- `WÃ¤hlt pro Asset genau ein Bewertungsmodell aus.` 

- `Konsolidiert Ergebnisse zu einem finalen Score.` 

- `Steuert Top-10-Analysen, Detailanalysen und Watchlist-Scans.` 

- `LÃ¶st Konflikte Ã¼ber DatenqualitÃ¤t, Confidence und PrioritÃ¤t auf.` 

- `Gibt pro Asset eine ModellbegrÃ¼ndung aus.` 

- `Stellt Auditierbarkeit sicher.` 

```
Hinweis: Falls in der Produktivumgebung bereits ein Supervisor existiert, ist dieser in
Abschnitt 0 zu erfassen. Die hier dokumentierte Architektur kann davon abweichen, wenn
der Bestand `extend`, `refactor` oder `replace` als Aktion erhalten hat.
```

# `### 3.2 Classification Agent` 

- `Ordnet Assets in Assetklasse, Hauptkategorie, Unterkategorie, Asset-Typ und Tier ein.` 

- `Erkennt, ob ein Asset primÃ¤r spekulativ, funktional, infrastrukturell oder` 

```
governance-orientiert ist.
- Liefert Classification-Reasoning als BegrÃ¼ndungskette.
```

```
### 3.3 Fundamental Agent
- Bewertet qualitÃ¤ts- und wertbezogene Kennzahlen pro Assetklasse.
- Untersucht QualitÃ¤t, Wachstum, Cashflows, Nutzung, Adoption, Tokenomics, Reserven
etc.
```

```
- Liefert Subscores je nach Assetklasse.
```

```
### 3.4 Risk Agent
- Bewertet VolatilitÃ¤t, LiquiditÃ¤tsrisiko, Konzentrationsrisiko, geopolitische
Risiken, Regulierungsrisiko, Manipulationsrisiko, Kreditrisiko etc.
- Liefert RiskScore, der invertiert in den Final Score einflieÃŸt.
```

```
### 3.5 Valuation Agent
```

```
- Berechnet den Wertkorridor (Conservative / Neutral / Optimistic).
```

```
- WÃ¤hlt das passende Bewertungsmodell je Asset-Typ.
```

```
- Liefert FairValueGap bei vorhandenem Referenzwert.
```

```
### 3.6 Ranking Agent
- Berechnet RankScore aus FinalScore, DataQualityScore, TierScore und LiquiditÃ¤ts-
StabilitÃ¤t.
- FÃ¼hrt Eligibility-Filter durch (MindestliquiditÃ¤t, Mindest-Confidence, keine
kritischen DatenlÃ¼cken).
```

```
- Sortiert absteigend, bei Gleichstand: LiquiditÃ¤t â†’ Data Quality â†’ Risk.
```

```
### 3.7 Data Quality Agent
- Bewertet Source-Coverage, Freshness, Supply-Transparenz, Exchange-Breadth, Outlier-
StabilitÃ¤t.
```

```
- Liefert DataQualityScore (low / medium / high / unknown).
```

```
- Identifiziert fehlende Felder.
```

```
### 3.8 Reporting Agent
- Kompiliert Audit-Ergebnisse.
```

- `Erstellt Markdown-Bericht, JSON-Summary, Roadmap. - Generiert Quality-Report und Workflow-Status.` 

```
### 3.9 Optionale Agenten (zu dokumentieren, falls relevant)
- Compliance Agent: PrÃ¼ft Regulierungs- und Offenlegungsanforderungen.
- Backtesting Agent: Out-of-sample, Walk-forward, Rebalancing-Simulation, Drift-
Monitoring.
```

```
- Regime Agent: Erkennt VolatilitÃ¤ts- und Trendregime, passt Gewichtungen an.
```

- `Sentiment Agent: NLP-Sentiment aus News, Social, Earnings Calls (z. B. FinBERT).` 

```
---
```

# `## 4. UNIVERSAL ASSET INTERFACE` 

```
Definiere ein neutrales, anwendungsunabhÃ¤ngiges Datenmodell, das ALLE Assetklassen
abdeckt. Dies ist der einzige harte Vertrag, den alle Komponenten einhalten mÃ¼ssen:
```

```
```json
{
  "asset_id": "string",
  "symbol": "string",
  "name": "string",
  "asset_class": "crypto | equity | forex | index | bond | commodity | etf |
derivative",
  "category_main": "string",
  "category_sub": "string",
  "asset_type": "string",
  "market": "string",
  "exchange": "string",
  "currency": "string",
  "tier": "1 | 2 | 3",
  "data_sources": ["string"],
  "required_metrics": ["string"],
  "optional_metrics": ["string"],
  "score_components": {
```

```
    "metric_name": "number (0-100)"
  },
  "weights": {
    "metric_name": "number (0-1)"
  },
  "risk_flags": ["string"],
  "confidence": "number (0-1)",
  "data_quality": {
    "level": "low | medium | high | unknown",
    "missing_fields": ["string"],
    "source_coverage": "number (0-1)",
    "freshness_minutes": "number"
  },
  "valuation_corridor": {
    "conservative": "number",
    "neutral": "number",
    "optimistic": "number",
    "fair_value_gap_pct": "number"
  },
  "ranking_eligibility": {
    "eligible": "boolean",
    "reason": "string"
  },
  "model_used": "string",
  "model_reasoning": "string",
  "audit_trail": ["string"],
  "calculation_version": "string"
}
```
```

```
---
```

```
## 5. ASSETKLASSEN-TIEFENSTRUKTUR
```

```
FÃ¼r JEDEN der folgenden Assetklassen ist ein vollstÃ¤ndiges Sub-Kapitel zu erstellen.
```

```
FÃ¼r jede Assetklasse ist ZUERST aus der Produktivumgebung zu erfassen, was bereits
existiert (Kategorien, Metriken, Formeln, Gewichte, Datenquellen). Dieser Bestand ist
als Ausgangsmaterial zu dokumentieren. Danach ist die erweiterte, unabhÃ¤ngige
Tiefenstruktur zu definieren â€“ sie kann bestehende Elemente Ã¼bernehmen, modifizieren
oder ersetzen.
```

```
Jedes Sub-Kapitel MUSS folgende Struktur haben:
```

```
### 5.X.0 Bestand aus Produktivumgebung
- Welche Kategorien, Metriken, Formeln, Gewichte und Datenquellen existieren bereits?
- Was ist geeignet, was fehlt, was muss Ã¼berarbeitet werden?
```

```
### 5.X.1 Kategorien und Unterkategorien
- VollstÃ¤ndige Liste aller Hauptkategorien.
```

```
- VollstÃ¤ndige Liste aller Unterkategorien.
- Asset-Typ-Klassifizierung.
```

```
### 5.X.2 Datenquellen
- PrimÃ¤re Datenquellen (APIs, Feeds, On-Chain, Off-Chain).
- SekundÃ¤re / Referenzquellen.
```

- `Datenanforderungen: Freshness, Coverage, Frequenz.` 

```
### 5.X.3 Metriken und Kennzahlen
```

- `VollstÃ¤ndige Liste aller relevanten Metriken.` 

- `Pflichtmetriken vs. optionale Metriken.` 

- `Definition jeder Metrik (Berechnungsgrundlage, Normalisierung).` 

```
### 5.X.4 Bewertungsmodell und Scoring-Formel
```

- `VollstÃ¤ndige Scoring-Formel mit allen Subscores und Gewichtungen. - Modellauswahl-Logik (welches Modell fÃ¼r welchen Subtyp). - Risikoadjustierung. - Wertkorridor-Definition. - Falls die Formel aus der Produktivumgebung Ã¼bernommen wurde: BegrÃ¼ndung. Falls neu:` 

```
BegrÃ¼ndung der Abweichung.
```

```
### 5.X.5 Risikofaktoren
```

```
- Assetspezifische Risiken.
```

- `Normalisierung und Gewichtung der Risiken.` 

```
### 5.X.6 Ranking-Regeln
```

```
- Eligibility-Kriterien.
```

```
- Sortierlogik.
```

- `Ausschlussregeln.` 

```
- Tier-spezifische Regeln.
```

- `### 5.X.7 Beispiel-JSON - VollstÃ¤ndiges JSON-Beispiel fÃ¼r ein reprÃ¤sentatives Asset der Klasse.` 

```
### 5.X.8 YAML-Konfigurationsbeispiel
- Gewichte, Schwellenwerte und Modellkonfiguration als YAML.
```

```
---
```

```
### 5.1 KRYPTOWÃ„HRUNGEN
```

```
Bestand aus Produktivumgebung erfassen: Welche Krypto-Kategorien, Subkategorien,
Scoring-Modelle (Base, DeFi, Stablecoin, Meme, RWA, Blue-chip etc.), Gewichte, Tiering-
Regeln, Wertkorridore und Datenquellen sind bereits implementiert?
```

```
Danach erweiterte Tiefenstruktur definieren. Kategorien (mindestens): Layer 1, Layer 2,
DeFi, Smart Contract Platform, Infrastructure, Oracle, Gaming, AI/Data, Payments,
Privacy, Meme, Stablecoin, Exchange Token, Governance, Real World Assets,
Storage/Compute, Interoperability, Liquid Staking, Restaking, Bridging, NFT/Creator,
Derivatives, DAO/Community, Index/Basket, Utility Token.
```

```
Unterkategorien: Chain-native Asset, Ecosystem Token, Protocol Token, Exchange-Backed
Asset, Governance Asset, Synthetic Asset, Wrapped Asset, Yield Asset.
```

```
MÃ¶gliche Bewertungsmodelle (pro Asset-Typ, zu erfassen und ggf. zu erweitern oder zu
ersetzen):
```

- `Blue-chip Chain Model (Layer 1, Infrastructure).` 

- `DeFi Cashflow Model (Fee Revenue, TVL Quality, Tokenomics, Governance).` 

- `Stablecoin Risk Model (Compliance, Supply Transparency, Reserve Quality).` 

- `Meme/Speculative Model (Sentiment, Liquidity, Community, Risk).` 

- `RWA/Yield Model (Compliance, Utility, Revenue, Adoption).` 

- `Governance/Adoption Model.` 

```
Scoring-Komponenten (Vorschlag, aus Bestand zu validieren): MarketCap, Liquidity,
VolumeQuality, Tokenomics, SupplyTransparency, NetworkActivity, Security,
DeveloperActivity, Utility, FeeGeneration, Revenue, GovernanceStrength, Adoption, Risk,
Volatility, Sentiment, Compliance, TVLQuality (DeFi).
```

```
Risikoklassen: Tier 1 (frei rankbar), Tier 2 (rankbar mit Abschlag), Tier 3 (nur bei
ausreichender Confidence und LiquiditÃ¤t).
```

```
### 5.2 AKTIEN
```

```
Bestand aus Produktivumgebung erfassen: Falls Aktien bereits teilweise implementiert
sind, sind Kategorien, Metriken, Formeln und Datenquellen zu dokumentieren. Falls nicht
vorhanden, als `new` markieren.
```

```
Kategorien: Large Cap, Mid Cap, Small Cap, Micro Cap, Growth, Value, Dividend, High
Beta, Blue Chip, Penny Stock.
```

```
Sektoren: Technologie, Finanzen, Gesundheit, Energie, VerbrauchsgÃ¼ter, Industrie,
Materialien, Versorger, Immobilien, Telekommunikation.
```

```
Bewertungsmodelle: Quality-Value Model, Growth-Momentum Model, Dividend-Income Model,
Distressed/Recovery Model.
```

```
Metriken: P/E, P/B, ROE, ROA, Debt/Equity, Free Cash Flow, Earnings Growth, Revenue
Growth, Margin Trends, Earnings Revisions, Earnings Tone (FinBERT), Insider Activity,
```

```
Institutional Ownership, Short Interest, Analyst Consensus, Price Momentum, Relative
Strength.
```

```
### 5.3 FOREX
```

```
Bestand aus Produktivumgebung erfassen.
```

```
Kategorien: G10 Majors, G10 Crosses, Emerging Market Currencies, Carry Currencies, Safe
Haven Currencies.
```

```
Metriken: Zinsdifferenz, Realrendite, Inflationsdifferenz, Trade Balance, Current
Account, GDP Growth Diff, Carry Score, Dollar Index Correlation, Risk Appetite,
Intermarket Correlation, Momentum, Volatility Regime.
```

```
### 5.4 INDIZES
```

```
Bestand aus Produktivumgebung erfassen.
```

```
Kategorien: Broad Market, Sector, Strategy, Volatility, Thematic.
```

```
Metriken: Breadth, Advance/Decline Ratio, Sector Rotation, Volatility (VIX), Trend
Strength, Market Cap Concentration, Earnings Trend, Sentiment, Flow Data, Intermarket.
```

```
### 5.5 BONDS
```

```
Bestand aus Produktivumgebung erfassen.
```

```
Kategorien: Government, Corporate Investment Grade, Corporate High Yield, Municipal,
Inflation-Linked, Emerging Market Sovereign.
```

```
Metriken: Duration, Modified Duration, Convexity, Credit Spread, Yield to Maturity,
Real Yield, Inflation Expectations, Default Probability, Recovery Rate, Liquidity
Stress, Rating, Spread Duration.
```

```
### 5.6 ROHSTOFFE
```

```
Bestand aus Produktivumgebung erfassen: Falls bereits ein Rohstoff-Scoring existiert
(Intrinsic Value / Execution / Risk Score etc.), ist dieses als Material zu
dokumentieren.
```

```
Kategorien: Edelmetalle, Industriemetalle, Energie, Agrar, kritische Rohstoffe.
```

```
Unterkategorien: Mining, Raffinerie, Spot, Futures, ETF/ETC.
```

```
Metriken: Marktpreis/LiquiditÃ¤t, Gehalt/Reinheit, Tonnage/Volumen, FÃ¶rderkosten,
Infrastruktur/Logistik, ESG/Regulierung, Strategische Knappheit, LagerbestÃ¤nde,
Seasonality, Geopolitisches Risiko, Supply/Demand Balance, Cut-off-Grade.
```

```
Bewertungsachsen (aus Bestand zu validieren oder neu zu definieren): Intrinsic Value
Score, Execution Score, Risk Score.
```

```
### 5.7 ETF / FONDS (optional)
```

```
Bestand aus Produktivumgebung erfassen.
```

```
Kategorien: Index-ETF, Active ETF, Smart Beta, Thematic, Leveraged/Inverse, Commodity-
ETC.
```

```
Metriken: Tracking Error, Expense Ratio, AUM, Liquidity, Holdings Concentration, Sector
Exposure, Factor Exposure, Premium/Discount, Creation/Redemption.
```

```
### 5.8 DERIVATE / FUTURES (optional)
```

```
Bestand aus Produktivumgebung erfassen.
```

```
Kategorien: Index Futures, Commodity Futures, Crypto Futures, Options, Swaps.
```

```
Metriken: Basis/Futures Curve (Contango/Backwardation), Open Interest, Funding Rate,
Put/Call Ratio, Volatility Skew, Gamma Exposure, Dealer Positioning.
```

```
---
```

# `## 6. SCORING- UND RANKING-METHODIK` 

```
### 6.1 Vorgehen
```

```
Scoring- und Ranking-Logik ist wie folgt aufzubauen:
```

```
1. Erfasse die bestehende Scoring-Logik aus der Produktivumgebung (Formeln, Gewichte,
Schwellenwerte, Normalisierungsregeln) in Abschnitt 0.
```

`2. Bewerte jede erfasste Logik-Komponente (keep_as_is / extend / refactor / replace / new).` 

`3. Definiere die Scoring- und Ranking-Methodik auf Basis dieser Bewertung. Ãœbernimm bewÃ¤hrte Logik, ersetze oder erweitere, wo nÃ¶tig.` 

```
4. Dokumentiere jede Entscheidung: Wurde eine Formel Ã¼bernommen oder neu definiert?
Warum?
```

```
### 6.2 Score-Hierarchie
```

```
| Ebene | Zweck | Beispiel |
```

```
|---|---|---|
```

```
| Indikator | Einzelmetrik bewerten | RSI, Spread, Funding Rate |
| Subklasse | Teilsegmente unterscheiden | Crypto-Large Cap, FX-G10, Equity-Growth |
| Assetklasse | Gesamturteil pro Klasse | Crypto Score, FX Score, Equity Score |
| Meta-Score | Cross-Asset-Ranking | Risk-on/Risk-off, AllokationsprioritÃ¤t |
```

```
### 6.3 Scoring-Kontrakt (HARTER VERTRAG)
```

```
Jedes Asset MUSS folgende Score-Felder liefern, unabhÃ¤ngig davon, welche internen
Modelle verwendet werden:
```

```
```json
{
  "scores": {
    "base_score": "number (0-100)",
    "asset_class_score": "number (0-100)",
    "category_score": "number (0-100)",
    "risk_adjusted_score": "number (0-100)",
    "confidence_score": "number (0-1)",
    "data_quality_score": "number (0-100) | low | medium | high | unknown",
    "rank_score": "number (0-100)",
    "final_enterprise_score": "number (0-100)",
    "score_breakdown": {
      "metric": "contribution_to_final"
    },
    "explanation_trace": ["string"]
  }
}
```
```

```
### 6.4 Ranking-Logik
```

```
Die Ranking-Formel ist aus der Produktivumgebung zu erfassen. Falls sie als geeignet
bewertet wird, kann sie Ã¼bernommen werden. Falls nicht, ist eine neue Formel zu
definieren. Beide Wege sind zu begrÃ¼nden.
```

```
Strukturelle Anforderungen an die Ranking-Logik:
- RankScore muss FinalScore, DataQualityScore, TierScore und LiquiditÃ¤ts-StabilitÃ¤t
gewichten.
- Eligibility-Filter muss Confidence, LiquiditÃ¤t und DatenqualitÃ¤t prÃ¼fen.
- Bei Gleichstand: LiquiditÃ¤t â†’ Data Quality â†’ Risk.
```

```
- Assets mit unzureichender DatenqualitÃ¤t sind vom Ranking ausgeschlossen.
```

```
### 6.5 Top-10-Modi
```

```
Mindestens zu unterstÃ¼tzende Modi:
```

```
- Overall Top 10
```

```
- Top 10 by Category
```

- `Top 10 by Tier` 

- `Top 10 by Market Quality` 

- `Top 10 by Growth Potential` 

```
### 6.6 Normalisierungsregeln
```

- `Alle Metriken werden auf 0â€“100 normalisiert.` 

- `Negative Metriken (Risk, Volatility) werden invertiert: (100 - value).` 

- `Gewichtungen mÃ¼ssen pro Modell aufsummiert 1.0 (oder 100%) ergeben.` 

- `Division durch 0 muss abgefangen werden.` 

- `NaN-Werte sind verboten; fehlende Werte = 0 mit Confidence-Reduktion.` 

```
---
```

```
## 7. DATENQUALITÃ„TS- UND CONFIDENCE-MODELL
```

```
### 7.1 Vorgehen
```

```
Auch das DatenqualitÃ¤ts- und Confidence-Modell ist aus der Produktivumgebung zu
erfassen und zu bewerten. Falls eine bestehende Logik geeignet ist, kann sie
Ã¼bernommen werden. Andernfalls ist ein neues Modell zu definieren.
```

```
### 7.2 Data Quality Score
```

```
Strukturelle Anforderung: Der DataQualityScore muss aus Source-Coverage, Freshness,
Supply-Transparenz, Exchange-Breadth und Outlier-StabilitÃ¤t berechnet werden.
```

```
Level: low (0-39) | medium (40-74) | high (75-100) | unknown
```

```
### 7.3 Confidence Score
```

```
Strukturelle Anforderung: Confidence muss aus Basis-Confidence, DatenqualitÃ¤t,
Quellenanzahl und Freshness berechnet werden.
```

- `Fehlende Pflichtfelder reduzieren Confidence.` 

- `Assets unterhalb eines zu definierenden Schwellenwerts sind nicht fÃ¼r Top-10-Ranking zugelassen.` 

- `Confidence wird pro Asset und pro Score-Komponente berechnet.` 

```
### 7.4 Manipulationsschutz
```

- `VWAP-nahe Preisbildung bei vorhandenen Preisquellen.` 

- `Volumenrobuste Aggregation.` 

- `Outlier-Detection und Entfernung unplausibler Preis-/VolumensprÃ¼nge.` 

- `Assets mit extrem niedriger LiquiditÃ¤t oder unzuverlÃ¤ssiger Supply-Transparenz werden im Ranking abgestraft.` 

```
---
```

# `## 8. DEPENDENCY-INVENTAR` 

```
Erfasse alle AbhÃ¤ngigkeiten in einer Matrix mit folgenden Spalten:
```

```
| AbhÃ¤ngigkeitstyp | Beschreibung | Betroffene Komponenten | Version | Status | Risiko
bei Ausfall | Quelle: Produktiv oder neu |
```

```
### 8.1 DatenabhÃ¤ngigkeiten
```

- `Marktdaten-Feeds (Preise, Volumen, Orderbuch).` 

- `On-Chain-Daten (fÃ¼r Krypto).` 

- `Fundamentaldaten (Bilanzen, Earnings, Makro).` 

- `Sentiment-Daten (News, Social).` 

- `Referenzdaten (ISIN, Symbol-Mappings).` 

```
### 8.2 API-AbhÃ¤ngigkeiten
```

- `Externe API-Provider pro Assetklasse.` 

- `Rate-Limits, Authentifizierung, Failover-Strategie.` 

- `Datenabkommen und Lizenzbedingungen.` 

```
### 8.3 ModellabhÃ¤ngigkeiten
```

- `Scoring-Modelle pro Asset-Typ.` 

- `NLP-Modelle (FinBERT etc.).` 

- `Regime-Erkennungs-Modelle.` 

```
### 8.4 FormelabhÃ¤ngigkeiten
```

- `Gewichtungs-Konfigurationen pro Modell.` 

- `Normalisierungs-Regeln.` 

- `Threshold-Werte.` 

```
### 8.5 Agent-AbhÃ¤ngigkeiten
```

- `Aufrufreihenfolge der Agenten.` 

- `Datenfluss zwischen Agenten.` 

- `Supervisor-Entscheidungslogik.` 

```
### 8.6 KonfigurationsabhÃ¤ngigkeiten
```

- `Weights-Dateien (JSON/YAML).` 

- `Threshold-Konfigurationen.` 

- `Tiering-Regeln.` 

```
### 8.7 Audit- und Logging-AbhÃ¤ngigkeiten
```

- `Event-Typen (data.validated, score.approved, report.completed etc.).` 

- `Audit-Trail-Format.` 

- `Logging-Level und Retention.` 

```
### 8.8 Test- und Backtesting-AbhÃ¤ngigkeiten
```

- `Testdaten-Sets.` 

- `Backtesting-Framework.` 

- `Drift-Monitoring.` 

- `Walk-Forward-Validierung.` 

```
---
```

```
## 9. ERWEITERUNGS-PLAYBOOK
```

```
Dieser Abschnitt dokumentiert, wie eine neue Assetklasse oder ein neues Sub-Modul
unabhÃ¤ngig hinzugefÃ¼gt wird, ohne die Produktivumgebung zu berÃ¼hren.
```

```
### 9.1 HinzufÃ¼gen einer neuen Assetklasse
```

`1. **Bestand erfassen**: Falls Teilkomponenten in der Produktivumgebung existieren, diese in Abschnitt 0 erfassen.` 

`2. **Klassifizierung definieren**: Hauptkategorien, Unterkategorien, Asset-Typen, Tiering-Regeln.` 

`3. **Metriken definieren**: Pflichtmetriken, optionale Metriken, Berechnungsgrundlagen, Normalisierungsregeln.` 

`4. **Scoring-Modell erstellen**: Subscores, Gewichtungen (Summe = 1.0), Risikoadjustierung, Wertkorridor.` 

`5. **Datenquellen identifizieren**: PrimÃ¤r-/SekundÃ¤rquellen, API-Anforderungen, Frequenz, Coverage.` 

`6. **Ranking-Regeln festlegen**: Eligibility-Kriterien, Sortierlogik, Ausschlussregeln.` 

`7. **Risk Flags definieren**: Assetspezifische Risiken, Schwellenwerte.` 

`8. **Beispiel-JSON erstellen**: ReprÃ¤sentatives Asset mit allen Feldern.` 

`9. **YAML-Konfiguration erstellen**: Gewichte, Thresholds, Modellkonfiguration.` 

`10. **TestfÃ¤lle definieren**: Edge Cases, Null-/Fehlwerte, Outlier, historische Daten.` 

`11. **Integration prÃ¼fen**: Supervisor-Anbindung, Classification Agent, Ranking Agent, Reporting Agent.` 

`12. **Dokumentation aktualisieren**: Scoring-Model, Classification-Model, API-Doku, Changelog.` 

```
### 9.2 HinzufÃ¼gen einer neuen Subkategorie
```

`1. Bestand aus Produktivumgebung erfassen (falls vorhanden).` 

`2. Subkategorie innerhalb der Assetklasse definieren.` 

`3. Spezifische Metriken und Gewichtungen festlegen.` 

`4. Modellauswahl-Logik im Supervisor aktualisieren.` 

`5. TestfÃ¤lle fÃ¼r die neue Subkategorie erstellen.` 

`6. Changelog-Eintrag mit Version, Datum und BegrÃ¼ndung.` 

```
### 9.3 KompatibilitÃ¤tsprÃ¼fung
```

- `Neue Gewichtungen mÃ¼ssen auf 1.0 normiert sein.` 

- `Neue Metriken mÃ¼ssen einen Normalisierungspfad haben.` 

- `Neue Modelle dÃ¼rfen bestehende Modelle nicht verÃ¤ndern.` 

- `Neue Assetklassen dÃ¼rfen den Universal Asset Interface-Vertrag und den ScoringKontrakt nicht brechen.` 

- `Changelog- und Backlog-EintrÃ¤ge sind Pflicht.` 

```
---
```

```
## 10. COMPLIANCE- UND AUDIT-LAYER
```

```
### 10.1 Auditierbarkeit
```

```
- Jede Score-Berechnung erzeugt einen Audit-Trail mit: Input-Daten, verwendete Formel,
Gewichte, Zwischenergebnisse, Final Score, Confidence, DatenqualitÃ¤t,
ModellbegrÃ¼ndung.
```

- `Audit-Trails sind versionierbar und reproduzierbar.` 

- `Bei Modellwechsel wird die Modellversion im Audit-Trail dokumentiert.` 

```
### 10.2 BaFin-KonformitÃ¤t
```

- `Transparenz: Jede Score-Komponente ist nachvollziehbar begrÃ¼ndet.` 

- `Reproduzierbarkeit: Gleiche Inputs liefern gleiche Scores bei gleicher Modellversion.` 

- `Nachvollziehbarkeit: Datenherkunft jeder Metrik ist dokumentiert.` 

- `Fehlerresistenz: Edge Cases, Nullwerte, Outlier werden robust behandelt.` 

- `DatenqualitÃ¤t: Pro Asset wird ein DataQualityScore ausgewiesen.` 

```
### 10.3 Event-Schema
```

```
```
```

```
data.validated â†’ data.rejected â†’ data.needs_review
score.approved â†’ score.rejected â†’ score.review_required
report.completed â†’ roadmap.completed â†’ workflow.completed```
```

```
---
```

# `## 11. BACKLOG UND ROADMAP` 

# `### Backlog-Format` 

```
| ID | Titel | Beschreibung | PrioritÃ¤t | Status | Datum |
```

```
### Roadmap-Phasen
```

- `Phase 0: Bestandsaufnahme Produktivumgebung (Abschnitt 0)` 

- `Phase 1: Datenvalidierung` 

- `Phase 2: Scoring-Audit` 

- `Phase 3: Backtesting` 

- `Phase 4: Regime-Erkennung` 

- `Phase 5: Multi-Timeframe-Analyse` 

- `Phase 6: Watchlist-Automation` 

- `Phase 7: Performance-Monitoring` 

- `Phase 8: Erweiterung auf weitere Assetklassen` 

- `Phase 9: Cross-Asset-Allokations-Logik` 

- `Phase 10: Echtzeit-Ranking-Refresh` 

```
---
```

# `## 12. AUSGABEANFORDERUNGEN` 

- `Der Bericht ist in Markdown zu verfassen.` 

- `Tabellen fÃ¼r Dependencies, Komponenten und Metriken.` 

- `JSON-Beispiele pro Assetklasse.` 

- `YAML-Konfigurations-Snippets pro Scoring-Modell.` 

- `Klare Trennung zwischen fachlicher Architektur und optionaler technischer Referenz.` 

- `Kein Pseudocode-Zwang, aber Architektur-Snippets sind erlaubt.` 

- `Jede wichtige Entscheidung ist dokumentiert.` 

```
- FÃ¼r jede aus der Produktivumgebung Ã¼bernommene Logik: BegrÃ¼ndung, warum sie
Ã¼bernommen wurde.
```

```
- FÃ¼r jede neu definierte oder ersetzte Logik: BegrÃ¼ndung, warum sie neu definiert
wurde.
```

- `Changelog und Backlog sind am Ende zu pflegen.` 

```
---
```

```
## 13. ARBEITSWEISE
```

```
1. **ERFASSEN**: Lese alle bestehenden FinTech-Komponenten aus der Produktivumgebung
aus und dokumentiere sie in Abschnitt 0 (Bestandsaufnahme). Dies umfasst Agenten,
Scoring-Modelle, Formeln, Gewichte, Ranking-Logik, Tiering, Wertkorridore,
DatenqualitÃ¤ts-Modell, Datenquellen, API-AbhÃ¤ngigkeiten, Konfigurationen, Skill-Layer
und Assetklassen-Abdeckung.
2. **BEWERTEN**: Bewerte jede erfasste Komponente (keep_as_is / extend / refactor /
replace / new) in Abschnitt 0.2.
```

`3. **KOMPONENTENREGISTER ERSTELLEN**: Definiere das Komponentenregister auf Basis der Bewertung (Abschnitt 3).` 

`4. **DEPENDENCY-INVENTAR ERSTELLEN**: Erfasse alle AbhÃ¤ngigkeiten, markiert als Produktiv oder neu (Abschnitt 8).` 

`5. **ASSETKLASSEN DEFINIEREN**: Dokumentiere jede Assetklasse mit voller Tiefe â€“ zuerst Bestand, dann erweiterte Definition (Abschnitt 5).` 

`6. **SCORING UND RANKING DEFINIEREN**: Definiere die Methodik, mit klaren Entscheidungen pro Logik-Komponente (Abschnitt 6). 7. **ERWEITERUNGS-PLAYBOOK ERSTELLEN**: Dokumentiere, wie neue Assetklassen unabhÃ¤ngig hinzugefÃ¼gt werden (Abschnitt 9).` 

`8. **COMPLIANCE DOKUMENTIEREN**: Compliance- und Audit-Anforderungen (Abschnitt 10).` 

`9. **BACKLOG UND ROADMAP PFLEGEN** (Abschnitt 11).` 

```
10. **INTEGRITÃ„T PRÃœFEN**: Sind alle Querverweise korrekt? Fehlen AbhÃ¤ngigkeiten?
Sind alle Gewichtungen normiert? Sind alle Ãœbernahme-/Ersetzungs-Entscheidungen
begrÃ¼ndet?
```

```
---
```

```
## KONTEXT: HINWEIS ZUR PRODUKTIVUMGEBUNG
```

```
Die Produktivumgebung enthÃ¤lt FinTech-Komponenten fÃ¼r Screening und
Bewertungslogiken. Diese Komponenten sind im Bericht NICHT als verbindliche Basis
vorauszusetzen, sondern in Abschnitt 0 neutral zu erfassen und zu bewerten.
```

```
Folgende Komponententypen kÃ¶nnen in der Produktivumgebung vorhanden sein (die Liste
ist nicht abschlieÃŸend â€“ erfasse alles, was du findest):
```

- `Agenten: Supervisor, Orchestrator, Classification, Fundamental, Risk, Valuation etc. - Services: Scoring, Ranking, Classification, Valuation, Validation.` 

- `Scoring-Modelle: Base, DeFi, Stablecoin, Meme, RWA, Blue-chip etc. mit jeweiligen Gewichten.` 

- `Skill-Layer: Data Validation, Scoring Audit, Reporting Orchestration.` 

- `Tiering-Logik, Wertkorridor-Logik, Ranking-Logik.` 

- `Datenquellen und API-Anbindungen.` 

- `Konfigurationen (JSON/YAML Weights, Thresholds).` 

- `Projektstruktur und Ordnerlayout.` 

- `Audit- und Event-Schema.` 

```
Wichtig: Diese Liste ist eine Suchhilfe, keine Vorgabe. Erfasse, was tatsÃ¤chlich
existiert. Bewerte, was geeignet ist. Definiere neu, was fehlt. Erweitere, was
unvollstÃ¤ndig ist. Ersetze, was nicht geeignet ist. Der Bericht definiert die
Zielarchitektur, nicht den Ist-Zustand.
```
```

