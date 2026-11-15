/** 
 * Knowledge Cluster Drafts from CAPITAL-AI Social Content Backlog v5.0
 * Status: DRAFT_ONLY – Educational content only. No financial advice, no investment recommendations.
 * Requires source verification, license check, and editorial review before publication.
 * Based on SEO Clusters from the redaktioneller Entwurfs-Backlog.
 */

export type KnowledgeClusterStatus = 'DRAFT';

export interface KnowledgeCluster {
  id: string;
  pillar: string;
  supporting: string[];
  searchIntent: 'informativ';
  internalPath: string;
  status: KnowledgeClusterStatus;
  summary: string;
  disclaimer: string;
}

export const KNOWLEDGE_CLUSTERS: readonly KnowledgeCluster[] = [
  {
    id: 'stripe-idempotenz',
    pillar: 'Stripe Idempotenz',
    supporting: ['Einführung', 'Teststrategie', 'typische Fehler'],
    searchIntent: 'informativ',
    internalPath: '/knowledge/stripe-idempotenz',
    status: 'DRAFT',
    summary: 'Ein Webhook ist kein bezahlter Auftrag. Idempotenz sorgt dafür, dass wiederholte Ereignisse denselben Zustand erzeugen, ohne Duplikate. Architektur und Nachweise müssen vor einem Release-Claim zusammenpassen.',
    disclaimer: 'Bildungsinhalt. Keine Produktfreigabe oder Anlageberatung. Quellen und technische Wahrhaftigkeit separat prüfen.'
  },
  {
    id: 'github-rulesets',
    pillar: 'GitHub Rulesets',
    supporting: ['Einführung', 'Teststrategie', 'typische Fehler'],
    searchIntent: 'informativ',
    internalPath: '/knowledge/github-rulesets',
    status: 'DRAFT',
    summary: 'Wie der Main-Branch geschützt wird: Rulesets erzwingen Checks, Reviews und History. Die tatsächliche Wirkung muss gegen die konfigurierte Policy und beobachtetes Verhalten geprüft werden.',
    disclaimer: 'Bildungsinhalt. Keine Produktfreigabe oder Anlageberatung. Quellen und technische Wahrhaftigkeit separat prüfen.'
  },
  {
    id: 'codeowners',
    pillar: 'CODEOWNERS',
    supporting: ['Einführung', 'Teststrategie', 'typische Fehler'],
    searchIntent: 'informativ',
    internalPath: '/knowledge/codeowners',
    status: 'DRAFT',
    summary: 'Wie Ownership-Regeln überprüft werden. Eine aktivierte Review-Regel ohne vorhandene CODEOWNERS-Datei erzeugt Drift. Wirkung an konkreten PRs nachstellen.',
    disclaimer: 'Bildungsinhalt. Keine Produktfreigabe oder Anlageberatung. Quellen und technische Wahrhaftigkeit separat prüfen.'
  },
  {
    id: 'devicecare-android-15',
    pillar: 'DeviceCare Android 15',
    supporting: ['Einführung', 'Teststrategie', 'typische Fehler'],
    searchIntent: 'informativ',
    internalPath: '/knowledge/devicecare-android-15',
    status: 'DRAFT',
    summary: 'Was systemeigene APIs zulassen. On-device Funktionen unterliegen Hardware- und OS-Limits. Release-Scope und Privacy vor Store-Listing prüfen.',
    disclaimer: 'Bildungsinhalt. Keine Produktfreigabe oder Anlageberatung. Quellen und technische Wahrhaftigkeit separat prüfen.'
  },
  {
    id: 'android-battery-collector',
    pillar: 'Android Battery Collector',
    supporting: ['Einführung', 'Teststrategie', 'typische Fehler'],
    searchIntent: 'informativ',
    internalPath: '/knowledge/android-battery-collector',
    status: 'DRAFT',
    summary: 'Akkudiagnose ohne Dauerüberwachung. Metriken statt Bauchgefühl. Battery Overhead benchmarken und Berechtigungsgrenzen beachten.',
    disclaimer: 'Bildungsinhalt. Keine Produktfreigabe oder Anlageberatung. Quellen und technische Wahrhaftigkeit separat prüfen.'
  }
] as const;

export const KNOWLEDGE_CLUSTER_COUNT = KNOWLEDGE_CLUSTERS.length;
