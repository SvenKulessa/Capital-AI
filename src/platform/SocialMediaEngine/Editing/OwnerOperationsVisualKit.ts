import { BRAND_COLORS } from '../../../../shared/hub-branding.mjs';

/**
 * Public design kit derived from the owner's approved visual reference.
 * It contains NO owner readback, tenant claims, credentials or live metrics.
 * The private DashboardReadback contract MUST NOT be accepted here.
 */
export const OWNER_OPERATIONS_VISUAL_KIT_ID = 'CAPITAL_AI_OPERATIONS_VISUAL_KIT@1';
export const OWNER_OPERATIONS_VISUAL_KIT = Object.freeze({
  schema: OWNER_OPERATIONS_VISUAL_KIT_ID,
  source: 'OWNER_APPROVED_VISUAL_REFERENCE_20261119',
  designSystem: 'CAPITAL_AI_UNIVERSE_SEVEN_COLOR',
  width: 1080,
  height: 1350,
  formats: ['image/svg+xml', 'image/png'] as const,
  renderer: 'EXISTING_RESVG_WASM_2_6_2',
  palette: Object.freeze({
    gold: BRAND_COLORS.gold,
    violet: BRAND_COLORS.violet,
    cyan: BRAND_COLORS.cyan,
    green: BRAND_COLORS.green,
    rose: BRAND_COLORS.rose,
    blue: BRAND_COLORS.blue,
    pink: BRAND_COLORS.pink,
  }),
  sourceRights: 'FIRST_PARTY_TEMPLATE_REVIEW_REQUIRED',
  publicationState: 'DRAFT_ONLY',
  publicPublishAllowed: false,
  channelsApproved: [] as string[],
  assetBytesVerified: false,
  approvalReceipts: [] as string[],
  deliveries: [] as string[],
});

/** Static vector template. No dynamic input -> impossible to embed private KPI values. */
export function createOperationsPublicTemplateSvg(): string {
  const { gold, violet, green, blue, rose } = OWNER_OPERATIONS_VISUAL_KIT.palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="CAPITAL-AI Operations Design Entwurf, ohne Echtdaten">
  <title>CAPITAL-AI Operations Visual Kit · Template</title>
  <rect width="1080" height="1350" fill="#070c1c"/>
  <rect x="36" y="40" width="1008" height="1260" rx="30" fill="#0b1428" stroke="${gold}" stroke-width="2"/>
  <text x="82" y="116" font-size="27" fill="${violet}" font-family="sans-serif" letter-spacing="4">CAPITAL-AI / OPERATIONS</text>
  <text x="82" y="192" font-size="55" font-weight="bold" fill="#f8fafc" font-family="sans-serif">Owner Operations</text>
  <text x="82" y="250" font-size="27" fill="#b7c7df" font-family="sans-serif">Öffentliche Gestaltungsvorlage · Entwurf</text>
  ${[['GitHub',violet],['Render',blue],['Analytics',gold],['Evidence',green]].map(([title,color],i)=>{
    const x=80+(i%2)*480;const y=315+Math.floor(i/2)*180;
    return `<rect x="${x}" y="${y}" width="445" height="155" rx="20" fill="#101d37" stroke="${color}"/>
      <text x="${x+26}" y="${y+58}" font-size="26" fill="#f8fafc" font-family="sans-serif">${title}</text>
      <text x="${x+26}" y="${y+113}" font-size="25" fill="#f9bf21" font-family="sans-serif">KEINE LIVE-DATEN</text>`;
  }).join('')}
  <rect x="80" y="707" width="920" height="235" rx="22" fill="#101d37" stroke="${violet}"/>
  <text x="111" y="765" font-size="29" fill="#f8fafc" font-family="sans-serif">Grafik- und Diagrammfläche</text>
  <path d="M115 893 L245 862 L377 885 L514 837 L659 848 L798 794 L957 775" fill="none" stroke="${violet}" stroke-width="7" stroke-linecap="round"/>
  <rect x="80" y="976" width="920" height="142" rx="22" fill="#101d37" stroke="${green}"/>
  <text x="111" y="1035" font-size="29" fill="#f8fafc" font-family="sans-serif">Evidence / Attribution</text>
  <text x="111" y="1081" font-size="24" fill="${rose}" font-family="sans-serif">NOT_PROVEN bis zur Quellenprüfung</text>
  <text x="82" y="1218" font-size="26" fill="${gold}" font-family="sans-serif">DRAFT_ONLY · Keine Veröffentlichung</text>
  <text x="82" y="1261" font-size="20" fill="#a1acc5" font-family="sans-serif">Keine Owner-Metriken, Tokens oder Kundendaten</text>
  </svg>`;
}

export function createOperationsVisualDraft() {
  return {
    schema: OWNER_OPERATIONS_VISUAL_KIT_ID,
    title: 'CAPITAL-AI Operations Visual · Entwurf',
    source: OWNER_OPERATIONS_VISUAL_KIT.source,
    width: OWNER_OPERATIONS_VISUAL_KIT.width,
    height: OWNER_OPERATIONS_VISUAL_KIT.height,
    svg: createOperationsPublicTemplateSvg(),
    publicationState: 'DRAFT_ONLY' as const,
    publicPublishAllowed: false as const,
    sourceRights: 'REVIEW_REQUIRED' as const,
    commercialRights: 'NOT_PROVEN' as const,
    mediaApproval: null,
    assetSha256: null,
    deliveryReceipt: null,
  };
}
