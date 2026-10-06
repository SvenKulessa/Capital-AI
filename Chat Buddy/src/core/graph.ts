import type { GraphHit, Intent, Lang } from "./types";

type Rel = "moves" | "hedges" | "values" | "regulates" | "contains";

type Node = {
  id: string;
  tags: string[];
  label: Record<Lang, string>;
  blurb: Record<Lang, string>;
};

type Edge = {
  from: string;
  to: string;
  rel: Rel;
  note: { de: string; en: string };
};

const L = (de: string, en: string, fr: string, es: string, it: string): Record<Lang, string> => ({
  de,
  en,
  fr,
  es,
  it,
});

const NODES: Node[] = [
  {
    id: "ezb",
    tags: ["ezb", "bce", "ecb", "leitzins", "rate", "taux", "tipo", "tasso", "zins"],
    label: L("EZB-Leitzins", "ECB policy rate", "Taux BCE", "Tipo BCE", "Tasso BCE"),
    blurb: L(
      "Der Leitzins ist der Preis, zu dem sich Banken Geld bei der Zentralbank leihen.",
      "The policy rate is the price banks pay to borrow from the central bank.",
      "Le taux directeur est le prix de l'argent pour les banques.",
      "El tipo oficial es el precio del dinero para los bancos.",
      "Il tasso ufficiale è il prezzo del denaro per le banche.",
    ),
  },
  {
    id: "inflation",
    tags: ["inflation", "teuerung", "cpi", "precios", "prezzi"],
    label: L("Inflation", "Inflation", "Inflation", "Inflación", "Inflazione"),
    blurb: L(
      "Inflation misst, wie die Kaufkraft eines Warenkorbs über die Zeit nachlässt.",
      "Inflation measures how a basket of goods loses purchasing power.",
      "L'inflation mesure la perte de pouvoir d'achat d'un panier.",
      "La inflación mide cuánto pierde un cesto de compra.",
      "L'inflazione misura quanto perde un paniere di beni.",
    ),
  },
  {
    id: "bund",
    tags: ["bund", "rendite", "yield", "anleihe", "bono", "titolo", "10y"],
    label: L("Bund-Rendite", "Bund yield", "Rendement Bund", "Rendimiento Bund", "Rendimento Bund"),
    blurb: L(
      "Die zehnjährige Bund-Rendite ist ein Anker für den risikofreien Zins in Euro.",
      "The ten-year Bund yield anchors the euro risk-free rate.",
      "Le rendement du Bund à dix ans ancre le taux sans risque en euro.",
      "El bono a diez años ancla el tipo sin riesgo en euros.",
      "Il Bund a dieci anni ancora il tasso privo di rischio in euro.",
    ),
  },
  {
    id: "equity",
    tags: ["aktie", "aktien", "equity", "equities", "actions", "acciones", "azioni", "bewertung"],
    label: L("Aktienbewertung", "Equity value", "Valeur des actions", "Valor de acciones", "Valore azioni"),
    blurb: L(
      "Aktienkurse spiegeln erwartete Gewinne, abgezinst mit einem Zinssatz.",
      "Share prices reflect expected profits, discounted by a rate.",
      "Les actions reflètent des profits attendus, actualisés.",
      "Las acciones reflejan beneficios esperados, descontados.",
      "Le azioni riflettono utili attesi, scontati.",
    ),
  },
  {
    id: "dcf",
    tags: ["dcf", "cashflow", "discounted", "barwert"],
    label: L("DCF", "DCF", "DCF", "DCF", "DCF"),
    blurb: L(
      "Ein DCF zinst künftige freie Cashflows auf heute ab. Der Zins sitzt im Nenner.",
      "A DCF discounts future free cash flows. The rate sits in the denominator.",
      "Un DCF actualise les cash-flows libres. Le taux est au dénominateur.",
      "Un DCF descuenta los flujos libres. El tipo está en el denominador.",
      "Un DCF attualizza i flussi liberi. Il tasso sta al denominatore.",
    ),
  },
  {
    id: "wacc",
    tags: ["wacc", "kapitalkosten", "cost of capital"],
    label: L("WACC", "WACC", "WACC", "WACC", "WACC"),
    blurb: L(
      "Die WACC mischen die geforderte Rendite von Eigen- und Fremdkapital.",
      "WACC blends the return required by equity and debt.",
      "Le WACC mélange le rendement exigé des fonds propres et de la dette.",
      "El WACC mezcla la rentabilidad exigida de capital y deuda.",
      "Il WACC mescola il rendimento chiesto da equity e debito.",
    ),
  },
  {
    id: "pe",
    tags: ["kgv", "kgs", "pe", "p/e", "multiple", "per"],
    label: L("KGV", "P/E", "PER", "PER", "P/E"),
    blurb: L(
      "Das Kurs-Gewinn-Verhältnis sagt, wie viele Jahresgewinne im Preis stecken.",
      "The price-to-earnings ratio says how many years of profit sit in the price.",
      "Le PER dit combien d'années de profit sont dans le prix.",
      "El PER dice cuántos años de beneficio hay en el precio.",
      "Il P/E dice quanti anni di utili stanno nel prezzo.",
    ),
  },
  {
    id: "gold",
    tags: ["gold", "or", "oro"],
    label: L("Gold", "Gold", "Or", "Oro", "Oro"),
    blurb: L(
      "Gold wirft keinen Zins ab. Man hält es oft als Gegenstück zu Papiergeld-Stress.",
      "Gold pays no yield. People hold it as a counterweight to currency stress.",
      "L'or ne verse pas d'intérêt. On le tient contre le stress monétaire.",
      "El oro no paga cupón. Se tiene contra el estrés de la moneda.",
      "L'oro non paga cedola. Si tiene contro lo stress della moneta.",
    ),
  },
  {
    id: "btc",
    tags: ["bitcoin", "btc", "krypto", "crypto"],
    label: L("Bitcoin", "Bitcoin", "Bitcoin", "Bitcoin", "Bitcoin"),
    blurb: L(
      "Bitcoin ist knapp und stark schwankend. Ein Hedge ist das nur mit hohem Zeichnen von Schwankung.",
      "Bitcoin is scarce and swings hard. As a hedge it still carries large swings.",
      "Bitcoin est rare et très mobile. Comme couverture, la variation reste grande.",
      "Bitcoin es escaso y se mueve mucho. Como cobertura, la oscilación sigue alta.",
      "Bitcoin è scarso e si muove forte. Come copertura, l'oscillazione resta alta.",
    ),
  },
  {
    id: "drawdown",
    tags: ["drawdown", "rückgang", "peak", "trough", "caida", "calo"],
    label: L("Drawdown", "Drawdown", "Drawdown", "Drawdown", "Drawdown"),
    blurb: L(
      "Der Drawdown ist der Rückgang vom letzten Hoch bis zum nächsten Tief.",
      "Drawdown is the drop from a peak to the next trough.",
      "Le drawdown est la chute d'un sommet au creux suivant.",
      "El drawdown es la caída del máximo al siguiente mínimo.",
      "Il drawdown è il calo da un massimo al minimo successivo.",
    ),
  },
  {
    id: "vol",
    tags: ["volatilität", "volatility", "volatilite", "volatilidad", "volatilita", "schwankung"],
    label: L("Volatilität", "Volatility", "Volatilité", "Volatilidad", "Volatilità"),
    blurb: L(
      "Volatilität beschreibt die Streuung der Renditen, nicht die Richtung.",
      "Volatility describes how widely returns scatter, not their direction.",
      "La volatilité décrit la dispersion des rendements, pas le sens.",
      "La volatilidad describe la dispersión, no la dirección.",
      "La volatilità descrive la dispersione, non la direzione.",
    ),
  },
  {
    id: "diversify",
    tags: ["diversifikation", "diversify", "streuung", "diversification", "diversificacion", "diversificazione"],
    label: L("Diversifikation", "Diversification", "Diversification", "Diversificación", "Diversificazione"),
    blurb: L(
      "Streuung hilft, wenn Anlagen nicht immer gleichzeitig fallen.",
      "Spreading helps when holdings do not fall together every time.",
      "Étaler aide si les actifs ne chutent pas toujours ensemble.",
      "Repartir ayuda si los activos no caen siempre juntos.",
      "Ripartire aiuta se gli asset non cadono sempre insieme.",
    ),
  },
  {
    id: "liquidity",
    tags: ["liquidität", "liquidity", "liquidite", "liquidez", "liquidita"],
    label: L("Liquidität", "Liquidity", "Liquidité", "Liquidez", "Liquidità"),
    blurb: L(
      "Liquidität ist, wie schnell du eine Anlage in Geld wandeln kannst, ohne den Preis zu drücken.",
      "Liquidity is how fast you can turn a holding into cash without shoving the price.",
      "La liquidité est la vitesse pour passer en cash sans pousser le prix.",
      "La liquidez es lo rápido que pasas a efectivo sin empujar el precio.",
      "La liquidità è quanto in fretta passi a cassa senza spingere il prezzo.",
    ),
  },
  {
    id: "capacity",
    tags: ["risikotrag", "capacity", "tragfähigkeit", "capacidad", "capacita", "sleep"],
    label: L(
      "Risikotragfähigkeit",
      "Risk capacity",
      "Capacité de risque",
      "Capacidad de riesgo",
      "Capacità di rischio",
    ),
    blurb: L(
      "Tragfähigkeit ist, welchen Rückgang du finanziell und nervlich aushältst.",
      "Capacity is the drop you can carry in money and in nerves.",
      "La capacité est la chute que tu peux porter, en argent et en nerfs.",
      "La capacidad es la caída que puedes sostener, en dinero y en nervios.",
      "La capacità è il calo che puoi reggere, in soldi e in nervi.",
    ),
  },
  {
    id: "bafin",
    tags: ["bafin", "aufsicht", "regulator", "regulierung"],
    label: L("BaFin", "BaFin", "BaFin", "BaFin", "BaFin"),
    blurb: L(
      "Die BaFin beaufsichtigt Finanzgeschäfte in Deutschland. Ein Buddy ersetzt sie nicht.",
      "BaFin supervises finance in Germany. A buddy does not replace it.",
      "La BaFin surveille la finance en Allemagne. Un buddy ne la remplace pas.",
      "BaFin supervisa las finanzas en Alemania. Un buddy no la sustituye.",
      "La BaFin vigila la finanza in Germania. Un buddy non la sostituisce.",
    ),
  },
  {
    id: "msci",
    tags: ["msci", "welt", "world", "etf", "index", "indice"],
    label: L("Weltaktien", "World equities", "Actions monde", "Acciones mundo", "Azioni mondo"),
    blurb: L(
      "Ein breiter Weltindex bündelt viele Firmen statt einer einzelnen Wette.",
      "A broad world index bundles many firms instead of one bet.",
      "Un indice monde large réunit beaucoup de firmes, pas un seul pari.",
      "Un índice mundial amplio junta muchas empresas, no una sola apuesta.",
      "Un indice mondo ampio unisce molte imprese, non una sola scommessa.",
    ),
  },
  {
    id: "savings",
    tags: ["sparplan", "savings", "dca", "plan", "plan de ahorro", "pac"],
    label: L("Sparplan", "Savings plan", "Plan d'épargne", "Plan de ahorro", "Piano di risparmio"),
    blurb: L(
      "Ein Sparplan kauft in festen Schritten und glättet den Einstiegszeitpunkt.",
      "A savings plan buys in fixed steps and smooths the entry date.",
      "Un plan achète par pas fixes et lisse la date d'entrée.",
      "Un plan compra en pasos fijos y suaviza la fecha de entrada.",
      "Un piano compra a passi fissi e smussa la data di ingresso.",
    ),
  },
  {
    id: "curve",
    tags: ["zinsstruktur", "curve", "yield curve", "courbe", "curva"],
    label: L("Zinsstruktur", "Yield curve", "Courbe des taux", "Curva de tipos", "Curva dei tassi"),
    blurb: L(
      "Die Zinsstruktur zeigt kurze gegen lange Zinsen. Eine Umkehr fällt oft vor schwächerem Wachstum auf.",
      "The yield curve sets short rates against long ones. An inversion often shows up before slower growth.",
      "La courbe compare taux courts et longs.",
      "La curva compara tipos cortos y largos.",
      "La curva confronta tassi corti e lunghi.",
    ),
  },
];

const EDGES: Edge[] = [
  {
    from: "inflation",
    to: "ezb",
    rel: "moves",
    note: {
      de: "Hartnäckige Teuerung macht höhere Leitzinsen wahrscheinlicher, nicht sicher.",
      en: "Sticky inflation makes higher policy rates more likely, not certain.",
    },
  },
  {
    from: "ezb",
    to: "equity",
    rel: "moves",
    note: {
      de: "Ein höherer Leitzins hebt oft den Abzinsungssatz und drückt damit Barwerte.",
      en: "A higher policy rate often lifts the discount rate and presses present values.",
    },
  },
  {
    from: "ezb",
    to: "bund",
    rel: "moves",
    note: {
      de: "Leitzins und Bund-Rendite ziehen meist in dieselbe Richtung, mit Zeitversatz.",
      en: "Policy rate and Bund yield usually move the same way, with a lag.",
    },
  },
  {
    from: "bund",
    to: "wacc",
    rel: "moves",
    note: {
      de: "Steigt der risikofreie Zins, steigen meist auch die Kapitalkosten.",
      en: "When the risk-free rate rises, the cost of capital usually rises too.",
    },
  },
  {
    from: "wacc",
    to: "dcf",
    rel: "values",
    note: {
      de: "Höhere Kapitalkosten senken den Barwert derselben Cashflows.",
      en: "A higher cost of capital lowers the present value of the same cash flows.",
    },
  },
  {
    from: "dcf",
    to: "equity",
    rel: "values",
    note: {
      de: "Der DCF ist eine Brille auf den Aktienwert, nicht der Markt selbst.",
      en: "A DCF is one lens on equity value, not the market itself.",
    },
  },
  {
    from: "pe",
    to: "equity",
    rel: "values",
    note: {
      de: "Ein hohes KGV kann Wachstum einpreisen oder einfach teuer sein.",
      en: "A high P/E can price in growth, or simply be expensive.",
    },
  },
  {
    from: "gold",
    to: "inflation",
    rel: "hedges",
    note: {
      de: "Gold puffert Inflationsangst unvollständig und in Schüben.",
      en: "Gold buffers inflation fear in bursts, and not fully.",
    },
  },
  {
    from: "btc",
    to: "vol",
    rel: "contains",
    note: {
      de: "Bitcoin trägt hohe Schwankung. Das ist Teil des Preises, nicht ein Fehler der Frage.",
      en: "Bitcoin carries high swings. That is part of the price, not a flaw in the question.",
    },
  },
  {
    from: "drawdown",
    to: "capacity",
    rel: "contains",
    note: {
      de: "Ein Drawdown wird erst tragbar, wenn er zu deiner Tragfähigkeit passt.",
      en: "A drawdown is bearable only when it fits your capacity.",
    },
  },
  {
    from: "vol",
    to: "drawdown",
    rel: "moves",
    note: {
      de: "Hohe Schwankung macht tiefe Drawdowns wahrscheinlicher, ohne das Datum zu nennen.",
      en: "High volatility makes deep drawdowns more likely, without naming the date.",
    },
  },
  {
    from: "diversify",
    to: "drawdown",
    rel: "hedges",
    note: {
      de: "Streuung kann den Rückgang eines einzelnen Namens dämpfen.",
      en: "Spreading can soften the drop of a single name.",
    },
  },
  {
    from: "savings",
    to: "msci",
    rel: "contains",
    note: {
      de: "Viele Sparpläne kaufen genau so einen breiten Korb.",
      en: "Many savings plans buy exactly this kind of broad basket.",
    },
  },
  {
    from: "bafin",
    to: "equity",
    rel: "regulates",
    note: {
      de: "Aufsicht rahmt den Vertrieb. Sie sagt nicht, welcher Kurs richtig ist.",
      en: "Supervision frames distribution. It does not say which price is right.",
    },
  },
  {
    from: "curve",
    to: "ezb",
    rel: "contains",
    note: {
      de: "Der kurze Teil der Kurve hängt enger am Leitzins als der lange.",
      en: "The short end of the curve hugs the policy rate more than the long end.",
    },
  },
  {
    from: "liquidity",
    to: "drawdown",
    rel: "hedges",
    note: {
      de: "Cash dämpft den Zwang, im Tief zu verkaufen.",
      en: "Cash softens the need to sell at the bottom.",
    },
  },
];

const REL: Record<Lang, Record<Rel, string>> = {
  de: {
    moves: "wirkt auf",
    hedges: "kann puffern gegen",
    values: "bewertet",
    regulates: "rahmt",
    contains: "gehört zu",
  },
  en: {
    moves: "moves",
    hedges: "can buffer",
    values: "values",
    regulates: "frames",
    contains: "belongs with",
  },
  fr: {
    moves: "agit sur",
    hedges: "peut amortir",
    values: "évalue",
    regulates: "encadre",
    contains: "va avec",
  },
  es: {
    moves: "mueve",
    hedges: "puede amortiguar",
    values: "valora",
    regulates: "enmarca",
    contains: "va con",
  },
  it: {
    moves: "agisce su",
    hedges: "può attutire",
    values: "valuta",
    regulates: "inquadra",
    contains: "sta con",
  },
};

const byId = new Map(NODES.map((node) => [node.id, node]));

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 2);
}

function scoreNode(query: string, node: Node): number {
  const hay = [node.id, ...node.tags, ...Object.values(node.label)].join(" ").toLowerCase();
  let score = 0;
  for (const token of tokens(query)) {
    if (hay.includes(token)) score += 1;
  }
  const q = query.toLowerCase();
  for (const label of Object.values(node.label)) {
    if (label.length > 2 && q.includes(label.toLowerCase())) score += 1.5;
  }
  return score;
}

function hit(node: Node, lang: Lang, score: number, hop: number, relation?: string): GraphHit {
  return {
    id: node.id,
    label: node.label[lang],
    snippet: node.blurb[lang],
    score: Number(score.toFixed(3)),
    hop,
    relation,
  };
}

const BIAS: Partial<Record<Intent, string[]>> = {
  risk: ["drawdown", "vol", "capacity", "diversify"],
  scenario: ["ezb", "equity", "inflation", "curve"],
  market: ["ezb", "equity", "btc", "gold", "bund"],
  explain: ["dcf", "wacc", "pe"],
};

export function retrieve(query: string, hops: number, lang: Lang, intent?: Intent): GraphHit[] {
  const depth = Math.min(3, Math.max(1, hops));
  const scored = NODES.map((node) => ({ node, score: scoreNode(query, node) })).sort(
    (a, b) => b.score - a.score,
  );
  let seeds = scored.filter((item) => item.score > 0).slice(0, 3);
  if (seeds.length === 0 && intent && BIAS[intent]) {
    seeds = (BIAS[intent] ?? [])
      .map((id) => byId.get(id))
      .filter((node): node is Node => Boolean(node))
      .map((node) => ({ node, score: 0.4 }));
  }
  const found = new Map<string, GraphHit>();
  for (const seed of seeds) {
    found.set(seed.node.id, hit(seed.node, lang, seed.score, 0));
  }
  let frontier = seeds.map((seed) => seed.node.id);
  for (let hop = 1; hop <= depth; hop += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of EDGES) {
        const other = edge.from === id ? edge.to : edge.to === id ? edge.from : "";
        if (!other || found.has(other)) continue;
        const node = byId.get(other);
        if (!node) continue;
        const parent = found.get(id);
        const relation = `${parent?.label ?? id} ${REL[lang][edge.rel]} ${node.label[lang]}`;
        found.set(other, hit(node, lang, (parent?.score ?? 0.4) * 0.62, hop, relation));
        next.push(other);
      }
    }
    frontier = next;
    if (found.size >= 5) break;
  }
  return [...found.values()].sort((a, b) => a.hop - b.hop || b.score - a.score).slice(0, 5);
}

export function scenarioLines(hits: GraphHit[], lang: Lang): string[] {
  const hop = new Map(hits.map((item) => [item.id, item.hop]));
  const ranked = EDGES.flatMap((edge) => {
    const fromHop = hop.get(edge.from);
    const toHop = hop.get(edge.to);
    if (fromHop === undefined && toHop === undefined) return [];
    const score =
      (fromHop === 0 ? 2 : fromHop !== undefined ? 1 : 0) + (toHop === 0 ? 2 : toHop !== undefined ? 1 : 0);
    return [{ edge, score }];
  }).sort((a, b) => b.score - a.score);
  const lines: string[] = [];
  for (const { edge } of ranked) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const note = lang === "de" ? edge.note.de : lang === "en" ? edge.note.en : "";
    const link = `${from.label[lang]} ${REL[lang][edge.rel]} ${to.label[lang]}.`;
    lines.push(note ? `${link} ${note}` : link);
    if (lines.length >= 2) break;
  }
  return lines;
}

export function graphContext(hits: GraphHit[]): string {
  if (hits.length === 0) return "No graph hits.";
  return hits
    .map((item) => `${item.label} (hop ${item.hop}): ${item.snippet}${item.relation ? ` | ${item.relation}` : ""}`)
    .join("\n");
}

export interface GraphRagAdapter {
  readonly id: string;
  search(query: string, hops: number): Promise<GraphHit[]>;
}

export function mergeHits(local: GraphHit[], remote: GraphHit[]): GraphHit[] {
  const map = new Map<string, GraphHit>();
  for (const item of [...remote, ...local]) {
    const prev = map.get(item.id);
    if (!prev || item.score > prev.score) map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => b.score - a.score).slice(0, 6);
}
