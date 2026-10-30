import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { BRAND_GLOBE } from '../platform/SocialMediaEngine/Visualization/BrandGlobeSpec';

export type BrandGlobeHandle = { capturePNG: () => Promise<Blob> };
type Renderer = Awaited<ReturnType<typeof import('../platform/SocialMediaEngine/Visualization/BrandGlobeRenderer').createBrandGlobeRenderer>>;

/** The poster is always available, including blocked imports, no WebGL, context
 * loss and reduced motion. Heavy Three.js loads only for a visible animation. */
export const BrandGlobe = forwardRef<BrandGlobeHandle, { paused: boolean }>(function BrandGlobe({ paused }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<Renderer | null>(null);
  const pausedRef = useRef(paused);
  const playbackRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();
  useImperativeHandle(ref, () => ({ capturePNG: async () => {
    if (!apiRef.current) throw new Error('3D-Vorschau ist noch nicht bereit.');
    return apiRef.current.capturePNG();
  } }), []);
  useEffect(() => { pausedRef.current = paused; playbackRef.current(); }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion !== false) return;
    let disposed = false;
    let visible = false;
    let failed = false;
    let loading = false;
    let frame = 0;
    let previous = 0;
    let seconds = 0;
    let api: Renderer | null = null;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; };
    const tick = (time: number) => {
      frame = 0;
      if (disposed || failed || pausedRef.current || !visible || document.hidden || !api) return;
      if (!pausedRef.current) seconds += previous ? Math.min((time - previous) / 1000, .1) : 0;
      previous = time;
      try { if (!pausedRef.current) api.render(seconds); }
      catch { fail(); return; }
      frame = requestAnimationFrame(tick);
    };
    const start = () => { if (api && !pausedRef.current && visible && !document.hidden && !frame && !failed && !disposed) frame = requestAnimationFrame(tick); };
    playbackRef.current = () => { if (pausedRef.current) stop(); else start(); };
    const fail = () => { failed = true; stop(); setReady(false); apiRef.current = null; api?.dispose(); api = null; };
    const load = async () => {
      if (api || loading || failed || disposed) return;
      loading = true;
      try {
        const { createBrandGlobeRenderer } = await import('../platform/SocialMediaEngine/Visualization/BrandGlobeRenderer');
        if (disposed) return;
        const result = await createBrandGlobeRenderer(canvas);
        if (disposed || failed) { result.dispose(); return; }
        api = result;
        apiRef.current = result;
        result.resize();
        setReady(true);
        start();
      } catch { if (!disposed) fail(); }
      finally { loading = false; }
    };
    const onVisibility = () => { if (document.hidden) stop(); else start(); };
    const onLost = (event: Event) => { event.preventDefault(); fail(); };
    const resize = () => { try { api?.resize(); } catch { fail(); } };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      visible = Boolean(entries[0]?.isIntersecting);
      if (visible) { void load(); start(); } else stop();
    });
    observer?.observe(canvas);
    if (!observer) { visible = true; void load(); }
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);
    if (!resizeObserver) window.addEventListener('resize', resize);
    canvas.addEventListener('webglcontextlost', onLost);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      stop();
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost);
      document.removeEventListener('visibilitychange', onVisibility);
      api?.dispose();
      apiRef.current = null;
      playbackRef.current = () => {};
      setReady(false);
    };
  }, [reducedMotion]);

  return <div className="brand-globe-art" aria-hidden="true" data-globe-state={ready ? '3d' : 'poster'}>
    <img src={BRAND_GLOBE.asset} alt="" width={1254} height={1254} fetchPriority="high" decoding="async"
      className="brand-globe-poster" style={{ opacity: ready ? 0 : 1 }} />
    <canvas ref={canvasRef} className="brand-globe-canvas" style={{ opacity: ready ? 1 : 0 }} />
  </div>;
});
