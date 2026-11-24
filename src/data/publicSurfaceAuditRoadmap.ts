/** Public-safe planning metadata only. No private findings, receipts or operational state. */
export type AuditRoadmapTask = {
  id: string; milestone: 'M1' | 'M2'; priority: 'P0' | 'P1' | 'P2';
  packageId: string; title: string; dependsOn: readonly string[]; nextStep: string;
};

export const PUBLIC_SURFACE_AUDIT_TASKS: readonly AuditRoadmapTask[] = [
  {"id":"P0-03","milestone":"M1","priority":"P0","packageId":"CA-TRUST-PUBLIC-AUTHORITY-GATE","title":"Informationsklassifikation","dependsOn":[],"nextStep":"Explizite Klassifikation und serverseitige Zulassung; unbekannte Inhalte ablehnen; Rollen- und Mandantentrennung negativ testen."},
  {"id":"P0-01","milestone":"M1","priority":"P0","packageId":"PRODUCTION-WEB-01-TRUST","title":"Öffentliche Produktoberfläche absichern","dependsOn":["P0-03"],"nextStep":"Nur freigegebene Inhalte ausliefern; UI, HTTP, Client-Bundles und Repository-Grenzen getrennt prüfen."},
  {"id":"P0-02","milestone":"M1","priority":"P0","packageId":"PRODUCTION-WEB-01-TRUST","title":"Öffentliche Artefakte zulassen","dependsOn":["P0-03"],"nextStep":"Vorhandene Artefakt-Policy erweitern; unbekannte Build- und Auslieferungsartefakte ablehnen; Positiv- und Negativtests."},
  {"id":"P1-01","milestone":"M2","priority":"P1","packageId":"PRODUCTION-WEB-01-PRODUCT","title":"Homepage und Produktnutzen","dependsOn":["P0-01","P0-02"],"nextStep":"Wertversprechen, CTA und Trust klar darstellen; Universe-Design, Hero Globe, Hub-Navigation und Deep Links erhalten."},
  {"id":"P1-02","milestone":"M2","priority":"P1","packageId":"PRODUCTION-WEB-01-PRODUCT","title":"Navigation und Informationsarchitektur","dependsOn":["P0-01","P0-02"],"nextStep":"Nutzerziele, mobile Bedienung, Fokus und Deep Links prüfen; bestehende Hub-Struktur erhalten."},
  {"id":"P1-03","milestone":"M2","priority":"P1","packageId":"AP-QA-02","title":"Accessibility-Abnahme","dependsOn":["P1-01","P1-02"],"nextStep":"WCAG 2.2 AA als Ziel; vorhandene Browser-QA, Tastatur, Zoom, Reduced Motion und manuelle Screenreader-Nachweise getrennt erfassen."},
  {"id":"P1-04","milestone":"M2","priority":"P1","packageId":"PRODUCTION-WEB-01-PLATFORM","title":"Performance-Budget","dependsOn":["P1-01","P1-02"],"nextStep":"LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,10 als Feldziele (p75); synthetische Regressionstests separat; bestehendes Chunk-Budget erhalten."},
  {"id":"P2-01","milestone":"M2","priority":"P2","packageId":"AP-SEC-03","title":"CSP-Härtung","dependsOn":[],"nextStep":"Dynamische Styles schrittweise migrieren und strengere CSP ohne Funktionsregression testen."},
  {"id":"P2-02","milestone":"M2","priority":"P2","packageId":"CA-GROWTH-SEO-ARCHITECTURE","title":"SEO-Suchintentionen","dependsOn":[],"nextStep":"Vorhandene SEO-Intent-Cluster und Landingpages stärken; Canonical, Sitemap und indexierbare Inhalte prüfen."},
  {"id":"P2-03","milestone":"M2","priority":"P2","packageId":"CA-GROWTH-SEO-ARCHITECTURE","title":"Metadaten bereinigen","dependsOn":[],"nextStep":"Nicht benötigte meta keywords entfernen; bestehende SEO-Metadaten und strukturierte Daten prüfen."},
  {"id":"CC-HYGIENE","milestone":"M2","priority":"P1","packageId":"AP-SEC-02","title":"Control-Center-Code und Dokumentation pflegen","dependsOn":[],"nextStep":"Alle vorhandenen Ansichten, Datenquellen, Rollen, veralteten Verweise und doppelte Logik prüfen; historische Evidence erhalten, keine erfundenen Betriebsdaten."},
];

export function auditTasksForPackage(packageId: string): readonly AuditRoadmapTask[] {
  return PUBLIC_SURFACE_AUDIT_TASKS.filter(task => task.packageId === packageId);
}
