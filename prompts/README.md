# CAPITAL-AI Prompt-Bibliothek

Diese Bibliothek enthält versionierte Aufgabenbeschreibungen für wiederkehrende Arbeit. [AGENTS.md](../AGENTS.md) definiert die Repository-Autorität. Prompt-Dateien erteilen keine zusätzlichen Berechtigungen und führen keine Workflows oder Pflichtprüfungen ein.

## Verwendung und Pflege

- Wähle anhand der Aufgabe einen Prompt und lies die aktuelle `AGENTS.md` sowie die fachlich passenden Skills. Gib bei Bedarf den Aufgaben-Scope, Main-SHA und belegbare Quellen mit. In einer externen KI-App teile nur freigegebene Inhalte.
- Nenne in der Ausgabe die verwendete Prompt-ID und Version. Prüfe, ob der Prompt tatsächlich zum Auftrag passt und ob die erforderlichen Eingaben und Werkzeuge vorliegen. Ein Prompt erzeugt keine Ausführungs- oder Freigabeevidenz.
- IDs bleiben stabil. Jede Datei enthält YAML-Frontmatter mit `id`, `version`, `status`, `primary_domain` und `category`. `active` bezeichnet einen zur Auswahl vorgesehenen Prompt. `deprecated` bezeichnet einen ersetzten Prompt.
- Erhöhe die Version nach SemVer. PATCH für Klarstellungen ohne Verhaltensänderung, MINOR für kompatible Ergänzungen, MAJOR für inkompatible Änderungen an Eingaben, Ausgaben oder Verhalten. Beschreibe im regulären PR die Wirkung auf vorhandene Aufrufer. Ergänze bei `deprecated` den Grund und den Ersatz direkt in der Datei. Verwende IDs nicht erneut.
- GOVERNANCE, DEVICECARE, KNOWLEDGE, AGENTS, COMMERCE und MARKETPLACE sind Fähigkeiten oder Produktbereiche. Die Primary Domain bleibt eine der fünf bestehenden Domains.

## Zweiter Layer · 011–025

| ID | Prompt | Primary Domain | Kategorie |
| --- | --- | --- | --- |
| 011 | [Enterprise Governance Starter Pack Generator](011-enterprise-governance-starter-pack.md) | TRUST | Governance |
| 012 | [Repository Merger](012-ecosystem-merger.md) | PLATFORM | Ecosystem |
| 013 | [AI DeviceCare Product Owner](013-devicecare-product.md) | PRODUCT | DeviceCare |
| 014 | [Android Runtime Architect](014-android-runtime-architect.md) | PLATFORM | Android AI |
| 015 | [Marketplace Architect](015-marketplace-architect.md) | PRODUCT | Marketplace |
| 016 | [Pricing Intelligence](016-pricing-intelligence.md) | GROWTH | Commerce |
| 017 | [Capital-AI Website Architect](017-capital-ai-website-architect.md) | PRODUCT | Website |
| 018 | [AI Governance Auditor](018-ai-governance-auditor.md) | TRUST | Governance |
| 019 | [Security Threat Modeling](019-security-threat-modeling.md) | TRUST | Security |
| 020 | [Android AI Benchmarking](020-android-ai-benchmarking.md) | PLATFORM | Android AI |
| 021 | [Prompt Library Manager](021-prompt-library-manager.md) | PLATFORM | Prompt Governance |
| 022 | [Branding Director](022-branding-director.md) | GROWTH | Branding |
| 023 | [Growth Engine](023-growth-engine.md) | GROWTH | Growth |
| 024 | [Solo Founder CTO](024-solo-founder-cto.md) | PLATFORM | Solo Maintainer |
| 025 | [Master Governance Prompt](025-master-governance-system.md) | TRUST | Prompt Governance |

## Bestehender erster Layer

Die beim Abgleich vorhandenen IDs [001–009](../.ai/prompts/) bleiben an ihren bestehenden Pfaden. [010 · Governance Evidence Review](010-governance-evidence-review.md) ist ein neu formulierter und vom Owner freigegebener Prompt der Domain TRUST. Weitere Prompts in anderen Verzeichnissen behalten ihre bisherigen Pfade.
