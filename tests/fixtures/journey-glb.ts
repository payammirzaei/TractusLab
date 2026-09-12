import * as THREE from "three";

// A small, embedded GLB exercises the real loader without Blender or remote fixtures.
export function journeyGlb(names: string[] = ["Artifact_Source"]): ArrayBuffer {
  const geometry = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const positions = geometry.getAttribute("position").array as Float32Array;
  const normals = geometry.getAttribute("normal").array as Float32Array;
  const binary = Buffer.concat([
    Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength),
    Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength),
  ]);
  const document = {
    asset: { version: "2.0", generator: "Journey test fixture" },
    scene: 0,
    scenes: [{ nodes: names.map((_, index) => index) }],
    nodes: names.map(name => ({ name, mesh: 0 })),
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, .15, .25, 1], metallicFactor: .2, roughnessFactor: .5 } }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
      { buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", min: [-.5, -.5, -.5], max: [.5, .5, .5] },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" },
    ],
  };
  const json = Buffer.from(JSON.stringify(document));
  const paddedJson = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(paddedJson);
  const buffer = Buffer.alloc(12 + 8 + paddedJson.length + 8 + binary.length);
  buffer.writeUInt32LE(0x46546c67, 0);
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(buffer.length, 8);
  buffer.writeUInt32LE(paddedJson.length, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  paddedJson.copy(buffer, 20);
  const offset = 20 + paddedJson.length;
  buffer.writeUInt32LE(binary.length, offset);
  buffer.writeUInt32LE(0x004e4942, offset + 4);
  binary.copy(buffer, offset + 8);
  geometry.dispose();
  return Uint8Array.from(buffer).buffer;
}
