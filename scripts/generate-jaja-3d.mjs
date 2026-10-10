// Original CAPITAL-AI JaJa low-poly figure: reproducible, texture-free glTF 2.0.
// Generated locally at build time. No external model, voice, texture or inference.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MATERIALS = [
  ['skin', '#D99542'], ['skinLight', '#F1B969'], ['skinShade', '#AD6327'],
  ['eyeball', '#FFF2DA'], ['iris', '#59361E'], ['pupil', '#150F0C'],
  ['mouth', '#481F1A'], ['tongue', '#BE5D59'], ['vest', '#634629'],
  ['vestEdge', '#33271C'], ['cloth', '#765230'], ['highlight', '#FFD88C'],
];

function rgba(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1);
}
function sphere() {
  const positions = [], normals = [], indices = [];
  const slices = 24, stacks = 16;
  for (let row = 0; row <= stacks; row++) {
    const phi = Math.PI * row / stacks;
    for (let col = 0; col <= slices; col++) {
      const theta = Math.PI * 2 * col / slices;
      const xyz = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
      positions.push(...xyz);
      normals.push(...xyz);
    }
  }
  for (let row = 0; row < stacks; row++) for (let col = 0; col < slices; col++) {
    const a = row * (slices + 1) + col, b = a + slices + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { positions, normals, indices };
}

export function createJaJaGlb() {
  const geometry = sphere();
  const binaries = [], bufferViews = [], accessors = [];
  let length = 0;
  const append = (values, type, target) => {
    const data = type === 'float' ? Buffer.from(Float32Array.from(values).buffer)
      : Buffer.from(Uint16Array.from(values).buffer);
    const aligned = (length + 3) & ~3;
    if (aligned > length) binaries.push(Buffer.alloc(aligned - length));
    const index = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: aligned, byteLength: data.length, target });
    binaries.push(data);
    length = aligned + data.length;
    return index;
  };
  const posView = append(geometry.positions, 'float', 34962);
  const normView = append(geometry.normals, 'float', 34962);
  const idxView = append(geometry.indices, 'index', 34963);
  const accessor = (bufferView, componentType, count, type, extras = {}) => {
    const index = accessors.length;
    accessors.push({ bufferView, componentType, count, type, ...extras });
    return index;
  };
  const vertexCount = geometry.positions.length / 3;
  const p = accessor(posView, 5126, vertexCount, 'VEC3', { min: [-1, -1, -1], max: [1, 1, 1] });
  const n = accessor(normView, 5126, vertexCount, 'VEC3');
  const ix = accessor(idxView, 5123, geometry.indices.length, 'SCALAR');
  const materials = MATERIALS.map(([name, hex]) => ({
    name, pbrMetallicRoughness: { baseColorFactor: rgba(hex), metallicFactor: 0, roughnessFactor: 0.86 },
    doubleSided: true
  }));
  const meshes = materials.map((material, index) => ({
    name: 'JaJa-' + material.name,
    primitives: [{ attributes: { POSITION: p, NORMAL: n }, indices: ix, material: index, mode: 4 }],
  }));
  const nodes = [];
  const group = (parent, name, translation = [0, 0, 0]) => {
    const index = nodes.length;
    nodes.push({ name, translation, children: [] });
    if (parent !== null) nodes[parent].children.push(index);
    return index;
  };
  const part = (parent, name, mat, translation, scale, rotation) => {
    const index = nodes.length;
    const node = { name, mesh: mat, translation, scale };
    if (rotation) node.rotation = [0, 0, Math.sin(rotation / 2), Math.cos(rotation / 2)];
    nodes.push(node);
    nodes[parent].children.push(index);
    return index;
  };
  const root = group(null, 'JaJaRoot');
  const torso = group(root, 'JaJaBodyPivot', [0, 1.38, 0]);
  part(torso, 'Torso', 0, [0, 0, 0], [.33, .67, .24]);
  part(torso, 'Chest', 1, [0, .3, .16], [.24, .37, .12]);
  part(torso, 'VestLeft', 8, [-.27, .08, .08], [.145, .53, .235]);
  part(torso, 'VestRight', 8, [.27, .08, .08], [.145, .53, .235]);
  part(torso, 'VestTrimLeft', 9, [-.15, .18, .273], [.035, .47, .037]);
  part(torso, 'VestTrimRight', 9, [.15, .18, .273], [.035, .47, .037]);
  const head = group(torso, 'JaJaHeadPivot', [0, .86, 0]);
  part(head, 'Head', 0, [0, .16, .06], [.44, .43, .37]);
  part(head, 'Forehead', 1, [0, .40, .20], [.37, .23, .27]);
  part(head, 'LongNose', 0, [0, .00, .40], [.38, .21, .61]);
  part(head, 'NoseTip', 1, [0, -.02, .89], [.47, .18, .37]);
  part(head, 'MouthInterior', 6, [0, -.17, .72], [.365, .125, .19]);
  part(head, 'Tongue', 7, [0, -.23, .80], [.22, .036, .12]);
  part(head, 'LowerJaw', 2, [0, -.28, .64], [.35, .065, .28]);
  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    part(head, 'EyeSocket' + side, 2, [sign * .29, .37, .29], [.24, .23, .18]);
    part(head, 'JaJaEye' + side, 3, [sign * .29, .39, .43], [.17, .168, .148]);
    part(head, 'Iris' + side, 4, [sign * .28, .39, .563], [.082, .088, .038]);
    part(head, 'Pupil' + side, 5, [sign * .28, .39, .597], [.047, .060, .023]);
    part(head, 'EyeLight' + side, 11, [sign * .28 - .023, .429, .617], [.016, .02, .009]);
    const ear = group(head, 'JaJaEar' + side, [sign * .47, .26, -.06]);
    part(ear, 'EarLeaf' + side, 0, [sign * .145, -.39, .0], [.18, .49, .12], sign * -.15);
    part(ear, 'EarInset' + side, 2, [sign * .15, -.37, .105], [.105, .37, .032], sign * -.15);
  }
  const pelvis = group(root, 'JaJaHipPivot', [0, .95, 0]);
  part(pelvis, 'Hip', 10, [0, -.07, 0], [.34, .29, .23]);
  part(pelvis, 'SkirtFront', 10, [0, -.26, .15], [.31, .28, .095]);
  part(pelvis, 'Knot', 8, [0, -.03, .28], [.12, .12, .12]);
  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const arm = group(torso, 'JaJaArm' + side + 'Pivot', [sign * .40, .46, 0]);
    part(arm, 'UpperArm' + side, 0, [sign * .16, -.32, .02], [.14, .40, .15], sign * .30);
    part(arm, 'LowerArm' + side, 0, [sign * .25, -.73, .14], [.113, .37, .12], sign * -.18);
    part(arm, 'Hand' + side, 1, [sign * .30, -1.05, .20], [.14, .18, .12]);
    for (let digit = 0; digit < 3; digit++)
      part(arm, 'Finger' + side + digit, 0, [sign * (.20 + digit * .09), -1.20, .22], [.045, .11, .044]);
    const leg = group(pelvis, 'JaJaLeg' + side + 'Pivot', [sign * .20, -.21, 0]);
    part(leg, 'Thigh' + side, 0, [0, -.36, 0], [.21, .46, .20]);
    part(leg, 'Shin' + side, 0, [0, -.91, .035], [.145, .46, .15]);
    part(leg, 'Foot' + side, 1, [0, -1.28, .25], [.24, .12, .38]);
    for (let digit = 0; digit < 3; digit++)
      part(leg, 'Toe' + side + digit, 1, [(digit - 1) * .14, -1.30, .50], [.082, .085, .19]);
  }
  const bin = Buffer.concat(binaries);
  const document = {
    asset: { version: '2.0', generator: 'CAPITAL-AI first-party procedural JaJa v1' },
    scene: 0, scenes: [{ nodes: [root] }], nodes, meshes, materials,
    buffers: [{ byteLength: bin.length }], bufferViews, accessors
  };
  const jsonBytes = Buffer.from(JSON.stringify(document), 'utf8');
  const jsonPadding = (4 - jsonBytes.length % 4) % 4;
  const binPadding = (4 - bin.length % 4) % 4;
  const json = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 32)]);
  const data = Buffer.concat([bin, Buffer.alloc(binPadding)]);
  const header = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), binHeader = Buffer.alloc(8);
  header.write('glTF'); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + data.length, 8);
  jsonHeader.writeUInt32LE(json.length, 0); jsonHeader.writeUInt32LE(0x4E4F534A, 4);
  binHeader.writeUInt32LE(data.length, 0); binHeader.writeUInt32LE(0x004E4942, 4);
  return Buffer.concat([header, jsonHeader, json, binHeader, data]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = resolve('public/assets/jaja-figure.glb');
  mkdirSync(dirname(target), { recursive: true });
  const contents = createJaJaGlb();
  writeFileSync(target, contents);
  process.stdout.write('Generated JaJa first-party GLB: ' + contents.length + ' bytes\n');
}
