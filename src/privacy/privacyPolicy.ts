export { CONTROLLER, PRIVACY_NOTICE_VERSION } from '../../shared/legal-identity.mjs';

export const PRIVACY_COMPLIANCE_STATUS = {
  label: 'Datenschutzhinweise für den Supabase-Auth- und BYOK-Dienst',
  disclaimer: 'Keine behördliche, gerichtliche oder externe DSGVO-Zertifizierung. Providerverträge, tatsächliche Infrastrukturkonfiguration und die Übernahme von Altdaten sind gesondert zu prüfen.',
} as const;

export const PRIVACY_REQUEST_TYPES = ['access', 'rectification', 'erasure', 'restriction', 'objection', 'portability'] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];
export type ProcessingLifecycle = 'active' | 'conditional' | 'planned';
export interface ProcessingActivity {
  id: string; title: string; lifecycle: ProcessingLifecycle; purpose: string;
  dataCategories: string[]; legalBasis: string; recipients: string[]; transfer: string;
  retention: string; technicalControls: string[];
}

export const PROCESSING_ACTIVITIES: ProcessingActivity[] = [
  {
    id: 'hosting', title: 'Bereitstellung der Website und technischer Betrieb', lifecycle: 'active',
    purpose: 'Bereitstellung der Website, Übertragung von Inhalten und Absicherung des Betriebs.',
    dataCategories: ['IP-Adresse und Verbindungsdaten beim Hostinganbieter', 'angeforderte URLs', 'Browser-/Geräteinformationen'],
    legalBasis: 'Art. 6 Abs. 1 lit. f DSGVO für den sicheren und zuverlässigen Betrieb; bei angeforderten Vertragsleistungen gegebenenfalls Art. 6 Abs. 1 lit. b DSGVO.',
    recipients: ['Render als Hostinganbieter', 'Google Fonts bei externem Abruf der verwendeten Schriftarten'],
    transfer: 'Standorte und Subprozessoren richten sich nach den tatsächlich eingesetzten Providerkonfigurationen. Eine ausschließliche Verarbeitung in Deutschland oder der EU wird nicht pauschal zugesagt.',
    retention: 'Die Aufbewahrung von Providerprotokollen richtet sich nach der jeweiligen Providerkonfiguration und ist separat zu prüfen. Dieser Dienst führt kein eigenes dauerhaftes personenbezogenes Zugriffsregister.',
    technicalControls: ['HTTPS', 'Content Security Policy', 'kein Browserzugriff auf Server-Secrets', 'begrenzte HTTP-Anfragen'],
  },
  {
    id: 'supabase-account', title: 'Supabase-Anmeldung und Anwendungssitzung', lifecycle: 'active',
    purpose: 'Verifikation der Identität und Zugriff auf authentifizierte Funktionen.',
    dataCategories: ['Supabase-Benutzerkennung (auth.users.id)', 'E-Mail-Adresse und Profilname', 'Ausstellerkennung (issuer)', 'Sitzungsablauf und technisch notwendige Sitzungscookies', 'Anmeldeidentitäten bei Supabase Auth'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für die angeforderte Anmeldung; Art. 6 Abs. 1 lit. f DSGVO für die Absicherung des Zugriffs.',
    recipients: ['Supabase für Authentifizierung und Kontodaten', 'Render für die Anwendungssitzung'],
    transfer: 'Hosting, Betreiber und Subprozessoren von Supabase und Render müssen anhand der tatsächlich verwendeten Regionen, Verträge und Transfermechanismen geprüft werden.',
    retention: 'Die Anwendungssitzung wird in signierten HttpOnly-Cookies mit einer maximalen Laufzeit von sieben Tagen geführt und bei Abmeldung lokal entfernt; Supabase-Zugriffs- und Refresh-Tokens werden serverseitig erneuert. Auth-Kontodaten und Providerprotokolle unterliegen zusätzlich der Supabase-Konfiguration.',
    technicalControls: ['Supabase Auth mit E-Mail/Passwort und Google OAuth', 'PKCE S256 für den Google- und Mobile-Flow', 'serverseitige User-/Session-Verifikation', 'signierte HttpOnly-/Secure-/SameSite-Cookies', 'keine Browserausgabe von Access- oder Refresh-Tokens'],
  },
  {
    id: 'user-provider-vault', title: 'Persönlicher API-Vault und private Providerdaten', lifecycle: 'active',
    purpose: 'Speicherung eines vom Nutzer selbst bereitgestellten Provider-Zugangs und Abruf kontogebundener privater Daten für persönliche Analysekontexte.',
    dataCategories: ['Provider-API-Key und privates API-Secret', 'Credential-Fingerprint und Verbindungsstatus', 'Providerberechtigungen', 'private Kontostände/Bestände beim Abruf'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für die ausdrücklich vom Nutzer aktivierte kontogebundene Funktion; weitergehende Provider- oder Marktdatenrechte werden dadurch nicht behauptet.',
    recipients: ['Supabase Vault für verschlüsselte Secret-Speicherung', 'Kraken bei vom Nutzer ausgelösten privaten API-Aufrufen', 'Render als serverseitige Anwendungslaufzeit'],
    transfer: 'Kraken- und Supabase-Verarbeitung, Regionen, Subprozessoren und mögliche Drittlandbezüge richten sich nach den jeweils tatsächlich geltenden Providerverträgen und Kontoeinstellungen.',
    retention: 'Die Provider-Verbindung bleibt bis zur Löschung durch den Nutzer oder zur Kontolöschung gespeichert. Das API-Secret wird dem Browser nach Speicherung nicht wieder ausgegeben. Abgerufene Bestände werden in diesem Prototyp nicht in Shared Cache oder JetStream veröffentlicht.',
    technicalControls: ['Supabase Vault', 'private Metadatentabelle ohne anon/authenticated-Zugriff', 'Secret-RPCs nur für service_role', 'serverseitige Session-Verifikation vor Secretzugriff', 'Kraken-Adapter auf read-only Balance begrenzt', 'kein Trading und keine Withdrawals'],
  },
  {
    id: 'privacy-requests', title: 'Datenauszug und Datenschutzanfragen', lifecycle: 'active',
    purpose: 'Bereitstellung eines begrenzten Datenauszugs und Vorbereitung von Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch oder Datenübertragbarkeit per E-Mail.',
    dataCategories: ['verifizierte Benutzer- und Ausstellerkennung', 'Profilname und Sitzungsablauf im Datenauszug', 'Anfragetyp', 'freiwillige Beschreibung im E-Mail-Entwurf', 'vom Nutzer versendete Nachricht'],
    legalBasis: 'Art. 6 Abs. 1 lit. c DSGVO für die Bearbeitung gesetzlicher Betroffenenrechte und notwendige Nachweise.',
    recipients: ['Verantwortlicher und autorisierte Supportprozesse', 'vom Nutzer verwendeter E-Mail-Dienst und Empfänger-Mail-Infrastruktur nach Versand'],
    transfer: 'Etwaige Drittlandbezüge richten sich nach den eingesetzten E-Mail-Diensten und deren Vertragslage.',
    retention: 'API-Anfragen und erzeugte Datenauszüge werden hier nicht dauerhaft gespeichert. Versendete Nachrichten werden für die Bearbeitung und erforderliche Nachweise im Postfach vorgehalten; Löschung oder Einschränkung erfolgt nach Zweckfortfall unter Beachtung gesetzlicher Pflichten. Ein Versand oder eine automatische Kontolöschung wird durch das Vorbereiten nicht ausgelöst.',
    technicalControls: ['Datenauszug nur für die serverseitig verifizierte Sitzung', 'keine Passwörter, Tokens oder MFA-Secrets im Export', 'Same-Origin-Prüfung für POST', 'keine Anfrageinhalte in Anwendungslogs', 'keine fingierte Speicherung oder Versandbestätigung'],
  },
  {
    id: 'telegram', title: 'Autorisierter Telegram-Versand', lifecycle: 'conditional',
    purpose: 'Vom autorisierten Nutzer ausgelöster Versand an einen serverseitig festgelegten Empfänger.',
    dataCategories: ['Nachrichtentext', 'festgelegte Telegram-Chatkennung', 'Benutzerkennung für die Berechtigungsprüfung'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für die ausdrücklich angeforderte Funktion.',
    recipients: ['Telegram und der festgelegte Empfänger'],
    transfer: 'Internationale Verarbeitung und Empfängerstandorte sind anhand der aktiven Telegram-Konfiguration und Vertragslage zu prüfen.',
    retention: 'Der Dienst führt keine eigene dauerhafte Versandhistorie. Nachrichten verbleiben nach Versand nach den Einstellungen und Regeln von Telegram und dem Empfänger.',
    technicalControls: ['separate Berechtigungsprüfung', 'fester Empfänger', 'serverseitiges Bot-Secret', 'Rate-Limit'],
  },
];

export const PUBLIC_PRIVACY_NOTES = {
  noAutomatedInvestmentDecision: 'Analyse- und Berechnungsfunktionen ersetzen keine individuelle Prüfung oder Beratung.',
  aiDataBoundary: 'Identitäts-, Authentifizierungs- oder Anfrageinformationen werden durch die Datenschutz-API nicht an Markt- oder AI-Scoring-Provider übermittelt.',
} as const;
