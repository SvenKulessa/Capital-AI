import { CONTROLLER } from '../privacy/privacyPolicy';

export type PublicFaqCategory =
  | 'Plattform & Analyse'
  | 'Daten & Qualität'
  | 'Sicherheit & Datenschutz'
  | 'Konto & Abonnement'
  | 'Recht & Transparenz';

export interface PublicFaqItem {
  id: string;
  category: PublicFaqCategory;
  question: string;
  answer: string;
}

export const PUBLIC_CONTACT_PHONE = '015204697947';

export const PUBLIC_FAQ_CATEGORIES: PublicFaqCategory[] = [
  'Plattform & Analyse',
  'Daten & Qualität',
  'Sicherheit & Datenschutz',
  'Konto & Abonnement',
  'Recht & Transparenz',
];

export const PUBLIC_FAQ_ITEMS: PublicFaqItem[] = [
  {
    id: 'platform-purpose',
    category: 'Plattform & Analyse',
    question: 'Was ist CAPITAL-AI?',
    answer:
      'CAPITAL-AI ist die Projekt- und Produktbezeichnung einer Software-Plattform für quantitative Analyse-, Scoring- und Marktinformationsfunktionen. CAPITAL-AI ist keine eigenständige juristische Person; Anbieter und Verantwortlicher ist die im Impressum genannte natürliche Person.',
  },
  {
    id: 'platform-asset-classes',
    category: 'Plattform & Analyse',
    question: 'Welche Anlageklassen werden abgedeckt?',
    answer:
      'Die öffentliche Produktarchitektur ist auf Multi-Asset-Analysen für Kryptowährungen, Aktien, Indizes, Devisen/Forex und Rohstoffe ausgerichtet. Welche Assets und Unterkategorien produktiv verfügbar sind, richtet sich nach dem jeweils freigegebenen FinTech-Universum.',
  },
  {
    id: 'platform-advice',
    category: 'Recht & Transparenz',
    question: 'Ersetzt CAPITAL-AI eine persönliche Anlage-, Finanz- oder Steuerberatung?',
    answer:
      'Nein. Die bereitgestellten Berechnungs-, Analyse- und Scoringfunktionen unterstützen die eigenständige Informations- und Risikobewertung. Eine individuelle Beratung oder persönliche Kauf-/Verkaufsempfehlung wird durch diese öffentlichen Produktinformationen nicht zugesagt.',
  },
  {
    id: 'data-quality',
    category: 'Daten & Qualität',
    question: 'Wie verlässlich sind Markt-, Scoring- und Analysewerte?',
    answer:
      'Markt-, Scoring- und Analysefunktionen können von externen Datenquellen, Modellannahmen und technischen Verfügbarkeiten abhängen. Synthetische, Fallback- oder nicht marktdatenbasierte Werte sollen in den dafür vorgesehenen Produktbereichen als solche gekennzeichnet werden.',
  },
  {
    id: 'data-regions',
    category: 'Sicherheit & Datenschutz',
    question: 'Werden alle Daten ausschließlich in Deutschland oder der EU verarbeitet?',
    answer:
      'Eine pauschale EU- oder Deutschland-only-Hosting-Zusage wird nicht behauptet. Je nach tatsächlich eingesetztem Provider und dessen Subprozessoren können internationale Datenflüsse oder Drittlandbezüge relevant sein. Vertrags-, DPA-/AVV- und Transfernachweise werden separat gepflegt und müssen aktuell belegt sein.',
  },
  {
    id: 'privacy-account-data',
    category: 'Sicherheit & Datenschutz',
    question: 'Welche Kontodaten können verarbeitet werden?',
    answer:
      'Die Anmeldung erfolgt über ZITADEL. Im neuen Dienst werden die verifizierte Benutzerkennung, der Aussteller, der Profilname und zeitlich begrenzte Sitzungsdaten verwendet. Passwörter und Anmeldefaktoren werden beim Identitätsanbieter verwaltet. Die konkreten Verarbeitungstätigkeiten stehen in der Datenschutzerklärung.',
  },
  {
    id: 'privacy-controls',
    category: 'Sicherheit & Datenschutz',
    question: 'Welche Sicherheitskontrollen sind dokumentiert?',
    answer:
      'Die Anwendung prüft die OIDC-Signatur, Aussteller, Zielanwendung, Ablauf und Nonce, verwendet PKCE und geschützte Sitzungscookies und begrenzt API-Anfragen. Passkeys und MFA richten sich nach der tatsächlichen ZITADEL-Konfiguration. Daraus wird keine externe Zertifizierung oder behördliche Freigabe abgeleitet.',
  },
  {
    id: 'privacy-rights',
    category: 'Sicherheit & Datenschutz',
    question: 'Wie kann ich Auskunft, Berichtigung oder Löschung meiner Daten anfragen?',
    answer:
      `Über /datenschutz können Sie eine E-Mail für Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch oder Datenübertragbarkeit vorbereiten und selbst an ${CONTROLLER.email} senden. Nach einer ZITADEL-Anmeldung kann außerdem ein begrenzter Datenauszug der Identitäts- und Sitzungsdaten dieses Dienstes heruntergeladen werden. Vorbereitete Anfragen werden hier nicht dauerhaft gespeichert oder automatisch versendet.`,
  },
  {
    id: 'privacy-cookies',
    category: 'Sicherheit & Datenschutz',
    question: 'Kann ich Analytics- und Cookie-Einstellungen ändern?',
    answer:
      'Optionales Analytics und Werbung sind in diesem Dienst deaktiviert. Die Anmeldung verwendet technisch notwendige Cookies für die OIDC-Transaktion und Anwendungssitzung; ein Opt-in für Analytics wird nicht vorgetäuscht.',
  },
  {
    id: 'account-login',
    category: 'Konto & Abonnement',
    question: 'Wo melde ich mich an?',
    answer:
      'Die öffentliche Anmeldung ist unter /login erreichbar. Authentifizierungs- und Registrierungsfunktionen werden dort gebündelt; geschützte Produktbereiche setzen eine gültige Sitzung voraus.',
  },
  {
    id: 'billing-provider',
    category: 'Konto & Abonnement',
    question: 'Wie werden kostenpflichtige Tarife bezahlt?',
    answer:
      'Der bisherige kostenpflichtige Tarifkatalog ist derzeit archiviert und nicht neu bestellbar. Für bereits bestehende entgeltliche Vertragsverhältnisse steht der im Impressum genannte Kontakt zur Verfügung; bestehende Vertrags-, Kündigungs-, Widerrufs- und Verbraucherrechte bleiben unberührt. Ein zukünftiges Pricing-Modell ist noch nicht festgelegt.',
  },
  {
    id: 'billing-cancellation',
    category: 'Konto & Abonnement',
    question: 'Wie verwalte oder beende ich ein Abonnement?',
    answer:
      'Für bestehende Vertragsverhältnisse können Sie sich an den im Impressum genannten Kontakt wenden. Ein Stripe-Kundenportal ist im neuen Dienst nicht angebunden. Gesetzliche Kündigungs- und Verbraucherrechte bleiben davon unberührt. Maßgeblich sind die jeweils veröffentlichten AGB und die Angaben im Bestellprozess.',
  },
  {
    id: 'referral',
    category: 'Recht & Transparenz',
    question: 'Verwendet CAPITAL-AI Partner- oder Referral-Links?',
    answer:
      'Solche Links können eingesetzt werden. Daraus können Vorteile oder Provisionen entstehen. Partner- und Referral-Verweise sollen entsprechend gekennzeichnet werden und ändern nichts an der eigenverantwortlichen Entscheidung der Nutzer.',
  },
  {
    id: 'legal-provider',
    category: 'Recht & Transparenz',
    question: 'Wer ist Anbieter und Ansprechpartner?',
    answer:
      `CAPITAL-AI ist eine Projekt-/Produktbezeichnung. Anbieter und Verantwortlicher ist ${CONTROLLER.name}. Für allgemeinen Support ist ${CONTROLLER.supportEmail} vorgesehen; die vollständige Anbieteranschrift und weitere Kontaktangaben stehen im Impressum.`,
  },
  {
    id: 'legal-certification',
    category: 'Recht & Transparenz',
    question: 'Ist CAPITAL-AI behördlich oder extern als DSGVO-konform zertifiziert?',
    answer:
      'Eine behördliche, gerichtliche oder externe DSGVO-Zertifizierung wird nicht behauptet. Die veröffentlichten Datenschutzinformationen beschreiben den Dienst mit ZITADEL-Anmeldung und die getrennt zu prüfenden Providerkonfigurationen.',
  },
];
