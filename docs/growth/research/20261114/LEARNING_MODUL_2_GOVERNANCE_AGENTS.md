# CAPITAL-AI Learning Hub — Modul 2
## Governance-as-Code für KI-Agenten in FinTech
**Status:** PROPOSED  
**Länge:** ca. 920 Wörter  

### Lernartikel

KI-Agenten, die Aufgaben autonom ausführen, verändern die Risikolandschaft in Finanzinstituten. Frameworks wie LangGraph ermöglichen zustandsbehaftete, langlebige Workflows mit Human-in-the-Loop-Punkten. Gleichzeitig steigen die Anforderungen an Nachvollziehbarkeit, Auditierbarkeit und Begrenzung von Handlungsbefugnissen. Der EU AI Act, DORA und aufsichtsrechtliche Erwartungen an Model Risk Management verlangen, dass auch agentische Systeme dokumentiert, überwacht und bei Bedarf gestoppt werden können.

**Governance as Code** bedeutet, dass Kontrollen nicht nur in Richtlinien, sondern in ausführbarem Code und Konfiguration existieren. Beispiele sind erzwungene Freigabeschritte, Audit-Logs, begrenzte Tool-Zugriffe und deterministische Zustandsübergänge. CAPITAL-AI setzt mit SOLO_MAINTAINER_FLOW@2 und AGENTS.md bereits einen konservativen, risikobasierten Ansatz um: Einzelne Maintainer entscheiden unter klaren Gates, statt autonome Multi-Agenten-Systeme unkontrolliert laufen zu lassen.

Gegenpositionen betonen den Geschwindigkeitsvorteil vollautonomer Agenten. Population-level-Effekte können jedoch entstehen, selbst wenn jede einzelne Agenteninstanz lokal compliant ist (siehe ARIA-Forschung). Deshalb bevorzugt CAPITAL-AI derzeit kontrollierte Solo-Maintainer-Prozesse mit expliziten Evidence- und Review-Gates.

### Synthetisches Beispiel
Ein Agent erhält die Aufgabe, einen Learning-Draft aus einer allowlisted Quelle zu erzeugen.  
Deterministischer Zustandsmaschine:  
1. Source-Allowlist-Check → pass/fail  
2. CADS-Qualitätsprüfung → Score  
3. Human-Approval-Flag = false (default)  
4. Delivery = blocked  

Nur bei explizitem Human-Override und dokumentiertem SHA wird der Status auf „draft ready“ gesetzt. Kein automatisches Publishing.

### Grafik
**Herkunftsangabe (ungeprüft):** SUBSCRIPTION_GENERATED (Grok Imagine, didaktischer Entwurf); konkrete kommerzielle Nutzungsrechte sind NOT_PROVEN. Keine Publishing-Freigabe.  
![Governance Diagramm](https://drive.google.com/uc?export=view&id=1dbgh0poX2fOahqRngEjVtNOd3c3vmHj4)

Zustandsdiagramm mit drei Knoten: Ingestion → Quality Gate → Human Gate. Rote Stop-Kante bei fehlender Freigabe, grüne Fortsetzung nur nach Approval. Farben Navy/Gold/Cyan.

### Quiz (5 Fragen)
1. Was bedeutet Governance as Code primär? → Kontrollen sind ausführbar und versioniert.  
2. Welchen Vorteil hat ein Human-in-the-Loop bei LangGraph-Agenten? → Aufsicht und Eingriffsmöglichkeit.  
3. Warum kann lokale Compliance kollektiv diskriminierend wirken? → Aggregierte Effekte über viele Agenten.  
4. Welchen Ansatz verfolgt CAPITAL-AI aktuell? → SOLO_MAINTAINER_FLOW@2 mit risikobasierten Gates.  
5. Darf ein Agent ohne explizite Freigabe publizieren? → Nein.

### Glossar
Governance as Code, Human-in-the-Loop, Audit Trail, SOLO_MAINTAINER_FLOW, Agent Boundary

### Diagrammbeschreibung
Zustandsdiagramm mit drei Knoten: Ingestion → Quality Gate → Human Gate. Rote Stop-Kante bei fehlender Freigabe, grüne Fortsetzung nur nach Approval. Farben Navy/Gold/Cyan.

### CTA
Erkunden Sie die implementierten Governance-Gates im CAPITAL-AI Repository und den zugehörigen Learning-Pfaden.
