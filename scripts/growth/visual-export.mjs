import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const PNG = '89504e470d0a1a0a';
const LIMIT = 16 * 1024 * 1024;
const PIXELS = 4096 * 4096;
const inputOptions = { limitInputPixels: PIXELS, failOn: 'warning' };
export const VISUAL_EXPORT_VERSION = 'CAPITAL_AI_VISUAL_EXPORT@1';
export function loadPinnedSharp() {
  const require = createRequire(new URL('../../deploy/runtime/package.json', import.meta.url));
  const sharp = require('sharp');
  if (sharp.versions.sharp !== '0.35.5') throw Error('VISUAL_SHARP_PIN_MISMATCH');
  return sharp;
}

// Local first-party PNGs only. No URL, filesystem lookup, provider or publishing authority.
export async function exportVisualDraft({png, svg, pngSha256, svgSha256, width, height, channel}, sharp) {
  const start = performance.now();
  if (!Buffer.isBuffer(png) || png.length < 8 || png.length > LIMIT ||
      png.subarray(0,8).toString('hex') !== PNG || hash(png) !== pngSha256 ||
      typeof svg !== 'string' || Buffer.byteLength(svg) > LIMIT || hash(svg) !== svgSha256 ||
      !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
      width > 4096 || height > 4096 || !['X','INSTAGRAM','WEBSITE'].includes(channel)) throw Error('VISUAL_SOURCE_INVALID');
  const image = sharp(png, inputOptions);
  const meta = await image.metadata();
  if (meta.format !== 'png' || meta.width !== width || meta.height !== height || (meta.pages ?? 1) !== 1) throw Error('VISUAL_DIMENSIONS_INVALID');
  const normalized = await image.clone().toColourspace('srgb').ensureAlpha().raw().toBuffer();
  const variants = await Promise.all([
    image.clone().webp({lossless:true, effort:4}).toBuffer(),
    image.clone().webp({quality:87, effort:4}).toBuffer(),
    image.clone().flatten({background:'#050b18'}).jpeg({quality:90, mozjpeg:true}).toBuffer(),
  ]);
  const checked = [];
  for (let i=0; i<variants.length; i++) {
    const bytes = variants[i];
    const decoded = sharp(bytes,inputOptions);
    const m = await decoded.metadata();
    if (m.width !== width || m.height !== height || m.format !== (i===2?'jpeg':'webp') || (m.pages??1)!==1 || m.exif || m.iptc || m.xmp || bytes.length > LIMIT) throw Error('VISUAL_OUTPUT_INVALID');
    const pixels = await decoded.toColourspace('srgb').ensureAlpha().raw().toBuffer();
    if (pixels.length !== normalized.length) throw Error('VISUAL_PIXEL_COUNT_INVALID');
    let total=0, max=0, alphaExact=true;
    for(let k=0;k<pixels.length;k++) {
      const delta=Math.abs(pixels[k]-normalized[k]);
      total+=delta; max=Math.max(max,delta);
      if(k%4===3 && delta!==0) alphaExact=false;
    }
    checked.push({bytes,sha256:hash(bytes),byteLength:bytes.length,mimeType:i===2?'image/jpeg':'image/webp',mode:['LOSSLESS','Q87','JPEG_Q90'][i],pixelExact:max===0,alphaExact,meanAbsoluteError:total/pixels.length,maxAbsoluteError:max});
  }
  const [lossless, lossy, jpeg] = checked;
  // Text/charts favor exact pixels; tolerate bounded errors for an optional web rendition only.
  // Transparent pixels can be normalized by WebP; if lossless is not exact, preserve PNG.
  const acceptable = [lossless,lossy].filter(v=>v.alphaExact && (v.pixelExact || (v.mode==='Q87' && v.meanAbsoluteError<=1 && v.maxAbsoluteError<=24)));
  acceptable.sort((a,b)=>a.byteLength-b.byteLength);
  const webp = acceptable[0] ?? null;
  const pngFallback = {bytes:png,sha256:pngSha256,byteLength:png.length,mimeType:'image/png',mode:'ORIGINAL',pixelExact:true};
  const selected = webp && webp.byteLength < png.length ? webp : pngFallback;
  const channelCandidate = channel==='X' ? (png.length<=5*1024*1024?'PNG_CANDIDATE':'REVIEW_REQUIRED') : channel==='INSTAGRAM' ? (width===1080&&height===1350&&jpeg.byteLength<=8*1024*1024?'JPEG_CAROUSEL_CANDIDATE_ONLY':'REVIEW_REQUIRED') : 'WEB_PREVIEW_ONLY';
  const metadata = v => v && Object.fromEntries(Object.entries(v).filter(([k])=>k!=='bytes'));
  return {webp, jpeg, selected, evidence:{schema:VISUAL_EXPORT_VERSION,state:'DRAFT_ONLY',publicPublishAllowed:false,rights:'REVIEW_REQUIRED',channel,channelCandidate,width,height,pngSha256,svgSha256,inputBytes:png.length,webp:metadata(webp),jpeg:metadata(jpeg),selected:metadata(selected),sharpVersion:sharp.versions.sharp,libwebpVersion:sharp.versions.webp,elapsedMs:Math.round((performance.now()-start)*1000)/1000,providerCalls:0,providerCost:0,repairCycles:0,manualTimeSavedMs:null}};
}
