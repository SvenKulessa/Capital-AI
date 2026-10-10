import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh,
  MeshLambertMaterial, SRGBColorSpace,
} from 'three';

const MODEL_URL = '/assets/jaja-figure.glb';
const MAX_GLB_BYTES = 256_000;
const MAX_NODES = 128;
const MAX_VERTICES = 10_000;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

type Accessor = { bufferView: number; componentType: number; count: number; type: string };
type View = { buffer: number; byteOffset: number; byteLength: number; byteStride?: number };
type FigureNode = {
  name?: string; mesh?: number; children?: number[];
  translation?: number[]; rotation?: number[]; scale?: number[];
};
type FigureMesh = { primitives: { attributes: { POSITION: number; NORMAL: number }; indices: number; material: number; mode: number }[] };
type FigureMaterial = {
  pbrMetallicRoughness: { baseColorFactor: number[]; metallicFactor: number; roughnessFactor: number };
};
type FigureDocument = {
  asset: { version: string }; buffers: { byteLength: number }[];
  bufferViews: View[]; accessors: Accessor[];
  materials: FigureMaterial[]; meshes: FigureMesh[]; nodes: FigureNode[];
  scene: number; scenes: { nodes: number[] }[];
};

function invariant(condition: unknown): asserts condition {
  if (!condition) throw new Error('Invalid first-party JaJa GLB');
}

function finiteVector(value: number[] | undefined, size: number, fallback: number[]) {
  if (value === undefined) return fallback;
  invariant(Array.isArray(value) && value.length === size &&
    value.every(item => Number.isFinite(item)));
  return value;
}

/** Strict, bounded subset of glTF 2.0 used by our offline generator.
 * No external URI, textures, extensions, compressed meshes, or untrusted uploads.
 */
function parseJaJaGLB(buffer: ArrayBuffer): Group {
  invariant(buffer.byteLength >= 28 && buffer.byteLength <= MAX_GLB_BYTES);
  const header = new DataView(buffer);
  invariant(header.getUint32(0, true) === 0x46546c67);
  invariant(header.getUint32(4, true) === 2);
  invariant(header.getUint32(8, true) === buffer.byteLength);
  const jsonLength = header.getUint32(12, true);
  invariant(header.getUint32(16, true) === JSON_CHUNK &&
    jsonLength > 0 && jsonLength < 64_000 &&
    20 + jsonLength + 8 <= buffer.byteLength);
  const binStart = 20 + jsonLength;
  const binLength = header.getUint32(binStart, true);
  invariant(header.getUint32(binStart + 4, true) === BIN_CHUNK &&
    binStart + 8 + binLength === buffer.byteLength);
  const json = new TextDecoder('utf-8', { fatal: true })
    .decode(new Uint8Array(buffer, 20, jsonLength));
  const model = JSON.parse(json) as FigureDocument;
  invariant(model.asset?.version === '2.0' && model.scene === 0);
  invariant(Array.isArray(model.buffers) && model.buffers.length === 1 &&
    model.buffers[0].byteLength <= binLength);
  invariant(Array.isArray(model.bufferViews) &&
    Array.isArray(model.accessors) &&
    Array.isArray(model.meshes) &&
    Array.isArray(model.materials) &&
    Array.isArray(model.nodes) &&
    model.nodes.length > 0 && model.nodes.length <= MAX_NODES &&
    model.meshes.length <= 16 &&
    model.materials.length <= 16 &&
    model.scenes?.length === 1);

  const getAttribute = (index: number, type: 'VEC3' | 'SCALAR', component: 5126 | 5123) => {
    const accessor = model.accessors[index];
    invariant(accessor && accessor.type === type &&
      accessor.componentType === component && Number.isInteger(accessor.count) &&
      accessor.count > 0 && accessor.count <= MAX_VERTICES * 6);
    const view = model.bufferViews[accessor.bufferView];
    const unit = component === 5126 ? 4 : 2;
    const itemSize = type === 'VEC3' ? 3 : 1;
    const bytes = accessor.count * itemSize * unit;
    invariant(view && view.buffer === 0 && view.byteStride === undefined &&
      Number.isInteger(view.byteOffset) && view.byteOffset >= 0 &&
      view.byteOffset % unit === 0 && Number.isInteger(view.byteLength) &&
      view.byteLength === bytes &&
      view.byteOffset + bytes <= model.buffers[0].byteLength);
    const offset = binStart + 8 + view.byteOffset;
    const values = component === 5126
      ? new Float32Array(buffer.slice(offset, offset + bytes))
      : new Uint16Array(buffer.slice(offset, offset + bytes));
    return new BufferAttribute(values, itemSize);
  };

  const materials = model.materials.map(def => {
    const pbr = def.pbrMetallicRoughness;
    invariant(pbr && Array.isArray(pbr.baseColorFactor) &&
      pbr.baseColorFactor.length === 4 &&
      pbr.baseColorFactor.every(x => Number.isFinite(x) && x >= 0 && x <= 1));
    // Low-poly, light-reactive material: omit full PBR shader dependency.
    return new MeshLambertMaterial({
      color: new Color().setRGB(pbr.baseColorFactor[0], pbr.baseColorFactor[1],
        pbr.baseColorFactor[2], SRGBColorSpace),
      side: DoubleSide,
    });
  });
  const geometries = new Map<string, BufferGeometry>();
  const meshes = model.meshes.map(def => {
    invariant(def.primitives?.length === 1);
    const primitive = def.primitives[0];
    invariant(primitive.mode === 4 &&
      Number.isInteger(primitive.material) &&
      primitive.material >= 0 && primitive.material < materials.length);
    const { POSITION, NORMAL } = primitive.attributes;
    const key = POSITION + ':' + NORMAL + ':' + primitive.indices;
    let geometry = geometries.get(key);
    if (!geometry) {
      const pos = getAttribute(POSITION, 'VEC3', 5126);
      const normal = getAttribute(NORMAL, 'VEC3', 5126);
      const idx = getAttribute(primitive.indices, 'SCALAR', 5123);
      invariant(pos.count === normal.count && pos.count <= MAX_VERTICES &&
        Array.from(idx.array).every(v => v < pos.count));
      geometry = new BufferGeometry();
      geometry.setAttribute('position', pos);
      geometry.setAttribute('normal', normal);
      geometry.setIndex(idx);
      geometries.set(key, geometry);
    }
    return { geometry, material: materials[primitive.material] };
  });

  const ancestor = new Set<number>();
  const seen = new Set<number>();
  const construct = (id: number): Group | Mesh => {
    invariant(Number.isInteger(id) && id >= 0 && id < model.nodes.length &&
      !ancestor.has(id) && !seen.has(id));
    seen.add(id);
    ancestor.add(id);
    const node = model.nodes[id];
    const mesh = node.mesh === undefined ? undefined : meshes[node.mesh];
    invariant(node.mesh === undefined || mesh !== undefined);
    const object = mesh ? new Mesh(mesh.geometry, mesh.material) : new Group();
    object.name = typeof node.name === 'string' ? node.name.slice(0, 80) : '';
    object.position.fromArray(finiteVector(node.translation, 3, [0, 0, 0]));
    object.quaternion.fromArray(finiteVector(node.rotation, 4, [0, 0, 0, 1]));
    object.scale.fromArray(finiteVector(node.scale, 3, [1, 1, 1]));
    invariant(!node.children || (Array.isArray(node.children) && node.children.length <= MAX_NODES));
    for (const child of node.children ?? []) object.add(construct(child));
    ancestor.delete(id);
    return object;
  };
  const root = new Group();
  root.name = 'JaJaFigure';
  invariant(model.scenes[0]?.nodes?.length === 1);
  for (const id of model.scenes[0].nodes) root.add(construct(id));
  return root;
}

export async function loadJaJaGLB(signal: AbortSignal): Promise<Group> {
  const response = await fetch(MODEL_URL, { signal, credentials: 'same-origin' });
  if (!response.ok) throw new Error('JaJa 3D asset unavailable');
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_GLB_BYTES) throw new Error('JaJa 3D asset too large');
  const buffer = await response.arrayBuffer();
  if (signal.aborted) throw new Error('JaJa 3D load aborted');
  return parseJaJaGLB(buffer);
}
