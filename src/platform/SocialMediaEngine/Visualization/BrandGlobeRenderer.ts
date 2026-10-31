import { Scene } from 'three/src/scenes/Scene.js';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer.js';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';
import { SphereGeometry } from 'three/src/geometries/SphereGeometry.js';
import { TorusGeometry } from 'three/src/geometries/TorusGeometry.js';
import { Mesh } from 'three/src/objects/Mesh.js';
import { Group } from 'three/src/objects/Group.js';
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial.js';
import { MeshPhongMaterial } from 'three/src/materials/MeshPhongMaterial.js';
import { DirectionalLight } from 'three/src/lights/DirectionalLight.js';
import { HemisphereLight } from 'three/src/lights/HemisphereLight.js';
import { SRGBColorSpace, AdditiveBlending } from 'three/src/constants.js';
import { BRAND_GLOBE, brandGlobePose } from './BrandGlobeSpec';

export function createBrandGlobeGeometry() {
  const geometry = new SphereGeometry(1, 80, 56);
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const p = BRAND_GLOBE.projection;
  for (let i = 0; i < positions.count; i++) {
    const facing = positions.getZ(i) < 0 ? -1 : 1;
    uv.setXY(i, (p.centerX + positions.getX(i) * facing * p.radius) / p.size,
      1 - (p.centerY - positions.getY(i) * p.radius) / p.size);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Actual sphere/orbit geometry. Deterministic frames can also be exported by
 * Content Studio. Texture comes exclusively from the local owner brand asset. */
export async function createBrandGlobeRenderer(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, .1, 20);
  camera.position.z = 4.8;
  const resources: Array<{ dispose: () => void }> = [];
  const own = <T extends { dispose: () => void }>(item: T): T => { resources.push(item); return item; };
  const dispose = () => { resources.forEach(item => item.dispose()); renderer.dispose(); };
  try {
    const texture = own(await new TextureLoader().loadAsync(BRAND_GLOBE.asset));
    texture.colorSpace = SRGBColorSpace;
    const geometry = own(createBrandGlobeGeometry());
    // Artwork already contains photographic shading; don't darken the logo.
    const earth = new Mesh(geometry, own(new MeshBasicMaterial({ map: texture })));
    scene.add(earth);
    const orbits = new Group();
    const satelliteGeometry = own(new SphereGeometry(.068, 20, 14));
    BRAND_GLOBE.orbitColors.forEach((color, index) => {
      const ring = new Group();
      ring.rotation.set(.85 + index * .24, index * .28, index * .51);
      const radius = 1.23 + index * .028;
      ring.add(new Mesh(own(new TorusGeometry(radius, .004, 6, 128)),
        own(new MeshBasicMaterial({ color, transparent: true, opacity: .9 }))));
      ring.add(new Mesh(own(new TorusGeometry(radius, .015, 6, 128)),
        own(new MeshBasicMaterial({ color, transparent: true, opacity: .12, blending: AdditiveBlending, depthWrite: false }))));
      const satellite = new Mesh(satelliteGeometry, own(new MeshPhongMaterial({
        color, emissive: color, emissiveIntensity: .18, shininess: 100, specular: 0xffffff,
      })));
      const phase = index * 1.05;
      satellite.position.set(Math.cos(phase) * radius, Math.sin(phase) * radius, 0);
      ring.add(satellite);
      orbits.add(ring);
    });
    scene.add(orbits);
    scene.add(new HemisphereLight(0xb8eaff, 0x121020, 2));
    const key = new DirectionalLight(0xffffff, 3);
    key.position.set(-2, 3, 5);
    scene.add(key);
    let lastTime = 0;
    const render = (seconds: number) => {
      const pose = brandGlobePose(seconds);
      lastTime = seconds;
      earth.rotation.set(0, pose.earthY, pose.tiltZ);
      orbits.rotation.y = pose.orbitY;
      renderer.render(scene, camera);
    };
    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render(lastTime);
    };
    return { render, resize, dispose,
      capturePNG: () => new Promise<Blob>((resolve, reject) => {
        render(lastTime);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Globe export failed')), 'image/png');
      }),
    };
  } catch (error) { dispose(); throw error; }
}
