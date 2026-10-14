/** Founder is an enquiry-only bespoke offer, never a Stripe checkout or automatic paid entitlement. */
export const FOUNDER_OFFER = Object.freeze({
  id: 'founder-private',
  label: 'CAPITAL-AI Founder',
  description: 'Individuelles Architektur-, Integrations- und Beratungspaket nach Leistungsvereinbarung.',
  priceLabel: 'Bruttopreis auf Anfrage',
  offerState: 'inquiry_only',
  billing: 'individual_contract',
  contactEmail: 'sven.kulessa@capital-ai.online',
  brandAsset: '/branding/capital-ai-logo.jpg',
  legalPath: '/datenschutz/',
});
