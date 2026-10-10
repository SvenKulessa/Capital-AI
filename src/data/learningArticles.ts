/** Public editorial learning content. No repository news or private owner drafts. */
export type PublicLearningHub = 'learning' | 'marketscreener' | 'studio';
export type PublicLearningArticle = { id:string; title:string; body:string; hub:PublicLearningHub; publishedAt:string; status:'PUBLISHED' };

/** Hub, publication state and date are required before editorial material is admitted. */
export const LEARNING_ARTICLES = [
  {hub:'learning',publishedAt:'2026-10-09',status:'PUBLISHED',id:'liquiditaet-spread',title:'Liquidität verstehen: Warum der angezeigte Preis nicht genügt',body:'Ein Bid-Ask-Spread ist die Differenz zwischen bestem Kauf- und Verkaufspreis. Wenig Markttiefe kann den Ausführungspreis zusätzlich verändern. Vergleiche deshalb Spread, Ordergröße, Gebühren und den tatsächlich verfügbaren Handelspartner. Eine Bildschirmnotierung garantiert keinen Ausführungspreis.'},
  {hub:'learning',publishedAt:'2026-10-09',status:'PUBLISHED',id:'quellenzeit',title:'News richtig lesen: Ereigniszeit und Veröffentlichungszeit trennen',body:'Eine Meldung kann heute erscheinen und ein älteres Ereignis beschreiben. Prüfe beide Zeitangaben, die Originalquelle und eventuelle Korrekturen. Trenne bestätigte Tatsachen, Zitate und Einschätzungen. Ein aktuelles Veröffentlichungsdatum allein macht eine Meldung noch nicht zu neuer Information.'},
  {hub:'learning',publishedAt:'2026-10-09',status:'PUBLISHED',id:'news-kontext',title:'Von der Schlagzeile zur belastbaren Einordnung',body:'Eine Schlagzeile verdichtet einen Sachverhalt und lässt häufig Bedingungen weg. Lies den Zusammenhang, identifiziere die Primärquelle und prüfe das betroffene Instrument. Ein Ereignis kann bereits erwartet oder eingepreist sein. Aus einer positiven Nachricht folgt keine garantierte positive Kursreaktion.'},
  {hub:'learning',publishedAt:'2026-10-09',status:'PUBLISHED',id:'rsi-kontext',title:'RSI im Kontext: Momentum ist keine Prognose',body:'Der Relative Strength Index vergleicht geglättete Aufwärts- und Abwärtsbewegungen. Die Skala reicht von 0 bis 100. Marken bei 70 und 30 sind verbreitete Orientierungspunkte. In ausgeprägten Trends kann der Indikator längere Zeit in Extrembereichen bleiben. Einzelne Marken ersetzen keine Betrachtung des Trends und Risikos.'},
  {hub:'learning',publishedAt:'2026-10-09',status:'PUBLISHED',id:'beobachtung-prognose',title:'Daten, Szenario, Prognose: Drei unterschiedliche Aussagen',body:'Eine Datenbeobachtung hält einen vergangenen Sachverhalt fest. Ein Szenario beschreibt mögliche Entwicklungen unter Annahmen. Eine Prognose schätzt eine zukünftige Entwicklung und bleibt unsicher. Achte darauf, dass Anbieter diese Aussagen kennzeichnen und Zeitpunkte, Quellen und Grenzen offenlegen.'},
  {hub:'learning',publishedAt:'2026-10-09',status:'PUBLISHED',id:'slippage',title:'Slippage: Die Lücke zwischen Erwartung und Ausführung',body:'Wenn eine Order zu einem anderen als dem erwarteten Preis ausgeführt wird, spricht man von Slippage. Preisbewegungen während der Übertragung, Markttiefe und Orderart können dazu beitragen. Eine Limitorder begrenzt den zulässigen Preis, garantiert aber keine Ausführung. Gebühren sind davon getrennt zu betrachten.'},
  {hub:'learning',publishedAt:'2026-10-09',status:'PUBLISHED',id:'primaerquelle',title:'Unternehmensmeldungen prüfen: Zur Originalveröffentlichung zurück',body:'Originalveröffentlichungen helfen, Zitate, Bezugszeiträume und Zahlen zu prüfen. Beachte Veröffentlichungsdatum, mögliche Berichtigungen sowie den Unterschied zwischen berichteten und bereinigten Kennzahlen. Auch Primärquellen benötigen Kontext: Eine Unternehmensprognose ist weiterhin eine Einschätzung und kein bewiesenes Ergebnis.'},
] as const satisfies readonly PublicLearningArticle[];

export function latestLearningArticles<T extends PublicLearningArticle>(articles: readonly T[], max = 3): T[] {
  // Sort by publication date, not by render or filesystem order. Modern JS sort is stable for ties.
  return articles.filter(article => article.status === 'PUBLISHED')
    .slice().sort((a,b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, Math.max(0, Math.min(3, max)));
}
export const LEARNING_ARTICLE_DATE = '2026-10-09';
