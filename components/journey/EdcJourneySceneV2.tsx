"use client";

import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { chapters } from "@/lib/data-journey";
import { directJourneyScene, directorArtifactOwners, type DirectedArtifact, type SceneArtifact } from "@/lib/journey-director";
import { edcRouteForBeat, type EdcPoint, type EdcRoute } from "@/lib/journey-edc-topology";
import { sequenceFrame } from "@/lib/journey-sequence";
import SimpleJourneyScene from "./SimpleJourneyScene";
import { loadJourneyModels } from "./journey-models";
import { createJourneyStage } from "./journey-stage-effects";
import type { SceneProps } from "./journey-scene-types";
import ui from "./edc-scene.module.css";

const C = {
  provider: "#59edcf",
  consumer: "#aaa4ff",
  control: "#63bfff",
  data: "#55efc8",
  agreement: "#f5d786",
  usage: "#ffb567",
  tractus: "#79d7ff",
} as const;

type Artifact = { group: THREE.Group; meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] };
type Connector = {
  group: THREE.Group;
  spine: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  frame: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  control: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  data: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  controlHalo: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  dataHalo: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
};
type World = {
  group: THREE.Group;
  core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  shell: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
};

const ease = (v: number) => {
  const n = THREE.MathUtils.clamp(v, 0, 1);
  return n * n * (3 - 2 * n);
};

function toneColor(tone: DirectedArtifact["tone"]) {
  return C[tone];
}

function TopologyHeader({ rail, chapter }: { rail?: { labels: string[]; active: number }; chapter: number }) {
  const accent = chapter === 5 ? C.agreement : chapter === 6 ? C.data : C.control;
  if (!rail) return null;
  return (
    <div className={ui.topologyHeader}>
      <div className={ui.rail} style={{ "--rail-accent": accent } as CSSProperties}>
        {rail.labels.map((label, index) => (
          <div key={label} className={ui.railStep} data-state={index === rail.active ? "active" : index < rail.active ? "done" : "future"}>
            <i />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActorStrip({ chapter, onSelect, labelRefs }: {
  chapter: number;
  onSelect: SceneProps["onSelect"];
  labelRefs: MutableRefObject<Partial<Record<"provider-system" | "provider-edc" | "consumer-edc" | "consumer-system", HTMLElement | null>>>;
}) {
  const providerActive = chapter >= 1 && chapter <= 6;
  const consumerActive = chapter >= 2 && chapter <= 6;
  return (
    <div className={ui.actorStrip}>
      <button type="button" ref={node => { labelRefs.current["provider-system"] = node; }} onClick={() => onSelect("provider")} className={`${ui.actor} ${ui.businessActor}`} data-active={chapter <= 1}>
        <strong>Company A</strong><span>Source owner</span>
      </button>
      <button type="button" ref={node => { labelRefs.current["provider-edc"] = node; }} onClick={() => onSelect("provider")} className={`${ui.actor} ${ui.edcActor}`} data-active={providerActive}>
        <strong>Provider EDC</strong><small>Control · Data</small>
      </button>
      <button type="button" ref={node => { labelRefs.current["consumer-edc"] = node; }} onClick={() => onSelect("consumer")} className={`${ui.actor} ${ui.edcActor}`} data-active={consumerActive}>
        <strong>Consumer EDC</strong><small>Control · Data</small>
      </button>
      <button type="button" ref={node => { labelRefs.current["consumer-system"] = node; }} onClick={() => onSelect("consumer")} className={`${ui.actor} ${ui.businessActor}`} data-active={chapter === 4 || chapter === 7}>
        <strong>Company B</strong><span>Requester</span>
      </button>
    </div>
  );
}

/** Place beats are already covered by the signal readout — only show plaques for exchange artifacts. */
const HERO_CALLOUT_IDS = new Set<SceneArtifact>(["offer", "trust", "usage", "agreement", "edr", "payload", "copy"]);

function HeroCallout({ item, onSelect, calloutRef }: { item?: DirectedArtifact; onSelect: SceneProps["onSelect"]; calloutRef: RefObject<HTMLButtonElement | null> }) {
  if (!item || !HERO_CALLOUT_IDS.has(item.id)) return null;
  const accent = toneColor(item.tone);
  const dock = item.id === "offer" || item.id === "trust" ? "left"
    : item.id === "copy" || item.id === "usage" ? "right"
    : "center";
  return (
    <button type="button" ref={calloutRef} className={ui.heroCallout} data-dock={dock} onClick={() => onSelect(directorArtifactOwners[item.id] ?? "agreement")} style={{ "--hero-accent": accent } as CSSProperties}>
      <small>ARTIFACT <i/> {item.id === "copy" ? "AT COMPANY B" : "IN THE EXCHANGE"}</small>
      <strong>{item.title}</strong>
      <span>{item.detail}</span>
    </button>
  );
}

function PlaneLegend({ chapter, lane }: { chapter: number; lane: "none" | "control" | "data" }) {
  if (chapter < 2) return null;
  return (
    <div className={ui.planeLegend}>
      <span data-active={lane === "control"}><i/>Control plane</span>
      <span data-active={lane === "data"}><i/>Data plane</span>
    </div>
  );
}

function PayloadState({ chapter, routeMode, delivered }: { chapter: number; routeMode: EdcRoute["mode"]; delivered: boolean }) {
  // Idle “not moved” badges only train people to ignore status — show from transfer onward.
  if (chapter < 6) return null;
  const moving = routeMode === "payload";
  return (
    <div className={ui.payloadState} data-state={delivered || chapter === 7 ? "done" : moving ? "moving" : "idle"}>
      {delivered || chapter === 7 ? "COPY DELIVERED" : moving ? "PAYLOAD MOVING" : "AWAITING DATA PLANE"}
    </div>
  );
}

export default function EdcJourneySceneV2(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  const labelRefs = useRef<Partial<Record<"provider-system" | "provider-edc" | "consumer-edc" | "consumer-system", HTMLElement | null>>>({});
  const calloutRef = useRef<HTMLButtonElement | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState({ loaded: 0, settled: 0 });
  const [showLookHint, setShowLookHint] = useState(true);

  const frame = sequenceFrame(props.chapter, props.progress, props.fault);
  const directed = directJourneyScene(props.chapter, frame.current.id, frame.current.kind);
  const route = edcRouteForBeat(props.chapter, frame.current.id, frame.current.kind);
  const hero = directed.artifacts.find(item => item.emphasis === "hero") ?? directed.artifacts[0];

  useEffect(() => {
    if (props.reduced) return;
    const timer = window.setTimeout(() => setShowLookHint(false), 4200);
    return () => window.clearTimeout(timer);
  }, [props.reduced, props.chapter]);

  useEffect(() => {
    const element = host.current;
    if (!element || unavailable) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setUnavailable(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.05 : 1.35));
    renderer.setClearColor(0x02060b, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute("aria-hidden", "true");
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", transform: "none" });
    element.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060d18, .035);
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    const pointer = new THREE.Vector2();
    const lookAt = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const sample = new THREE.Vector3();
    const project = new THREE.Vector3();
    const orbitOffset = new THREE.Vector3();
    const spherical = new THREE.Spherical();
    const routePoints: THREE.Vector3[] = [];
    const routeCurve = new THREE.CatmullRomCurve3([], false, "centripetal");
    const orbit = { yaw: 0, pitch: 0, zoom: 0, smoothYaw: 0, smoothPitch: 0, smoothZoom: 0, dragging: false, lastX: 0, lastY: 0 };

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const geo = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
    const mat = <T extends THREE.Material>(m: T) => { materials.add(m); return m; };
    const pbr = (color: THREE.ColorRepresentation, emissive = .3, opacity = 1) => mat(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: .3, metalness: .44, transparent: opacity < 1, opacity, depthWrite: opacity > .3 }));
    const lineMat = (color: THREE.ColorRepresentation, opacity = .18) => mat(new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, .04);
    room.dispose(); pmrem.dispose(); scene.environment = env.texture;
    scene.add(new THREE.HemisphereLight(0xc5e8ff, 0x13243c, 1.2));
    const key = new THREE.DirectionalLight(0xe5f8ff, 1.8); key.position.set(-4, 7, 8);
    const rim = new THREE.DirectionalLight(0xb9afff, 1.2); rim.position.set(6, 3, -2);
    const activeLight = new THREE.PointLight(0x63bfff, 0, 7, 2); scene.add(key, rim, activeLight);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), .12, .22, 1.22));
    composer.addPass(new OutputPass());
    const stage = createJourneyStage(scene);

    function createWorld(color: string): World {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(.28, 2)), pbr(color, .5));
      const shell = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(.78, 2)), mat(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .065, depthWrite: false })));
      group.add(core, shell); scene.add(group); return { group, core, shell };
    }

    function createConnector(sideColor: string): Connector {
      const group = new THREE.Group();
      const frame = new THREE.Mesh(geo(new THREE.BoxGeometry(1.18, 2.18, .58)), mat(new THREE.MeshBasicMaterial({ color: C.tractus, wireframe: true, transparent: true, opacity: .25, depthWrite: false })));
      const control = new THREE.Mesh(geo(new THREE.BoxGeometry(.82, .5, .64)), pbr(C.control, .62)); control.position.y = .5;
      const data = new THREE.Mesh(geo(new THREE.BoxGeometry(.82, .5, .64)), pbr(C.data, .34)); data.position.y = -.5;
      const spine = new THREE.Mesh(geo(new THREE.BoxGeometry(.075, 1.72, .66)), pbr(sideColor, .6)); spine.position.x = -.48;
      const controlHalo = new THREE.Mesh(geo(new THREE.TorusGeometry(.48, .012, 6, 56)), mat(new THREE.MeshBasicMaterial({ color: C.control, transparent: true, opacity: .12, depthWrite: false }))); controlHalo.position.y = .5; controlHalo.rotation.x = Math.PI / 2;
      const dataHalo = new THREE.Mesh(geo(new THREE.TorusGeometry(.48, .012, 6, 56)), mat(new THREE.MeshBasicMaterial({ color: C.data, transparent: true, opacity: .08, depthWrite: false }))); dataHalo.position.y = -.5; dataHalo.rotation.x = Math.PI / 2;
      group.add(frame, control, data, spine, controlHalo, dataHalo); scene.add(group);
      return { group, frame, spine, control, data, controlHalo, dataHalo };
    }

    function gem(shape: THREE.BufferGeometry, color: string): Artifact {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geo(shape), pbr(color, 1.05));
      group.add(core); scene.add(group); return { group, meshes: [core] };
    }

    function offerArtifact(): Artifact {
      const group = new THREE.Group(); const meshes: Artifact["meshes"] = [];
      [-.055, 0, .055].forEach((z, i) => {
        const mesh = new THREE.Mesh(geo(new THREE.BoxGeometry(.52 - i * .035, .31 - i * .02, .05)), pbr(C.control, i === 0 ? 1 : .28, i === 0 ? 1 : .7));
        mesh.position.set(-i * .03, i * .028, z); group.add(mesh); meshes.push(mesh);
      });
      scene.add(group); return { group, meshes };
    }

    function agreementArtifact(): Artifact {
      const group = new THREE.Group();
      const left = new THREE.Mesh(geo(new THREE.TorusGeometry(.28, .05, 9, 60)), pbr(C.agreement, 1.2)); left.rotation.x = Math.PI / 2;
      const right = new THREE.Mesh(geo(new THREE.TorusGeometry(.28, .05, 9, 60)), pbr(C.agreement, 1.2)); right.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      const core = new THREE.Mesh(geo(new THREE.OctahedronGeometry(.14, 1)), pbr(C.agreement, 1.5));
      group.add(left, right, core); scene.add(group); return { group, meshes: [left, right, core] };
    }

    function edrArtifact(): Artifact {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(.16, .038, 8, 36)), pbr(C.control, 1.25));
      const bar = new THREE.Mesh(geo(new THREE.BoxGeometry(.32, .06, .06)), pbr(C.control, 1.25)); bar.position.x = .25;
      const tooth = new THREE.Mesh(geo(new THREE.BoxGeometry(.07, .1, .06)), pbr(C.control, 1.25)); tooth.position.set(.39, -.055, 0);
      group.add(ring, bar, tooth); scene.add(group); return { group, meshes: [ring, bar, tooth] };
    }

    const providerSystem = createWorld(C.provider);
    const consumerSystem = createWorld(C.consumer);
    const providerEdc = createConnector(C.provider);
    const consumerEdc = createConnector(C.consumer);
    const artifacts: Record<SceneArtifact, Artifact> = {
      source: gem(new THREE.OctahedronGeometry(.19, 1), C.provider),
      offer: offerArtifact(),
      dsp: gem(new THREE.TorusGeometry(.2, .038, 8, 36), C.control),
      trust: gem(new THREE.OctahedronGeometry(.2, 1), C.control),
      usage: gem(new THREE.TetrahedronGeometry(.23, 1), C.usage),
      agreement: agreementArtifact(),
      edr: edrArtifact(),
      payload: gem(new THREE.CapsuleGeometry(.14, .27, 5, 10), C.data),
      copy: gem(new THREE.CapsuleGeometry(.14, .27, 5, 10), C.data),
    };

    const assets = loadJourneyModels([
      { id: "providerSystem", parent: providerSystem.group, fallback: [providerSystem.core, providerSystem.shell] },
      { id: "consumerSystem", parent: consumerSystem.group, fallback: [consumerSystem.core, consumerSystem.shell] },
      { id: "providerEdc", parent: providerEdc.group, fallback: [providerEdc.frame, providerEdc.spine, providerEdc.control, providerEdc.data] },
      { id: "consumerEdc", parent: consumerEdc.group, fallback: [consumerEdc.frame, consumerEdc.spine, consumerEdc.control, consumerEdc.data] },
      ...(Object.keys(artifacts) as SceneArtifact[]).map(id => ({ id, parent: artifacts[id].group, fallback: artifacts[id].meshes })),
    ], (loaded, settled) => setLoading({ loaded, settled }));

    const positions: Record<EdcPoint, THREE.Vector3> = {
      "provider-system": new THREE.Vector3(-5.05, -.3, -.6),
      "provider-source": new THREE.Vector3(-5.05, -.4, .8),
      "provider-control": new THREE.Vector3(-2.5, .65, .55),
      "provider-data": new THREE.Vector3(-2.5, -.65, .55),
      "consumer-control": new THREE.Vector3(2.5, .65, .55),
      "consumer-data": new THREE.Vector3(2.5, -.65, .55),
      "consumer-system": new THREE.Vector3(5.05, -.3, -.6),
    };

    const homes: Record<SceneArtifact, THREE.Vector3> = {
      source: new THREE.Vector3(-5.05, .15, 1.35),
      offer: new THREE.Vector3(-2.5, -.05, 1.45),
      dsp: new THREE.Vector3(0, .35, 1.35),
      trust: new THREE.Vector3(-2.5, .15, 1.35),
      usage: new THREE.Vector3(2.5, .15, 1.35),
      agreement: new THREE.Vector3(0, .95, .85),
      edr: new THREE.Vector3(2.5, .2, 1.35),
      payload: new THREE.Vector3(0, -.25, 1.2),
      copy: new THREE.Vector3(5.05, .15, 1.35),
    };

    const labelAnchors: Record<"provider-system" | "provider-edc" | "consumer-edc" | "consumer-system", THREE.Vector3> = {
      "provider-system": new THREE.Vector3(-5.05, 1.35, -.6),
      "provider-edc": new THREE.Vector3(-2.5, 1.55, -.3),
      "consumer-edc": new THREE.Vector3(2.5, 1.55, -.3),
      "consumer-system": new THREE.Vector3(5.05, 1.35, -.6),
    };

    providerSystem.group.position.copy(positions["provider-system"]);
    consumerSystem.group.position.copy(positions["consumer-system"]);
    providerEdc.group.position.set(-2.5, .05, -.3);
    consumerEdc.group.position.set(2.5, .05, -.3);
    providerSystem.group.scale.setScalar(1.18);
    consumerSystem.group.scale.setScalar(1.18);
    providerEdc.group.scale.setScalar(1.12);
    consumerEdc.group.scale.setScalar(1.12);
    Object.keys(artifacts).forEach(id => artifacts[id as SceneArtifact].group.position.copy(homes[id as SceneArtifact]));

    function makeLane(color: string, y: number) {
      const g = geo(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.5, y, .52), new THREE.Vector3(2.5, y, .52)]));
      const line = new THREE.Line(g, lineMat(color, .16)); scene.add(line); return line;
    }
    const controlLane = makeLane(C.control, .65);
    const dataLane = makeLane(C.data, -.65);
    const providerLocal = new THREE.Line(geo(new THREE.BufferGeometry().setFromPoints([positions["provider-system"], providerEdc.group.position])), lineMat(C.provider, .08));
    const consumerLocal = new THREE.Line(geo(new THREE.BufferGeometry().setFromPoints([consumerEdc.group.position, positions["consumer-system"]])), lineMat(C.consumer, .08));
    scene.add(providerLocal, consumerLocal);

    const routeGeo = geo(new THREE.BufferGeometry());
    routeGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Array(120 * 3).fill(0), 3));
    const routeLine = new THREE.Line(routeGeo, lineMat(C.control, .6)); routeLine.frustumCulled = false; scene.add(routeLine);
    const token = new THREE.Mesh(geo(new THREE.OctahedronGeometry(.1, 1)), pbr(C.control, 1.45)); scene.add(token);

    let width = 1, height = 1, baseDistance = 13.5;

    function syncCamera() {
      const aspect = Math.max(.7, camera.aspect || 1);
      const halfW = 5.7;
      const halfH = 2.15;
      const fov = 38 * Math.PI / 180;
      // Closer framing so the four actors fill the stage instead of floating in empty dark space.
      baseDistance = Math.max(halfH / Math.tan(fov / 2), halfW / (Math.tan(fov / 2) * aspect)) + .55;
      camTarget.set(0, 2.05, baseDistance);
      lookTarget.set(0, .05, .35);
      if (!orbit.dragging && Math.abs(orbit.yaw) < .001 && Math.abs(orbit.pitch) < .001 && Math.abs(orbit.zoom) < .001) {
        camera.position.copy(camTarget);
        lookAt.copy(lookTarget);
      }
    }

    function aimCamera(cue: ReturnType<typeof directJourneyScene>["camera"], parallaxX: number, parallaxY: number, breathe: number, reduced: boolean) {
      // Keep the corridor readable: tiny actor bias only, never hide the opposite EDC.
      const x = cue === "provider" ? -.35 : cue === "consumer" ? .35 : 0;
      const y = cue === "data" ? 1.85 : cue === "control" || cue === "center" ? 2.2 : 2.05;
      const z = baseDistance - breathe;
      const lookX = cue === "provider" ? -.7 : cue === "consumer" ? .7 : 0;
      const lookY = cue === "data" ? -.2 : cue === "control" || cue === "center" ? .25 : .05;
      lookTarget.set(lookX + parallaxX * .02, lookY + parallaxY * .015, cue === "data" ? .4 : .35);

      // Constrained orbit around the teaching look-point so learners can peek inside the stage.
      const ease = orbit.dragging ? .42 : .14;
      orbit.smoothYaw = THREE.MathUtils.lerp(orbit.smoothYaw, reduced ? 0 : orbit.yaw, ease);
      orbit.smoothPitch = THREE.MathUtils.lerp(orbit.smoothPitch, reduced ? 0 : orbit.pitch, ease);
      orbit.smoothZoom = THREE.MathUtils.lerp(orbit.smoothZoom, reduced ? 0 : orbit.zoom, ease);

      orbitOffset.set(x + parallaxX * .04 - lookTarget.x, y + parallaxY * .05 - lookTarget.y, z - lookTarget.z);
      spherical.setFromVector3(orbitOffset);
      spherical.theta += orbit.smoothYaw;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + orbit.smoothPitch, .42, Math.PI / 2 - .05);
      spherical.radius = THREE.MathUtils.clamp(spherical.radius + orbit.smoothZoom, baseDistance * .72, baseDistance * 1.28);
      camTarget.copy(lookTarget).add(orbitOffset.setFromSpherical(spherical));

      camera.position.lerp(camTarget, orbit.dragging ? .28 : .14);
      lookAt.lerp(lookTarget, .16);
      camera.lookAt(lookAt);
    }

    function placeLabel(id: keyof typeof labelAnchors, world: THREE.Vector3, slot: number) {
      const el = labelRefs.current[id];
      if (!el) return;
      project.copy(world).project(camera);
      if (project.z > 1) { el.style.opacity = "0"; return; }
      // Prefer even spacing so labels stay readable above each actor.
      const rawX = (project.x * .5 + .5) * width;
      const ideal = (0.125 + slot * 0.25) * width;
      const x = THREE.MathUtils.clamp(THREE.MathUtils.lerp(rawX, ideal, .55), 54, width - 54);
      const y = width < 720 ? 64 : 52;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = "translate(-50%,0)";
      el.style.opacity = "1";
    }

    function placeCallout(artifactId?: SceneArtifact) {
      const el = calloutRef.current;
      if (!el) return;
      if (!artifactId) { el.style.opacity = "0"; return; }
      // Dock outside the model corridor so the 3D actors stay visible.
      el.style.top = "auto";
      el.style.bottom = "14px";
      el.style.opacity = "1";
      const leftDock = artifactId === "source" || artifactId === "offer" || artifactId === "trust";
      const rightDock = artifactId === "copy" || artifactId === "usage";
      if (leftDock) {
        el.style.left = "16px";
        el.style.right = "auto";
        el.style.transform = "none";
      } else if (rightDock) {
        el.style.left = "auto";
        el.style.right = "16px";
        el.style.transform = "none";
      } else {
        el.style.left = "50%";
        el.style.right = "auto";
        el.style.transform = "translateX(-50%)";
      }
    }

    function buildRoute(r: EdcRoute) {
      routePoints.length = 0;
      r.points.forEach(point => routePoints.push(positions[point].clone()));
      if (routePoints.length < 2) { routeLine.visible = false; return; }
      routeCurve.points = routePoints;
      const attr = routeGeo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < 120; i++) {
        const u = i / 119;
        if (routePoints.length > 2) routeCurve.getPoint(u, sample);
        else {
          sample.lerpVectors(routePoints[0], routePoints[1], u);
          sample.z += Math.sin(Math.PI * u) * (r.mode === "control" ? .3 : r.mode === "data" ? .16 : .08);
        }
        attr.setXYZ(i, sample.x, sample.y, sample.z);
      }
      attr.needsUpdate = true;
      routeLine.visible = true;
    }

    function pointOnRoute(r: EdcRoute, u: number, out: THREE.Vector3) {
      if (routePoints.length < 2) return out.set(0, 0, 0);
      if (routePoints.length > 2) return routeCurve.getPoint(u, out);
      out.lerpVectors(routePoints[0], routePoints[1], u);
      out.z += Math.sin(Math.PI * u) * (r.mode === "control" ? .3 : r.mode === "data" ? .16 : .08);
      return out;
    }

    const resize = new ResizeObserver(() => {
      width = Math.max(1, element.clientWidth); height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height); composer.setSize(width, height);
      camera.aspect = width / height; camera.updateProjectionMatrix(); syncCamera();
    });
    resize.observe(element);

    const isUiTarget = (target: EventTarget | null) => target instanceof Element && !!target.closest("button,a,input,select,label");

    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
      if (!orbit.dragging) return;
      const dx = event.clientX - orbit.lastX;
      const dy = event.clientY - orbit.lastY;
      orbit.lastX = event.clientX;
      orbit.lastY = event.clientY;
      orbit.yaw = THREE.MathUtils.clamp(orbit.yaw - dx * .0048, -.62, .62);
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + dy * .0036, -.28, .34);
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || isUiTarget(event.target) || live.current.reduced) return;
      orbit.dragging = true;
      orbit.lastX = event.clientX;
      orbit.lastY = event.clientY;
      element.dataset.dragging = "true";
      setShowLookHint(false);
      element.setPointerCapture(event.pointerId);
    };
    const up = (event: PointerEvent) => {
      if (!orbit.dragging) return;
      orbit.dragging = false;
      delete element.dataset.dragging;
      try { element.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    };
    const leave = () => {
      pointer.set(0, 0);
      if (orbit.dragging) {
        orbit.dragging = false;
        delete element.dataset.dragging;
      }
    };
    const wheel = (event: WheelEvent) => {
      if (live.current.reduced || isUiTarget(event.target)) return;
      event.preventDefault();
      orbit.zoom = THREE.MathUtils.clamp(orbit.zoom + event.deltaY * .0022, -2.1, 2.4);
    };
    const dblclick = (event: MouseEvent) => {
      if (isUiTarget(event.target)) return;
      orbit.yaw = 0;
      orbit.pitch = 0;
      orbit.zoom = 0;
    };
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("dblclick", dblclick);

    let raf = 0, last = 0, disposed = false;
    function render(now: number) {
      if (disposed) return;
      raf = requestAnimationFrame(render);
      if (document.hidden) return;
      const p = live.current;
      const mobile = width < 720;
      const minGap = p.paused || p.reduced ? 100 : mobile ? 1000 / 30 : 1000 / 45;
      if (now - last < minGap) return;
      last = now;

      const seq = sequenceFrame(p.chapter, p.progress, p.fault);
      const current = seq.current;
      const d = directJourneyScene(p.chapter, current.id, current.kind);
      const r = edcRouteForBeat(p.chapter, current.id, current.kind);
      const t = p.reduced ? 0 : seq.position * chapters[p.chapter].duration;
      const parallax = mobile || p.reduced || orbit.dragging ? 0 : .55;
      const breathe = p.reduced ? 0 : Math.sin(seq.position * Math.PI) * .12;

      aimCamera(d.camera, pointer.x * parallax, pointer.y * parallax, breathe, p.reduced);

      const providerBusiness = p.chapter <= 1 || current.id === "read-source" || current.id === "payload";
      const consumerBusiness = p.chapter === 4 || p.chapter === 7 || current.id === "payload";
      providerSystem.core.material.emissiveIntensity = providerBusiness ? 1.15 : .12;
      providerSystem.shell.material.opacity = providerBusiness ? .14 : .02;
      consumerSystem.core.material.emissiveIntensity = consumerBusiness ? 1.15 : .12;
      consumerSystem.shell.material.opacity = consumerBusiness ? .14 : .02;
      providerSystem.group.scale.setScalar(providerBusiness ? 1.22 : ((p.depth ?? "story") === "story" ? .92 : .78));
      consumerSystem.group.scale.setScalar(consumerBusiness ? 1.22 : ((p.depth ?? "story") === "story" ? .92 : .78));
      providerSystem.group.rotation.y = .24 + Math.sin(t * .05) * .025;
      consumerSystem.group.rotation.y = -.24 + Math.sin(t * .05 + 1) * .025;

      const dataActive = d.lane === "data" || r.mode === "data" || r.mode === "payload";
      const providerConnectorActive = p.chapter >= 1 && p.chapter <= 6;
      const consumerConnectorActive = p.chapter >= 2 && p.chapter <= 6;
      const depth = p.depth ?? "story";
      if (labelRefs.current["provider-system"]) labelRefs.current["provider-system"].dataset.lens = depth === "architect" || depth === "developer" ? "dim" : "show";
      if (labelRefs.current["consumer-system"]) labelRefs.current["consumer-system"].dataset.lens = depth === "architect" || depth === "developer" ? "dim" : "show";
      if (labelRefs.current["provider-edc"]) labelRefs.current["provider-edc"].dataset.lens = depth === "story" && !providerConnectorActive ? "dim" : "show";
      if (labelRefs.current["consumer-edc"]) labelRefs.current["consumer-edc"].dataset.lens = depth === "story" && !consumerConnectorActive ? "dim" : "show";
      assets.animate("providerEdc", t, providerConnectorActive, dataActive);
      assets.animate("consumerEdc", t, consumerConnectorActive, dataActive);
      [[providerEdc, providerConnectorActive], [consumerEdc, consumerConnectorActive]].forEach(([connectorRaw, activeRaw]) => {
        const connector = connectorRaw as Connector; const active = activeRaw as boolean;
        connector.frame.material.opacity = active ? .42 : .07;
        connector.control.material.emissiveIntensity = active && !dataActive ? 1.45 : .18;
        connector.data.material.emissiveIntensity = active && dataActive ? 1.5 : .16;
        connector.controlHalo.material.opacity = active && !dataActive ? .48 : .04;
        connector.dataHalo.material.opacity = active && dataActive ? .48 : .03;
        connector.group.rotation.y = (connector === providerEdc ? .12 : -.12) + Math.sin(t * .035) * .012;
        connector.group.scale.setScalar(active ? 1.14 : .88);
      });

      const visible = new Set(d.artifacts.filter(item => item.emphasis !== "context").map(item => item.id));
      const activeHero = d.artifacts.find(item => item.emphasis === "hero");
      (Object.keys(artifacts) as SceneArtifact[]).forEach(id => {
        const residue = (id === "agreement" && p.chapter >= 5) || (id === "offer" && p.chapter >= 1 && p.chapter <= 5) || (id === "copy" && p.chapter >= 7);
        artifacts[id].group.visible = visible.has(id) || residue;
        const isHero = activeHero?.id === id;
        artifacts[id].group.position.copy(homes[id]);
        const reveal = p.reduced || current.status !== "active" ? 1 : .9 + ease(current.fraction * 5) * .18;
        artifacts[id].group.scale.setScalar(isHero ? reveal * 1.45 : residue && !visible.has(id) ? .42 : .55);
        if (isHero && !p.reduced && !p.fault) artifacts[id].group.position.y += .08 + Math.sin(t * .8) * .03;
        assets.animate(id, t, isHero, dataActive, p.reduced ? 0 : current.fraction, !!p.fault);
      });

      if (p.chapter === 3 && current.id === "catalog-response" && visible.has("offer")) {
        artifacts.offer.group.position.lerpVectors(positions["provider-control"], positions["consumer-control"], ease(current.fraction));
        artifacts.offer.group.position.y += .35;
        artifacts.offer.group.scale.setScalar(.7);
      }
      if (p.chapter === 6 && current.id === "transfer-start" && visible.has("edr")) {
        artifacts.edr.group.position.lerpVectors(positions["provider-control"], positions["consumer-control"], ease(current.fraction));
        artifacts.edr.group.position.y += .35;
        artifacts.edr.group.position.z += Math.sin(Math.PI * ease(current.fraction)) * .3;
        artifacts.edr.group.scale.setScalar(.7);
      }

      buildRoute(r);
      routeLine.material.color.set(r.mode === "data" || r.mode === "payload" ? C.data : r.mode === "local" ? (p.chapter === 4 || p.chapter === 7 ? C.consumer : C.provider) : C.control);
      routeLine.material.opacity = p.fault ? .12 : r.mode === "payload" ? .62 : .32;
      token.visible = r.mode !== "none" && r.mode !== "payload" && current.status === "active" && !p.fault;
      if (token.visible) {
        pointOnRoute(r, ease(current.fraction), token.position);
        token.material.color.set(r.mode === "data" ? C.data : C.control);
        token.material.emissive.copy(token.material.color);
        token.material.emissiveIntensity = 1.55;
        token.rotation.set(t * .2, t * .34, .1);
      }
      if (r.mode === "payload" && visible.has("payload")) {
        pointOnRoute(r, ease(current.fraction), artifacts.payload.group.position);
        artifacts.payload.group.scale.setScalar(.6);
      }

      controlLane.visible = p.chapter >= 2 && p.chapter <= 6;
      dataLane.visible = p.chapter === 6;
      controlLane.material.opacity = dataActive ? .035 : .16;
      dataLane.material.opacity = dataActive ? .24 : .035;
      providerLocal.material.opacity = providerBusiness ? .2 : .05;
      consumerLocal.material.opacity = consumerBusiness ? .2 : .05;

      Object.values(artifacts).forEach(artifact => { artifact.group.rotation.y = .15 + Math.sin(t * .22) * .13; });

      if (activeHero) {
        activeLight.position.copy(artifacts[activeHero.id].group.position).add(new THREE.Vector3(0, .38, 1.6));
        activeLight.color.set(toneColor(activeHero.tone));
        activeLight.intensity = 3.5;
      } else activeLight.intensity = .35;

      placeLabel("provider-system", labelAnchors["provider-system"], 0);
      placeLabel("provider-edc", labelAnchors["provider-edc"], 1);
      placeLabel("consumer-edc", labelAnchors["consumer-edc"], 2);
      placeLabel("consumer-system", labelAnchors["consumer-system"], 3);
      placeCallout(activeHero && HERO_CALLOUT_IDS.has(activeHero.id) ? activeHero.id : undefined);

      stage.update({ time: t, fraction: ease(current.fraction), reduced: p.reduced, failed: !!p.fault, finished: seq.finished,
        color: activeHero ? toneColor(activeHero.tone) : C.control, hero: activeHero ? artifacts[activeHero.id].group : undefined,
        route: r.mode !== "none", destination: routePoints.at(-1), sample: (fraction, out) => pointOnRoute(r, fraction, out),
        provider: providerConnectorActive || providerBusiness, consumer: consumerConnectorActive || consumerBusiness, data: dataActive });

      if (!mobile && !p.reduced) composer.render(); else renderer.render(scene, camera);
    }

    syncCamera(); raf = requestAnimationFrame(render);
    const lost = (event: Event) => { event.preventDefault(); setUnavailable(true); cancelAnimationFrame(raf); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true; cancelAnimationFrame(raf); resize.disconnect();
      assets.dispose();
      stage.dispose();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("dblclick", dblclick);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      composer.passes.forEach(pass => pass.dispose()); composer.dispose(); env.dispose(); geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, [unavailable]);

  if (unavailable) return <SimpleJourneyScene {...props} />;

  return (
    <div
      ref={host}
      className={ui.scene}
      data-reduced={props.reduced}
      data-paused={props.paused}
      data-depth={props.depth ?? "story"}
      role="group"
      aria-label={`Tractus-X EDC mediated journey. ${chapters[props.chapter].title}. ${frame.current.title}. Drag to look around. Scroll to zoom. Double-click to reset.`}
    >
      <TopologyHeader rail={directed.rail} chapter={props.chapter} />
      <ActorStrip chapter={props.chapter} onSelect={props.onSelect} labelRefs={labelRefs} />
      <HeroCallout item={hero} onSelect={props.onSelect} calloutRef={calloutRef} />
      <PlaneLegend chapter={props.chapter} lane={directed.lane} />
      <PayloadState chapter={props.chapter} routeMode={route.mode} delivered={frame.copyDelivered} />
      {!props.reduced && showLookHint && <div className={ui.lookHint} aria-hidden="true">Drag to look · Scroll zoom · Double-click reset</div>}
      {loading.settled < 13 && <div className={ui.assetLoading} role="status"><i/>Loading scene</div>}
    </div>
  );
}
