// First-party, source-independent explanatory recipes, not empirical observations.
export const GROWTH_VISUAL_RECIPES = {
  'CAP-GROW-001': ['Quelle','Analyse','Grenzen'],
  'CAP-GROW-002': ['OHLC','EMA','RSI'],
  'CAP-GROW-003': ['Datenherkunft','Point-in-Time','Quality Gates'],
  'CAP-GROW-004': ['Providerrechte','Zeitstempel','Testfall'],
  'CAP-GROW-005': ['Quelle','Annahmen','Grenzen'],
  'CAP-GROW-006': ['Evidence','Einordnung','Grenzen'],
  'CAP-GROW-007': ['Signal','Risk-Veto','Kontext'],
} as const;
export function growthVisualScene(id: string) {
  if(!Object.hasOwn(GROWTH_VISUAL_RECIPES,id)) return undefined;
  const labels=GROWTH_VISUAL_RECIPES[id as keyof typeof GROWTH_VISUAL_RECIPES];
  return {kind:'flow' as const,nodes:labels.map(label=>({label,detail:'Schematischer Themenbereich',height:.8})),
    description:'Redaktioneller 3D-Entwurf. Abstände und Höhen sind keine Messwerte, keine Live-Marktdaten.'};
}
