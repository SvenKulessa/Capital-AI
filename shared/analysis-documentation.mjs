export const ANALYSIS_DOCUMENTATION = '/dokumentation/analyse-komponenten';

export const analysisArticles = [
  {
    id: 'datenqualitaet',
    title: 'Von der Quelle zum Merkmal',
    subtitle: 'Wie Herkunft, Rechte und Datenqualität die Analyse begrenzen.',
    rows: [
      { title: 'Quelle', lines: ['Lizenzumfang prüfen', 'Instrument und Zeit erfassen'] },
      { title: 'Qualität', lines: ['Aktualität prüfen', 'Pflichtdaten validieren'] },
      { title: 'Merkmal', lines: ['Rechenweg versionieren', 'Provenienz mitführen'] },
    ],
    paragraphs: [
      'Der Provider-Vertrag beschreibt mögliche Quellen. Erst der Herkunftsnachweis am gespeicherten Analysemerkmal belegt, welche Quelle tatsächlich verwendet wurde.',
      'Die Datenschicht normalisiert Eingaben und prüft Aktualität, Abdeckung und Rechte. Fehlende Pflichtdaten unterbrechen die Auswertung. Ein fehlender Messwert darf keinen Null-Score erzeugen.',
    ],
  },
  {
    id: 'scoring',
    title: 'Merkmale, Gewichtung und Risiko',
    subtitle: 'Welche Informationen in einen Score eingehen und wann ein Veto greift.',
    rows: [
      { title: 'Merkmale', lines: ['Versionierte Berechnung', 'Pro Instrument auswerten'] },
      { title: 'Score', lines: ['Gewichte nachvollziehen', 'Konfidenz berücksichtigen'] },
      { title: 'Risiko', lines: ['Risikoabzug prüfen', 'Veto respektieren'] },
    ],
    paragraphs: [
      'Analysekomponenten beschreiben Eingaben, Berechnungen und Ausgabegrenzen. Versionierte Merkmale werden dem jeweiligen Instrument zugeordnet.',
      'Für die Erklärung eines Ergebnisses zählen die im konkreten Resultat dokumentierten Gewichte, Konfidenz und Risikoabzüge. Ein aktives Veto blockiert die Freigabe.',
    ],
  },
  {
    id: 'evidence',
    title: 'Analyseergebnisse überprüfen',
    subtitle: 'Wie Modellversion, Begründungen und Evidence-ID den Score überprüfbar machen.',
    rows: [
      { title: 'Herkunft', lines: ['Quelle und Zeitstempel', 'Feature-Provenienz'] },
      { title: 'Erklärung', lines: ['Rechenmodell und Version', 'Gründe und Grenzen'] },
      { title: 'Nachweis', lines: ['Evidence-ID zuordnen', 'Freigabestatus prüfen'] },
    ],
    paragraphs: [
      'Der Ergebnisvertrag verbindet den Score mit Merkmalen, Provider-Provenienz, Begründungen und Modellversion. Über die Evidence-ID lässt sich der dazugehörige Nachweis zuordnen.',
      'Die Freigabe nutzt den aktuellen Nachweis und dessen Berechtigungsstatus. Fehlt ein relevanter Nachweis oder ist er veraltet, bleibt die handlungsrelevante Veröffentlichung gesperrt.',
    ],
  },
];
