export const PRIVACY_NOTICE_VERSION = '2026-09-15';

export const CONTROLLER = {
  name: 'Sven Michael Kulessa',
  legalStatus: 'Privatperson',
  projectName: 'CAPITAL-AI',
  street: 'von Lepel Straße 3a',
  postalCode: '27259',
  city: 'Freistatt',
  country: 'Deutschland',
  email: 'sven.kulessa@capital-ai.online',
  supportEmail: 'support@capital-ai.online',
} as const;

export const PRIVACY_COMPLIANCE_STATUS = {
  label: 'Datenschutzkontrollen intern dokumentiert',
  disclaimer:
    'Keine behördliche, gerichtliche oder externe DSGVO-Zertifizierung. Der Status beschreibt ausschließlich intern dokumentierte technische und organisatorische Kontrollen.',
} as const;

export const PRIVACY_REQUEST_TYPES = [
  'access',
  'rectification',
  'erasure',
  'restriction',
  'objection',
  'portability',
] as const;

export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];
export type ProcessingLifecycle = 'active' | 'conditional' | 'planned';

export interface ProcessingActivity {
  id: string;
  title: string;
  lifecycle: ProcessingLifecycle;
  purpose: string;
  dataCategories: string[];
  legalBasis: string;
  recipients: string[];
  transfer: string;
  retention: string;
  technicalControls: string[];
}

export const PROCESSING_ACTIVITIES: ProcessingActivity[] = [
  {
    id: 'account-profile',
    title: 'Konto, Authentifizierung und Profil',
    lifecycle: 'active',
    purpose: 'Registrierung, Anmeldung, Kontoverwaltung, Tarifzuordnung und Absicherung des Kontozugriffs.',
    dataCategories: [
      'E-Mail-Adresse',
      'Name/Profilname',
      'Land/Wohnsitz',
      'optionale Telefonnummer',
      'Authentifizierungs- und MFA-Metadaten',
      'interne Nutzer- und Rollenkennungen',
    ],
    legalBasis:
      'Art. 6 Abs. 1 lit. b DSGVO für die Bereitstellung des Nutzerkontos; Art. 6 Abs. 1 lit. f DSGVO für angemessene Sicherheitsmaßnahmen, soweit keine speziellere Grundlage greift.',
    recipients: ['Supabase als Auth-/Datenbank-Infrastruktur', 'vom Verantwortlichen autorisierte Administrationsprozesse'],
    transfer:
      'Abhängig von der tatsächlich eingesetzten Provider- und Subprozessor-Konfiguration können Drittlandbezüge bestehen. Vertrags- und Transfernachweise werden außerhalb des Sourcecodes im Vendor-Register geführt.',
    retention:
      'Grundsätzlich für die Dauer des Kontos. Nach Kontolöschung werden Daten gelöscht oder anonymisiert, soweit keine gesetzlichen oder sicherheitsbezogenen Aufbewahrungsgründe entgegenstehen.',
    technicalControls: ['Row Level Security', 'serverseitige Privilege-Separation', 'MFA/Passkey', 'verschlüsselte Secrets'],
  },
  {
    id: 'billing-subscription',
    title: 'Abonnement und Zahlungsabwicklung',
    lifecycle: 'active',
    purpose: 'Tarifverwaltung, Zahlungsabwicklung, Berechtigungsprüfung und Abrechnungsnachweise.',
    dataCategories: ['E-Mail-Adresse', 'Nutzer-ID', 'Tarif-/Abonnementstatus', 'Stripe-Referenzkennungen', 'Rechnungs-/Transaktionsmetadaten'],
    legalBasis:
      'Art. 6 Abs. 1 lit. b DSGVO für Vertragserfüllung; soweit gesetzliche Aufbewahrungspflichten bestehen zusätzlich Art. 6 Abs. 1 lit. c DSGVO.',
    recipients: ['Stripe', 'Supabase', 'autorisierte Abrechnungs-/Supportprozesse'],
    transfer:
      'Drittlandverarbeitung kann abhängig von Stripe-/Supabase-Subprozessoren stattfinden. Aktuelle DPA-/Transfermechanismen sind als Vendor-Evidence separat zu pflegen.',
    retention:
      'Vertrags- und Berechtigungsdaten bis zum Ende des Vertragsverhältnisses; abrechnungsrelevante Nachweise nach den jeweils anwendbaren gesetzlichen Aufbewahrungspflichten.',
    technicalControls: ['serverseitige Stripe-Verarbeitung', 'keine Speicherung vollständiger Karteninformationen', 'RLS/Service-Role-Trennung'],
  },
  {
    id: 'consent-evidence',
    title: 'Nachweis von Einwilligungen und Kenntnisnahmen',
    lifecycle: 'active',
    purpose: 'Nachweis, welche Fassung von AGB/Datenschutzhinweisen akzeptiert bzw. zur Kenntnis genommen und ob optionales Marketing erlaubt wurde.',
    dataCategories: ['Nutzer-ID', 'Dokumentversion', 'Zeitstempel', 'Entscheidungsstatus', 'gehashte IP-Adresse'],
    legalBasis:
      'Art. 6 Abs. 1 lit. c DSGVO, soweit eine gesetzliche Nachweispflicht besteht; für Marketing ist die zugrunde liegende Verarbeitung Art. 6 Abs. 1 lit. a DSGVO. Die Kenntnisnahme der Datenschutzhinweise ist selbst keine pauschale Einwilligungs-Rechtsgrundlage.',
    recipients: ['Supabase', 'autorisierte Compliance-/Supportprozesse'],
    transfer:
      'Kein zusätzlicher Drittlandtransfer durch diesen Prozess beabsichtigt; maßgeblich bleibt die tatsächlich eingesetzte Datenbank-Infrastruktur.',
    retention:
      'Für die Dauer, in der der Nachweis für die jeweilige Verarbeitung oder Rechtsverteidigung erforderlich ist; bei Kontolöschung vorbehaltlich gesetzlicher Nachweispflichten Löschung bzw. Einschränkung.',
    technicalControls: ['versionierte Evidence Records', 'IP nur gehasht im Consent-Nachweis', 'RLS für eigene Historie'],
  },
  {
    id: 'security-iam',
    title: 'Security-, IAM- und Missbrauchsprotokollierung',
    lifecycle: 'active',
    purpose: 'Erkennung und Abwehr unberechtigter Zugriffe, Rate-Limit-Missbrauch, Rollenänderungen und sicherheitskritischer Aktionen.',
    dataCategories: ['Nutzer-ID', 'IP-Adresse', 'User-Agent', 'Geräte-/Endpoint-Metadaten', 'Security-Event', 'Rollen-/Audit-Metadaten'],
    legalBasis:
      'Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb) in Verbindung mit risikoadäquaten Maßnahmen nach Art. 32 DSGVO.',
    recipients: ['autorisierte Sicherheits-/Administrationsprozesse', 'Supabase'],
    transfer:
      'Kein zusätzlicher Drittlandtransfer durch die Logging-Logik beabsichtigt; Infrastruktur- und Subprozessorstandorte sind separat zu verifizieren.',
    retention:
      'Security Events: technische Standardaufbewahrung maximal 180 Tage, sofern kein konkreter Sicherheitsvorfall eine längere zweckgebundene Sicherung erfordert. Weitere Auditdaten werden nach ihrer jeweiligen Governance-Policy behandelt.',
    technicalControls: ['RLS', 'Service-Role-only writes', 'append-only Auditmuster', 'rate limiting', 'MFA-Step-up'],
  },
  {
    id: 'analytics-advertising',
    title: 'Reichweitenmessung und Cookie-Auswahl',
    lifecycle: 'conditional',
    purpose: 'Optionale Nutzungsstatistik nach Einwilligung; Google AdSense ist derzeit deaktiviert.',
    dataCategories: ['Online-Kennungen', 'Cookie-/Consent-Informationen', 'Nutzungs- und Geräteinformationen', 'gekürzte/technisch verarbeitete IP-Informationen beim Provider'],
    legalBasis:
      'Art. 6 Abs. 1 lit. a DSGVO und § 25 TDDDG für einwilligungspflichtige Endgerätezugriffe. Ohne passende Einwilligung wird GA4 nicht geladen. AdSense bleibt auch nach einer Einwilligung deaktiviert.',
    recipients: ['Google für Google Analytics 4; CookieConsent wird selbst gehostet und übermittelt keine Consent-Daten an seinen Entwickler'],
    transfer:
      'Bei Google-Diensten kann eine Verarbeitung außerhalb des EWR stattfinden. Der konkrete Transfermechanismus ist anhand der aktuellen Providerverträge zu dokumentieren.',
    retention:
      'Die Cookie-Auswahl wird lokal höchstens 182 Tage gespeichert. Analytics-Aufbewahrung richtet sich nach der Provider-Konfiguration; erreichbare First-Party-GA-Cookies werden bei Widerruf gelöscht.',
    technicalControls: ['Basic Consent Mode v2', 'default denied', 'dynamisches Laden erst nach Opt-in', 'Widerrufs-Reload'],
  },
  {
    id: 'social-publishing',
    title: 'Verknüpfte Social-Media-Konten und Publishing',
    lifecycle: 'conditional',
    purpose: 'Vom Nutzer angeforderte Verknüpfung externer Social-Media-Konten sowie Veröffentlichung und Nachverfolgung von Posts.',
    dataCategories: ['Plattform', 'Accountname/Handle', 'Avatar-URL', 'Scopes', 'externe Account-ID', 'verschlüsselte Access-/Refresh-Tokens', 'Publishing-Historie'],
    legalBasis:
      'Art. 6 Abs. 1 lit. b DSGVO, soweit die Funktion auf Wunsch des Nutzers bereitgestellt wird.',
    recipients: ['jeweils vom Nutzer verbundene Social-Media-Plattform', 'Supabase'],
    transfer:
      'Je nach verbundener Plattform ist eine Drittlandverarbeitung wahrscheinlich. Die konkreten Empfänger und Transfermechanismen richten sich nach der aktiv verbundenen Plattform und deren aktueller Vertragslage.',
    retention:
      'Bis zur Trennung des jeweiligen Kontos bzw. Kontolöschung; kurzlebige OAuth-State-Daten werden nach Ablauf automatisiert bereinigt. Publishing-Historie bleibt bis zur Löschung bzw. bis zum Ende ihres Zwecks gespeichert.',
    technicalControls: ['AES-256-GCM für OAuth-Tokens', 'PKCE/State-Prüfung', 'Service-Role-only Tabellen', 'keine Token-Ausgabe an den Browser'],
  },
  {
    id: 'alerts',
    title: 'E-Mail-Alerts',
    lifecycle: 'conditional',
    purpose: 'Versand vom Nutzer angeforderter Markt-/Score-Benachrichtigungen.',
    dataCategories: ['E-Mail-Adresse', 'Symbol/Asset', 'Schwellenwert/Regel', 'Bestätigungsstatus', 'letzter Versandzeitpunkt'],
    legalBasis:
      'Art. 6 Abs. 1 lit. b DSGVO für die ausdrücklich angeforderte Alert-Funktion; der Double-Opt-in dient der Verifikation der E-Mail-Adresse.',
    recipients: ['E-Mail-Versanddienst bzw. Mail-Infrastruktur', 'Supabase'],
    transfer:
      'Abhängig vom tatsächlich konfigurierten E-Mail-Dienst; Vendor-Evidence ist separat zu pflegen.',
    retention:
      'Bis zur Abmeldung/Deaktivierung. Nicht bestätigte Anmeldungen werden nach 14 Tagen automatisiert bereinigt.',
    technicalControls: ['Double-Opt-in', 'Unsubscribe-Token', 'Service-Role-only Datenbankzugriff'],
  },
  {
    id: 'usage-quota',
    title: 'Nutzungs- und Quota-Steuerung',
    lifecycle: 'active',
    purpose: 'Durchsetzung tarifabhängiger Nutzungsgrenzen und Missbrauchsschutz.',
    dataCategories: ['E-Mail-Adresse', 'Quota-Typ', 'Nutzungszähler', 'Zeitfenster'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für tarifabhängige Leistungserbringung sowie Art. 6 Abs. 1 lit. f DSGVO für Missbrauchsschutz.',
    recipients: ['Supabase', 'autorisierte Backend-Prozesse'],
    transfer: 'Abhängig von der eingesetzten Datenbank-Infrastruktur und deren Subprozessoren.',
    retention: 'Inaktive Quota-Datensätze werden nach 90 Tagen ohne Aktualisierung automatisiert bereinigt.',
    technicalControls: ['serverseitige Durchsetzung', 'Service-Role-only Tabelle'],
  },
  {
    id: 'privacy-requests',
    title: 'Betroffenenrechte und Datenschutzanfragen',
    lifecycle: 'active',
    purpose: 'Bearbeitung und Nachweis von Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit.',
    dataCategories: ['Nutzer-ID', 'Anfragetyp', 'optionale Beschreibung', 'Bearbeitungsstatus', 'Zeitstempel und Frist'],
    legalBasis: 'Art. 6 Abs. 1 lit. c DSGVO zur Erfüllung gesetzlicher Betroffenenrechte und Nachweispflichten.',
    recipients: ['autorisierte Datenschutz-/Supportprozesse', 'Supabase'],
    transfer: 'Kein zusätzlicher Drittlandtransfer durch den Request-Workflow beabsichtigt; Infrastruktur bleibt separat zu bewerten.',
    retention: 'Abgeschlossene Anfragen werden für Accountability-Zwecke maximal drei Jahre nach Abschluss vorgehalten und danach automatisiert bereinigt, sofern kein aktiver Preservation-/Legal-Hold entgegensteht.',
    technicalControls: ['authentifizierter Zugriff', 'RLS', 'serverseitige Request-Erstellung', 'Status-State-Machine', 'keine Rohdaten in Request-Logs'],
  },
];

export const PUBLIC_PRIVACY_NOTES = {
  noAutomatedInvestmentDecision:
    'CAPITAL-AI stellt Analyse- und Berechnungsfunktionen bereit. Die Datenschutzinformation ist keine Aussage darüber, ob eine Funktion finanzaufsichtsrechtlich als Beratung oder Empfehlung einzuordnen ist.',
  aiDataBoundary:
    'Personenbezogene Nutzer- oder Authentifizierungsdaten sollen nicht an Markt- oder AI-Scoring-Provider weitergegeben werden. Provider- und Telemetrieänderungen müssen gegen diese Vorgabe geprüft werden.',
} as const;
