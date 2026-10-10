import type { ContentCampaignBrief } from '../contracts/contentEngine.ts';

export const CHART_LEARNING_DISCLOSURE = 'Synthetisches Lernbeispiel · keine Live-Kurse · keine Anlageberatung';
export const CHART_LEARNING_SOURCE_SHA = '6620033b6ea1b5a9c379a937fbc21455102ae6fa';
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
const BASE_CHART_LESSONS: readonly ChartLesson[] = [
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

// Additional original educational lessons: 30 patterns/flags and 10 indicators.
const EXTENDED_CHART_LESSONS: readonly ChartLesson[] = [
  {
    "id": "inverse-head-shoulders",
    "title": "Inverse Schulter–Kopf–Schulter",
    "category": "Patterns",
    "hook": "Drei Tiefs; das mittlere ist tiefer als die beiden Schultern.",
    "recognition": "Drei Tiefs; das mittlere ist tiefer als die beiden Schultern. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          80,
          55,
          35,
          55,
          42,
          12,
          40,
          55,
          35,
          48,
          55,
          70,
          82
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Drei Tiefs; das mittlere ist tiefer als die beiden Schultern. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "triple-top",
    "title": "Dreifachtop",
    "category": "Patterns",
    "hook": "Drei ähnlich hohe Gipfel werden durch zwei Rückgänge getrennt.",
    "recognition": "Drei ähnlich hohe Gipfel werden durch zwei Rückgänge getrennt. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          30,
          60,
          80,
          50,
          35,
          60,
          80,
          50,
          35,
          60,
          80,
          35,
          20
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Drei ähnlich hohe Gipfel werden durch zwei Rückgänge getrennt. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "triple-bottom",
    "title": "Dreifachboden",
    "category": "Patterns",
    "hook": "Drei ähnliche Tiefpunkte wechseln sich mit zwei Erholungen ab.",
    "recognition": "Drei ähnliche Tiefpunkte wechseln sich mit zwei Erholungen ab. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          70,
          40,
          20,
          50,
          65,
          40,
          20,
          50,
          65,
          40,
          20,
          65,
          80
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Drei ähnliche Tiefpunkte wechseln sich mit zwei Erholungen ab. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "descending-triangle",
    "title": "Absteigendes Dreieck",
    "category": "Patterns",
    "hook": "Ähnliche Tiefs treffen auf schrittweise niedrigere Hochs.",
    "recognition": "Ähnliche Tiefs treffen auf schrittweise niedrigere Hochs. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          80,
          30,
          70,
          30,
          60,
          30,
          50,
          30,
          40,
          30,
          35,
          20,
          10
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Ähnliche Tiefs treffen auf schrittweise niedrigere Hochs. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "symmetric-triangle",
    "title": "Symmetrisches Dreieck",
    "category": "Patterns",
    "hook": "Fallende Hochs und steigende Tiefs nähern sich einander an.",
    "recognition": "Fallende Hochs und steigende Tiefs nähern sich einander an. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          80,
          20,
          72,
          28,
          66,
          34,
          60,
          40,
          55,
          45,
          52,
          65,
          75
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Fallende Hochs und steigende Tiefs nähern sich einander an. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "rising-wedge",
    "title": "Steigender Keil",
    "category": "Patterns",
    "hook": "Beide Grenzen steigen; die untere Grenze steigt schneller und verengt die Spanne.",
    "recognition": "Beide Grenzen steigen; die untere Grenze steigt schneller und verengt die Spanne. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          20,
          50,
          30,
          56,
          40,
          62,
          50,
          68,
          60,
          74,
          68,
          52,
          38
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Beide Grenzen steigen; die untere Grenze steigt schneller und verengt die Spanne. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "falling-wedge",
    "title": "Fallender Keil",
    "category": "Patterns",
    "hook": "Beide Grenzen fallen; die obere Grenze fällt schneller und verengt die Spanne.",
    "recognition": "Beide Grenzen fallen; die obere Grenze fällt schneller und verengt die Spanne. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          80,
          50,
          70,
          44,
          60,
          38,
          50,
          32,
          40,
          26,
          32,
          48,
          62
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Beide Grenzen fallen; die obere Grenze fällt schneller und verengt die Spanne. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "bull-pennant",
    "title": "Bullischer Wimpel",
    "category": "Patterns",
    "hook": "Ein Aufwärtsimpuls geht in eine kurze konvergierende Konsolidierung über.",
    "recognition": "Ein Aufwärtsimpuls geht in eine kurze konvergierende Konsolidierung über. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          10,
          25,
          50,
          85,
          45,
          78,
          52,
          70,
          58,
          65,
          62,
          82,
          92
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Ein Aufwärtsimpuls geht in eine kurze konvergierende Konsolidierung über. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "bear-pennant",
    "title": "Bärischer Wimpel",
    "category": "Patterns",
    "hook": "Ein Abwärtsimpuls geht in eine kurze konvergierende Konsolidierung über.",
    "recognition": "Ein Abwärtsimpuls geht in eine kurze konvergierende Konsolidierung über. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          90,
          75,
          50,
          15,
          55,
          22,
          48,
          30,
          42,
          35,
          38,
          18,
          8
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Ein Abwärtsimpuls geht in eine kurze konvergierende Konsolidierung über. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "bull-rectangle",
    "title": "Bullisches Rechteck",
    "category": "Patterns",
    "hook": "Nach einem Anstieg pendelt der Kurs zwischen annähernd horizontalen Grenzen.",
    "recognition": "Nach einem Anstieg pendelt der Kurs zwischen annähernd horizontalen Grenzen. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          10,
          25,
          50,
          75,
          50,
          75,
          50,
          75,
          50,
          75,
          50,
          82,
          92
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Nach einem Anstieg pendelt der Kurs zwischen annähernd horizontalen Grenzen. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "bear-rectangle",
    "title": "Bärisches Rechteck",
    "category": "Patterns",
    "hook": "Nach einem Rückgang folgt eine seitwärts verlaufende Handelsspanne.",
    "recognition": "Nach einem Rückgang folgt eine seitwärts verlaufende Handelsspanne. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          90,
          75,
          50,
          25,
          50,
          25,
          50,
          25,
          50,
          25,
          50,
          18,
          8
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Nach einem Rückgang folgt eine seitwärts verlaufende Handelsspanne. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "ascending-channel",
    "title": "Aufwärtskanal",
    "category": "Patterns",
    "hook": "Höhere Hochs und höhere Tiefs verlaufen in ungefähr parallelen Grenzen.",
    "recognition": "Höhere Hochs und höhere Tiefs verlaufen in ungefähr parallelen Grenzen. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          15,
          35,
          25,
          45,
          35,
          55,
          45,
          65,
          55,
          75,
          65,
          85,
          75
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Höhere Hochs und höhere Tiefs verlaufen in ungefähr parallelen Grenzen. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "descending-channel",
    "title": "Abwärtskanal",
    "category": "Patterns",
    "hook": "Tiefere Hochs und tiefere Tiefs verlaufen in ungefähr parallelen Grenzen.",
    "recognition": "Tiefere Hochs und tiefere Tiefs verlaufen in ungefähr parallelen Grenzen. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          85,
          65,
          75,
          55,
          65,
          45,
          55,
          35,
          45,
          25,
          35,
          15,
          25
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Tiefere Hochs und tiefere Tiefs verlaufen in ungefähr parallelen Grenzen. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "horizontal-channel",
    "title": "Seitwärtskanal",
    "category": "Patterns",
    "hook": "Wiederholte Richtungswechsel bleiben innerhalb einer waagerechten Spanne.",
    "recognition": "Wiederholte Richtungswechsel bleiben innerhalb einer waagerechten Spanne. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          30,
          65,
          35,
          70,
          30,
          65,
          35,
          70,
          30,
          65,
          35,
          70,
          30
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Wiederholte Richtungswechsel bleiben innerhalb einer waagerechten Spanne. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "broadening-top",
    "title": "Sich ausweitende Formation",
    "category": "Patterns",
    "hook": "Höhere Hochs und tiefere Tiefs vergrößern die Schwankungsbreite.",
    "recognition": "Höhere Hochs und tiefere Tiefs vergrößern die Schwankungsbreite. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          50,
          55,
          45,
          60,
          40,
          65,
          35,
          70,
          30,
          75,
          25,
          80,
          20
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Höhere Hochs und tiefere Tiefs vergrößern die Schwankungsbreite. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "diamond-top",
    "title": "Diamant am Hoch",
    "category": "Patterns",
    "hook": "Nach einem Anstieg weitet sich die Spanne zunächst aus und zieht sich anschließend zusammen.",
    "recognition": "Nach einem Anstieg weitet sich die Spanne zunächst aus und zieht sich anschließend zusammen. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          15,
          35,
          60,
          70,
          45,
          85,
          30,
          80,
          40,
          70,
          50,
          38,
          20
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Nach einem Anstieg weitet sich die Spanne zunächst aus und zieht sich anschließend zusammen. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "diamond-bottom",
    "title": "Diamant am Tief",
    "category": "Patterns",
    "hook": "Nach einem Rückgang weitet sich die Spanne zunächst aus und wird danach enger.",
    "recognition": "Nach einem Rückgang weitet sich die Spanne zunächst aus und wird danach enger. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          85,
          65,
          40,
          30,
          55,
          15,
          70,
          20,
          60,
          30,
          50,
          62,
          80
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Nach einem Rückgang weitet sich die Spanne zunächst aus und wird danach enger. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "rounding-bottom",
    "title": "Runder Boden",
    "category": "Patterns",
    "hook": "Ein länger werdender Rückgang verliert Steigung und geht in eine gerundete Erholung über.",
    "recognition": "Ein länger werdender Rückgang verliert Steigung und geht in eine gerundete Erholung über. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          85,
          65,
          48,
          35,
          26,
          21,
          20,
          21,
          26,
          35,
          48,
          65,
          85
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Ein länger werdender Rückgang verliert Steigung und geht in eine gerundete Erholung über. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "rounding-top",
    "title": "Rundes Top",
    "category": "Patterns",
    "hook": "Ein Anstieg verliert Steigung und geht in einen gerundeten Rückgang über.",
    "recognition": "Ein Anstieg verliert Steigung und geht in einen gerundeten Rückgang über. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          15,
          35,
          52,
          65,
          74,
          79,
          80,
          79,
          74,
          65,
          52,
          35,
          15
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Ein Anstieg verliert Steigung und geht in einen gerundeten Rückgang über. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "cup-handle",
    "title": "Tasse mit Henkel",
    "category": "Patterns",
    "hook": "Auf eine gerundete Erholung zum alten Hoch folgt eine kleinere Konsolidierung.",
    "recognition": "Auf eine gerundete Erholung zum alten Hoch folgt eine kleinere Konsolidierung. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          75,
          50,
          30,
          20,
          30,
          50,
          75,
          65,
          58,
          62,
          70,
          82,
          92
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Auf eine gerundete Erholung zum alten Hoch folgt eine kleinere Konsolidierung. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "inverse-cup-handle",
    "title": "Inverse Tasse mit Henkel",
    "category": "Patterns",
    "hook": "Auf einen gerundeten Rückgang zum alten Tief folgt eine kleinere Erholung.",
    "recognition": "Auf einen gerundeten Rückgang zum alten Tief folgt eine kleinere Erholung. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          25,
          50,
          70,
          80,
          70,
          50,
          25,
          35,
          42,
          38,
          30,
          18,
          8
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Auf einen gerundeten Rückgang zum alten Tief folgt eine kleinere Erholung. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "v-bottom",
    "title": "V-Boden",
    "category": "Patterns",
    "hook": "Ein steiler Abverkauf wird unmittelbar von einer schnellen Erholung gefolgt.",
    "recognition": "Ein steiler Abverkauf wird unmittelbar von einer schnellen Erholung gefolgt. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          90,
          77,
          64,
          51,
          38,
          25,
          12,
          25,
          38,
          51,
          64,
          77,
          90
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Ein steiler Abverkauf wird unmittelbar von einer schnellen Erholung gefolgt. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "v-top",
    "title": "V-Top",
    "category": "Patterns",
    "hook": "Ein steiler Anstieg geht unmittelbar in einen schnellen Rückgang über.",
    "recognition": "Ein steiler Anstieg geht unmittelbar in einen schnellen Rückgang über. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          10,
          23,
          36,
          49,
          62,
          75,
          88,
          75,
          62,
          49,
          36,
          23,
          10
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Ein steiler Anstieg geht unmittelbar in einen schnellen Rückgang über. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "failed-breakout",
    "title": "Fehlausbruch nach oben",
    "category": "Patterns",
    "hook": "Der Kurs überschreitet eine Spanne kurz und fällt dann unter die Ausbruchszone zurück.",
    "recognition": "Der Kurs überschreitet eine Spanne kurz und fällt dann unter die Ausbruchszone zurück. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          35,
          60,
          35,
          60,
          35,
          60,
          35,
          60,
          80,
          65,
          50,
          35,
          20
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Der Kurs überschreitet eine Spanne kurz und fällt dann unter die Ausbruchszone zurück. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "failed-breakdown",
    "title": "Fehlausbruch nach unten",
    "category": "Patterns",
    "hook": "Der Kurs unterschreitet eine Spanne kurz und kehrt dann oberhalb der Ausbruchszone zurück.",
    "recognition": "Der Kurs unterschreitet eine Spanne kurz und kehrt dann oberhalb der Ausbruchszone zurück. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          65,
          40,
          65,
          40,
          65,
          40,
          65,
          40,
          20,
          35,
          50,
          65,
          80
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Der Kurs unterschreitet eine Spanne kurz und kehrt dann oberhalb der Ausbruchszone zurück. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "breakout-retest",
    "title": "Ausbruch mit Retest",
    "category": "Patterns",
    "hook": "Ein Ausbruch wird durch eine Rückkehr zur bisherigen Begrenzung und erneute Bewegung ergänzt.",
    "recognition": "Ein Ausbruch wird durch eine Rückkehr zur bisherigen Begrenzung und erneute Bewegung ergänzt. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          30,
          60,
          35,
          60,
          40,
          60,
          75,
          85,
          70,
          60,
          68,
          80,
          92
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Ein Ausbruch wird durch eine Rückkehr zur bisherigen Begrenzung und erneute Bewegung ergänzt. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "high-tight-flag",
    "title": "High-Tight-Flag",
    "category": "Flags",
    "hook": "Auf einen außergewöhnlich steilen Anstieg folgt eine enge, kurze Konsolidierung nahe dem Hoch.",
    "recognition": "Auf einen außergewöhnlich steilen Anstieg folgt eine enge, kurze Konsolidierung nahe dem Hoch. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          5,
          10,
          20,
          40,
          65,
          88,
          82,
          86,
          80,
          85,
          81,
          90,
          97
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Auf einen außergewöhnlich steilen Anstieg folgt eine enge, kurze Konsolidierung nahe dem Hoch. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "flat-bull-flag",
    "title": "Flache bullische Flagge",
    "category": "Flags",
    "hook": "Nach einem Aufwärtsimpuls verläuft die kurze Pause nahezu waagerecht.",
    "recognition": "Nach einem Aufwärtsimpuls verläuft die kurze Pause nahezu waagerecht. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          10,
          20,
          40,
          70,
          65,
          70,
          65,
          70,
          65,
          70,
          65,
          82,
          92
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Nach einem Aufwärtsimpuls verläuft die kurze Pause nahezu waagerecht. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "flat-bear-flag",
    "title": "Flache bärische Flagge",
    "category": "Flags",
    "hook": "Nach einem Abwärtsimpuls verläuft die kurze Pause nahezu waagerecht.",
    "recognition": "Nach einem Abwärtsimpuls verläuft die kurze Pause nahezu waagerecht. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          90,
          80,
          60,
          30,
          35,
          30,
          35,
          30,
          35,
          30,
          35,
          18,
          8
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Nach einem Abwärtsimpuls verläuft die kurze Pause nahezu waagerecht. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "bull-flag-retest",
    "title": "Bull Flag mit Retest",
    "category": "Flags",
    "hook": "Die Flagge löst sich nach oben auf; anschließend wird die Ausbruchszone erneut getestet.",
    "recognition": "Die Flagge löst sich nach oben auf; anschließend wird die Ausbruchszone erneut getestet. Das Schema vereinfacht Verlauf und Zeitebene.",
    "confirmation": "Schlusskurse außerhalb der erkennbaren Begrenzung und einen möglichen Retest im übergeordneten Kontext beobachten.",
    "invalidation": "Rückkehr in die Formation oder Bruch der Gegenbegrenzung schwächt die These; Geometrie allein garantiert keine Richtung.",
    "axis": "Relative Preisposition · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Preis",
        "values": [
          10,
          25,
          50,
          80,
          70,
          60,
          65,
          55,
          75,
          85,
          68,
          80,
          92
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Welche Struktur unterscheidet dieses Muster von einer zufälligen Bewegung?",
    "answer": "Die Flagge löst sich nach oben auf; anschließend wird die Ausbruchszone erneut getestet. Bestätigung und Widerlegung sind zusätzlich zu prüfen."
  },
  {
    "id": "atr",
    "title": "ATR · Schwankungsbreite",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "Average True Range glättet True Ranges und misst Schwankungsbreite, keine Richtung. True Range berücksichtigt auch die Distanz zum vorigen Schlusskurs.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "ATR · Schwankungsbreite · schematisch",
    "domain": [
      0,
      15
    ],
    "series": [
      {
        "label": "ATR · Schwankungsbreite",
        "values": [
          4,
          5,
          7,
          9,
          8,
          10,
          12,
          9,
          7,
          6,
          5,
          4,
          6
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  },
  {
    "id": "adx",
    "title": "ADX · Trendstärke",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "Average Directional Index glättet die relative Differenz der Richtungsindikatoren. Ein höherer Wert beschreibt Trendstärke, nicht die Richtung des Trends.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "ADX · Trendstärke · schematisch",
    "domain": [
      0,
      60
    ],
    "series": [
      {
        "label": "ADX · Trendstärke",
        "values": [
          12,
          16,
          22,
          28,
          35,
          40,
          43,
          39,
          33,
          27,
          21,
          17,
          15
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  },
  {
    "id": "stochastic",
    "title": "Stochastik · Lage in der Handelsspanne",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "Die Stochastik vergleicht den Schlusskurs mit Hoch und Tief des betrachteten Fensters. Marken bei 80 und 20 kennzeichnen relative Extrembereiche.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "Stochastik · Lage in der Handelsspanne · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Stochastik · Lage in der Handelsspanne",
        "values": [
          30,
          44,
          61,
          79,
          90,
          84,
          69,
          48,
          28,
          14,
          23,
          38,
          55
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  },
  {
    "id": "williams-r",
    "title": "Williams %R",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "Williams %R setzt den Abstand zum Periodenhoch ins Verhältnis zur Hoch-Tief-Spanne. Die Skala reicht von minus 100 bis null.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "Williams %R · schematisch",
    "domain": [
      -100,
      0
    ],
    "series": [
      {
        "label": "Williams %R",
        "values": [
          -70,
          -56,
          -39,
          -21,
          -10,
          -16,
          -31,
          -52,
          -72,
          -86,
          -77,
          -62,
          -45
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  },
  {
    "id": "cci",
    "title": "CCI · Abweichung vom Durchschnitt",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "Commodity Channel Index normiert die Abweichung des typischen Preises vom gleitenden Mittel mit dessen mittlerer absoluter Abweichung.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "CCI · Abweichung vom Durchschnitt · schematisch",
    "domain": [
      -200,
      200
    ],
    "series": [
      {
        "label": "CCI · Abweichung vom Durchschnitt",
        "values": [
          -120,
          -80,
          -30,
          40,
          100,
          150,
          110,
          60,
          0,
          -60,
          -130,
          -70,
          20
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  },
  {
    "id": "roc",
    "title": "Rate of Change",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "Rate of Change beschreibt die prozentuale Preisänderung gegenüber einer festgelegten Anzahl vergangener Perioden. Die Fensterlänge beeinflusst die Interpretation.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "Rate of Change · schematisch",
    "domain": [
      -10,
      10
    ],
    "series": [
      {
        "label": "Rate of Change",
        "values": [
          -4,
          -2,
          0,
          2,
          4,
          6,
          4,
          2,
          0,
          -3,
          -5,
          -2,
          1
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  },
  {
    "id": "obv",
    "title": "On-Balance Volume",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "On-Balance Volume addiert Volumen bei steigenden Schlusskursen und subtrahiert es bei fallenden Schlusskursen. Divergenzen sind Beobachtungen, keine Beweise.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "On-Balance Volume · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "On-Balance Volume",
        "values": [
          20,
          28,
          36,
          30,
          40,
          52,
          60,
          48,
          55,
          68,
          75,
          65,
          80
        ]
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  },
  {
    "id": "bollinger",
    "title": "Bollinger-Bänder",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "Bollinger-Bänder liegen in einem festgelegten Standardabweichungsabstand um einen gleitenden Durchschnitt. Engere Bänder zeigen geringere beobachtete Streuung.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "Bollinger-Bänder · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Oberes Band",
        "values": [
          70,
          72,
          76,
          80,
          82,
          75,
          68,
          64,
          66,
          72,
          82,
          88,
          85
        ]
      },
      {
        "label": "Unteres Band",
        "values": [
          30,
          32,
          36,
          40,
          42,
          35,
          28,
          24,
          26,
          32,
          42,
          48,
          45
        ],
        "dashed": true
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  },
  {
    "id": "keltner",
    "title": "Keltner-Kanal",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "Ein Keltner-Kanal verwendet typischerweise einen EMA als Mitte und einen ATR-basierten Abstand. Perioden und Multiplikator müssen angegeben werden.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "Keltner-Kanal · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Oberes Band",
        "values": [
          65,
          66,
          68,
          72,
          78,
          82,
          84,
          81,
          76,
          73,
          75,
          78,
          82
        ]
      },
      {
        "label": "Unteres Band",
        "values": [
          25,
          26,
          28,
          32,
          38,
          42,
          44,
          41,
          36,
          33,
          35,
          38,
          42
        ],
        "dashed": true
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  },
  {
    "id": "donchian",
    "title": "Donchian-Kanal",
    "category": "Indikatoren",
    "hook": "Berechnung und Interpretation getrennt betrachten.",
    "recognition": "Ein Donchian-Kanal zeigt das höchste Hoch und das tiefste Tief eines Fensters. Ob die aktuelle Periode ausgeschlossen wird, bestimmt die Ausbruchsinterpretation.",
    "confirmation": "Die Indikatorbeobachtung mit Preisstruktur, Fensterlänge, Markt und Datenabdeckung vergleichen.",
    "invalidation": "Fehlsignale, Datenlücken und veränderte Marktphasen können die Interpretation schwächen; aus dieser Illustration folgt keine Prognose.",
    "axis": "Donchian-Kanal · schematisch",
    "domain": [
      0,
      100
    ],
    "series": [
      {
        "label": "Oberes Band",
        "values": [
          60,
          60,
          65,
          65,
          75,
          75,
          75,
          80,
          80,
          80,
          85,
          85,
          85
        ]
      },
      {
        "label": "Unteres Band",
        "values": [
          20,
          20,
          25,
          25,
          35,
          35,
          35,
          40,
          40,
          40,
          45,
          45,
          45
        ],
        "dashed": true
      }
    ],
    "guides": [],
    "checkpoint": "Ist die gezeigte Indikatorlinie aus realen Kursdaten berechnet?",
    "answer": "Nein. Diese selbst erstellte Geometrie erläutert das Konzept. Berechnete Werte brauchen einen nachvollziehbaren Daten- und Parametervertrag."
  }
];
export const CHART_LESSONS: readonly ChartLesson[] = [...BASE_CHART_LESSONS, ...EXTENDED_CHART_LESSONS];

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
