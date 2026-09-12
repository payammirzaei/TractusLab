import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { attachJourneyAssetPack, disposeJourneyAssetPack, JOURNEY_ASSETS, JOURNEY_ASSET_URL, loadJourneyAssets, type JourneyAssetBinding } from "../components/journey/journey-assets";
import { journeyGlb } from "./fixtures/journey-glb";

test("shipped Blender pack loads all thirteen slots within its geometry budget", async () => {
  const bytes = fs.readFileSync(new URL(`../public${JOURNEY_ASSET_URL}`, import.meta.url));
  assert.ok(bytes.length < 5 * 1024 * 1024);
  const pack = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, "");
  const bindings = (Object.keys(JOURNEY_ASSETS) as JourneyAssetBinding["id"][]).map(id => slot(id));
  const mounted = attachJourneyAssetPack(pack.scene, bindings);
  assert.equal(mounted.count, 13);
  let triangles = 0, primitives = 0;
  pack.scene.traverse(object => {
    if (object instanceof THREE.Mesh) {
      triangles += (object.geometry.index?.count ?? object.geometry.getAttribute("position").count) / 3;
      primitives++;
    }
  });
  assert.ok(triangles <= 80000);
  assert.ok(primitives <= 128);
  mounted.dispose();
  disposeJourneyAssetPack(pack.scenes);
});

function slot(id: JourneyAssetBinding["id"] = "source") {
  const parent = new THREE.Group();
  const fallback = [new THREE.Object3D()];
  parent.add(...fallback);
  return { id, parent, fallback };
}

test("real GLB parsing replaces only present slots and preserves the animation parent", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(journeyGlb()));
  const source = slot();
  const offer = slot("offer");
  source.parent.position.set(4, 2, 1);
  source.parent.visible = false;
  const assets = loadJourneyAssets([source, offer]);
  assert.equal(await assets.ready, 1);
  assert.equal(source.fallback[0].visible, false);
  assert.equal(offer.fallback[0].visible, true);
  assert.deepEqual(source.parent.position.toArray(), [4, 2, 1]);
  assert.equal(source.parent.visible, false);
  assert.ok(source.parent.getObjectByName("GLB_Artifact_Source"));
  assets.dispose();
  assets.dispose();
  assert.equal(source.parent.children.length, 1);
  assert.equal(source.fallback[0].visible, true);
});

test("fitting centers geometry, keeps proportions and stays inside each slot", () => {
  const root = new THREE.Group();
  const source = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 1), new THREE.MeshStandardMaterial());
  source.name = "Artifact_Source";
  source.geometry.translate(10, 6, -2);
  source.position.set(500, 30, 0);
  root.add(source);
  const binding = slot();
  const mounted = attachJourneyAssetPack(root, [binding]);
  const model = binding.parent.getObjectByName("GLB_Artifact_Source")!;
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(bounds.getCenter(new THREE.Vector3()).length() < 1e-6);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x / size.y - 2) < 1e-6);
  size.toArray().forEach((extent, axis) => assert.ok(extent <= JOURNEY_ASSETS.source.size[axis] + 1e-6));
  assert.equal(source.position.x, 500);
  mounted.dispose();
  disposeJourneyAssetPack([root]);
});

test("empty, ambiguous and rigged objects retain fallback; valid siblings still load", () => {
  const root = new THREE.Group();
  const empty = new THREE.Group(); empty.name = "Artifact_Source";
  const rig = new THREE.SkinnedMesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); rig.name = "Artifact_Trust";
  const offer = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); offer.name = "Artifact_Offer";
  const duplicate = offer.clone(); duplicate.name = "Artifact_Usage";
  root.add(empty, rig, offer, duplicate, duplicate.clone());
  const bindings = [slot(), slot("trust"), slot("offer"), slot("usage")];
  const mounted = attachJourneyAssetPack(root, bindings);
  assert.equal(mounted.count, 1);
  assert.deepEqual(bindings.map(binding => binding.fallback[0].visible), [true, true, false, true]);
  mounted.dispose();
  disposeJourneyAssetPack([root]);
});

test("shared resources, material arrays and textures are disposed once", t => {
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial();
  const texture = new THREE.Texture();
  material.map = texture;
  material.emissiveMap = texture;
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, [material, material]);
  root.add(mesh, mesh.clone());
  const disposeGeo = t.mock.method(geometry, "dispose");
  const disposeMat = t.mock.method(material, "dispose");
  const disposeTex = t.mock.method(texture, "dispose");
  disposeJourneyAssetPack([root, root]);
  assert.equal(disposeGeo.mock.callCount(), 1);
  assert.equal(disposeMat.mock.callCount(), 1);
  assert.equal(disposeTex.mock.callCount(), 1);
});

test("missing, malformed and failed downloads never hide procedural meshes", async t => {
  for (const response of [new Response(null, { status: 404 }), new Response("not a glb"), null]) {
    const fetchMock = t.mock.method(globalThis, "fetch", async () => {
      if (!response) throw new TypeError("Network unavailable");
      return response;
    });
    const binding = slot();
    const assets = loadJourneyAssets([binding]);
    assert.equal(await assets.ready, 0);
    assert.equal(binding.fallback[0].visible, true);
    assets.dispose();
    fetchMock.mock.restore();
  }
});

test("disposing during parsing discards and disposes the late result", async t => {
  const pack = await new GLTFLoader().parseAsync(journeyGlb(), "");
  const mesh = pack.scene.getObjectByName("Artifact_Source") as THREE.Mesh;
  const geometryDispose = t.mock.method(mesh.geometry, "dispose");
  let finish!: (value: typeof pack) => void;
  let started!: () => void;
  const parsing = new Promise<void>(resolve => { started = resolve; });
  t.mock.method(globalThis, "fetch", async () => new Response(journeyGlb()));
  t.mock.method(GLTFLoader.prototype, "parseAsync", () => {
    started();
    return new Promise<typeof pack>(resolve => { finish = resolve; });
  });
  const binding = slot();
  const assets = loadJourneyAssets([binding]);
  await parsing;
  assets.dispose();
  finish(pack);
  assert.equal(await assets.ready, 0);
  assert.equal(binding.parent.children.length, 1);
  assert.equal(binding.fallback[0].visible, true);
  assert.equal(geometryDispose.mock.callCount(), 1);
});

test("disposing while fetching aborts the request", async t => {
  let signal: AbortSignal | undefined;
  t.mock.method(globalThis, "fetch", (_url: string, init: RequestInit) => {
    signal = init.signal!;
    return new Promise<Response>((_resolve, reject) => signal!.addEventListener("abort", () => reject(new Error("Aborted"))));
  });
  const binding = slot();
  const assets = loadJourneyAssets([binding]);
  assets.dispose();
  assert.equal(signal?.aborted, true);
  assert.equal(await assets.ready, 0);
  assert.equal(binding.fallback[0].visible, true);
});
