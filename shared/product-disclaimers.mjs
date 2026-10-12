export const PRODUCT_DISCLAIMERS = Object.freeze({
 marketing: 'CAPITAL-AI vermittelt Finanzwissen und Analysemethoden. Keine persönliche Anlageberatung oder Kauf-/Verkaufsempfehlung. Anlagen bergen Verlustrisiken. Inhalte, Daten und Medien unterliegen den jeweiligen Nutzungsrechten.',
 commerce: 'Es gelten die im Bestellprozess ausgewiesenen Preise, Laufzeiten, Kündigungsbedingungen und gesetzlichen Verbraucherrechte. Externe Daten- und Modellkosten sind separat. Ein Abo erweitert keine Daten- oder Weiterverbreitungsrechte. Ein Abo ist keine Zusage von Live-Kursen oder Anlageerfolgen.',
 scoring: 'Scorings dienen der Information, nicht der persönlichen Anlageberatung. Demo-Werte sind synthetisch und keine Live-Signale oder Renditenachweise. Modelle können irren; Anlagen können bis zum Totalverlust führen. Daten- und Medienrechte bleiben beim jeweiligen Rechteinhaber.',
});
export const DISCLAIMER_LEGAL_SOURCES = Object.freeze([
 'https://www.gesetze-im-internet.de/wpig/__2.html',
 'https://www.gesetze-im-internet.de/bgb/__312k.html',
 'https://www.gesetze-im-internet.de/urhg/',
]);
export const KRAKEN_REFERRAL = Object.freeze({url:'https://proinvite.kraken.com/9f1e/8nfzp3u7',code:'yc4ggk3f'});
export function youtubeDescription({title, summary, chapters = ''}) {
 return `${title}\n\n${summary}\n\n${chapters}\n\nCAPITAL-AI: https://capital-ai.online/\nLearning Portal: https://capital-ai.online/learning\n\nWerbung / Referral: Tritt Kraken Pro bei, und wir können beide Prämien erhalten. Verwende meinen Link oder den Referral-Code ${KRAKEN_REFERRAL.code}. Prämien hängen von den aktuellen Teilnahmebedingungen ab.\n${KRAKEN_REFERRAL.url}\n\n${PRODUCT_DISCLAIMERS.marketing}\n${PRODUCT_DISCLAIMERS.scoring}\nRechtliche Hinweise: https://capital-ai.online/agb\n#CapitalAI #Finanzwissen`;
}
