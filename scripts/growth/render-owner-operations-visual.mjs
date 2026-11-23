import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-wasm';
import { ensureResvgWasmInitialized } from '../../src/platform/SocialMediaEngine/Branding/ResvgWasmRuntime.mjs';
import { createOperationsPublicTemplateSvg, OWNER_OPERATIONS_VISUAL_KIT } from '../../src/platform/SocialMediaEngine/Editing/OwnerOperationsVisualKit.ts';

let init;
export async function renderOwnerOperationsSocialDraft() {
  // Exact, static first-party SVG; no private snapshot, browser auth, external URL or provider request.
  const fontUrl = new URL('../../public/fonts/PlusJakartaSans-Regular.ttf', import.meta.url);
  init ??= Promise.all([ensureResvgWasmInitialized(),readFile(fontUrl)]).then(([,font]) => font);
  const font = await init;
  const svg = createOperationsPublicTemplateSvg();
  const renderer = new Resvg(svg, { font: { fontBuffers:[font], defaultFontFamily:'Plus Jakarta Sans' } });
  try {
    const raster = renderer.render();
    try {
      if (raster.width !== OWNER_OPERATIONS_VISUAL_KIT.width ||
          raster.height !== OWNER_OPERATIONS_VISUAL_KIT.height) throw Error('OPERATIONS_TEMPLATE_SIZE_MISMATCH');
      const png=Buffer.from(raster.asPng());
      const sha256=createHash('sha256').update(png).digest('hex');
      return {
        png, sha256, svg,
        assetRightsStatus:'REVIEW_REQUIRED',
        publicationState:'DRAFT_ONLY',
        publicPublishAllowed:false,
      };
    } finally { raster.free(); }
  } finally { renderer.free(); }
}

// Local opt-in draft export only. Never publishes or sends owner data.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.length !== 4 || process.argv[2] !== '--output' || !process.argv[3].endsWith('.png')) {
    console.error('Usage: node --import tsx scripts/growth/render-owner-operations-visual.mjs --output /tmp/owner-operations-draft.png');
    process.exitCode=2;
  } else {
    const draft=await renderOwnerOperationsSocialDraft();
    await writeFile(process.argv[3],draft.png,{flag:'wx',mode:0o600});
    console.info(JSON.stringify({sha256:draft.sha256,bytes:draft.png.byteLength,state:draft.publicationState,publicPublishAllowed:false}));
  }
}
