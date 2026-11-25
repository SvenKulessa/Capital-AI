export type SceneNode = { label: string; detail: string; height: number; x?: number };
export type ArticleScene = { kind: 'portfolio' | 'spread' | 'timeline' | 'network' | 'status' | 'flow'; nodes: SceneNode[]; description: string; control?: { label: string; min: number; max: number; step: number; initial: number }; };
const number = (n: number, digits = 2) => n.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const bounded = (n: number, min: number, max: number, fallback: number) => Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;

/** Illustrative values only; no prices, predictions, feeds or provider calls. */
export function learningArticleScene(id: string, input?: number): ArticleScene | undefined {
  switch (id) {
    case 'portfolio-risiko-korrelation': {
      const rho = bounded(input ?? 0, -1, 1, 0);
      const risk = 20 * Math.sqrt((1 + rho) / 2);
      return { kind: 'portfolio', nodes: [
        {label:'Anlage A', detail:'20 % Modellvolatilität', height: 2},
        {label:'Anlage B', detail:'20 % Modellvolatilität', height: 2},
        {label:'Portfolio', detail:number(risk, 1)+' % Modellvolatilität', height:risk/10},
      ], description: 'Synthetisches Beispiel: zwei gleich gewichtete Anlagen mit jeweils 20 % Volatilität. Korrelation: '+number(rho, 1)+'. Modelliertes Portfoliorisiko: '+number(risk, 1)+' %. Keine Prognose.',
      control:{label:'Korrelation', min:-1,max:1,step:.1,initial:0} };
    }
    case 'liquiditaet-spread': {
      const spread = bounded(input ?? 2, 0, 10, 2);
      return { kind:'spread', nodes: [
        {label:'Geldkurs (Bid)', detail:number(100-spread/2)+' Beispiel-EUR', height:1.5-spread/20},
        {label:'Mitte', detail:'100,00 Beispiel-EUR',height:1.5},
        {label:'Briefkurs (Ask)',detail:number(100+spread/2)+' Beispiel-EUR',height:1.5+spread/20},
      ], description:'Synthetische Preisbeispiele um 100 EUR. Spread: '+number(spread)+' EUR. Die räumliche Darstellung zeigt Abstände schematisch; keine Live-Kurse oder garantierte Ausführung.',
      control:{label:'Spread in Beispiel-EUR',min:0,max:10,step:.5,initial:2} };
    }
    case 'quellenzeit': {
      const days = Math.round(bounded(input ?? 3, 0, 14, 3));
      return {kind:'timeline', nodes:[
        {label:'Ereignis',detail:'Beispiel: Tag 0',height:.8,x:-2.4},
        {label:'Meldung',detail:'Tag '+days,height:.8,x:-2.4+days/14*4.8},
        {label:'Quellenprüfung',detail:'Original und Korrekturen prüfen',height:.8,x:2.9},
      ], description:'Synthetische Zeitachse: Veröffentlichung '+days+' Tage nach dem Ereignis. Die Zeitspanne ist ein Lernbeispiel, kein Nachrichtenfeed.',
      control:{label:'Tage bis Veröffentlichung',min:0,max:14,step:1,initial:3}};
    }
    default: return undefined;
  }
}

type StructuredGraphic = {kind:'network';center:string;labels:string[]} | {kind:'status';rows:{label:string;outcome:string}[]} | {kind:'flow';labels:string[]};
/** Called only inside the already rights-admitted editorial article render path. */
export function structuredNewsScene(graphic: StructuredGraphic): ArticleScene {
  const nodes = graphic.kind === 'network'
    ? [graphic.center,...graphic.labels].map(label => ({label,detail:'Genanntes Netzwerk / Element',height:.8}))
    : graphic.kind === 'status'
      ? graphic.rows.map(row=>({label:row.label,detail:row.outcome,height:.8}))
      : graphic.labels.map((label,index)=>({label,detail:'Schritt '+(index+1),height:.8}));
  return {kind:graphic.kind,nodes,description:'Interaktive, schematische Darstellung der freigegebenen redaktionellen Angaben. Kein Live-Marktdatenfeed; Höhen und Abstände sind keine Messwerte.'};
}
