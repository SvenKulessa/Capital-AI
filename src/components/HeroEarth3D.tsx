import { useEffect, useRef } from 'react';
import { CanvasTexture } from 'three/src/textures/CanvasTexture.js';
import { Color } from 'three/src/math/Color.js';
import { DirectionalLight } from 'three/src/lights/DirectionalLight.js';
import { Group } from 'three/src/objects/Group.js';
import { HemisphereLight } from 'three/src/lights/HemisphereLight.js';
import { Mesh } from 'three/src/objects/Mesh.js';
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial.js';
import { MeshLambertMaterial } from 'three/src/materials/MeshLambertMaterial.js';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js';
import { Scene } from 'three/src/scenes/Scene.js';
import { SphereGeometry } from 'three/src/geometries/SphereGeometry.js';
import { SRGBColorSpace } from 'three/src/constants.js';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer.js';

type GeoPoint = readonly [longitude: number, latitude: number];
type HeroEarth3DProps = { onReadyChange: (ready: boolean) => void };

const REVOLUTION_SECONDS = 90;
const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 512;

// Hand-authored, deliberately stylized continent silhouettes (not licensed
// map data). The canvas is an equirectangular color texture on an actual sphere.
const LAND: GeoPoint[][] = [
  [[-168, 65], [-153, 70], [-140, 69], [-129, 73], [-116, 69], [-105, 66], [-91, 72],
    [-80, 62], [-63, 60], [-53, 50], [-67, 45], [-74, 43], [-79, 32], [-87, 28],
    [-96, 16], [-104, 19], [-111, 29], [-117, 32], [-126, 40], [-138, 56]],
  [[-83, 13], [-71, 12], [-61, 10], [-52, 4], [-46, -1], [-35, -8], [-39, -18],
    [-45, -23], [-50, -31], [-59, -39], [-69, -54], [-75, -45], [-76, -29], [-81, -12]],
  [[-12, 36], [-10, 44], [-23, 60], [-12, 70], [8, 71], [26, 68], [35, 61],
    [52, 58], [64, 67], [93, 74], [111, 68], [138, 60], [164, 61], [171, 53],
    [150, 47], [142, 36], [132, 31], [123, 22], [112, 16], [107, 4], [101, 1],
    [98, 18], [89, 23], [80, 10], [74, 8], [68, 24], [58, 27], [48, 29],
    [41, 40], [33, 42], [25, 38], [16, 42], [6, 37], [-2, 36]],
  [[-17, 36], [0, 38], [11, 36], [26, 31], [34, 30], [43, 15], [51, 12],
    [47, -10], [41, -17], [35, -25], [19, -35], [12, -27], [9, -14],
    [2, -5], [-7, 5], [-16, 19]],
  [[112, -12], [123, -13], [138, -11], [148, -19], [153, -29], [144, -39],
    [130, -36], [116, -29], [112, -22]],
  [[-60, 59], [-48, 60], [-36, 66], [-20, 80], [-40, 84], [-51, 78], [-62, 72]],
  [[44, -13], [51, -16], [49, -25], [46, -26], [43, -19]],
  [[95, 20], [104, 21], [109, 12], [119, 4], [123, -6], [111, -8], [108, 0]],
  [[130, 33], [136, 37], [142, 43], [146, 39], [141, 35]],
  [[-179, -69], [-148, -71], [-110, -72], [-72, -71], [-28, -74],
    [18, -72], [69, -74], [114, -71], [152, -74], [179, -69], [179, -90], [-179, -90]],
];

const BEACONS: GeoPoint[] = [
  [10, 51], [-74, 41], [31, 30], [78, 22], [121, 31], [139, 36],
];

function pointOnSphere([longitude, latitude]: GeoPoint, radius: number) {
  const phi = (longitude + 180) * Math.PI / 180;
  const lat = latitude * Math.PI / 180;
  return {
    x: -Math.cos(phi) * Math.cos(lat) * radius,
    y: Math.sin(lat) * radius,
    z: Math.sin(phi) * Math.cos(lat) * radius,
  };
}

function createEarthTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('EARTH_TEXTURE_CANVAS_UNAVAILABLE');

  const ocean = ctx.createLinearGradient(0, 0, 0, TEXTURE_HEIGHT);
  ocean.addColorStop(0, '#0b223a');
  ocean.addColorStop(.5, '#06192d');
  ocean.addColorStop(1, '#020d1c');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  const xy = ([lon, lat]: GeoPoint) => ({
    x: (lon + 180) / 360 * TEXTURE_WIDTH,
    y: (90 - lat) / 180 * TEXTURE_HEIGHT,
  });
  ctx.strokeStyle = 'rgba(76, 207, 234, 0.20)';
  ctx.lineWidth = .75;
  for (let lon = -160; lon <= 160; lon += 20) {
    const x = xy([lon, 0]).x;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TEXTURE_HEIGHT);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 20) {
    const y = xy([0, lat]).y;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TEXTURE_WIDTH, y);
    ctx.stroke();
  }

  for (const polygon of LAND) {
    ctx.beginPath();
    polygon.forEach((geo, i) => {
      const { x, y } = xy(geo);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#12506b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 70, 0.86)';
    ctx.lineWidth = 1.7;
    ctx.shadowColor = 'rgba(251, 191, 70, 0.70)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  for (const [lon, lat] of BEACONS) {
    const { x, y } = xy([lon, lat]);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 17);
    halo.addColorStop(0, 'rgba(255, 232, 171, 0.95)');
    halo.addColorStop(.22, 'rgba(251, 191, 70, 0.70)');
    halo.addColorStop(1, 'rgba(251, 191, 70, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 17, y - 17, 34, 34);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * A real, axial 3D Earth: geographic texture is wrapped onto SphereGeometry,
 * longitude rotates through the limb, and the beacon meshes rotate with it.
 * Static original imagery is retained by Hero while WebGL loads or fails.
 */
export default function HeroEarth3D({ onReadyChange }: HeroEarth3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer | null = null;
    let frame: number | null = null;
    let disposed = false;
    let contextLost = false;
    let intersecting = true;
    let elapsed = 0;
    let previousTime: number | null = null;
    const scene = new Scene();
    const camera = new PerspectiveCamera(39, 1, .1, 30);
    camera.position.set(0, 0, 3.25);
    camera.lookAt(0, 0, 0);
    const earth = new Group();
    earth.rotation.z = -23.4 * Math.PI / 180;
    earth.rotation.y = -Math.PI / 2;
    const beaconMaterials: MeshBasicMaterial[] = [];
    let texture: CanvasTexture | null = null;
    let surface: SphereGeometry | null = null;
    let surfaceMaterial: MeshLambertMaterial | null = null;
    let beaconGeometry: SphereGeometry | null = null;

    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
    };
    const animate = (time: number) => {
      frame = null;
      if (disposed || contextLost || !intersecting || document.hidden || !renderer) return;
      const delta = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, .06);
      previousTime = time;
      elapsed += delta;
      earth.rotation.y += delta * (Math.PI * 2 / REVOLUTION_SECONDS);
      beaconMaterials.forEach((material, index) => {
        material.opacity = .52 + .44 * (.5 + .5 * Math.sin(elapsed * 2.3 + index * 1.1));
      });
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    const start = () => {
      if (!disposed && !contextLost && intersecting && !document.hidden && renderer && frame === null) {
        previousTime = null;
        frame = requestAnimationFrame(animate);
      }
    };
    const resize = () => {
      if (!renderer) return;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const onVisibility = () => { if (document.hidden) stop(); else start(); };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      stop();
      onReadyChange(false);
    };

    try {
      renderer = new WebGLRenderer({
        canvas, alpha: true, antialias: true, powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(new Color(0x000000), 0);
      renderer.outputColorSpace = SRGBColorSpace;

      texture = createEarthTexture();
      surface = new SphereGeometry(1, 56, 40);
      surfaceMaterial = new MeshLambertMaterial({
        map: texture, color: 0xe4f6ff, emissive: new Color(0x153651),
        emissiveIntensity: .35,
      });
      earth.add(new Mesh(surface, surfaceMaterial));
      beaconGeometry = new SphereGeometry(.019, 10, 8);
      BEACONS.forEach((location, index) => {
        const material = new MeshBasicMaterial({
          color: index % 3 === 0 ? 0xffd276 : 0x64ecff,
          transparent: true, opacity: .9, depthWrite: false,
        });
        beaconMaterials.push(material);
        const beacon = new Mesh(beaconGeometry!, material);
        const position = pointOnSphere(location, 1.028);
        beacon.position.set(position.x, position.y, position.z);
        earth.add(beacon);
      });
      scene.add(earth);
      scene.add(new HemisphereLight(0x9ddaff, 0x020715, 1.3));
      const sunlight = new DirectionalLight(0xffdcb0, 2.4);
      sunlight.position.set(-3, 3, 5);
      scene.add(sunlight);
      resize();
      renderer.render(scene, camera);
    } catch {
      renderer?.dispose();
      texture?.dispose();
      surface?.dispose();
      surfaceMaterial?.dispose();
      beaconGeometry?.dispose();
      beaconMaterials.forEach(material => material.dispose());
      onReadyChange(false);
      return;
    }

    canvas.addEventListener('webglcontextlost', onContextLost);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);
    if (!resizeObserver) window.addEventListener('resize', resize);
    const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null
      : new IntersectionObserver(entries => {
        intersecting = Boolean(entries[0]?.isIntersecting);
        if (intersecting) start(); else stop();
      }, { threshold: .01 });
    intersectionObserver?.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    onReadyChange(true);
    start();

    return () => {
      disposed = true;
      stop();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', resize);
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      texture?.dispose();
      surface?.dispose();
      surfaceMaterial?.dispose();
      beaconGeometry?.dispose();
      beaconMaterials.forEach(material => material.dispose());
      renderer?.dispose();
      onReadyChange(false);
    };
  }, [onReadyChange]);

  return <canvas ref={canvasRef} role="presentation" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
