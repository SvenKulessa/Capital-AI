import { PRIVACY_NOTICE_VERSION } from './legal-identity.mjs';
// Canonical disclosures shared by standalone HTML, application and owner connection UI.
export const YOUTUBE_POLICY = Object.freeze({
  version: PRIVACY_NOTICE_VERSION,
  terms: 'https://www.youtube.com/t/terms',
  privacy: 'https://policies.google.com/privacy',
  revoke: 'https://security.google.com/settings/security/permissions',
  title: 'YouTube API Services: Nutzung, Datenschutz und Widerruf',
  acceptance: 'CAPITAL-AI nutzt YouTube API Services. Mit der Nutzung der YouTube-Funktionen stimmen Sie den YouTube-Nutzungsbedingungen zu und akzeptieren die Datenschutzhinweise für diese Funktion.',
  use: 'Die Kanalverbindung ist von der Google-Anmeldung getrennt. Verarbeitete Kanal-, Video- und Token-Daten werden für die ausdrücklich angeforderten YouTube-Funktionen verwendet. CAPITAL-AI verkauft diese Daten nicht, nutzt sie nicht für Werbung und nicht zum Training allgemeiner KI-Modelle. Empfänger, Datenkategorien und Speicherung sind im Abschnitt zur YouTube-Kanalverbindung beschrieben.',
  withdrawal: 'Den Zugriff können Sie zusätzlich in den Google-Sicherheitseinstellungen (Google-Kontoeinstellungen) widerrufen. Für die Löschung bei CAPITAL-AI und Fragen oder Beschwerden wenden Sie sich an sven.kulessa@capital-ai.online oder verwenden als angemeldeter Owner „Verbindung und gespeicherte YouTube-Daten löschen“. Ein Löschauftrag ist erst nach bestätigter Ausführung abgeschlossen. Videos auf YouTube werden dabei nicht gelöscht; sie können in YouTube Studio separat verwaltet werden.',
});
export const COMMERCE_NOTICE = Object.freeze({
  title: 'Aktuelle Angebote und Zahlungsabwicklung',
  paragraphs: [
    'Der archivierte Starter-/Pro-/Enterprise-Katalog gilt nicht für neue Angebote im Learning Portal oder auf der aktuellen Preisseite. Soweit ein Angebot freigeschaltet ist, werden Leistung, Gesamtpreis, Zahlungsart, Laufzeit und gegebenenfalls Verlängerung vor der zahlungspflichtigen Bestellung angezeigt. Maßgeblich sind diese konkreten Bestellinformationen.',
    'Die Zahlungsabwicklung erfolgt über Stripe Checkout. Berechtigte Abonnements können unter Profil → Abo verwalten über das Stripe-Kundenportal verwaltet werden. Einmalkäufe und Abonnements sind getrennte Angebote; ein Einmalkauf wird nicht allein durch diese AGB zum Abonnement. Der im Impressum genannte Kontakt bleibt für Vertragsfragen erreichbar.',
    'Optionale Analytics-Einwilligung ist keine Voraussetzung für eine Anfrage oder einen Kauf. Ohne Zustimmung wird GA4 nicht geladen; Marketing bleibt deaktiviert. Eine Datenschutzanfrage, eine Vertragskündigung und der Widerruf einer Google-Berechtigung sind getrennte Vorgänge.',
  ],
});
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function youtubePolicyHtml(locale = 'de') {
  if (locale === 'en') {
    const p = YOUTUBE_POLICY;
    return `<section id="youtube-policy" lang="en"><h2>YouTube API Services: use, privacy and revocation</h2><p>CAPITAL-AI uses YouTube API Services. By using the YouTube features, you agree to the YouTube Terms of Service and accept the privacy information for this feature.</p><p>Connecting your channel is separate from signing in with Google. Channel, video and token data are used only for the YouTube features you explicitly request. CAPITAL-AI does not sell this data, use it for advertising or use it to train general-purpose AI models. Recipients, data categories and retention are described in the YouTube channel connection section of our privacy policy.</p><p><a href="${p.terms}?hl=en">YouTube Terms of Service</a> · <a href="${p.privacy}?hl=en">Google Privacy Policy</a> · <a href="${p.revoke}?hl=en">Google account settings: revoke access</a></p><p>You can also revoke access in your Google account settings. To delete data stored by CAPITAL-AI, or for questions or complaints, contact sven.kulessa@capital-ai.online or, as the signed-in owner, use “Delete connection and stored YouTube data”. A deletion request is complete only after successful confirmation. This does not delete videos from YouTube; manage those separately in YouTube Studio.</p><p><a href="/datenschutz/">Full CAPITAL-AI privacy policy (German)</a></p><p><a href="/api/social-media/youtube/account/connect?hl=en">Manage YouTube connection as signed-in owner</a></p></section>`;
  }
  const p = YOUTUBE_POLICY;
  return `<section id="youtube-policy"><h2>${p.title}</h2><p>${p.acceptance}</p><p>${p.use}</p><p><a href="${p.terms}">YouTube-Nutzungsbedingungen</a> · <a href="${p.privacy}">Google-Datenschutzerklärung</a> · <a href="${p.revoke}">Google-Sicherheitseinstellungen: Zugriff widerrufen</a></p><p>${p.withdrawal}</p><p><a href="/api/social-media/youtube/account/connect">YouTube-Verbindung als angemeldeter Owner verwalten</a></p></section>`;
}
export function commerceNoticeHtml() {
  return `<section id="current-commerce"><h2>${COMMERCE_NOTICE.title}</h2>${COMMERCE_NOTICE.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')}</section>`;
}
