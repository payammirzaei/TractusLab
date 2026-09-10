"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { chapters, journeyNodes, type Fault, type NodeId } from "@/lib/data-journey";
import { directJourneyScene, directorArtifactOwners, type CameraCue, type DirectedArtifact, type LaneCue, type SceneArtifact } from "@/lib/journey-director";
import { journeyLayout } from "@/lib/journey-visuals";
import { sequenceFrame, signalStyles, type SignalKind } from "@/lib/journey-sequence";
import styles from "./journey.module.css";

export type SceneProps = {
  chapter: number;
  progress: number;
  fault: Fault | null;
  paused: boolean;
  reduced: boolean;
  selected: NodeId | null;
  onSelect: (id: NodeId) => void;
};

const COLORS = {
  provider: "#59edcf",
  consumer: "#aaa4ff",
  control: "#80caff",
  usage: "#ffb567",
  agreement: "#f5d786",
  data: "#59edcf",
  fault: "#ff7185",
} as const;

const smooth = (value: number) => {
  const n = THREE.MathUtils.clamp(value, 0, 1);
  return n * n * (3 - 2 * n);
};

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function participantLabel(id?: NodeId) {
  if (!id) return "";
  if (id === "provider") return "Company A";
  if (id === "consumer") return "Company B";
  return journeyNodes[id].label;
}

function signalColor(chapter: number, kind: SignalKind, blocked: boolean) {
  if (blocked) return COLORS.fault;
  if (chapter === 5) return COLORS.agreement;
  if (kind === "retrieval" || kind === "data") return COLORS.data;
  return signalStyles[kind].color;
}

function artifactColor(tone: DirectedArtifact["tone"]) {
  return COLORS[tone];
}

function WorldBadge({
  side,
  title,
  role,
  accent,
  active,
  pressed,
  onClick,
}: {
  side: "left" | "right";
  title: string;
  role: string;
  accent: string;
  active: boolean;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      style={{
        position: "absolute",
        zIndex: 20,
        top: 14,
        [side]: "clamp(14px, 3vw, 48px)",
        minWidth: 118,
        padding: "7px 11px",
        borderRadius: 999,
        border: `1px solid ${accent}${active ? "99" : "3f"}`,
        background: active ? "rgba(5,16,24,.84)" : "rgba(5,11,20,.46)",
        boxShadow: active ? `0 0 24px ${accent}18` : "none",
        color: "#edf5ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        font: "inherit",
        cursor: "pointer",
        opacity: active ? 1 : .62,
        backdropFilter: "blur(8px)",
      }}
    >
      <strong style={{ fontSize: 11.5, lineHeight: 1.1 }}>{title}</strong>
      <small style={{ fontSize: 8.5, color: accent }}>{role}</small>
    </button>
  );
}

function StoryRail({ scene, chapter }: { scene: ReturnType<typeof directJourneyScene>; chapter: number }) {
  if (!scene.rail) return null;
  const accent = chapter === 5 ? COLORS.agreement : chapter === 6 ? COLORS.data : COLORS.control;
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 18,
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(540px, 52vw)",
        display: "grid",
        gridTemplateColumns: `repeat(${scene.rail.labels.length}, minmax(0,1fr))`,
        pointerEvents: "none",
      }}
    >
      {scene.rail.labels.map((label, index) => {
        const active = index === scene.rail!.active;
        const done = index < scene.rail!.active;
        return (
          <div key={label} style={{ position: "relative", display: "grid", justifyItems: "center", gap: 5 }}>
            {index > 0 && <span style={{ position: "absolute", top: 5, right: "50%", width: "100%", height: 1, background: done || active ? `${accent}75` : "rgba(120,145,170,.14)" }} />}
            <span style={{ position: "relative", zIndex: 1, width: active ? 11 : 7, height: active ? 11 : 7, borderRadius: 999, border: `1px solid ${active || done ? accent : "#405267"}`, background: active ? accent : done ? `${accent}66` : "#07101b", boxShadow: active ? `0 0 14px ${accent}88` : "none" }} />
            <span style={{ fontSize: 8.2, color: active ? "#edf6ff" : done ? "#8fa6bb" : "#4f6276", fontWeight: active ? 700 : 560 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LaneLegend({ lane }: { lane: LaneCue }) {
  if (lane === "none") return null;
  return (
    <div style={{ position: "absolute", zIndex: 14, inset: "auto 0 16px", display: "flex", justifyContent: "center", gap: 12, pointerEvents: "none" }}>
      <span style={{ padding: "5px 9px", borderRadius: 999, border: `1px solid ${COLORS.control}${lane === "control" ? "88" : "2c"}`, color: lane === "control" ? COLORS.control : "#54687d", background: "rgba(4,10,18,.72)", fontSize: 8.2, fontWeight: 720, letterSpacing: ".11em" }}>CONTROL · METADATA / AGREEMENT / EDR</span>
      <span style={{ padding: "5px 9px", borderRadius: 999, border: `1px solid ${COLORS.data}${lane === "data" ? "88" : "2c"}`, color: lane === "data" ? COLORS.data : "#54687d", background: "rgba(4,10,18,.72)", fontSize: 8.2, fontWeight: 720, letterSpacing: ".11em" }}>DATA · REQUEST / PAYLOAD</span>
    </div>
  );
}

function PayloadState({ chapter, currentId, copyVisible, copyDelivered }: { chapter: number; currentId: string; copyVisible: boolean; copyDelivered: boolean }) {
  const moving = chapter === 6 && currentId === "payload" && copyVisible && !copyDelivered;
  const delivered = copyDelivered || chapter === 7;
  const accent = delivered || moving ? COLORS.data : "#70859a";
  const text = delivered ? "COPY DELIVERED" : moving ? "PAYLOAD MOVING" : "PAYLOAD NOT MOVED";
  return <div style={{ position: "absolute", zIndex: 16, right: 14, bottom: 14, padding: "5px 9px", borderRadius: 999, border: `1px solid ${accent}4d`, background: "rgba(4,10,18,.82)", color: accent, fontSize: 8, letterSpacing: ".12em", fontWeight: 760, pointerEvents: "none" }}>{text}</div>;
}

export default function NeuralScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  const labelRefs = useRef<Partial<Record<SceneArtifact, HTMLDivElement | null>>>({});
  live.current = props;
  const [unavailable, setUnavailable] = useState(false);

  const frame = sequenceFrame(props.chapter, props.progress, props.fault);
  const directed = directJourneyScene(props.chapter, frame.current.id, frame.current.kind);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setUnavailable(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.05 : 1.35));
    renderer.setClearColor(0x03070d, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute("aria-hidden", "true");
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", transform: "none" });
    element.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03070d, .015);
    const camera = new THREE.PerspectiveCamera(39, 1, .1, 100);
    const cameraTarget = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const pointer = new THREE.Vector2();

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
    const material = <T extends THREE.Material>(m: T) => { materials.add(m); return m; };

    const pbr = (color: THREE.ColorRepresentation, emissive = .25, opacity = 1) => material(new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: emissive,
      roughness: .32,
      metalness: .42,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity > .35,
    }));
    const lineMat = (color: THREE.ColorRepresentation, opacity = .2) => material(new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));

    const glowPoints = (color: string, size: number, positions: number[]) => {
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const m = material(new THREE.ShaderMaterial({
        uniforms: { tint: { value: new THREE.Color(color) }, size: { value: size }, opacity: { value: 1 }, energy: { value: 1 } },
        vertexShader: "uniform float size; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(64.0,size*135.0/-p.z);gl_Position=projectionMatrix*p;}",
        fragmentShader: "uniform vec3 tint;uniform float opacity;uniform float energy;void main(){float d=length(gl_PointCoord-vec2(.5))*2.;if(d>1.)discard;float a=pow(1.-d,3.5);gl_FragColor=vec4(tint*energy,a*opacity);}",
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      return new THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>(g, m);
    };

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    room.dispose();
    pmrem.dispose();
    scene.environment = environment.texture;

    scene.add(new THREE.HemisphereLight(0xb6ddff, 0x010306, 1.05));
    const key = new THREE.DirectionalLight(0xd9f5ff, 1.55); key.position.set(-5, 7, 8);
    const rim = new THREE.DirectionalLight(0xb2a7ff, 1.15); rim.position.set(6, -2, 6);
    const activeLight = new THREE.PointLight(0x80caff, 0, 8, 2);
    scene.add(key, rim, activeLight);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .28, .22, 1.2);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    type World = {
      group: THREE.Group;
      core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      shell: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      network: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      nodes: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
      ringA: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      ringB: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      halo: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    };

    function createWorld(color: string, seed: number): World {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.42, 2)), pbr(color, .5));
      const shell = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(1.55, 2)), material(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .08, depthWrite: false })));
      const ringA = new THREE.Mesh(geometry(new THREE.TorusGeometry(1.18, .01, 6, 80)), material(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .1, depthWrite: false })));
      const ringB = new THREE.Mesh(geometry(new THREE.TorusGeometry(.9, .008, 6, 70)), material(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .07, depthWrite: false })));
      ringA.rotation.set(.72, .5, .15); ringB.rotation.set(1.1, -.35, .55);
      const halo = glowPoints(color, 12, [0, 0, 0]); halo.material.uniforms.opacity.value = .5;

      const rand = seeded(seed);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 16; i++) {
        const theta = i * 2.399963;
        const phi = Math.acos(1 - 2 * (i + .5) / 16);
        const r = .72 + rand() * .55;
        pts.push(new THREE.Vector3(Math.cos(theta) * Math.sin(phi) * r, Math.sin(theta) * Math.sin(phi) * r * .86, Math.cos(phi) * r * .78));
      }
      const edges: number[] = [];
      pts.forEach((point, i) => {
        const ranked = pts.map((candidate, j) => ({ j, d: i === j ? Infinity : point.distanceToSquared(candidate) })).sort((a, b) => a.d - b.d).slice(0, 2);
        ranked.forEach(({ j }) => { if (j > i) edges.push(...point.toArray(), ...pts[j].toArray()); });
      });
      const eg = geometry(new THREE.BufferGeometry()); eg.setAttribute("position", new THREE.Float32BufferAttribute(edges, 3));
      const network = new THREE.LineSegments(eg, lineMat(color, .11));
      const nodes = glowPoints(color, 2.1, pts.flatMap(point => point.toArray())); nodes.material.uniforms.opacity.value = .52;
      group.add(core, shell, ringA, ringB, halo, network, nodes); scene.add(group);
      return { group, core, shell, network, nodes, ringA, ringB, halo };
    }

    type Artifact = { group: THREE.Group; cores: THREE.Mesh[]; halo: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> };
    const makeHalo = (group: THREE.Group, color: string, size = 8) => { const halo = glowPoints(color, size, [0, 0, 0]); halo.material.uniforms.opacity.value = .24; group.add(halo); return halo; };

    function createGem(shape: THREE.BufferGeometry, color: string, scale = 1): Artifact {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(shape), pbr(color, .85)); core.scale.setScalar(scale);
      const shell = new THREE.Mesh(geometry(shape.clone()), material(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .22, depthWrite: false }))); shell.scale.setScalar(scale * 1.32);
      group.add(core, shell); const halo = makeHalo(group, color); scene.add(group); return { group, cores: [core], halo };
    }

    function createOffer(): Artifact {
      const group = new THREE.Group();
      const cores: THREE.Mesh[] = [];
      [-.07, 0, .07].forEach((z, index) => {
        const slab = new THREE.Mesh(geometry(new THREE.BoxGeometry(.58 - index * .04, .36 - index * .025, .055)), pbr(COLORS.control, index === 0 ? 1.05 : .35, index === 0 ? 1 : .62));
        slab.position.z = z; slab.position.x = index * -.04; slab.position.y = index * .035; group.add(slab); cores.push(slab);
      });
      const halo = makeHalo(group, COLORS.control, 7.5); scene.add(group); return { group, cores, halo };
    }

    function createAgreement(): Artifact {
      const group = new THREE.Group();
      const cores: THREE.Mesh[] = [];
      const ring1 = new THREE.Mesh(geometry(new THREE.TorusGeometry(.33, .055, 10, 70)), pbr(COLORS.agreement, 1.2));
      const ring2 = new THREE.Mesh(geometry(new THREE.TorusGeometry(.33, .055, 10, 70)), pbr(COLORS.agreement, 1.2));
      ring1.rotation.x = Math.PI / 2; ring2.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      const gem = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.18, 1)), pbr(COLORS.agreement, 1.55));
      group.add(ring1, ring2, gem); cores.push(ring1, ring2, gem);
      const halo = makeHalo(group, COLORS.agreement, 11); scene.add(group); return { group, cores, halo };
    }

    function createEdr(): Artifact {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(geometry(new THREE.TorusGeometry(.2, .045, 9, 42)), pbr(COLORS.control, 1.35));
      const bar = new THREE.Mesh(geometry(new THREE.BoxGeometry(.38, .07, .07)), pbr(COLORS.control, 1.35)); bar.position.x = .31;
      const tooth = new THREE.Mesh(geometry(new THREE.BoxGeometry(.08, .12, .07)), pbr(COLORS.control, 1.35)); tooth.position.set(.47, -.07, 0);
      group.add(ring, bar, tooth); const halo = makeHalo(group, COLORS.control, 8); scene.add(group); return { group, cores: [ring, bar, tooth], halo };
    }

    const provider = createWorld(COLORS.provider, 91);
    const consumer = createWorld(COLORS.consumer, 133);
    const source = createGem(new THREE.OctahedronGeometry(.24, 1), COLORS.provider, 1);
    const offer = createOffer();
    const dsp = createGem(new THREE.TorusGeometry(.25, .045, 9, 42), COLORS.control, 1);
    const trust = createGem(new THREE.OctahedronGeometry(.25, 1), COLORS.control, 1);
    const usage = createGem(new THREE.TetrahedronGeometry(.29, 1), COLORS.usage, 1);
    const agreement = createAgreement();
    const edr = createEdr();
    const payload = createGem(new THREE.CapsuleGeometry(.17, .35, 5, 10), COLORS.data, 1);
    const copy = createGem(new THREE.CapsuleGeometry(.17, .35, 5, 10), COLORS.data, 1);

    const policyOrbit = new THREE.Group();
    const accessRing = new THREE.Mesh(geometry(new THREE.TorusGeometry(.5, .015, 7, 64)), material(new THREE.MeshBasicMaterial({ color: COLORS.control, transparent: true, opacity: .34, depthWrite: false })));
    const usageRing = new THREE.Mesh(geometry(new THREE.TorusGeometry(.63, .015, 7, 64)), material(new THREE.MeshBasicMaterial({ color: COLORS.usage, transparent: true, opacity: .3, depthWrite: false })));
    accessRing.rotation.set(.75, .4, 0); usageRing.rotation.set(1.05, -.42, .45); policyOrbit.add(accessRing, usageRing); scene.add(policyOrbit);

    const activeLineGeometry = geometry(new THREE.BufferGeometry());
    activeLineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(81 * 3).fill(0), 3));
    const activeLine = new THREE.Line(activeLineGeometry, lineMat(COLORS.control, .55)); activeLine.frustumCulled = false; scene.add(activeLine);
    const token = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.12, 1)), pbr(COLORS.control, 1.45)); scene.add(token);
    const trail = glowPoints(COLORS.control, 3, new Array(9 * 3).fill(0)); trail.frustumCulled = false; trail.material.uniforms.opacity.value = .58; scene.add(trail);

    const controlLaneGeometry = geometry(new THREE.BufferGeometry()); controlLaneGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(2 * 3).fill(0), 3));
    const dataLaneGeometry = geometry(new THREE.BufferGeometry()); dataLaneGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(2 * 3).fill(0), 3));
    const controlLane = new THREE.Line(controlLaneGeometry, lineMat(COLORS.control, .13)); const dataLane = new THREE.Line(dataLaneGeometry, lineMat(COLORS.data, .09)); scene.add(controlLane, dataLane);

    const relationGeometry = geometry(new THREE.BufferGeometry()); relationGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(2 * 3).fill(0), 3));
    const relation = new THREE.Line(relationGeometry, lineMat(COLORS.agreement, .08)); scene.add(relation);

    const focusRing = new THREE.Mesh(geometry(new THREE.TorusGeometry(.52, .013, 7, 68)), material(new THREE.MeshBasicMaterial({ color: COLORS.control, transparent: true, opacity: .32, depthWrite: false })));
    focusRing.rotation.x = .78; scene.add(focusRing);

    const dustRand = seeded(7); const dustPositions: number[] = [];
    for (let i = 0; i < 42; i++) dustPositions.push((dustRand() - .5) * 24, (dustRand() - .5) * 8, (dustRand() - .5) * 8 - 2);
    const dust = glowPoints("#60809d", .8, dustPositions); dust.material.uniforms.opacity.value = .08; dust.material.uniforms.energy.value = .3; scene.add(dust);

    let width = 1, height = 1, layout = journeyLayout(1);
    const pos = {
      provider: new THREE.Vector3(), consumer: new THREE.Vector3(), source: new THREE.Vector3(), offerProvider: new THREE.Vector3(), offerConsumer: new THREE.Vector3(), dsp: new THREE.Vector3(), trust: new THREE.Vector3(), usage: new THREE.Vector3(), agreement: new THREE.Vector3(), edr: new THREE.Vector3(), payload: new THREE.Vector3(), copy: new THREE.Vector3(),
    };
    const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
    const start = new THREE.Vector3(), end = new THREE.Vector3(), point = new THREE.Vector3(), projected = new THREE.Vector3(), focus = new THREE.Vector3(), color = new THREE.Color();

    function syncLayout() {
      const compact = camera.aspect < .9;
      const s = compact ? .8 : 1.02;
      pos.provider.set(...layout.positions.provider); pos.consumer.set(...layout.positions.consumer);
      provider.group.position.copy(pos.provider); consumer.group.position.copy(pos.consumer); provider.group.scale.setScalar(s); consumer.group.scale.setScalar(s);
      const cs = layout.companyScale ?? 1;
      pos.source.copy(pos.provider).add(new THREE.Vector3(-.25 * cs, -1.18 * cs, .82));
      pos.offerProvider.copy(pos.provider).add(new THREE.Vector3(1.35 * cs, .72 * cs, .92));
      pos.offerConsumer.copy(pos.consumer).add(new THREE.Vector3(-1.35 * cs, .72 * cs, .92));
      pos.dsp.set(0, .62, 1.05); pos.trust.copy(pos.provider).add(new THREE.Vector3(1.3 * cs, .24 * cs, .94)); pos.usage.copy(pos.consumer).add(new THREE.Vector3(-1.3 * cs, .32 * cs, .94)); pos.agreement.set(0, .2, 1.08); pos.edr.copy(pos.consumer).add(new THREE.Vector3(-1.12 * cs, .78 * cs, .9)); pos.payload.copy(pos.consumer).add(new THREE.Vector3(-.9 * cs, -1.0 * cs, .88)); pos.copy.copy(pos.consumer).add(new THREE.Vector3(-.35 * cs, -.5 * cs, .78));
      source.group.position.copy(pos.source); offer.group.position.copy(pos.offerProvider); dsp.group.position.copy(pos.dsp); trust.group.position.copy(pos.trust); usage.group.position.copy(pos.usage); agreement.group.position.copy(pos.agreement); edr.group.position.copy(pos.edr); payload.group.position.copy(pos.payload); copy.group.position.copy(pos.copy); policyOrbit.position.copy(pos.offerProvider);
      const c = controlLaneGeometry.getAttribute("position") as THREE.BufferAttribute; c.setXYZ(0, pos.provider.x + 1.35, .82, .08); c.setXYZ(1, pos.consumer.x - 1.35, .82, .08); c.needsUpdate = true;
      const d = dataLaneGeometry.getAttribute("position") as THREE.BufferAttribute; d.setXYZ(0, pos.provider.x + 1.35, -1.04, .08); d.setXYZ(1, pos.consumer.x - 1.35, -1.04, .08); d.needsUpdate = true;
      const r = relationGeometry.getAttribute("position") as THREE.BufferAttribute; r.setXYZ(0, pos.provider.x + .8, .22, .1); r.setXYZ(1, pos.consumer.x - .8, .22, .1); r.needsUpdate = true;
      camera.position.set(0, .08, layout.distance); cameraTarget.copy(camera.position); lookAt.set(0,0,0); lookTarget.set(0,0,0);
    }

    function nodePoint(id: NodeId, out: THREE.Vector3) {
      if (id === "provider") return out.copy(pos.provider);
      if (id === "consumer") return out.copy(pos.consumer);
      if (id === "identity") return out.copy(pos.trust);
      if (id === "policy") return out.copy(pos.usage);
      if (id === "agreement") return out.copy(pos.agreement);
      return out.copy(offer.group.position);
    }

    function cameraCue(cue: CameraCue) {
      const base = layout.distance;
      if (cue === "provider") { cameraTarget.set(-layout.companyX * .22, .04, base * .84); lookTarget.copy(pos.provider).multiplyScalar(.34); }
      else if (cue === "consumer") { cameraTarget.set(layout.companyX * .22, .04, base * .84); lookTarget.copy(pos.consumer).multiplyScalar(.34); }
      else if (cue === "center") { cameraTarget.set(0, .03, base * .82); lookTarget.set(0, .18, .35); }
      else if (cue === "control") { cameraTarget.set(0, .14, base * .9); lookTarget.set(0, .62, .18); }
      else if (cue === "data") { cameraTarget.set(0, -.16, base * .9); lookTarget.set(0, -.74, .18); }
      else { cameraTarget.set(0, .08, base); lookTarget.set(0, 0, 0); }
    }

    function artifactWorld(id: SceneArtifact) {
      if (id === "source") return source.group.position;
      if (id === "offer") return offer.group.position;
      if (id === "dsp") return dsp.group.position;
      if (id === "trust") return trust.group.position;
      if (id === "usage") return usage.group.position;
      if (id === "agreement") return agreement.group.position;
      if (id === "edr") return edr.group.position;
      if (id === "payload") return payload.group.position;
      return copy.group.position;
    }

    function placeLabel(id: SceneArtifact) {
      const el = labelRefs.current[id]; if (!el) return;
      projected.copy(artifactWorld(id)).project(camera);
      const x = (projected.x * .5 + .5) * width; const y = (-projected.y * .5 + .5) * height;
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      if (id === "agreement" || id === "dsp") el.style.transform = "translate(-50%, 34px)";
      else if (x < width * .5) el.style.transform = "translate(18px, -50%)";
      else el.style.transform = "translate(calc(-100% - 18px), -50%)";
      el.style.opacity = projected.z > 1 ? "0" : "1";
    }

    const resize = new ResizeObserver(() => {
      width = Math.max(1, element.clientWidth); height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height); composer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); layout = journeyLayout(camera.aspect); syncLayout();
    });
    resize.observe(element);

    const pointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    };
    const pointerLeave = () => pointer.set(0, 0);
    element.addEventListener("pointermove", pointerMove, { passive: true }); element.addEventListener("pointerleave", pointerLeave);

    let raf = 0, lastRender = 0, disposed = false;
    function render(now: number) {
      if (disposed) return; raf = requestAnimationFrame(render); if (document.hidden) return;
      const p = live.current; const mobile = width < 720; const gap = p.paused || p.reduced ? 100 : mobile ? 1000 / 30 : 1000 / 45; if (now - lastRender < gap) return; lastRender = now;
      const sequence = sequenceFrame(p.chapter, p.progress, p.fault); const current = sequence.current; const directedFrame = directJourneyScene(p.chapter, current.id, current.kind); const t = p.reduced ? 0 : sequence.position * chapters[p.chapter].duration; const parallax = mobile || p.reduced ? 0 : 1;

      cameraCue(directedFrame.camera); cameraTarget.x += pointer.x * .08 * parallax; cameraTarget.y += pointer.y * .045 * parallax; lookTarget.x += pointer.x * .04 * parallax; lookTarget.y += pointer.y * .025 * parallax;
      if (!p.paused) { camera.position.lerp(cameraTarget, p.reduced ? 1 : .036); lookAt.lerp(lookTarget, p.reduced ? 1 : .045); } camera.lookAt(lookAt);

      const providerActive = directedFrame.actor === "provider" || directedFrame.actor === "both"; const consumerActive = directedFrame.actor === "consumer" || directedFrame.actor === "both";
      [provider, consumer].forEach((world, index) => {
        const active = index === 0 ? providerActive : consumerActive; const phase = index ? 1 : 0;
        world.group.rotation.y = Math.sin(t * .07 + phase) * .065 + pointer.x * .014 * parallax * (index ? 1 : -1); world.group.rotation.x = pointer.y * .01 * parallax;
        world.shell.rotation.y = t * .02 * (index ? -1 : 1); world.ringA.rotation.z = t * .028 * (index ? -1 : 1); world.ringB.rotation.y = t * .018 * (index ? 1 : -1);
        world.core.rotation.set(t * .11, t * .17 * (index ? -1 : 1), .1); world.core.material.emissiveIntensity = active ? .88 : .24; world.shell.material.opacity = active ? .12 : .038; world.network.material.opacity = active ? .16 : .045; world.nodes.material.uniforms.opacity.value = active ? .66 : .2; world.halo.material.uniforms.opacity.value = active ? .52 : .16;
      });

      const visible = new Set(directedFrame.artifacts.map(a => a.id));
      source.group.visible = visible.has("source"); offer.group.visible = visible.has("offer"); dsp.group.visible = visible.has("dsp"); trust.group.visible = visible.has("trust"); usage.group.visible = visible.has("usage"); edr.group.visible = visible.has("edr"); payload.group.visible = visible.has("payload"); copy.group.visible = visible.has("copy");
      agreement.group.visible = visible.has("agreement") || p.chapter === 6 || p.chapter === 7;
      policyOrbit.visible = p.chapter === 1 && current.id === "define-policies";

      source.group.position.copy(pos.source); source.group.rotation.set(t * .14, t * .28, .1);
      offer.group.position.copy(p.chapter === 3 && current.id === "catalog-response" ? pos.offerProvider.clone().lerp(pos.offerConsumer, smooth(current.fraction)) : p.chapter >= 3 ? pos.offerConsumer : pos.offerProvider); offer.group.rotation.set(.08, t * .08, .02);
      policyOrbit.position.copy(pos.offerProvider); policyOrbit.rotation.z = t * .12;
      dsp.group.position.copy(pos.dsp); dsp.group.rotation.set(.3, t * .18, t * .06);
      trust.group.position.copy(pos.trust); trust.group.rotation.set(t * .18, t * .3, .1);
      usage.group.position.copy(p.chapter === 5 ? pos.trust : pos.usage); usage.group.rotation.set(t * .16, t * .24, t * .06);

      const contractBeat = p.chapter === 5 ? sequence.beats.find(b => b.id === "contract-agreement") : undefined;
      agreement.group.position.copy(pos.agreement); const contractScale = p.chapter === 6 || p.chapter === 7 ? .58 : current.id === "seal" || current.id === "contract-finalized" ? 1.28 : contractBeat?.status === "active" ? .55 + smooth(contractBeat.fraction) * .65 : .9; agreement.group.scale.setScalar(contractScale); agreement.group.rotation.y = t * .18; agreement.cores.forEach((mesh, i) => { mesh.rotation.z = (i === 0 ? 1 : -1) * t * .08; });
      const agreementHero = visible.has("agreement"); agreement.cores.forEach(mesh => { if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissiveIntensity = agreementHero ? 1.7 : .45; }); agreement.halo.material.uniforms.opacity.value = agreementHero ? .55 : .12;

      const transferStart = p.chapter === 6 ? sequence.beats.find(b => b.id === "transfer-start") : undefined;
      edr.group.position.copy(pos.edr);
      if (p.chapter === 6 && transferStart?.status === "active") { nodePoint("provider", start); nodePoint("consumer", end); curve.v0.copy(start); curve.v3.copy(end); curve.v1.copy(start).lerp(end,.34).add(new THREE.Vector3(0,.82,.7)); curve.v2.copy(start).lerp(end,.66).add(new THREE.Vector3(0,.82,.7)); curve.getPoint(smooth(transferStart.fraction), edr.group.position); }
      edr.group.rotation.set(.18, t * .26, .06);

      const payloadBeat = p.chapter === 6 ? sequence.beats.find(b => b.id === "payload") : undefined;
      payload.group.position.copy(pos.payload);
      if (p.chapter === 6 && payloadBeat?.status === "active") { nodePoint("provider", start); nodePoint("consumer", end); curve.v0.copy(start); curve.v3.copy(end); curve.v1.copy(start).lerp(end,.34).add(new THREE.Vector3(0,-1.05,.68)); curve.v2.copy(start).lerp(end,.66).add(new THREE.Vector3(0,-1.05,.68)); curve.getPoint(smooth(payloadBeat.fraction), payload.group.position); }
      payload.group.rotation.set(t * .22, t * .42, .1); copy.group.position.copy(pos.copy); copy.group.rotation.set(t * .12, t * .2, .08);

      controlLane.visible = directedFrame.lane !== "none" || p.chapter === 6; dataLane.visible = p.chapter === 6;
      controlLane.material.opacity = directedFrame.lane === "control" ? .34 : directedFrame.lane === "data" ? .055 : .11; dataLane.material.opacity = directedFrame.lane === "data" ? .34 : .055;
      relation.visible = p.chapter >= 5; relation.material.opacity = p.chapter === 5 ? .12 : .055;

      activeLine.visible = false; token.visible = false; trail.visible = false;
      const moving = !!current.from && !!current.to && (current.status === "active" || current.status === "blocked");
      const objectCarriesMessage = current.id === "catalog-response" || current.id === "transfer-start" || current.id === "payload";
      if (moving) {
        nodePoint(current.from!, start); nodePoint(current.to!, end); const dataMove = current.kind === "retrieval" || current.kind === "data"; const liftY = dataMove ? -1.05 : .82; const liftZ = dataMove ? .68 : .62;
        curve.v0.copy(start); curve.v3.copy(end); curve.v1.copy(start).lerp(end,.34).add(new THREE.Vector3(0,liftY,liftZ)); curve.v2.copy(start).lerp(end,.66).add(new THREE.Vector3(0,liftY,liftZ));
        const attr = activeLineGeometry.getAttribute("position") as THREE.BufferAttribute; for (let i=0;i<81;i++){curve.getPoint(i/80,point);attr.setXYZ(i,point.x,point.y,point.z);} attr.needsUpdate=true;
        const fraction = smooth(current.fraction); activeLine.visible = true; activeLine.geometry.setDrawRange(0, Math.max(2, Math.floor(81 * (p.reduced ? 1 : fraction)))); color.set(signalColor(p.chapter,current.kind,sequence.blocked)); activeLine.material.color.copy(color); activeLine.material.opacity = sequence.blocked ? .72 : .52;
        if (!objectCarriesMessage) { token.visible = true; curve.getPoint(fraction, token.position); token.rotation.set(t*.24,t*.4,.1); token.material.color.copy(color); token.material.emissive.copy(color); token.material.emissiveIntensity=1.5; if(!p.reduced){trail.visible=true;trail.material.uniforms.tint.value.copy(color);const ta=trail.geometry.getAttribute("position") as THREE.BufferAttribute;for(let i=0;i<9;i++){curve.getPoint(Math.max(0,fraction-i*.03),point);ta.setXYZ(i,point.x,point.y,point.z);}ta.needsUpdate=true;} }
      }

      if (visible.size) {
        const hero = directedFrame.artifacts.find(a => a.emphasis === "hero") ?? directedFrame.artifacts[0]; if (hero) focus.copy(artifactWorld(hero.id)); else focus.set(0,0,0);
      } else if (current.focus) nodePoint(current.focus, focus); else focus.set(0,0,0);
      focusRing.position.copy(focus); focusRing.visible = !moving || objectCarriesMessage; focusRing.material.color.set(signalColor(p.chapter,current.kind,sequence.blocked)); focusRing.material.opacity = .22 + (p.reduced ? 0 : Math.sin(t*1.7)*.05); focusRing.rotation.z=t*.1;
      activeLight.color.set(signalColor(p.chapter,current.kind,sequence.blocked)); activeLight.position.copy(focus).add(new THREE.Vector3(0,.45,2)); activeLight.intensity = visible.size ? 1.75 : 1.1;

      directedFrame.artifacts.forEach(a => placeLabel(a.id)); dust.rotation.y=t*.002;
      if (!mobile && !p.reduced) composer.render(); else renderer.render(scene,camera);
    }

    syncLayout(); raf = requestAnimationFrame(render);
    const lost = (event: Event) => { event.preventDefault(); setUnavailable(true); cancelAnimationFrame(raf); }; renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => { disposed=true;cancelAnimationFrame(raf);resize.disconnect();element.removeEventListener("pointermove",pointerMove);element.removeEventListener("pointerleave",pointerLeave);renderer.domElement.removeEventListener("webglcontextlost",lost);composer.dispose();environment.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove(); };
  }, []);

  if (unavailable) return <SimpleScene {...props} />;
  const providerActive = directed.actor === "provider" || directed.actor === "both";
  const consumerActive = directed.actor === "consumer" || directed.actor === "both";

  return (
    <div ref={host} className={styles.canvas} role="group" aria-label={`Conceptual Tractus-X journey. ${chapters[props.chapter].title}. Current step: ${frame.current.title}.`}>
      <WorldBadge side="left" title="Company A" role="Supplier · Provider" accent={COLORS.provider} active={providerActive} pressed={props.selected === "provider"} onClick={() => props.onSelect("provider")} />
      <WorldBadge side="right" title="Company B" role="Manufacturer · Consumer" accent={COLORS.consumer} active={consumerActive} pressed={props.selected === "consumer"} onClick={() => props.onSelect("consumer")} />
      <StoryRail scene={directed} chapter={props.chapter} />
      {directed.artifacts.map(item => {
        const owner = directorArtifactOwners[item.id];
        const accent = artifactColor(item.tone);
        const style: CSSProperties = {
          position: "absolute", zIndex: item.emphasis === "hero" ? 19 : 15, left: "50%", top: "50%", width: item.emphasis === "hero" ? "min(210px, 28vw)" : "min(178px, 24vw)", padding: item.emphasis === "hero" ? "9px 11px" : "7px 9px", borderRadius: 11, border: `1px solid ${accent}${item.emphasis === "hero" ? "8f" : "45"}`, background: item.emphasis === "hero" ? "rgba(4,11,20,.93)" : "rgba(4,10,18,.72)", boxShadow: item.emphasis === "hero" ? `0 10px 30px #0008, 0 0 25px ${accent}14` : "0 8px 18px #0005", backdropFilter: "blur(9px)", color: "#eef6ff", pointerEvents: owner ? "auto" : "none", opacity: 0, transition: props.reduced ? "none" : "opacity .16s ease", textAlign: "left",
        };
        return (
          <div key={item.id} ref={el => { labelRefs.current[item.id] = el; }} style={style} onClick={owner ? () => props.onSelect(owner) : undefined} role={owner ? "button" : undefined} tabIndex={owner ? 0 : undefined} onKeyDown={owner ? e => { if (e.key === "Enter" || e.key === " ") props.onSelect(owner); } : undefined}>
            <strong style={{ display: "block", fontSize: item.emphasis === "hero" ? 12.5 : 10.5, lineHeight: 1.15 }}>{item.title}</strong>
            <span style={{ display: "block", marginTop: 3, color: accent, fontSize: item.emphasis === "hero" ? 9.2 : 8.3, lineHeight: 1.35 }}>{item.detail}</span>
          </div>
        );
      })}
      <LaneLegend lane={directed.lane} />
      <PayloadState chapter={props.chapter} currentId={frame.current.id} copyVisible={frame.copyVisible} copyDelivered={frame.copyDelivered} />
    </div>
  );
}

/** Lightweight fallback that follows the same director instead of inventing a second story. */
export function SimpleScene({ chapter, progress, fault, selected, onSelect }: SceneProps) {
  const sequence = sequenceFrame(chapter, progress, fault); const current = sequence.current; const directed = directJourneyScene(chapter, current.id, current.kind); const marker = useId(); const accent = signalColor(chapter,current.kind,sequence.blocked);
  const p: Record<NodeId,[number,number]> = { provider:[135,190],consumer:[585,190],catalog:[270,105],identity:[285,180],policy:[470,110],agreement:[360,210] };
  return <div className={styles.simpleScene}>
    <svg viewBox="0 0 720 360" role="img" aria-label={`${chapters[chapter].title}. ${current.title}`}>
      <defs><marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="context-stroke"/></marker></defs>
      {(["provider","consumer"] as const).map((id,index)=>{const [x,y]=p[id];const c=index?COLORS.consumer:COLORS.provider;const active=directed.actor==="both"||directed.actor===(index?"consumer":"provider");return <g key={id}><circle cx={x} cy={y} r="65" fill="#05101a" stroke={c} strokeWidth={active?2.5:1} opacity={active?1:.45}/><circle cx={x} cy={y} r="17" fill={c} opacity={active?1:.38}/><text x={x} y={y-84} textAnchor="middle" fill="#eaf3ff" fontSize="14">{index?"Company B":"Company A"}</text></g>;})}
      {current.from&&current.to&&<path d={`M${p[current.from][0]} ${p[current.from][1]} Q360 ${current.kind==="data"||current.kind==="retrieval"?285:95} ${p[current.to][0]} ${p[current.to][1]}`} fill="none" stroke={accent} strokeWidth={current.kind==="data"?4:2} markerEnd={`url(#${marker})`}/>} 
      <text x="360" y="32" textAnchor="middle" fill={accent} fontSize="12" fontWeight="700">{current.title}</text>
      {directed.artifacts.map((a,index)=><g key={a.id} transform={`translate(360 ${150+index*48})`}><rect x="-100" y="-17" width="200" height="34" rx="11" fill="#07131f" stroke={artifactColor(a.tone)}/><text x="0" y="-1" textAnchor="middle" fill="#edf6ff" fontSize="11">{a.title}</text><text x="0" y="11" textAnchor="middle" fill={artifactColor(a.tone)} fontSize="8">{a.detail.slice(0,42)}</text></g>)}
    </svg>
    <div className={styles.simpleNodes}>{(["provider","consumer"] as NodeId[]).map(id=><button key={id} onClick={()=>onSelect(id)} aria-pressed={selected===id}>{journeyNodes[id].label}</button>)}</div>
  </div>;
}
