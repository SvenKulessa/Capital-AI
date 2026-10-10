import { useEffect, useRef, useState } from 'react';
import {
  Clock, Color, DirectionalLight, Group, HemisphereLight,
  PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer,
} from 'three';

type JaJa3DAvatarProps = { azimuth: number };
type RenderState = 'loading' | 'ready' | 'failed';
const MODEL_URL = '/assets/jaja-figure.glb';

/**
 * Read-only, first-party WebGL avatar. Lazy loaded by HeroBuddy.
 * Canvas intentionally ignores pointer events: the existing semantic
 * chat button owns drag/keyboard interaction and all accessible labels.
 */
export default function JaJa3DAvatar({ azimuth }: JaJa3DAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(azimuth);
  const [state, setState] = useState<RenderState>('loading');
  const [imageFailed, setImageFailed] = useState(false);
  angleRef.current = azimuth;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frameId: number | null = null;
    let visible = true;
    let model: Group | null = null;
    let renderer: WebGLRenderer;
    const clock = new Clock();
    const scene = new Scene();
    const camera = new PerspectiveCamera(36, 1, .1, 30);
    camera.position.set(0, 1.45, 6.1);
    camera.lookAt(0, 1.45, 0);

    const resize = () => {
      if (!renderer) return;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const stop = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    };
    const animate = () => {
      frameId = null;
      if (disposed || !visible || document.hidden || !model) return;
      const t = clock.getElapsedTime();
      model.rotation.y = angleRef.current * Math.PI / 180 + Math.sin(t * .65) * .07;
      model.position.y = Math.sin(t * 1.6) * .035;
      const head = model.getObjectByName('JaJaHeadPivot');
      if (head) {
        head.rotation.z = Math.sin(t * .8) * .045;
        head.rotation.x = Math.sin(t * 1.1) * .045;
      }
      const arm = model.getObjectByName('JaJaArmRightPivot');
      if (arm) arm.rotation.z = Math.sin(t * 1.9) * .17 - .12;
      const leftEar = model.getObjectByName('JaJaEarLeft');
      const rightEar = model.getObjectByName('JaJaEarRight');
      if (leftEar) leftEar.rotation.z = Math.sin(t * 1.2) * .07;
      if (rightEar) rightEar.rotation.z = -Math.sin(t * 1.2 + .4) * .07;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    const start = () => {
      if (!disposed && visible && !document.hidden && model && frameId === null) {
        frameId = requestAnimationFrame(animate);
      }
    };
    const onVisibilityChange = () => { if (document.hidden) stop(); else start(); };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
      if (!disposed) setState('failed');
    };

    try {
      renderer = new WebGLRenderer({
        canvas, alpha: true, antialias: false, powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(new Color(0x000000), 0);
      renderer.outputColorSpace = SRGBColorSpace;
      scene.add(new HemisphereLight(0xffe9c9, 0x513527, 2));
      const light = new DirectionalLight(0xffffff, 2);
      light.position.set(-3, 5, 6);
      scene.add(light);
      resize();
    } catch {
      setState('failed');
      return;
    }
    canvas.addEventListener('webglcontextlost', onContextLost);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(canvas);
    if (!observer) window.addEventListener('resize', resize);
    const visibility = typeof IntersectionObserver === 'undefined' ? null
      : new IntersectionObserver(entries => {
          visible = Boolean(entries[0]?.isIntersecting);
          if (visible) start(); else stop();
        }, { threshold: .01 });
    visibility?.observe(canvas);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Keep the optional general-purpose GLTF loader out of the Three.js core chunk.
    // The existing Vite 500 kB budget applies to each emitted JS chunk.
    void import('three/addons/loaders/GLTFLoader.js')
      .then(({ GLTFLoader }) => new GLTFLoader().loadAsync(MODEL_URL))
      .then(gltf => {
      if (disposed) return;
      model = gltf.scene;
      scene.add(model);
      resize();
      setState('ready');
      start();
    }).catch(() => { if (!disposed) setState('failed'); });

    return () => {
      disposed = true;
      stop();
      visibility?.disconnect();
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      model?.traverse(child => {
        if (!('isMesh' in child) || !child.isMesh) return;
        // Each material/geometry is shared across mesh nodes in the GLB.
        const mesh = child as import('three').Mesh;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => material.dispose());
      });
      renderer.dispose();
    };
  }, []);

  return (
    <span className="relative block h-full w-full" aria-hidden="true">
      <img
        src="/assets/jaja-avatar-transparent.webp"
        alt=""
        draggable={false}
        onError={() => setImageFailed(true)}
        className={'absolute inset-0 h-full w-full object-contain transition-opacity ' +
          (state === 'ready' ? 'opacity-0' : 'opacity-100')}
      />
      {imageFailed && state !== 'ready' && (
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-amber-300/10 text-2xl font-bold text-amber-300">
          JaJa
        </span>
      )}
      <canvas
        ref={canvasRef}
        role="presentation"
        className={'absolute inset-0 h-full w-full pointer-events-none transition-opacity ' +
          (state === 'ready' ? 'opacity-100' : 'opacity-0')}
      />
    </span>
  );
}
