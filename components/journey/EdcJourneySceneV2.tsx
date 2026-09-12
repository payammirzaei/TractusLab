"use client";

import { useEffect, useRef, useState } from "react";
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
  return (
    <div className={ui.topologyHeader}>
      <div className={ui.dataspaceTitle}>
        <strong>TRACTUS-X DATASPACE</strong>
        <span>Two companies. One governed exchange.</span>
      </div>
      {rail && (
        <div className={ui.rail} style={{ "--rail-accent": accent } as React.CSSProperties}>
          {rail.labels.map((label, index) => (
            <div key={label} className={ui.railStep} data-state={index === rail.active ? "active" : index < rail.active ? "done" : "future"}>
              <i />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActorStrip({ chapter, onSelect }: { chapter: number; onSelect: SceneProps["onSelect"] }) {
  const providerActive = chapter >= 1 && chapter <= 6;
  const consumerActive = chapter >= 2 && chapter <= 6;
  return (
    <div className={ui.actorStrip}>
      <button type="button" onClick={() => onSelect("provider")} className={`${ui.actor} ${ui.businessActor}`} data-active={chapter <= 1}>
        <strong>Company A</strong><span>Business systems</span>
      </button>
      <button type="button" onClick={() => onSelect("provider")} className={`${ui.actor} ${ui.edcActor}`} data-active={providerActive}>
        <span>TRACTUS-X EDC</span><strong>Provider EDC</strong><small>Control plane · Data plane</small>
      </button>
      <button type="button" onClick={() => onSelect("consumer")} className={`${ui.actor} ${ui.edcActor}`} data-active={consumerActive}>
        <span>TRACTUS-X EDC</span><strong>Consumer EDC</strong><small>Control plane · Data plane</small>
      </button>
      <button type="button" onClick={() => onSelect("consumer")} className={`${ui.actor} ${ui.businessActor}`} data-active={chapter === 4 || chapter === 7}>
        <strong>Company B</strong><span>Business systems</span>
      </button>
    </div>
  );
}

function HeroCallout({ item, onSelect }: { item?: DirectedArtifact; onSelect: SceneProps["onSelect"] }) {
  if (!item) return null;
  const accent = toneColor(item.tone);
  return (
    <button type="button" className={ui.heroCallout} onClick={() => onSelect(directorArtifactOwners[item.id] ?? "agreement")} style={{ "--hero-accent": accent } as React.CSSProperties}>
      <small>IN FOCUS <i/> {item.id === "source" ? "PRIVATE AT COMPANY A" : item.id === "copy" ? "RECEIVED AT COMPANY B" : "EXCHANGE ARTIFACT"}</small>
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
  const moving = routeMode === "payload";
  return (
    <div className={ui.payloadState} data-state={delivered || chapter === 7 ? "done" : moving ? "moving" : "idle"}>
      {delivered || chapter === 7 ? "COPY DELIVERED" : moving ? "PAYLOAD MOVING THROUGH EDC DATA PLANES" : "PAYLOAD NOT MOVED"}
    </div>
  );
}

export default function EdcJourneySceneV2(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState({ loaded: 0, settled: 0 });

  const frame = sequenceFrame(props.chapter, props.progress, props.fault);
  const directed = directJourneyScene(props.chapter, frame.current.id, frame.current.kind);
  const route = edcRouteForBeat(props.chapter, frame.current.id, frame.current.kind);
  const hero = directed.artifacts.find(item => item.emphasis === "hero") ?? directed.artifacts[0];

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
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.setAttribute("aria-hidden", "true");
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", transform: "none" });
    element.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060d18, .035);
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    const pointer = new THREE.Vector2();
    const lookAt = new THREE.Vector3();
    const sample = new THREE.Vector3();
    const routePoints: THREE.Vector3[] = [];
    const routeCurve = new THREE.CatmullRomCurve3([], false, "centripetal");

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
    scene.add(new THREE.HemisphereLight(0xc5e8ff, 0x13243c, 1.6));
    const key = new THREE.DirectionalLight(0xe5f8ff, 3.2); key.position.set(-4, 7, 8);
    const rim = new THREE.DirectionalLight(0xb9afff, 2.4); rim.position.set(6, 3, -2);
    const activeLight = new THREE.PointLight(0x63bfff, 0, 7, 2); scene.add(key, rim, activeLight);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), .32, .4, 1.15));
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
      source: new THREE.Vector3(-5.05, -.5, 1.1),
      offer: new THREE.Vector3(-3.5, .4, .7),
      dsp: new THREE.Vector3(0, .5, .64),
      trust: new THREE.Vector3(-1.25, .5, .62),
      usage: new THREE.Vector3(3.5, .4, .7),
      agreement: new THREE.Vector3(0, 1.4, -.6),
      edr: new THREE.Vector3(1.22, .72, .64),
      payload: new THREE.Vector3(2.65, -.58, .62),
      copy: new THREE.Vector3(5.05, -.5, 1.1),
    };

    providerSystem.group.position.copy(positions["provider-system"]);
    consumerSystem.group.position.copy(positions["consumer-system"]);
    providerEdc.group.position.set(-2.5, .05, -.3);
    consumerEdc.group.position.set(2.5, .05, -.3);
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
      const halfW = 6.4;
      const halfH = 2.8;
      const fov = 38 * Math.PI / 180;
      baseDistance = Math.max(halfH / Math.tan(fov / 2), halfW / (Math.tan(fov / 2) * aspect)) + 1.7;
      camera.position.set(0, 3.4, baseDistance);
      lookAt.set(0, -.05, .25);
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

    const focusHome = new THREE.Vector3(0, -.3, 2.25);

    const resize = new ResizeObserver(() => {
      width = Math.max(1, element.clientWidth); height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height); composer.setSize(width, height);
      camera.aspect = width / height; camera.updateProjectionMatrix(); syncCamera();
    });
    resize.observe(element);

    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    };
    const leave = () => pointer.set(0, 0);
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", leave);

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
      const parallax = mobile || p.reduced ? 0 : 1;

      camera.position.set(pointer.x * .05 * parallax, 3.4 + pointer.y * .12 * parallax, baseDistance - (p.reduced ? 0 : Math.sin(seq.position * Math.PI) * .2));
      lookAt.set(pointer.x * .02 * parallax, -.05, .25);
      camera.lookAt(lookAt);

      const providerBusiness = p.chapter <= 1 || current.id === "read-source" || current.id === "payload";
      const consumerBusiness = p.chapter === 4 || p.chapter === 7 || current.id === "payload";
      providerSystem.core.material.emissiveIntensity = providerBusiness ? .72 : .14;
      providerSystem.shell.material.opacity = providerBusiness ? .075 : .025;
      consumerSystem.core.material.emissiveIntensity = consumerBusiness ? .72 : .14;
      consumerSystem.shell.material.opacity = consumerBusiness ? .075 : .025;
      providerSystem.group.rotation.y = .24 + Math.sin(t * .05) * .025;
      consumerSystem.group.rotation.y = -.24 + Math.sin(t * .05 + 1) * .025;

      const dataActive = d.lane === "data" || r.mode === "data" || r.mode === "payload";
      const providerConnectorActive = p.chapter >= 1 && p.chapter <= 6;
      const consumerConnectorActive = p.chapter >= 2 && p.chapter <= 6;
      assets.animate("providerEdc", t, providerConnectorActive, dataActive);
      assets.animate("consumerEdc", t, consumerConnectorActive, dataActive);
      [[providerEdc, providerConnectorActive], [consumerEdc, consumerConnectorActive]].forEach(([connectorRaw, activeRaw]) => {
        const connector = connectorRaw as Connector; const active = activeRaw as boolean;
        connector.frame.material.opacity = active ? .28 : .11;
        connector.control.material.emissiveIntensity = active && !dataActive ? 1.05 : .25;
        connector.data.material.emissiveIntensity = active && dataActive ? 1.15 : .22;
        connector.controlHalo.material.opacity = active && !dataActive ? .34 : .06;
        connector.dataHalo.material.opacity = active && dataActive ? .34 : .05;
        connector.group.rotation.y = (connector === providerEdc ? .12 : -.12) + Math.sin(t * .035) * .012;
      });

      const visible = new Set(d.artifacts.map(item => item.id));
      const activeHero = d.artifacts.find(item => item.emphasis === "hero");
      (Object.keys(artifacts) as SceneArtifact[]).forEach(id => {
        artifacts[id].group.visible = visible.has(id) || (id === "agreement" && p.chapter === 6);
        const isHero = activeHero?.id === id;
        artifacts[id].group.position.copy(isHero ? focusHome : homes[id]);
        const reveal = p.reduced || current.status !== "active" ? 1 : .88 + ease(current.fraction * 5) * .12;
        artifacts[id].group.scale.setScalar(isHero ? reveal : .36);
        if (isHero && !p.reduced && !p.fault) artifacts[id].group.position.y += Math.sin(t * .8) * .035;
        assets.animate(id, t, isHero, dataActive, p.reduced ? 0 : current.fraction, !!p.fault);
      });

      if (p.chapter === 3 && current.id === "catalog-response" && visible.has("offer")) {
        artifacts.offer.group.position.lerpVectors(positions["provider-control"], positions["consumer-control"], ease(current.fraction));
        artifacts.offer.group.scale.setScalar(.48);
      }
      if (p.chapter === 6 && current.id === "transfer-start" && visible.has("edr")) {
        artifacts.edr.group.position.lerpVectors(positions["provider-control"], positions["consumer-control"], ease(current.fraction));
        artifacts.edr.group.position.z += Math.sin(Math.PI * ease(current.fraction)) * .3;
        artifacts.edr.group.scale.setScalar(.48);
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

      // Keep authored fronts readable: a small inspection sway, never a full spin.
      Object.values(artifacts).forEach(artifact => { artifact.group.rotation.y = .15 + Math.sin(t * .22) * .13; });

      if (activeHero) {
        activeLight.position.copy(artifacts[activeHero.id].group.position).add(new THREE.Vector3(0, .38, 1.6));
        activeLight.color.set(toneColor(activeHero.tone));
        activeLight.intensity = 3.5;
      } else activeLight.intensity = .35;

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
      element.removeEventListener("pointermove", move); element.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      composer.passes.forEach(pass => pass.dispose()); composer.dispose(); env.dispose(); geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, [unavailable]);

  if (unavailable) return <SimpleJourneyScene {...props} />;

  return (
    <div ref={host} className={ui.scene} data-reduced={props.reduced} data-paused={props.paused} role="group" aria-label={`Tractus-X EDC mediated journey. ${chapters[props.chapter].title}. ${frame.current.title}.`}>
      <TopologyHeader rail={directed.rail} chapter={props.chapter} />
      <ActorStrip chapter={props.chapter} onSelect={props.onSelect} />
      <HeroCallout item={hero} onSelect={props.onSelect} />
      <PlaneLegend chapter={props.chapter} lane={directed.lane} />
      <PayloadState chapter={props.chapter} routeMode={route.mode} delivered={frame.copyDelivered} />
      {loading.settled < 13 && <div className={ui.assetLoading} role="status"><i/>Assembling the dataspace <span>{loading.settled}/13</span></div>}
      {loading.settled === 13 && loading.loaded < 13 && <div className={ui.assetLoading} role="status">Some models unavailable · simplified shapes shown</div>}
    </div>
  );
}
