# CAPITAL-AI Learning Hub — Modul 1
## SHAP und Counterfactual Explanations im Credit Scoring
**Status:** PROPOSED (redaktionelle Prüfung erforderlich)  
**Zielgruppe:** Lernende im Financial Learning Simulator / Chart-Lernatlas  
**Länge:** ca. 980 Wörter  
**Datenbasis:** ausschließlich synthetisch  

### Lernartikel

Explainable Artificial Intelligence (XAI) ist in der Kreditrisiko-Modellierung kein optionales Add-on mehr, sondern eine regulatorische und geschäftliche Notwendigkeit. Modelle wie Gradient Boosting oder neuronale Netze erreichen häufig höhere Vorhersagegüte als klassische logistische Regressionen. Gleichzeitig werden sie als „Black Boxes“ wahrgenommen. Aufsichtsbehörden und Verbraucher erwarten nachvollziehbare Gründe für ablehnende Kreditentscheidungen (Adverse Action). Der EU AI Act stuft Systeme zur Bewertung der Kreditwürdigkeit natürlicher Personen als Hochrisiko ein und verlangt Transparenz, menschliche Aufsicht und Risikomanagement.

Zwei besonders relevante Erklärungsansätze sind SHAP und Counterfactual Explanations.

**SHAP (SHapley Additive exPlanations)** zerlegt die Modellvorhersage in additive Beiträge einzelner Merkmale. Der Ansatz basiert auf der Shapley-Wert-Theorie aus der kooperativen Spieltheorie. Jedes Merkmal erhält einen Wert, der seinen durchschnittlichen marginalen Beitrag über alle möglichen Merkmalskombinationen hinweg beschreibt. Die Summe der SHAP-Werte plus dem Basiswert ergibt exakt die Modellvorhersage. Dadurch sind die Erklärungen konsistent und lokal treu. Globale Aussagen entstehen durch Aggregation über viele Beobachtungen.

**Counterfactual Explanations** (z. B. mit DiCE) beantworten eine andere Frage: Welche minimalen, realistischen Änderungen an den Eingaben würden zu einem anderen Ergebnis führen? Statt „Warum wurde abgelehnt?“ lautet die Antwort „Was müsste sich ändern, damit genehmigt wird?“. Das macht die Erklärung handlungsorientiert.

Beide Ansätze ergänzen sich. SHAP erklärt den Ist-Zustand, Counterfactuals zeigen mögliche Pfade in einen gewünschten Zustand. In der Praxis werden sie häufig kombiniert: Zuerst SHAP zur Diagnose, anschließend Counterfactuals zur Handlungsempfehlung.

Kritische Gegenpositionen betonen die Grenzen. LIME-Erklärungen können bei ähnlichen Eingaben instabil sein. LLM-generierte Narrative über SHAP-Werte können zusätzliche Opazität erzeugen, wenn sie nicht an die numerischen Werte gebunden bleiben. Federated oder privacy-preserving Varianten reduzieren die Datenqualität und damit die Erklärungsstabilität. CAPITAL-AI nutzt deshalb ausschließlich synthetische Daten im Learning Simulator und kennzeichnet Erklärungen klar als didaktisch.

### Mathematisch nachvollziehbares Beispiel (synthetisch)

Annahme eines einfachen logistischen Modells für die Ausfallwahrscheinlichkeit:

\[
p = \frac{1}{1 + e^{-z}}, \quad z = -1{,}2 + 0{,}004 \cdot \text{Einkommen} - 0{,}8 \cdot \text{Verschuldungsgrad}
\]

Synthetische Werte eines Antragstellers:  
- Einkommen = 48 000  
- Verschuldungsgrad = 0,35  

Basiswert (Durchschnittspopulation) = 0,28.  
Modellvorhersage = 0,41.  

SHAP-Beiträge (approximiert):  
- Einkommen: +0,09  
- Verschuldungsgrad: −0,12  
- Residual/Interaktion: +0,16  

Summe: 0,28 + 0,09 − 0,12 + 0,16 = 0,41.

Counterfactual (minimal): Eine Erhöhung des Einkommens auf 54 000 oder eine Senkung des Verschuldungsgrads auf 0,27 würde die vorhergesagte Wahrscheinlichkeit unter 0,30 senken. Beide Änderungen liegen innerhalb realistischer Bandbreiten und werden im Simulator als interaktive Slider angeboten.

### Grafik
![SHAP Diagramm](https://drive.google.com/uc?export=view&id=1erXG1gj7aZoyrz6a_EVCou2zvhpMU4kf)

Horizontales Balkendiagramm. Positive Beiträge (Einkommen) in Gold, negative Beiträge (Verschuldungsgrad) in Navy. Der Basiswert als gestrichelte Referenzlinie in Cyan. Beschriftungen links, Werte rechts. Keine überlappenden Elemente, ausreichender Kontrast.

### Fünf Quizfragen

1. **Frage:** Welches mathematische Prinzip liegt SHAP zugrunde?  
   **Antwort:** Shapley-Werte aus der kooperativen Spieltheorie.  
   **Begründung:** Nur dieses Prinzip garantiert die Axiome Konsistenz, Effizienz und Symmetrie.

2. **Frage:** Was unterscheidet eine Counterfactual Explanation primär von einer SHAP-Erklärung?  
   **Antwort:** Sie zeigt minimale Änderungen für ein anderes Ergebnis statt Beitragszerlegungen.  
   **Begründung:** Handlungsorientierung versus Attributionsorientierung.

3. **Frage:** Warum ist der EU AI Act für Credit-Scoring-Systeme relevant?  
   **Antwort:** Bewertung der Kreditwürdigkeit natürlicher Personen ist Annex-III-Hochrisiko.  
   **Begründung:** Daraus folgen Pflichten zu Transparenz, Risikomanagement und menschlicher Aufsicht.

4. **Frage:** Darf ein SHAP-Wert aus synthetischen Daten als reale Entscheidungsgrundlage verwendet werden?  
   **Antwort:** Nein.  
   **Begründung:** Synthetische Beispiele dienen ausschließlich dem Lernen; sie sind keine Produktionsprognosen.

5. **Frage:** Welcher Vorteil hat die Kombination aus SHAP und Counterfactuals?  
   **Antwort:** Diagnose des Ist-Zustands plus konkrete Handlungsoptionen.  
   **Begründung:** Beide Perspektiven decken unterschiedliche Nutzerbedürfnisse ab.

### Glossar-Begriffe
- SHAP  
- Counterfactual Explanation  
- Adverse Action  
- Local Explainability  
- Basiswert (Expected Value)

### Barrierearme Diagrammbeschreibung
Ein horizontales Balkendiagramm. Positive Beiträge (Einkommen) in Gold, negative Beiträge (Verschuldungsgrad) in Navy. Der Basiswert als gestrichelte Referenzlinie in Cyan. Beschriftungen links, Werte rechts. Keine überlappenden Elemente, ausreichender Kontrast.

### Weiterführende Quellen
- Lundberg & Lee (2017): A Unified Approach to Interpreting Model Predictions.  
- EU AI Act Annex III.  
- Equifax und CRIF/UNIMORE Veröffentlichungen zu Explainable AI (2026).

### CTA
Vertiefen Sie SHAP und Counterfactuals interaktiv im CAPITAL-AI Financial Learning Simulator. Der Chart-Lernatlas zeigt die zugehörigen Visualisierungen. Alle Beispiele bleiben synthetisch und didaktisch gekennzeichnet.
