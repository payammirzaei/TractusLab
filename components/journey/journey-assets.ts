import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { SceneArtifact } from "../../lib/journey-director";

export const JOURNEY_ASSET_URL = "/models/journey/tractuslab/edc-journey.glb";

export const JOURNEY_ASSETS = {
  providerSystem: { node: "CompanyA_System", size: [.95, .95, .95] },
  consumerSystem: { node: "CompanyB_System", size: [.95, .95, .95] },
  providerEdc: { node: "ProviderEDC", size: [1.6, 2.25, 1.25] },
  consumerEdc: { node: "ConsumerEDC", size: [1.6, 2.25, 1.25] },
  source: { node: "Artifact_Source", size: [.6, .6, .6] },
  offer: { node: "Artifact_Offer", size: [.75, .65, .5] },
  dsp: { node: "Artifact_DSP", size: [.65, .5, .5] },
  trust: { node: "Artifact_Trust", size: [.6, .65, .4] },
  usage: { node: "Artifact_Usage", size: [.65, .65, .4] },
  agreement: { node: "Artifact_Agreement", size: [.7, .7, .5] },
  edr: { node: "Artifact_EDR", size: [.65, .55, .45] },
  payload: { node: "Artifact_Payload", size: [.45, .65, .45] },
  copy: { node: "Artifact_Copy", size: [.55, .65, .45] },
} as const satisfies Record<SceneArtifact | "providerSystem" | "consumerSystem" | "providerEdc" | "consumerEdc", {
  node: string;
  size: readonly [number, number, number];
}>;

export type JourneyAssetBinding = {
  id: keyof typeof JOURNEY_ASSETS;
  parent: THREE.Group;
  fallback: THREE.Object3D[];
};

// Clones share the pack's GPU resources. Dispose the pack once, after detaching all clones.
export function disposeJourneyAssetPack(roots: THREE.Object3D[]) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const bitmaps = new Set<ImageBitmap>();
  roots.forEach(root => root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
      materials.add(material);
      Object.values(material).forEach(value => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  }));
  textures.forEach(texture => {
    const images = Array.isArray(texture.source.data) ? texture.source.data : [texture.source.data];
    images.forEach(image => {
      if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) bitmaps.add(image);
    });
    texture.dispose();
  });
  bitmaps.forEach(bitmap => bitmap.close());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

function fitAsset(source: THREE.Object3D, size: readonly [number, number, number]) {
  let valid = true, meshCount = 0;
  source.traverse(object => {
    if (object instanceof THREE.Mesh) {
      meshCount++;
      if (object instanceof THREE.SkinnedMesh || object.morphTargetInfluences?.length) valid = false;
    } else if (!(object instanceof THREE.Group) && object.type !== "Object3D") valid = false;
  });
  if (!valid || !meshCount) return null;

  const model = source.clone(true);
  // Pack layout and parent transforms are irrelevant; each slot owns world placement.
  model.position.set(0, 0, 0);
  model.updateMatrix();
  const bounds = new THREE.Box3().setFromObject(model);
  const extent = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  if (bounds.isEmpty() || ![...extent, ...center].every(Number.isFinite) || extent.lengthSq() < 1e-12) return null;
  const scale = Math.min(...size.map((limit, axis) => extent.getComponent(axis) > 1e-6 ? limit / extent.getComponent(axis) : Infinity));
  const fitted = new THREE.Group();
  fitted.name = `GLB_${source.name}`;
  model.position.sub(center);
  model.updateMatrix();
  fitted.add(model);
  fitted.scale.setScalar(scale);
  return fitted;
}

export function attachJourneyAssetPack(root: THREE.Object3D, bindings: JourneyAssetBinding[]) {
  const mounted: {
    id: JourneyAssetBinding["id"];
    model: THREE.Group;
    originals: { object: THREE.Object3D; visible: boolean }[];
    control: THREE.MeshStandardMaterial[];
    data: THREE.MeshStandardMaterial[];
  }[] = [];
  for (const binding of bindings) {
    const contract = JOURNEY_ASSETS[binding.id];
    const matches: THREE.Object3D[] = [];
    root.traverse(object => { if (object.name === contract.node) matches.push(object); });
    if (matches.length !== 1) continue;
    const model = fitAsset(matches[0], contract.size);
    if (!model) continue;
    function markerMaterials(suffix: string) {
      const result: THREE.MeshStandardMaterial[] = [];
      model!.getObjectByName(`${contract.node}_${suffix}`)?.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const clone = (material: THREE.Material) => {
          if (!(material instanceof THREE.MeshStandardMaterial)) return material;
          const copy = material.clone();
          result.push(copy);
          return copy;
        };
        object.material = Array.isArray(object.material) ? object.material.map(clone) : clone(object.material);
      });
      return result;
    }
    const control = markerMaterials("ControlPlane");
    const data = markerMaterials("DataPlane");
    const originals = binding.fallback.map(object => ({ object, visible: object.visible }));
    binding.parent.add(model);
    originals.forEach(({ object }) => { object.visible = false; });
    mounted.push({ id: binding.id, model, originals, control, data });
  }
  return {
    count: mounted.length,
    setConnectorActivity(id: "providerEdc" | "consumerEdc", active: boolean, dataActive: boolean) {
      const connector = mounted.find(item => item.id === id);
      connector?.control.forEach(material => { material.emissiveIntensity = active && !dataActive ? 1.05 : .15; });
      connector?.data.forEach(material => { material.emissiveIntensity = active && dataActive ? 1.15 : .15; });
    },
    dispose() {
      mounted.forEach(({ model, originals, control, data }) => {
        model.removeFromParent();
        [...control, ...data].forEach(material => material.dispose());
        originals.forEach(({ object, visible }) => { object.visible = visible; });
      });
      mounted.length = 0;
    },
  };
}

export function loadJourneyAssets(bindings: JourneyAssetBinding[], url = JOURNEY_ASSET_URL) {
  const abort = new AbortController();
  let pack: GLTF | undefined;
  let mounted: ReturnType<typeof attachJourneyAssetPack> | undefined;

  const ready = (async () => {
    try {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) return 0;
      const buffer = await response.arrayBuffer();
      if (abort.signal.aborted) return 0;
      const manager = new THREE.LoadingManager();
      // The contract is self-contained: never fetch external textures, buffers or decoders.
      manager.setURLModifier(resource => {
        if (/^(blob:|data:)/.test(resource)) return resource;
        throw new Error("Journey GLB assets must embed their resources");
      });
      pack = await new GLTFLoader(manager).parseAsync(buffer, "");
      if (abort.signal.aborted) {
        disposeJourneyAssetPack(pack.scenes);
        pack = undefined;
        return 0;
      }
      mounted = attachJourneyAssetPack(pack.scene, bindings);
      return mounted.count;
    } catch {
      // An optional missing, invalid or unsupported pack leaves the procedural scene usable.
      if (pack) disposeJourneyAssetPack(pack.scenes);
      pack = undefined;
      return 0;
    }
  })();

  return {
    ready,
    setConnectorActivity(id: "providerEdc" | "consumerEdc", active: boolean, dataActive: boolean) {
      mounted?.setConnectorActivity(id, active, dataActive);
    },
    dispose() {
      abort.abort();
      mounted?.dispose();
      mounted = undefined;
      if (pack) disposeJourneyAssetPack(pack.scenes);
      pack = undefined;
    },
  };
}
