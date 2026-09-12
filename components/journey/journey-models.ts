import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { disposeJourneyAssetPack, type JourneyAssetBinding } from "./journey-assets";

/** The author's individual, self-contained models in public/glb. */
export const JOURNEY_MODELS = {
  providerSystem: { file: "Company_A", size: [1.65, 1.65, 1.4] },
  consumerSystem: { file: "Company_B", size: [1.65, 1.65, 1.4] },
  providerEdc: { file: "Provider_EDC", size: [1.85, 2.75, 1.5] },
  consumerEdc: { file: "Consumer_EDC", size: [1.85, 2.75, 1.5] },
  source: { file: "Source", size: [1.6, 1.55, 1.25] },
  offer: { file: "Catalogue_Offer", size: [1.7, 1.55, 1.25] },
  dsp: { file: "DSP_Message", size: [1.75, 1.4, 1.25] },
  trust: { file: "Identity", size: [1.55, 1.65, 1.2] },
  usage: { file: "Usage_Policy", size: [1.7, 1.55, 1.25] },
  agreement: { file: "Agreement", size: [1.65, 1.65, 1.25] },
  edr: { file: "Access_Key_EDR", size: [1.75, 1.4, 1.25] },
  payload: { file: "Payload", size: [1.35, 1.65, 1.25] },
  copy: { file: "Delivered_Copy", size: [1.5, 1.65, 1.25] },
} as const;

type ModelId = keyof typeof JOURNEY_MODELS;
type MotionPart = { object: THREE.Object3D; base: THREE.Vector3; rotation: THREE.Euler; kind: "fan" | "knob"; index: number };

/** Bake static geometry by material; retain authored moving parts and transparent surfaces. */
export function prepareJourneyModel(root: THREE.Group, id: ModelId) {
  const contract = JOURNEY_MODELS[id];
  const source = root.getObjectByName(`TL_ROOT_${contract.file}`);
  if (!source) throw new Error(`Missing model root: ${contract.file}`);
  const model = new THREE.Group();
  model.name = `Model_${contract.file}`;
  const batches = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
  const moving: MotionPart[] = [];
  const ownedMaterials = new Map<THREE.Material, THREE.Material>();
  const control: THREE.MeshStandardMaterial[] = [], data: THREE.MeshStandardMaterial[] = [];
  source.updateWorldMatrix(true, true);
  const inverse = source.matrixWorld.clone().invert();
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object instanceof THREE.SkinnedMesh || object.morphTargetInfluences?.length || Array.isArray(object.material)) {
      throw new Error("Journey models require static, single-material primitives");
    }
    const original = object.material as THREE.Material;
    const material: THREE.Material = ownedMaterials.get(original) ?? original.clone();
    if (!ownedMaterials.has(original)) {
      ownedMaterials.set(original, material);
      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMapIntensity = .65;
        material.emissiveIntensity = Math.min(material.emissiveIntensity, 1.1);
        if (material.name === "TL_MAT_Control") control.push(material);
        if (material.name === "TL_MAT_Data") data.push(material);
      }
    }
    const transform = inverse.clone().multiply(object.matrixWorld);
    const isFan = /Fan[LR]_Blade_/.test(object.name);
    const isKnob = /Knob(?:Bolt)?_/.test(object.name);
    if (isFan || isKnob || material.transparent || object.geometry.groups.length > 1) {
      const mesh = new THREE.Mesh(object.geometry.clone(), material);
      mesh.name = object.name;
      transform.decompose(mesh.position, mesh.quaternion, mesh.scale);
      model.add(mesh);
      if (isFan || isKnob) moving.push({ object: mesh, base: mesh.position.clone(), rotation: mesh.rotation.clone(), kind: isFan ? "fan" : "knob", index: Number(object.name.split("_").at(-1)) });
      return;
    }
    const geometry = object.geometry.clone().applyMatrix4(transform);
    // Attributes differ between bevels, text and primitive meshes. Only merge compatible sets.
    const signature = `${material.uuid}:${!!geometry.index}:${Object.keys(geometry.attributes).sort().join(",")}`;
    const batch = batches.get(signature) ?? { material, geometries: [] as THREE.BufferGeometry[] };
    batch.geometries.push(geometry); batches.set(signature, batch);
  });
  batches.forEach(({ material, geometries }) => {
    const merged = mergeGeometries(geometries);
    if (merged) { model.add(new THREE.Mesh(merged, material)); geometries.forEach(geometry => geometry.dispose()); }
    else geometries.forEach(geometry => model.add(new THREE.Mesh(geometry, material)));
  });
  const bounds = new THREE.Box3().setFromObject(model);
  const extent = bounds.getSize(new THREE.Vector3());
  if (bounds.isEmpty() || !extent.toArray().every(Number.isFinite)) { disposeJourneyAssetPack([model]); throw new Error("Empty model"); }
  const scale = Math.min(...contract.size.map((limit, axis) => limit / Math.max(1e-6, extent.getComponent(axis))));
  const content = new THREE.Group();
  content.add(model);
  model.position.sub(bounds.getCenter(new THREE.Vector3()));
  content.scale.setScalar(scale);
  return {
    group: content,
    animate(time: number, active: boolean, dataActive = false, fraction = 0, failed = false) {
      control.forEach(material => { material.emissiveIntensity = active && !dataActive ? 1.65 : .32; });
      data.forEach(material => { material.emissiveIntensity = active && dataActive ? 1.8 : .3; });
      moving.forEach(part => {
        part.object.rotation.copy(part.rotation);
        part.object.position.copy(part.base);
        if (part.kind === "fan") part.object.rotation.z += time * (active ? 2.4 : .8);
        else if (active) part.object.position.y += Math.sin(part.index * 2.1 + fraction * Math.PI * 2) * (failed ? .15 : .07);
      });
    },
    dispose() { content.removeFromParent(); disposeJourneyAssetPack([content]); },
  };
}

/** Three downloads at a time. Each failed model retains its own procedural fallback. */
export function loadJourneyModels(bindings: JourneyAssetBinding[], onProgress?: (loaded: number, settled: number) => void) {
  const abort = new AbortController();
  const mounted = new Map<ModelId, { model: ReturnType<typeof prepareJourneyModel>; originals: { object: THREE.Object3D; visible: boolean }[] }>();
  const queue = [...bindings];
  let settled = 0;
  const worker = async () => {
    while (queue.length && !abort.signal.aborted) {
      const binding = queue.shift()!;
      let roots: THREE.Group[] = [];
      try {
        const response = await fetch(`/glb/${JOURNEY_MODELS[binding.id].file}.glb`, { signal: abort.signal });
        if (!response.ok) throw new Error("Model unavailable");
        const buffer = await response.arrayBuffer();
        if (abort.signal.aborted) return;
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(url => { if (/^(blob:|data:)/.test(url)) return url; throw new Error("Models must embed resources"); });
        const pack = await new GLTFLoader(manager).parseAsync(buffer, "");
        roots = pack.scenes;
        if (abort.signal.aborted) return;
        const model = prepareJourneyModel(pack.scene, binding.id);
        const originals = binding.fallback.map(object => ({ object, visible: object.visible }));
        binding.parent.add(model.group);
        originals.forEach(({ object }) => { object.visible = false; });
        mounted.set(binding.id, { model, originals });
      } catch {
        // The scene and its controls remain usable with partial or missing assets.
      } finally {
        disposeJourneyAssetPack(roots);
        settled++;
        if (!abort.signal.aborted) onProgress?.(mounted.size, settled);
      }
    }
  };
  const ready = Promise.all([worker(), worker(), worker()]).then(() => mounted.size);
  return {
    ready,
    animate(id: ModelId, time: number, active: boolean, dataActive = false, fraction = 0, failed = false) {
      mounted.get(id)?.model.animate(time, active, dataActive, fraction, failed);
    },
    dispose() {
      abort.abort();
      mounted.forEach(({ model, originals }) => { model.dispose(); originals.forEach(({ object, visible }) => { object.visible = visible; }); });
      mounted.clear();
    },
  };
}
