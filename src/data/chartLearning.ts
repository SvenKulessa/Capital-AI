import type { ContentCampaignBrief } from '../contracts/contentEngine.ts';

export const CHART_LEARNING_DISCLOSURE = 'Synthetisches Lernbeispiel · keine Live-Kurse · keine Anlageberatung';
export const CHART_LEARNING_SOURCE_SHA = '75b0bae05a5c862e87274adf28a5e4d079c5a87a';
export const CHART_LEARNING_SOURCES = [
  { title: 'Fidelity: RSI', url: 'https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/RSI' },
  { title: 'Fidelity: MACD', url: 'https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/macd' },
  { title: 'Fidelity: Technical Indicator Guide', url: 'https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/overview' },
  { title: 'Schwab: Chartmuster und Trendbestätigung', url: 'https://www.schwab.com/learn/story/how-to-read-stock-charts-and-trading-patterns' },
] as const;

export type LearningSeries = { label: string; values: readonly number[]; dashed?: boolean };
export type LearningGuide = { label: string; from: readonly [number, number]; to: readonly [number, number] };
export type ChartLesson = {
  id: string; title: string; category: 'Flags' | 'Patterns' | 'Indikatoren';
  hook: string; recognition: string; confirmation: string; invalidation: string;
  axis: string; domain: readonly [number, number]; series: readonly LearningSeries[];
  guides: readonly LearningGuide[]; checkpoint: string; answer: string;
};

// Authored schematic geometry. Indicator lines illustrate concepts, they are NOT
// computed from a hidden price feed or presented as calibrated model output.
export const CHART_LESSONS: readonly ChartLesson[] = [
  { id: 'bull-flag', title: 'Bull Flag', category: 'Flags', hook: 'Impuls, Pause, Ausbruch: drei Teile einer Flagge.',
    recognition: 'Nach einem steilen Anstieg folgt ein kurzer, leicht abwärts gerichteter Parallelkanal.',
    confirmation: 'Ein Schlusskurs oberhalb des Kanals kann die Fortsetzungsthese stützen; Volumen und Zeitebene mitprüfen.',
    invalidation: 'Ein Bruch unter die Konsolidierung oder ein Rückfall nach dem Ausbruch widerspricht der Fortsetzung.',
    axis: 'Relative Preisposition', domain: [0, 100], series: [{ label: 'Preis', values: [12,20,42,70,66,57,63,52,58,47,55,74,86] }],
    guides: [{ label: 'Kanal oben', from:[3,70],to:[10,55] },{label:'Kanal unten',from:[3,56],to:[10,41]}],
    checkpoint: 'Ist ein steigender Kurs allein bereits eine Bull Flag?', answer: 'Nein. Erst Impuls und begrenzte Konsolidierung bilden das Muster; der Ausbruch bleibt eine Hypothese.' },
  { id: 'bear-flag', title: 'Bear Flag', category: 'Flags', hook: 'Eine Erholung kann nur eine Pause im Abwärtstrend sein.',
    recognition: 'Auf einen starken Rückgang folgt ein kurzer, leicht aufwärts gerichteter Parallelkanal.',
    confirmation: 'Ein Schlusskurs unter dem Kanal kann die Abwärtsthese stützen. Ein einzelner Docht reicht nicht.',
    invalidation: 'Ein nachhaltiger Bruch nach oben oder schnelle Rückkehr in den Kanal schwächt die These.',
    axis: 'Relative Preisposition', domain:[0,100],series:[{label:'Preis',values:[88,80,58,30,34,43,37,48,42,53,45,26,14]}],
    guides:[{label:'Kanal oben',from:[3,44],to:[10,59]},{label:'Kanal unten',from:[3,30],to:[10,45]}],
    checkpoint:'Ist die kleine Erholung automatisch eine Trendwende?',answer:'Nein. Der vorangehende Impuls und die Reaktion an den Kanalgrenzen sind entscheidend.' },
  { id:'pennant',title:'Wimpel / Pennant',category:'Patterns',hook:'Die Schwankungen werden enger – die Richtung bleibt offen.',
    recognition:'Nach einem Impuls laufen obere und untere Begrenzung der kurzen Konsolidierung zusammen.',
    confirmation:'Erst der Ausbruch und dessen Fortbestand zeigen eine mögliche Auflösung; beide Richtungen beobachten.',
    invalidation:'Ein Fehlausbruch oder eine lange, unscharfe Seitwärtsphase passt nicht zum kurzen Wimpel.',
    axis:'Relative Preisposition',domain:[0,100],series:[{label:'Preis',values:[10,24,48,80,45,74,51,68,56,62,59,77,89]}],
    guides:[{label:'Fallende Hochs',from:[3,80],to:[10,60]},{label:'Steigende Tiefs',from:[4,45],to:[10,59]}],
    checkpoint:'Garantiert die Verengung einen Ausbruch nach oben?',answer:'Nein. Die Verengung beschreibt die Struktur, keine sichere Richtung.' },
  { id:'ascending-triangle',title:'Aufsteigendes Dreieck',category:'Patterns',hook:'Gleicher Widerstand, höhere Tiefs.',
    recognition:'Mehrere Hochs liegen auf ähnlicher Höhe, während die Tiefs ansteigen.',
    confirmation:'Ein Schlusskurs über dem Widerstand und ein möglicher Retest stützen die Ausbruchsthese.',
    invalidation:'Ein Bruch der steigenden Unterstützung oder Rückfall unter den Widerstand kann das Muster entkräften.',
    axis:'Relative Preisposition',domain:[0,100],series:[{label:'Preis',values:[25,68,32,68,40,68,48,68,56,68,64,80,89]}],
    guides:[{label:'Widerstand',from:[1,68],to:[10,68]},{label:'Höhere Tiefs',from:[0,25],to:[10,64]}],
    checkpoint:'Muss ein aufsteigendes Dreieck nach oben ausbrechen?',answer:'Nein. Auch der Bruch der steigenden Unterstützung ist möglich.' },
  { id:'double-top',title:'Doppeltop',category:'Patterns',hook:'Zwei Hochs sind erst der Anfang der Beobachtung.',
    recognition:'Zwei ähnliche Hochs werden durch ein Zwischentief getrennt. Dessen Niveau bildet die Nackenlinie.',
    confirmation:'Ein Schlusskurs unter der Nackenlinie kann eine Umkehrthese stützen.',
    invalidation:'Neue Hochs oder Rückeroberung der Nackenlinie widersprechen der erwarteten Abwärtsauflösung.',
    axis:'Relative Preisposition',domain:[0,100],series:[{label:'Preis',values:[20,42,64,82,66,46,60,80,67,46,37,24,18]}],
    guides:[{label:'Nackenlinie',from:[2,46],to:[11,46]},{label:'Ähnliche Hochs',from:[3,82],to:[7,80]}],
    checkpoint:'Wann ist die Umkehrthese besser gestützt?',answer:'Beim Bruch der Nackenlinie, nicht schon beim zweiten Hoch.' },
  { id:'double-bottom',title:'Doppelboden',category:'Patterns',hook:'Zwei Tiefs, ein dazwischenliegender Widerstand.',
    recognition:'Zwei ähnliche Tiefs werden durch ein Zwischenhoch getrennt. Dieses bildet die Nackenlinie.',
    confirmation:'Ein Schlusskurs oberhalb der Nackenlinie kann die Aufwärtsthese stützen.',
    invalidation:'Neue Tiefs oder Rückfall unter die Nackenlinie schwächen die Umkehrthese.',
    axis:'Relative Preisposition',domain:[0,100],series:[{label:'Preis',values:[80,58,36,18,34,54,40,20,33,54,63,76,82]}],
    guides:[{label:'Nackenlinie',from:[2,54],to:[11,54]},{label:'Ähnliche Tiefs',from:[3,18],to:[7,20]}],
    checkpoint:'Sind zwei Tiefs eine Kaufgarantie?',answer:'Nein. Struktur, Bestätigung und mögliche Widerlegung gehören zusammen.' },
  { id:'head-shoulders',title:'Schulter–Kopf–Schulter',category:'Patterns',hook:'Drei Hochs, das mittlere am höchsten.',
    recognition:'Linke Schulter, höherer Kopf und rechte Schulter. Die beiden Zwischentiefs definieren die Nackenlinie.',
    confirmation:'Ein Schlusskurs unter der Nackenlinie kann die Umkehrthese stützen.',
    invalidation:'Ein neues Hoch oder nachhaltige Rückeroberung der Nackenlinie schwächt die These.',
    axis:'Relative Preisposition',domain:[0,100],series:[{label:'Preis',values:[20,45,65,45,58,88,60,45,65,52,45,30,18]}],
    guides:[{label:'Nackenlinie',from:[3,45],to:[11,45]},{label:'Schultern',from:[2,65],to:[8,65]}],
    checkpoint:'Welche Linie entscheidet über die klassische Bestätigung?',answer:'Die Nackenlinie durch die Zwischentiefs.' },
  { id:'support-resistance',title:'Unterstützung & Widerstand',category:'Patterns',hook:'Zonen erklären Reaktionen besser als millimetergenaue Linien.',
    recognition:'Wiederholte Reaktionen an ähnlichen Tiefs und Hochs bilden beobachtbare Unterstützungs- und Widerstandszonen.',
    confirmation:'Wiederholte Reaktion oder Ausbruch mit anschließendem Retest beobachten.',
    invalidation:'Ein nachhaltiger Bruch zeigt, dass die bisherige Zone nicht mehr hält.',
    axis:'Relative Preisposition',domain:[0,100],series:[{label:'Preis',values:[40,65,72,50,28,45,70,52,29,47,71,53,31]}],
    guides:[{label:'Widerstandszone',from:[0,71],to:[12,71]},{label:'Unterstützungszone',from:[0,29],to:[12,29]}],
    checkpoint:'Sind die Grenzen exakte, unveränderliche Preise?',answer:'Nein. Die Grafik vereinfacht Zonen zu Referenzlinien.' },
  { id:'rsi',title:'RSI: Momentum lesen',category:'Indikatoren',hook:'Überkauft bedeutet nicht: Der Kurs muss sofort fallen.',
    recognition:'Der RSI bewegt sich zwischen 0 und 100. 70 und 30 sind verbreitete Beobachtungsmarken, keine universellen Handelsregeln.',
    confirmation:'Rückkehr aus Extrembereichen und den Preis-/Trendkontext gemeinsam betrachten.',
    invalidation:'In starken Trends kann RSI lange extrem bleiben. Ein Extremwert allein bestätigt keine Umkehr.',
    axis:'RSI · schematisch (0–100)',domain:[0,100],series:[{label:'RSI',values:[42,49,57,66,75,81,76,68,54,38,26,32,44]}],
    guides:[{label:'70',from:[0,70],to:[12,70]},{label:'30',from:[0,30],to:[12,30]}],
    checkpoint:'Ist RSI über 70 allein ein Verkaufssignal?',answer:'Nein. Die Marke beschreibt Momentum; der Trend kann weiterlaufen.' },
  { id:'macd',title:'MACD & Signallinie',category:'Indikatoren',hook:'Kreuzung und Nulllinie erzählen unterschiedliche Dinge.',
    recognition:'Die MACD-Linie ist die Differenz zweier EMAs; die Signallinie glättet sie. Üblich sind 12/26/9 Perioden.',
    confirmation:'Kreuzungen im Trendkontext beobachten. Die Nulllinie kennzeichnet die relative Lage der beiden Preis-EMAs.',
    invalidation:'Seitwärtsmärkte können viele wechselnde Kreuzungen erzeugen. Verzögerung und Fehlsignale mitbewerten.',
    axis:'MACD · schematische Einheiten',domain:[-6,6],series:[{label:'MACD',values:[-4,-3,-2,0,2,4,3,2,0,-2,-3,-2,0]},{label:'Signal',dashed:true,values:[-3,-3,-2.8,-2,-0.8,0.8,1.7,1.8,1.2,0,-1.2,-1.5,-1]}],
    guides:[{label:'Nulllinie',from:[0,0],to:[12,0]}],
    checkpoint:'Ist eine Signallinienkreuzung gleich einem Nulllinienbruch?',answer:'Nein. Sie vergleichen unterschiedliche Referenzen und können zu verschiedenen Zeiten auftreten.' },
  { id:'moving-averages',title:'Gleitende Durchschnitte',category:'Indikatoren',hook:'Glättung schafft Übersicht, aber auch Verzögerung.',
    recognition:'Ein kurzer Durchschnitt reagiert schneller als ein langer. Kreuzungen illustrieren mögliche Trendwechsel.',
    confirmation:'Die Steigung und der übergeordnete Trend liefern Kontext; Perioden und SMA/EMA-Auswahl offenlegen.',
    invalidation:'In Seitwärtsphasen wechseln Kreuzungen häufig. Ein Durchschnitt erkennt keinen zukünftigen Kurs.',
    axis:'Relative Preisposition · schematisch',domain:[0,100],series:[{label:'Kurz',values:[30,32,37,44,52,61,67,70,66,57,47,40,38]},{label:'Lang',dashed:true,values:[47,46,45,45,46,49,53,57,59,59,57,53,49]}],
    guides:[],checkpoint:'Warum kann eine Kreuzung spät erscheinen?',answer:'Durchschnitte beruhen auf vergangenen Beobachtungen und glätten schnelle Änderungen.' },
  { id:'volume-breakout',title:'Volumen & Ausbruch',category:'Indikatoren',hook:'Mehr Aktivität kann einen Ausbruch stützen – nicht garantieren.',
    recognition:'Die Aktivität am Ausbruch mit vorherigen Perioden desselben Markts, derselben Quelle und Zeitebene vergleichen.',
    confirmation:'Erhöhtes Volumen und Fortbestand des Preisausbruchs können sich ergänzen; dieses Bild zeigt nur das Volumenkonzept.',
    invalidation:'Hohes Volumen kann auch am Ende einer Bewegung auftreten. Lücken und venue-spezifische Abdeckung prüfen.',
    axis:'Relatives Volumen · schematisch',domain:[0,100],series:[{label:'Volumen',values:[25,28,24,31,29,26,32,28,35,78,88,64,52]}],
    guides:[{label:'Vergleichsniveau',from:[0,30],to:[12,30]}],
    checkpoint:'Beweist hohes Volumen die Ausbruchsrichtung?',answer:'Nein. Volumen beschreibt Aktivität; die Preisstruktur muss separat geprüft werden.' },
];

export const CHART_LEARNING_CAMPAIGN: ContentCampaignBrief = {
  campaignId:'chart-learning-20261009',productId:'capital-ai-learning',sourceSha:CHART_LEARNING_SOURCE_SHA,
  canonicalUrl:'https://capital-ai.online/learning?tab=patterns',locale:'de-DE',
  objective:'Chartmuster, Flags und Indikatoren mit selbst erstellten synthetischen Lerncharts erklären.',
  audience:['Lernende Anleger','FinTech-Builder'],channels:['WEBSITE','LINKEDIN','YOUTUBE'],outputs:['TEXT','IMAGE'],
  sourceUrls:CHART_LEARNING_SOURCES.map(source=>source.url),
};

export function lessonPost(lesson: ChartLesson): string {
  return `${lesson.title}: ${lesson.hook}\n\nErkennen: ${lesson.recognition}\nBestätigung: ${lesson.confirmation}\nFehlersignal: ${lesson.invalidation}\n\n${CHART_LEARNING_DISCLOSURE}\nIm Lernatlas vergleichen: https://capital-ai.online/learning?tab=patterns&lesson=${lesson.id}\n#CapitalAI #Chartmuster #Finanzbildung`;
}
