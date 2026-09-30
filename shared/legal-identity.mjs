// Public document identity shared by the browser and the privacy API.
export const PRIVACY_NOTICE_VERSION = '2026-09-30';
export const CONTROLLER = Object.freeze({
  name: 'Sven Michael Kulessa', legalStatus: 'Privatperson', projectName: 'CAPITAL-AI',
  street: 'von Lepel Straße 3a', postalCode: '27259', city: 'Freistatt', country: 'Deutschland',
  email: 'sven.kulessa@capital-ai.online', supportEmail: 'support@capital-ai.online',
});

export const PRIVACY_REQUEST_LABELS = Object.freeze({
  access: 'Auskunft', rectification: 'Berichtigung', erasure: 'Löschung',
  restriction: 'Einschränkung', objection: 'Widerspruch', portability: 'Datenübertragbarkeit',
});
