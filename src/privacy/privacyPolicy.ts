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
    id: 'learning-inquiry', title: 'Kontakt-, Lern- und Kursanfragen', lifecycle: 'active',
    purpose: 'Auf ausdrücklich abgesendete Kontakt-, Lern- oder Kursanfragen antworten. Ohne Analytics-Einwilligung unverändert nutzbar.',
    dataCategories: ['E-Mail-Adresse als Antwortadresse', 'freiwillig eingegebene Anfrage'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für vorvertragliche Kursanfragen; Art. 6 Abs. 1 lit. f DSGVO für allgemeine angeforderte Auskünfte.',
    recipients: ['Verantwortlicher', 'Render als Anwendungsserver', 'konfigurierter SMTP-/Postfachanbieter'],
    transfer: 'Regionen und mögliche Drittlandverarbeitung richten sich nach den tatsächlich eingesetzten Hosting- und Mailverträgen.',
    retention: 'Keine dauerhafte Anfragekopie in Anwendungsdatenbank oder Logs. Zufälliger Wiederholungsschlüssel und Status maximal 15 Minuten im Serverspeicher. Nachricht im Supportpostfach bis Abschluss der Anfrage und Zweckfortfall, vorbehaltlich gesetzlicher Aufbewahrungspflichten.',
    technicalControls: ['fester Empfänger', 'SMTP über TLS', 'Same-Origin-Prüfung', 'begrenzte Eingaben und Versandraten', 'keine Kontaktangaben oder Nachrichten an GA4'],
  },
  {
    id: 'founder-inquiry', title: 'Vertrauliche Sponsoring- und Investor-Relations-Anfragen', lifecycle: 'active',
    purpose: 'Vertrauliche Beantwortung selbst initiierter Fragen zu Sponsoring, strategischen Partnerschaften und Investor Relations sowie gegebenenfalls optionaler Gesprächsabstimmung; keine öffentliche Investitionsofferte, Buchung oder Berechtigungsvergabe.',
    dataCategories: ['Name', 'Antwort-E-Mail-Adresse', 'Inhalt der Kontaktanfrage', 'freiwillige Organisation', 'freiwillige Rückrufnummer oder Terminpräferenz'],
    legalBasis: 'Art. 6 Abs. 1 lit. f DSGVO für selbst initiierte geschäftliche Kontaktanfragen und gegebenenfalls lit. b für konkret gewünschte vorvertragliche Gespräche. Datenschutzkenntnisnahme ist keine Werbeeinwilligung.',
    recipients: ['Verantwortlicher unter sven.kulessa@capital-ai.online', 'Render als Anwendungsserver', 'konfigurierter SMTP-/Postfachanbieter'],
    transfer: 'Regions- und mögliche Drittlandverarbeitung nach den tatsächlich eingesetzten Mail-/Hosting-Verträgen; individuell zu prüfen.',
    retention: 'Keine dauerhafte Anwendungsspeicherung; zufälliger Retry-Schlüssel und Status 15 Minuten im Serverspeicher. Anfrage im privaten Mailpostfach bis zum Zweckfortfall, vorbehaltlich gesetzlicher Aufbewahrung.',
    technicalControls: ['fester privater Empfänger', 'Same-Origin POST', 'SMTP mit TLS', 'Honeypot und Rate-Limits', 'keine Kundendaten in Analytics oder öffentlichen Caches'],
  },
  {
    id: 'consented-ga4', title: 'Optionale Reichweiten-, Kursanfrage- und Kaufmessung mit GA4', lifecycle: 'conditional',
    purpose: 'Öffentliche Seitenaufrufe und vom Mailserver angenommene Kursanfragen sowie serverseitig bestätigte Learning-Käufe nach gültiger Analytics-Einwilligung messen.',
    dataCategories: ['pseudonyme GA4-Cookie-Kennung', 'öffentlicher Seitenpfad ohne Query und Fragment', 'Ereignistyp', 'bestätigter Kaufbetrag und Währung', 'pseudonyme Transaktionskennung (HMAC, keine Stripe- oder Benutzerkennung)', 'beim Google-Abruf übermittelte Verbindungsdaten'],
    legalBasis: 'Art. 6 Abs. 1 lit. a DSGVO sowie Einwilligung für optionalen Gerätezugriff nach § 25 Abs. 1 TDDDG.',
    recipients: ['Google als GA4-Anbieter'],
    transfer: 'Google-Verarbeitung kann außerhalb des EWR stattfinden; Verträge und Transfermechanismen richten sich nach der verwendeten Google-Konfiguration.',
    retention: 'GA4-Cookies höchstens bis zum Ablauf der 180-Tage-Einwilligung; Entfernung beim Widerruf oder nächsten Zugriff nach Ablauf. Datenaufbewahrung der GA4-Property ist separat von Cookie-Fristen gemäß tatsächlicher Google-Admin-Konfiguration zu prüfen.',
    technicalControls: ['Basic Consent Mode: kein Tag vor Zustimmung', 'Werbeeinwilligungen verweigert', 'keine privaten Kontoseiten', 'keine E-Mail-/Nachrichtendaten in Events', 'manuelle deduplizierte Seitenaufrufe und bestätigte Anfragen; Kaufmessung nur nach serverseitiger Live-Zahlungsprüfung, keine Testkäufe', 'Widerruf entfernt Cookies und lädt das Dokument ohne Tag neu'],
  },
  {
    id: 'billing', title: 'Bestellungen, Zahlungen und Abonnementverwaltung mit Stripe', lifecycle: 'conditional',
    purpose: 'Vom angemeldeten Nutzer angeforderte Learning-Käufe oder verfügbare Abonnements abwickeln, den Zahlungsstatus verifizieren, erworbene Zugänge freischalten und berechtigte Abonnements im Kundenportal verwalten.',
    dataCategories: ['Benutzerkennung zur Zuordnung der Bestellung', 'E-Mail-Adresse, soweit für Checkout und Kundenkonto erforderlich', 'ausgewähltes Angebot, Preis, Währung und Vertragsstatus', 'Stripe-Kunden-, Checkout-, Zahlungs- und Abonnementreferenzen', 'Rechnungs- und Zahlungsangaben, die Nutzer direkt bei Stripe eingeben'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für Bestellung, Zahlung und Vertragsverwaltung; Art. 6 Abs. 1 lit. c DSGVO für gesetzliche Nachweis- und Aufbewahrungspflichten.',
    recipients: ['Stripe als Zahlungsdienstleister und Anbieter von Checkout und Kundenportal', 'Supabase für kontogebundene Zahlungsreferenzen und Zugangsberechtigungen', 'Render als Anwendungsserver', 'Verantwortlicher für Vertragsabwicklung'],
    transfer: 'Stripe und seine Zahlungs- und Unterauftragspartner können abhängig von Zahlungsart und Vertragskonfiguration Daten außerhalb des EWR verarbeiten. Maßgeblich sind die tatsächlichen Verträge und Transfermechanismen. Stripe-Datenschutzhinweise: https://stripe.com/privacy.',
    retention: 'Vertrags- und Zahlungsreferenzen werden zur Vertragsabwicklung, Berechtigungsprüfung und für einschlägige gesetzliche Nachweispflichten aufbewahrt. Der Umfang und die dokumentbezogenen Fristen sind von einer Kontolöschung getrennt zu prüfen. Vollständige Kartendaten werden direkt bei Stripe eingegeben und durch diesen Checkout nicht in der CAPITAL-AI-Anwendungsdatenbank gespeichert.',
    technicalControls: ['serverseitig gebundene Benutzerkennung', 'Preisprüfung vor Checkout', 'Stripe-Webhook-Signatur und serverseitige Zahlungsprüfung', 'Kundenportal nur nach verifizierter Kontozuordnung', 'keine Kartendaten, Rechnungsadressen oder Checkout-Secrets an GA4; Kaufbetrag, Währung und pseudonyme Transaktionskennung nur nach Analytics-Einwilligung', 'optionale Analytics-Einwilligung ist keine Kaufvoraussetzung'],
  },
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
    id: 'google-oauth', title: 'Optionale Google-Anmeldung über Supabase Auth', lifecycle: 'conditional',
    purpose: 'Wenn ein Nutzer Google-Anmeldung auswählt: Identität prüfen, ein CAPITAL-AI-Konto zuordnen und eine Anwendungssitzung bereitstellen. Die Anmeldung verlangt im dokumentierten Flow keinen Zugriff auf Gmail- oder Google-Drive-Inhalte.',
    dataCategories: ['Google-Konto-Kennung (Provider-Identität)', 'E-Mail-Adresse', 'Profilname und gegebenenfalls Profilbild, soweit von Google für die Anmeldung übermittelt', 'Anmelde- und Sitzungstoken während des Authentifizierungsvorgangs'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für die vom Nutzer gewählte Anmeldung; Art. 6 Abs. 1 lit. f DSGVO für die Absicherung gegen unbefugte Kontozugriffe.',
    recipients: ['Google als Identitätsanbieter', 'Supabase Auth als Identitäts- und Sitzungsdienst', 'Render als Anwendungsserver'],
    transfer: 'Google, Supabase und Render können abhängig von ihren tatsächlichen Vertrags-, Hosting- und Subprozessor-Konfigurationen Daten außerhalb des EWR verarbeiten; Transfermechanismen sind gesondert zu prüfen.',
    retention: 'Die Anwendungssitzung ist auf höchstens sieben Tage begrenzt. Zuordnungs- und Profildaten verbleiben grundsätzlich für die Dauer des CAPITAL-AI-Kontos und werden auf berechtigte Löschanfrage entfernt, soweit keine gesetzlichen Pflichten entgegenstehen. Providerprotokolle haben gesonderte, noch zu verifizierende Fristen.',
    technicalControls: ['Google OAuth via Supabase Auth und PKCE S256', 'serverseitige Identitätsprüfung', 'HttpOnly-/Secure-/SameSite-Sitzungscookies', 'keine Ausgabe von Google- oder Supabase-Provider-Tokens im Browser', 'Google-Anmeldedaten werden nicht verkauft, für Werbung verwendet oder zum Training allgemeiner KI-Modelle weitergegeben'],
  },
  {
    id: 'youtube-owner-oauth', title: 'Optionale YouTube-Kanalverbindung und privater API-Testupload', lifecycle: 'conditional',
    purpose: 'Nach ausdrücklicher Google-Einwilligung den YouTube-Kanal des verifizierten CAPITAL-AI-Owners verbinden, Kanalinformationen lesen, Zugriffstoken bei Bedarf erneuern und einen vom Owner ausgelösten privaten Testupload einschließlich Upload-Status prüfen. Keine automatische öffentliche Veröffentlichung durch diesen Test.',
    dataCategories: ['Google-/YouTube-Kanal-ID und Kanalmetadaten', 'gewährte OAuth-Berechtigungen youtube.readonly und youtube.upload', 'verschlüsselte OAuth-Zugriffs- und Refresh-Tokens samt Ablauf- und Verbindungsmetadaten', 'vom Owner ausgewählte Videodatei sowie private Video-ID, Upload-Status und technische Empfangsbestätigung'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für die ausdrücklich gewählte Kanalverbindung und angeforderte Testfunktion; Art. 6 Abs. 1 lit. f DSGVO für sichere Zuordnung, Missbrauchsschutz und nachvollziehbare technische Zustände. Die Google-OAuth-Einwilligung ist zugleich die providerseitige Autorisierung, nicht pauschal die datenschutzrechtliche Rechtsgrundlage aller Verarbeitungen.',
    recipients: ['Google/YouTube als API- und OAuth-Anbieter: erhält Autorisierungsanfragen und beim Upload die Videodatei; stellt Kanal- und Videometadaten bereit', 'Render als serverseitiger Anwendungs- und Übermittlungsdienst', 'Supabase als Datenbank-/Vault-Infrastruktur für verschlüsselte Provider-Credentials, Kontozuordnung und private Upload-Belege im konfigurierten Speicherpfad', 'Verantwortlicher und technisch autorisierte Betreiber ausschließlich soweit für die Funktion und Fehlerbehebung erforderlich'],
    transfer: 'Bei der Verbindung werden OAuth-Anfragen an Google übermittelt; bei einem vom Owner ausgelösten Upload wird das Video an die YouTube API übertragen. Google/YouTube, Render und Supabase können abhängig von tatsächlichen Regionen, Verträgen und Unterauftragsverarbeitern Daten außerhalb des EWR verarbeiten. Konkrete Drittland-Transfermechanismen und Auftragsverarbeitungsverträge sind anhand der aktiven Providerverträge zu prüfen. Eine Weitergabe an andere Social-Media-Anbieter, Werbenetzwerke oder KI-Modelle ist nicht Bestandteil dieses YouTube-Testworkflows.',
    retention: 'Über „Verbindung und gespeicherte YouTube-Daten löschen“ sperrt der angemeldete Owner die Verbindung, widerruft die gespeicherte Google-Berechtigung und löscht anschließend Kanalzuordnung, verschlüsselte Tokens, OAuth-Zustände, Upload-Belege einschließlich Archiv und YouTube-Versandprotokolle bei CAPITAL-AI. Bei Fehlern bleibt die Verbindung gesperrt und der Auftrag offen; erneute Ausführung oder Kontakt zum Datenschutzverantwortlichen ist erforderlich. Ein minimaler Sperrvermerk ohne Kanal-, Video- oder Token-Daten bleibt bis zur ausdrücklich neu gestarteten Verbindung oder Kontolöschung. Ohne Löschauftrag bleiben Verbindungs- und Upload-Daten für die Funktion gespeichert; eine periodische providerseitige Wiederprüfung und fristgebundene automatische Bereinigung sind noch nicht nachgewiesen. Videos auf YouTube werden durch diesen Ablauf nicht gelöscht.',
    technicalControls: ['Google OAuth mit PKCE und einmalig konsumierbarem State', 'Owner-/Session-Prüfung und Same-Origin-Schutz', 'serverseitige AES-GCM-Verschlüsselung der Tokens', 'Vault-Zugriff über geschützte Service-Role- oder signierte Workload-Grenze', 'keine Ausgabe von Provider-Tokens an den Browser', 'privater Testupload mit festgelegter Kanal- und Dateiprüfung; keine automatische Wiederholung unklarer Uploads', 'expliziter Same-Origin-Widerruf nur für den verifizierten Owner', 'Datenbanksperre gegen spätere Callback- und Upload-Schreibvorgänge nach Löschauftrag', 'Löschbestätigung erst nach Google-Antwort und Datenbanktransaktion'],
  },
  {
    id: 'x-oauth-login', title: 'Optionale X-Anmeldung über Supabase Auth', lifecycle: 'conditional',
    purpose: 'Vom Nutzer ausgewählte Website-Anmeldung über X OAuth2; strikt getrennt von X-Content-Publishing und Social-API-Verbindungen.',
    dataCategories: ['X Provideridentität', 'E-Mail und Profilname soweit vom Anbieter freigegeben', 'kurzlebige OAuth-Codes und Session-Informationen'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für die gewählte Anmeldung, lit. f für Account-Sicherheit und Missbrauchsabwehr.',
    recipients: ['X als Identitätsanbieter', 'Supabase Auth für verifizierte Kontozuordnung', 'Render für die Anwendungssitzung'],
    transfer: 'Anbieter-Subprozessoren und mögliche Drittlandverarbeitung hängen von tatsächlichen X-/Supabase-/Render-Verträgen ab.',
    retention: 'Website-Sitzung maximal sieben Tage; Profil- und Providerzuordnung grundsätzlich bis zur Kontolöschung, soweit keine Aufbewahrungspflichten bestehen. Anbieterprotokolle getrennt prüfen.',
    technicalControls: ['OAuth2 X-Provider via Supabase Auth', 'PKCE S256', 'signierter HttpOnly-/Secure-Sitzungszustand', 'serverseitiger User- und MFA-Readback', 'keine Verwendung von X Social Publishing Tokens'],
  },
  {
    id: 'supabase-account', title: 'Supabase-Anmeldung und Anwendungssitzung', lifecycle: 'active',
    purpose: 'Verifikation der Identität und Zugriff auf authentifizierte Funktionen.',
    dataCategories: ['Supabase-Benutzerkennung (auth.users.id)', 'E-Mail-Adresse und Profilname', 'Ausstellerkennung (issuer)', 'Sitzungsablauf und technisch notwendige Sitzungscookies', 'Anmeldeidentitäten bei Supabase Auth'],
    legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO für die angeforderte Anmeldung; Art. 6 Abs. 1 lit. f DSGVO für die Absicherung des Zugriffs.',
    recipients: ['Supabase für Authentifizierung und Kontodaten', 'Render für die Anwendungssitzung'],
    transfer: 'Hosting, Betreiber und Subprozessoren von Supabase und Render müssen anhand der tatsächlich verwendeten Regionen, Verträge und Transfermechanismen geprüft werden.',
    retention: 'Die Anwendungssitzung wird in signierten HttpOnly-Cookies mit einer maximalen Laufzeit von sieben Tagen geführt und bei Abmeldung lokal entfernt; Supabase-Zugriffs- und Refresh-Tokens werden serverseitig erneuert. Auth-Kontodaten und Providerprotokolle unterliegen zusätzlich der Supabase-Konfiguration.',
    technicalControls: ['Supabase Auth mit E-Mail/Passwort, Google OAuth und optionalem X OAuth2', 'PKCE S256 für den Google- und Mobile-Flow', 'serverseitige User-/Session-Verifikation', 'signierte HttpOnly-/Secure-/SameSite-Cookies', 'keine Browserausgabe von Access- oder Refresh-Tokens'],
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
    purpose: 'Bereitstellung eines begrenzten Datenauszugs und Bearbeitung von Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch oder Datenübertragbarkeit. Angemeldete Nutzer registrieren eine Anfrage mit Vorgangsnummer; ohne Anmeldung kann ein E-Mail-Entwurf vorbereitet werden.',
    dataCategories: ['verifizierte Benutzer- und Ausstellerkennung', 'Profilname und Sitzungsablauf im Datenauszug', 'Anfragetyp', 'freiwillige Beschreibung im E-Mail-Entwurf', 'vom Nutzer versendete Nachricht', 'Vorgangsnummer, Bearbeitungsstatus, Erstellungs- und Fälligkeitsdatum bei registrierten Anfragen'],
    legalBasis: 'Art. 6 Abs. 1 lit. c DSGVO für die Bearbeitung gesetzlicher Betroffenenrechte und notwendige Nachweise.',
    recipients: ['Verantwortlicher und autorisierte Supportprozesse', 'Supabase als Anfrageregister', 'Render als Anwendungsserver', 'vom Nutzer verwendeter E-Mail-Dienst und Empfänger-Mail-Infrastruktur nach Versand'],
    transfer: 'Etwaige Drittlandbezüge richten sich nach den eingesetzten E-Mail-Diensten und deren Vertragslage.',
    retention: 'Der begrenzte Datenauszug wird nicht dauerhaft gespeichert. Registrierte Datenschutzanfragen werden bis zur Bearbeitung und grundsätzlich drei Jahre nach Abschluss als Nachweis aufbewahrt; dokumentierte Aufbewahrungssperren können die Löschung verzögern. Die tägliche Bereinigung entfernt danach fällige Datensätze. E-Mail-Anfragen verbleiben zur Bearbeitung im Postfach. Die Registrierung ist keine automatische Kontolöschung oder Vertragskündigung.',
    technicalControls: ['Datenauszug nur für die serverseitig verifizierte Sitzung', 'keine Passwörter, Tokens oder MFA-Secrets im Export', 'Same-Origin-Prüfung für POST', 'keine Anfrageinhalte in Anwendungslogs', 'serverseitige Identitätsprüfung vor Registerzugriff', 'Vorgangsnummer erst nach bestätigter Datenbankspeicherung', 'keine automatische Kontolöschung oder Vertragskündigung'],
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
