/**
 * X Article Draft Templates from CAPITAL-AI Social Content Backlog v5.0
 * Status: DRAFT_ONLY – Educational content. No financial advice.
 * After editorial + rights approval, these can be turned into posts with media (image/video/podcast-as-video).
 */

export interface XDraftTemplate {
  id: string;
  title: string;
  blocks: Array<{ key: string; text: string; type?: string }>;
  suggestedMedia?: 'image' | 'video' | 'podcast-video';
  disclaimer: string;
}

export const X_DRAFT_TEMPLATES: readonly XDraftTemplate[] = [
  {
    id: 'evidence-first-scoring',
    title: 'Evidence-first Scoring: Was ein nachvollziehbarer Score belegen muss',
    blocks: [
      { key: '1', text: 'Evidence-first Scoring: Was ein nachvollziehbarer Score belegen muss', type: 'header-one' },
      { key: '2', text: 'Bei Evidence-first Scoring führt eine überzeugende Produktgeschichte nur dann zu Vertrauen, wenn Architektur und tatsächliche Nachweise zusammenpassen.' },
      { key: '3', text: 'Für CAPITAL-AI heißt das: zuerst die technische Grenze benennen, danach einen überprüfbaren Test festlegen und erst anschließend aus einem Pilot einen Release-Claim machen. Ein Repository-Artefakt belegt keine aktive, rechtlich freigegebene Produktfunktion.' },
      { key: '4', text: 'Diskussionsfrage: Welchen konkreten Nachweis würdest du vor einer Produktfreigabe erwarten?' },
      { key: '5', text: 'Redaktionsstatus: Entwurf. Bildungsinhalt – keine Anlageberatung.' },
    ],
    suggestedMedia: 'image',
    disclaimer: 'DRAFT_ONLY. Quellenprüfung und redaktionelle Abnahme erforderlich.',
  },
  {
    id: 'supabase-rls',
    title: 'Supabase RLS: Warum aktiviert noch nicht ausreichend ist',
    blocks: [
      { key: '1', text: 'Supabase RLS: Warum aktiviert noch nicht ausreichend ist', type: 'header-one' },
      { key: '2', text: 'RLS auf Tabellen zu aktivieren ist der erste Schritt. Die tatsächliche Isolation hängt von Policies, Grants und der korrekten Ausführung ab.' },
      { key: '3', text: 'Ein Security Advisor zeigt private Tabellen ohne Policies. Die Wirksamkeit muss mit konkreten Tests gegen den geplanten Tenant-Zugriff belegt werden.' },
      { key: '4', text: 'Bildungsinhalt. Keine Produktfreigabe.' },
    ],
    suggestedMedia: 'video',
    disclaimer: 'DRAFT_ONLY. Technische Wahrhaftigkeit und Rechte prüfen.',
  },
  {
    id: 'stripe-idempotenz',
    title: 'Stripe Idempotenz: Ein Webhook ist kein bezahlter Auftrag',
    blocks: [
      { key: '1', text: 'Stripe Idempotenz: Ein Webhook ist kein bezahlter Auftrag', type: 'header-one' },
      { key: '2', text: 'Ein eingehender Webhook signalisiert ein Ereignis. Die eigentliche Bestellung und Entitlement entstehen erst nach signaturgeprüfter, idempotenter Verarbeitung.' },
      { key: '3', text: 'Replay- und Negativtests sind erforderlich, bevor der Checkout-Pfad als verkaufsfähig gilt.' },
      { key: '4', text: 'Bildungsinhalt. Keine Umsatz- oder Anlageempfehlung.' },
    ],
    suggestedMedia: 'podcast-video',
    disclaimer: 'DRAFT_ONLY. Signature/Replay-Tests und AGB-Abgleich separat.',
  },
] as const;
