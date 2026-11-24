import deliveryPlan from './publicSurfaceDeliveryPlan.json';

/** Generic planning metadata; no operational evidence or private findings. */
export type AuditRoadmapTask = {
  id: string; milestone: string; priority: 'P0' | 'P1' | 'P2';
  packageId: string; title: string; dependsOn: readonly string[]; nextStep: string;
};

const PACKAGE_DETAILS: Record<string, { packageId: string; nextStep: string }> = {
  'P0-03': {"packageId":"CA-TRUST-PUBLIC-AUTHORITY-GATE","nextStep":"Explizite Klassifikation und serverseitige Zulassung; unbekannte Inhalte ablehnen; Rollen- und Mandantentrennung negativ testen."},
  'P0-01': {"packageId":"PRODUCTION-WEB-01-TRUST","nextStep":"Nur freigegebene Inhalte ausliefern; UI, HTTP, Client-Bundles und Repository-Grenzen getrennt prüfen."},
  'P0-02': {"packageId":"PRODUCTION-WEB-01-TRUST","nextStep":"Vorhandene Artefakt-Policy erweitern; unbekannte Build- und Auslieferungsartefakte ablehnen; Positiv- und Negativtests."},
  'P1-01': {"packageId":"PRODUCTION-WEB-01-PRODUCT","nextStep":"Wertversprechen, CTA und Trust klar darstellen; Universe-Design, Hero Globe, Hub-Navigation und Deep Links erhalten."},
  'P1-02': {"packageId":"PRODUCTION-WEB-01-PRODUCT","nextStep":"Nutzerziele, mobile Bedienung, Fokus und Deep Links prüfen; bestehende Hub-Struktur erhalten."},
  'P1-03': {"packageId":"AP-QA-02","nextStep":"WCAG 2.2 AA als Ziel; vorhandene Browser-QA, Tastatur, Zoom, Reduced Motion und manuelle Screenreader-Nachweise getrennt erfassen."},
  'P1-04': {"packageId":"PRODUCTION-WEB-01-PLATFORM","nextStep":"LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,10 als Feldziele (p75); synthetische Regressionstests separat; bestehendes Chunk-Budget erhalten."},
  'P2-01': {"packageId":"AP-SEC-03","nextStep":"Dynamische Styles schrittweise migrieren und strengere CSP ohne Funktionsregression testen."},
  'P2-02': {"packageId":"CA-GROWTH-SEO-ARCHITECTURE","nextStep":"Vorhandene SEO-Intent-Cluster und Landingpages stärken; Canonical, Sitemap und indexierbare Inhalte prüfen."},
  'P2-03': {"packageId":"CA-GROWTH-SEO-ARCHITECTURE","nextStep":"Nicht benötigte meta keywords entfernen; bestehende SEO-Metadaten und strukturierte Daten prüfen."},
};

export const PUBLIC_SURFACE_AUDIT_TASKS: readonly AuditRoadmapTask[] = [
  ...deliveryPlan.tasks.map((task): AuditRoadmapTask => {
    const details = PACKAGE_DETAILS[task.id];
    if (!details || !/^(P0|P1|P2)-\\d{2}$/.test(task.id)) throw new Error('UNKNOWN_AUDIT_TASK');
    return { ...details, id: task.id, title: task.name, milestone: task.milestone,
      priority: task.id.slice(0, 2) as AuditRoadmapTask['priority'], dependsOn: task.dependencies };
  }),
  {"id":"CC-HYGIENE","milestone":"M2","priority":"P1","packageId":"AP-SEC-02","title":"Control-Center-Code und Dokumentation pflegen","dependsOn":[],"nextStep":"Alle vorhandenen Ansichten, Datenquellen, Rollen, veralteten Verweise und doppelte Logik prüfen; historische Evidence erhalten, keine erfundenen Betriebsdaten."},
];

export function auditTasksForPackage(packageId: string): readonly AuditRoadmapTask[] {
  return PUBLIC_SURFACE_AUDIT_TASKS.filter(task => task.packageId === packageId);
}
