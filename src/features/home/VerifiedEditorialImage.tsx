import { useEffect, useState } from 'react';
import { homeEditorialPngPath } from './homeEditorialAdmission.mjs';
import { verifyEditorialPng, type RenderedNewsGraphic } from './homeEditorialPng';

export function VerifiedEditorialImage({ graphic }: { graphic: RenderedNewsGraphic }) {
  const [state, setState] = useState<{ graphic: RenderedNewsGraphic; url: string | null }>();
  useEffect(() => {
    const request = new AbortController();
    let objectUrl: string | undefined;
    const load = async () => {
      const response = await fetch(homeEditorialPngPath(graphic.asset.sha256), {
        signal: request.signal, redirect: 'error', credentials: 'omit',
      });
      if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'image/png' ||
          Number(response.headers.get('content-length')) > 2_000_000) throw Error('Editorial image unavailable');
      const buffer = await response.arrayBuffer();
      if (!await verifyEditorialPng(new Uint8Array(buffer), graphic)) throw Error('Editorial image mismatch');
      if (request.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/png' }));
      setState({ graphic, url: objectUrl });
    };
    load().catch(() => { if (!request.signal.aborted) setState({ graphic, url: null }); });
    return () => {
      request.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [graphic]);
  if (state?.graphic !== graphic) return <p role="status">Grafik wird geprüft …</p>;
  return state.url
    ? <img src={state.url} width={graphic.width} height={graphic.height} alt={graphic.altText} />
    : <p>{graphic.altText}</p>;
}

