"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { chapters, journeyNodes, type Fault, type NodeId } from "@/lib/data-journey";
import { journeyLayout } from "@/lib/journey-visuals";
import { journeySequences, sequenceFrame, signalStyles, type JourneyBeat } from "@/lib/journey-sequence";
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

type OverlayId = "provider" | "consumer" | "source" | "offer" | "identity" | "policy" | "agreement" | "edr" | "payload" | "message";
type OverlaySpec = {
  id: OverlayId;
  title: string;
  subtitle: string;
  color: string;
  visible: boolean;
  active: boolean;
  priority: number;
  nodeId?: NodeId;
};

type ScreenPoint = { x: number; y: number };
type ScreenRect = { left: number; top: number; right: number; bottom: number };

const providerColor = "#59edcf";
const consumerColor = "#aaa4ff";
const controlColor = "#80caff";
const contractColor = "#f5d786";
const dataColor = "#59edcf";
const faultColor = "#ff7185";

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

function overlapArea(a: ScreenRect, b: ScreenRect, padding = 10) {
  const x = Math.max(0, Math.min(a.right + padding, b.right + padding) - Math.max(a.left - padding, b.left - padding));
  const y = Math.max(0, Math.min(a.bottom + padding, b.bottom + padding) - Math.max(a.top - padding, b.top - padding));
  return x * y;
}

function overlayStyle(spec: OverlaySpec): React.CSSProperties {
  const muted = !spec.active && spec.priority < 50;
  return {
    position: "absolute",
    zIndex: spec.priority,
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    minWidth: spec.active ? 132 : 104,
    maxWidth: "min(230px, 44vw)",
    padding: spec.active ? "8px 12px" : "6px 10px",
    borderRadius: 10,
    border: `1px solid ${spec.color}${spec.active ? "bb" : muted ? "33" : "66"}`,
    background: spec.active ? "rgba(6, 14, 25, .96)" : "rgba(5, 11, 20, .84)",
    boxShadow: spec.active ? `0 0 30px ${spec.color}25, inset 0 1px 0 rgba(255,255,255,.06)` : "inset 0 1px 0 rgba(255,255,255,.025)",
    backdropFilter: "blur(12px)",
    color: spec.active ? "#f7fbff" : "#d9e4f2",
    opacity: spec.visible ? (muted ? .74 : 1) : 0,
    visibility: spec.visible ? "visible" : "hidden",
    pointerEvents: spec.visible && spec.nodeId ? "auto" : "none",
    transition: "opacity .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease",
    cursor: spec.nodeId ? "pointer" : "default",
    font: "inherit",
    lineHeight: 1.12,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
}

function buildOverlaySpecs(props: SceneProps) {
  const sequence = sequenceFrame(props.chapter, props.progress, props.fault);
  const current = sequence.current;
  const focus = props.selected ?? current.focus;
  const moving = !!current.from && !!current.to && (current.status === "active" || current.status === "blocked");

  const identityStep = props.chapter === 3 && ["credential-check", "access-check"].includes(current.id);
  const offerReturning = props.chapter === 3 && ["catalog-response", "offer-found"].includes(current.id);
  const policyStep = (props.chapter === 1 && current.id === "define-policies")
    || props.chapter === 4
    || (props.chapter === 5 && current.id === "contract-policy-check")
    || props.fault === "policy";
  const agreementStep = props.chapter === 5 && ["contract-finalized", "seal"].includes(current.id);
  const edrStep = props.chapter === 6 && ["transfer-start", "edr-ready", "fetch"].includes(current.id);
  const sourceStep = props.chapter === 0 || (props.chapter === 1 && current.id === "register-asset")
    || (props.chapter === 6 && ["read-source", "payload"].includes(current.id))
    || props.fault === "offline";
  const payloadStep = (props.chapter === 6 && current.id === "payload") || props.chapter === 7 || sequence.copyDelivered;
  const providerOfferStep = props.chapter === 1 && ["publish-offer", "offer-ready"].includes(current.id);

  const companyAActive = current.focus === "provider" || current.from === "provider" || current.to === "provider" || identityStep || sourceStep;
  const companyBActive = current.focus === "consumer" || current.from === "consumer" || current.to === "consumer" || offerReturning || edrStep || payloadStep;

  const signalColor = props.fault ? faultColor : props.chapter === 5 ? contractColor : signalStyles[current.kind].color;
  const specs: OverlaySpec[] = [
    { id: "provider", title: "Company A", subtitle: "Supplier · Provider", color: providerColor, visible: true, active: companyAActive, priority: companyAActive ? 62 : 28, nodeId: "provider" },
    { id: "consumer", title: "Company B", subtitle: "Manufacturer · Consumer", color: consumerColor, visible: true, active: companyBActive, priority: companyBActive ? 62 : 28, nodeId: "consumer" },
    { id: "source", title: "Private source", subtitle: current.id === "read-source" ? "Provider reads its backend" : "Original stays at Company A", color: dataColor, visible: sourceStep, active: sourceStep, priority: 78 },
    { id: "offer", title: offerReturning ? "Visible offer" : "Provider offer", subtitle: offerReturning ? "Allowed for Company B" : "Asset + access + usage policies", color: controlColor, visible: providerOfferStep || offerReturning, active: true, priority: 82, nodeId: "catalog" },
    { id: "identity", title: "Identity + access", subtitle: current.id === "access-check" ? "Apply access policy" : "Verify participant credentials", color: journeyNodes.identity.color, visible: identityStep || props.fault === "identity", active: true, priority: 84, nodeId: "identity" },
    { id: "policy", title: props.chapter === 5 ? "Usage-policy check" : props.chapter === 1 ? "Access + usage policies" : "Usage policy", subtitle: props.chapter === 5 ? "Provider evaluates the request" : "Terms for allowed use", color: journeyNodes.policy.color, visible: policyStep, active: true, priority: 80, nodeId: "policy" },
    { id: "agreement", title: sequence.agreementReady ? "Finalized agreement" : "Contract agreement", subtitle: "Control plane · no payload yet", color: contractColor, visible: agreementStep, active: true, priority: 86, nodeId: "agreement" },
    { id: "edr", title: "EDR · access key", subtitle: "Endpoint + authorization", color: controlColor, visible: edrStep, active: true, priority: 84 },
    { id: "payload", title: props.chapter === 7 || sequence.copyDelivered ? "Received copy" : "Actual payload", subtitle: "Battery-footprint record", color: dataColor, visible: payloadStep, active: true, priority: 88 },
    { id: "message", title: current.title, subtitle: current.from && current.to ? `${journeyNodes[current.from].label} → ${journeyNodes[current.to].label}` : "", color: signalColor, visible: moving, active: true, priority: 100 },
  ];
  return { sequence, specs };
}

export default function NeuralScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const overlays = useRef<Partial<Record<OverlayId, HTMLElement | null>>>({});
  const live = useRef(props);
  live.current = props;
  const previousPlacement = useRef<Partial<Record<OverlayId, ScreenPoint>>>({});
  const [unavailable, setUnavailable] = useState(false);

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.1 : 1.45));
    renderer.setClearColor(0x050a12, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a12, .014);
    let width = 1;
    let height = 1;
    let layout = journeyLayout(1);
    const vec = (id: NodeId) => new THREE.Vector3(...layout.positions[id]);

    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(0, .1, layout.distance);
    const cameraTarget = camera.position.clone();
    const lookAt = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const pointer = new THREE.Vector2();

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
    const material = <T extends THREE.Material>(m: T) => { materials.add(m); return m; };

    const pbr = (color: THREE.ColorRepresentation, emissive = .18) => material(new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: emissive, roughness: .3, metalness: .48,
    }));
    const lineMat = (color: THREE.ColorRepresentation, opacity = .18) => material(new THREE.LineBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const glowPoints = (color: string, size: number, positions: number[]) => {
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const m = material(new THREE.ShaderMaterial({
        uniforms: { tint: { value: new THREE.Color(color) }, size: { value: size }, opacity: { value: 1 }, energy: { value: 1 } },
        vertexShader: "uniform float size;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(84.0,size*150.0/-p.z);gl_Position=projectionMatrix*p;}",
        fragmentShader: "uniform vec3 tint;uniform float opacity;uniform float energy;void main(){float d=length(gl_PointCoord-vec2(.5))*2.;if(d>1.)discard;float a=pow(1.-d,3.2);gl_FragColor=vec4(tint*energy,a*opacity);}",
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      return new THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>(g, m);
    };

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environmentTarget = pmrem.fromScene(room, .04);
    room.dispose();
    pmrem.dispose();
    scene.environment = environmentTarget.texture;
    scene.add(new THREE.HemisphereLight(0xb8dcff, 0x03070d, 1.3));
    const key = new THREE.DirectionalLight(0xd8f5ff, 1.9); key.position.set(-5, 7, 8);
    const rim = new THREE.DirectionalLight(0xb8aaff, 1.6); rim.position.set(6, -2, 6);
    const activeLight = new THREE.PointLight(0x80caff, 0, 8, 2);
    scene.add(key, rim, activeLight);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .48, .36, 1.06);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const hitMeshes: THREE.Object3D[] = [];

    type World = {
      group: THREE.Group;
      core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      shell: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      network: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      nodes: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
      rings: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
    };

    function createWorld(id: "provider" | "consumer", color: string, seed: number): World {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.42, 2)), pbr(color, .55));
      core.userData.nodeId = id;
      hitMeshes.push(core);
      group.add(core);
      const shell = new THREE.Mesh(
        geometry(new THREE.IcosahedronGeometry(1.58, 2)),
        material(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .1, depthWrite: false })),
      );
      group.add(shell);
      const rings = [0, 1].map((_, index) => {
        const ring = new THREE.Mesh(
          geometry(new THREE.TorusGeometry(1.18 + index * .2, .011, 6, 72)),
          material(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .12, depthWrite: false })),
        );
        ring.rotation.set(.55 + index * .8, index * .9, .3 + index * .45);
        group.add(ring);
        return ring;
      });
      const rand = seeded(seed);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 24; i++) {
        const theta = i * 2.399963;
        const phi = Math.acos(1 - 2 * (i + .5) / 24);
        const radius = .72 + rand() * .68;
        pts.push(new THREE.Vector3(Math.cos(theta) * Math.sin(phi) * radius, Math.sin(theta) * Math.sin(phi) * radius * .86, Math.cos(phi) * radius * .82));
      }
      const edges: number[] = [];
      pts.forEach((point, i) => {
        let nearest = -1, distance = Infinity;
        pts.forEach((candidate, j) => {
          if (i === j) return;
          const d = point.distanceToSquared(candidate);
          if (d < distance) { distance = d; nearest = j; }
        });
        if (nearest > i) edges.push(...point.toArray(), ...pts[nearest].toArray());
      });
      const edgeGeometry = geometry(new THREE.BufferGeometry());
      edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edges, 3));
      const network = new THREE.LineSegments(edgeGeometry, lineMat(color, .17));
      const nodes = glowPoints(color, 2.35, pts.flatMap(point => point.toArray()));
      nodes.material.uniforms.opacity.value = .68;
      group.add(network, nodes);
      scene.add(group);
      return { group, core, shell, network, nodes, rings };
    }

    type Glyph = {
      id: "catalog" | "identity" | "policy";
      group: THREE.Group;
      core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      halo: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    };
    function createGlyph(id: Glyph["id"], shape: THREE.BufferGeometry) {
      const color = journeyNodes[id].color;
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(shape), pbr(color, .4));
      core.userData.nodeId = id;
      hitMeshes.push(core);
      const halo = glowPoints(color, 8, [0, 0, 0]);
      halo.material.uniforms.opacity.value = .3;
      group.add(core, halo);
      scene.add(group);
      return { id, group, core, halo } as Glyph;
    }

    const providerWorld = createWorld("provider", providerColor, 91);
    const consumerWorld = createWorld("consumer", consumerColor, 133);
    const offerGlyph = createGlyph("catalog", new THREE.BoxGeometry(.42, .3, .16));
    const identityGlyph = createGlyph("identity", new THREE.OctahedronGeometry(.29, 1));
    const policyGlyph = createGlyph("policy", new THREE.TetrahedronGeometry(.35, 1));

    const source = new THREE.Group();
    const sourceCore = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.25, 1)), pbr(dataColor, 1.2));
    const sourceShell = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.4, 1)), material(new THREE.MeshBasicMaterial({ color: dataColor, wireframe: true, transparent: true, opacity: .34, depthWrite: false })));
    source.add(sourceCore, sourceShell); scene.add(source);

    const agreement = new THREE.Group();
    const agreementCore = new THREE.Mesh(geometry(new THREE.DodecahedronGeometry(.46, 1)), material(new THREE.MeshPhysicalMaterial({
      color: "#86671c", emissive: contractColor, emissiveIntensity: 1.3, metalness: .82, roughness: .17, clearcoat: .9, clearcoatRoughness: .08,
    })));
    agreementCore.userData.nodeId = "agreement"; hitMeshes.push(agreementCore);
    const agreementHalo = glowPoints(contractColor, 11, [0, 0, 0]); agreementHalo.material.uniforms.energy.value = 2;
    agreement.add(agreementCore, agreementHalo); scene.add(agreement);
    const fragments = Array.from({ length: 7 }, (_, i) => {
      const mesh = new THREE.Mesh(geometry(new THREE.TetrahedronGeometry(.14)), pbr(contractColor, 1));
      mesh.userData.phase = i * Math.PI * 2 / 7; scene.add(mesh); return mesh;
    });

    const edr = new THREE.Group();
    const edrRing = new THREE.Mesh(geometry(new THREE.TorusGeometry(.2, .048, 8, 36)), pbr(controlColor, 1.7));
    const edrBar = new THREE.Mesh(geometry(new THREE.BoxGeometry(.34, .08, .08)), pbr(controlColor, 1.7)); edrBar.position.x = .29;
    const edrGlow = glowPoints(controlColor, 8, [0, 0, 0]); edr.add(edrRing, edrBar, edrGlow); scene.add(edr);

    const payload = new THREE.Group();
    const payloadCore = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.25, 1)), pbr(dataColor, 2));
    const payloadShell = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.41, 1)), material(new THREE.MeshBasicMaterial({ color: dataColor, wireframe: true, transparent: true, opacity: .48, depthWrite: false })));
    const payloadGlow = glowPoints(dataColor, 11, [0, 0, 0]); payloadGlow.material.uniforms.energy.value = 2.2;
    payload.add(payloadCore, payloadShell, payloadGlow); scene.add(payload);
    const payloadWake = glowPoints(dataColor, 3.4, new Array(10 * 3).fill(0)); payloadWake.frustumCulled = false; scene.add(payloadWake);

    type Path = { beat: JourneyBeat; chapter: number; curve: THREE.CubicBezierCurve3; line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>; token: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; trail: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> };
    const paths: Path[] = [];
    const tokenGeometry = (beat: JourneyBeat) => beat.id.includes("contract")
      ? geometry(new THREE.OctahedronGeometry(.14, 1))
      : beat.id.includes("version")
        ? geometry(new THREE.TorusGeometry(.14, .03, 8, 28))
        : geometry(new THREE.BoxGeometry(.22, .12, .065));

    journeySequences.forEach((beats, chapter) => beats.forEach(beat => {
      if (!beat.from || !beat.to) return;
      const color = chapter === 5 ? contractColor : signalStyles[beat.kind].color;
      const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
      const g = geometry(new THREE.BufferGeometry()); g.setAttribute("position", new THREE.Float32BufferAttribute(new Array(101 * 3).fill(0), 3));
      const line = new THREE.Line(g, lineMat(color, .07));
      const token = new THREE.Mesh(tokenGeometry(beat), pbr(color, 1.75));
      const trail = glowPoints(color, beat.kind === "data" ? 4.2 : 3.1, new Array(8 * 3).fill(0)); trail.frustumCulled = false;
      scene.add(line, token, trail); paths.push({ beat, chapter, curve, line, token, trail });
    }));

    const dustRand = seeded(7); const dustPositions: number[] = [];
    for (let i = 0; i < 68; i++) dustPositions.push((dustRand() - .5) * 24, (dustRand() - .5) * 9, (dustRand() - .5) * 8 - 2);
    const dust = glowPoints("#6487a5", .95, dustPositions); dust.material.uniforms.opacity.value = .16; dust.material.uniforms.energy.value = .4; scene.add(dust);

    function updatePathGeometry(item: Path) {
      const a = vec(item.beat.from!); const b = vec(item.beat.to!);
      const dataLane = item.beat.kind === "data" || item.beat.kind === "retrieval";
      const liftY = dataLane ? -1 : .86;
      const liftZ = item.beat.kind === "data" ? 1.45 : item.beat.kind === "retrieval" ? 1.12 : .78;
      item.curve.v0.copy(a); item.curve.v3.copy(b);
      item.curve.v1.copy(a).lerp(b, .34).add(new THREE.Vector3(0, liftY, liftZ));
      item.curve.v2.copy(a).lerp(b, .66).add(new THREE.Vector3(0, liftY, liftZ));
      const attr = item.line.geometry.getAttribute("position") as THREE.BufferAttribute;
      const p = new THREE.Vector3();
      for (let i = 0; i <= 100; i++) { item.curve.getPoint(i / 100, p); attr.setXYZ(i, p.x, p.y, p.z); }
      attr.needsUpdate = true; item.line.geometry.computeBoundingSphere();
    }

    function syncLayout() {
      providerWorld.group.position.copy(vec("provider")); consumerWorld.group.position.copy(vec("consumer"));
      offerGlyph.group.position.copy(vec("catalog")); identityGlyph.group.position.copy(vec("identity")); policyGlyph.group.position.copy(vec("policy"));
      const compact = camera.aspect < .9; const worldScale = compact ? .78 : .96;
      providerWorld.group.scale.setScalar(worldScale); consumerWorld.group.scale.setScalar(worldScale);
      source.position.copy(vec("provider")).add(new THREE.Vector3(0, -1.18 * worldScale, .7));
      agreement.position.copy(vec("agreement"));
      paths.forEach(updatePathGeometry);
      camera.position.set(0, .1, layout.distance); cameraTarget.copy(camera.position); lookAt.set(0, 0, 0); lookTarget.set(0, 0, 0);
    }

    const resize = new ResizeObserver(() => {
      width = Math.max(1, element.clientWidth); height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height); composer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
      layout = journeyLayout(camera.aspect); syncLayout();
    });
    resize.observe(element);

    const raycaster = new THREE.Raycaster(); const rayPointer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    };
    const resetPointer = () => pointer.set(0, 0);
    const onPointerDown = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      rayPointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
      raycaster.setFromCamera(rayPointer, camera);
      const hit = raycaster.intersectObjects(hitMeshes, false)[0]?.object;
      const id = hit?.userData.nodeId as NodeId | undefined; if (id) live.current.onSelect(id);
    };
    element.addEventListener("pointermove", onPointerMove, { passive: true }); element.addEventListener("pointerleave", resetPointer); element.addEventListener("pointerdown", onPointerDown);

    const temp = new THREE.Vector3(); const projected = new THREE.Vector3();

    function toScreen(world: THREE.Vector3): ScreenPoint {
      projected.copy(world).project(camera);
      return { x: (projected.x * .5 + .5) * width, y: (-projected.y * .5 + .5) * height };
    }

    function preferredOffset(id: OverlayId, chapter: number): [number, number] {
      if (id === "provider") return [-78, -122];
      if (id === "consumer") return [78, -122];
      if (id === "source") return [-84, 62];
      if (id === "offer") return chapter === 3 ? [-92, -92] : [92, -86];
      if (id === "identity") return [92, -8];
      if (id === "policy") return [-92, -64];
      if (id === "agreement") return [0, -86];
      if (id === "edr") return [-82, -72];
      if (id === "payload") return [0, -74];
      return [0, -78];
    }

    function layoutLabels(anchorMap: Partial<Record<OverlayId, THREE.Vector3>>, chapter: number) {
      const labels = (Object.keys(overlays.current) as OverlayId[])
        .map(id => ({ id, el: overlays.current[id]! }))
        .filter(item => item.el && item.el.dataset.visible === "true")
        .sort((a, b) => Number(b.el.dataset.priority || 0) - Number(a.el.dataset.priority || 0));
      const placed: ScreenRect[] = [];
      const margin = width < 720 ? 12 : 20;
      labels.forEach(({ id, el }) => {
        const anchorWorld = anchorMap[id]; if (!anchorWorld) return;
        const anchor = toScreen(anchorWorld); const pref = preferredOffset(id, chapter);
        const w = Math.max(86, el.offsetWidth || 110); const h = Math.max(34, el.offsetHeight || 42);
        const candidates: [number, number][] = [
          pref,
          [pref[0] + 120, pref[1]], [pref[0] - 120, pref[1]],
          [pref[0], pref[1] - 72], [pref[0], pref[1] + 72],
          [pref[0] + 94, pref[1] - 62], [pref[0] - 94, pref[1] - 62],
          [pref[0] + 94, pref[1] + 62], [pref[0] - 94, pref[1] + 62],
        ];
        const previous = previousPlacement.current[id];
        let best = { x: anchor.x + pref[0], y: anchor.y + pref[1], score: Infinity, rect: { left: 0, top: 0, right: 0, bottom: 0 } };
        candidates.forEach(([dx, dy], index) => {
          const x = THREE.MathUtils.clamp(anchor.x + dx, margin + w / 2, width - margin - w / 2);
          const y = THREE.MathUtils.clamp(anchor.y + dy, margin + h / 2, height - margin - h / 2);
          const rect = { left: x - w / 2, top: y - h / 2, right: x + w / 2, bottom: y + h / 2 };
          const collision = placed.reduce((sum, other) => sum + overlapArea(rect, other), 0);
          const preferencePenalty = Math.hypot(dx - pref[0], dy - pref[1]) * 1.2 + index * 2;
          const movementPenalty = previous ? Math.hypot(x - previous.x, y - previous.y) * .12 : 0;
          const score = collision * 30 + preferencePenalty + movementPenalty;
          if (score < best.score) best = { x, y, score, rect };
        });
        el.style.left = `${best.x}px`; el.style.top = `${best.y}px`; placed.push(best.rect); previousPlacement.current[id] = { x: best.x, y: best.y };
      });
    }

    let raf = 0, lastRender = 0, disposed = false;
    function render(now: number) {
      if (disposed) return; raf = requestAnimationFrame(render); const p = live.current; if (document.hidden) return;
      const mobile = width < 720; const frameGap = p.paused || p.reduced ? 100 : mobile ? 1000 / 30 : 1000 / 45;
      if (now - lastRender < frameGap) return; lastRender = now;

      const sequence = sequenceFrame(p.chapter, p.progress, p.fault); const current = sequence.current;
      const t = p.reduced ? 0 : sequence.position * chapters[p.chapter].duration; const focus = vec(p.selected ?? current.focus); const parallax = mobile || p.reduced ? 0 : 1;
      const push = [-.1, .04, .12, -.12, -.06, -.34, .24, .02][p.chapter] ?? 0;
      cameraTarget.set(pointer.x * .2 * parallax + focus.x * .012, .08 + pointer.y * .1 * parallax + focus.y * .01, layout.distance + push);
      lookTarget.set(focus.x * .03 * parallax, focus.y * .022 * parallax, focus.z * .06 * parallax);
      if (!p.paused) { camera.position.lerp(cameraTarget, p.reduced ? 1 : .055); lookAt.lerp(lookTarget, p.reduced ? 1 : .065); }
      camera.lookAt(lookAt);

      const signalColor = new THREE.Color(p.fault ? faultColor : p.chapter === 5 ? contractColor : signalStyles[current.kind].color);
      activeLight.color.copy(signalColor); activeLight.position.copy(focus).add(new THREE.Vector3(0, .5, 2.3)); activeLight.intensity = current.status === "active" || sequence.blocked ? 2.7 : .6;

      const providerActive = current.from === "provider" || current.to === "provider" || current.focus === "provider" || current.focus === "identity";
      const consumerActive = current.from === "consumer" || current.to === "consumer" || current.focus === "consumer";
      [providerWorld, consumerWorld].forEach((world, index) => {
        const active = index === 0 ? providerActive : consumerActive; const activated = index === 0 || p.chapter >= 2;
        world.group.rotation.y = Math.sin(t * .1 + index) * .1 + pointer.x * .025 * parallax * (index ? 1 : -1); world.group.rotation.x = pointer.y * .016 * parallax;
        world.core.rotation.set(t * .14, t * .23 * (index ? -1 : 1), .12); world.shell.rotation.y = -t * .045 * (index ? 1 : -1);
        world.core.material.emissiveIntensity = active ? 1.05 : activated ? .42 : .15; world.shell.material.opacity = active ? .2 : .09;
        world.network.material.opacity = active ? .3 : .11; world.nodes.material.uniforms.opacity.value = active ? .85 : .45; world.nodes.material.uniforms.energy.value = active ? 1.3 : .65;
        world.rings.forEach((ring, i) => { ring.rotation.y += p.reduced ? 0 : .0008 * (i + 1) * (index ? -1 : 1); ring.material.opacity = active ? .28 - i * .05 : .08; });
      });

      const identityVisible = p.chapter === 3 && (["credential-check", "access-check"].includes(current.id) || p.fault === "identity");
      const offerProviderVisible = p.chapter === 1 && ["publish-offer", "offer-ready"].includes(current.id);
      const offerReturn = p.chapter === 3 ? sequence.beats.find(beat => beat.id === "catalog-response") : undefined;
      const offerConsumerVisible = p.chapter === 3 && ["catalog-response", "offer-found"].includes(current.id);
      const policyVisible = (p.chapter === 1 && current.id === "define-policies") || p.chapter === 4 || (p.chapter === 5 && current.id === "contract-policy-check") || p.fault === "policy";

      identityGlyph.group.visible = identityVisible; policyGlyph.group.visible = policyVisible; offerGlyph.group.visible = offerProviderVisible || offerConsumerVisible;
      identityGlyph.group.position.copy(vec("identity"));
      policyGlyph.group.position.copy(p.chapter === 4 ? vec("consumer").add(new THREE.Vector3(-1.2, 1.22, .62)) : vec("policy"));
      if (offerProviderVisible) offerGlyph.group.position.copy(vec("catalog"));
      if (offerConsumerVisible) {
        const target = vec("consumer").add(new THREE.Vector3(-1.35, 1.22, .68));
        const alpha = offerReturn?.status === "active" ? smooth(offerReturn.fraction) : 1;
        offerGlyph.group.position.copy(vec("catalog")).lerp(target, alpha);
      }
      [identityGlyph, policyGlyph, offerGlyph].forEach(glyph => {
        if (!glyph.group.visible) return; glyph.core.rotation.set(t * .17, t * .3, t * .1); glyph.core.material.emissiveIntensity = 1.45; glyph.halo.material.uniforms.opacity.value = .8;
      });

      source.visible = p.chapter === 0 || (p.chapter === 1 && current.id === "register-asset") || (p.chapter === 6 && ["read-source", "payload"].includes(current.id)) || p.fault === "offline";
      sourceCore.rotation.set(t * .22, t * .44, .2); sourceShell.rotation.set(-t * .13, t * .2, .1);

      const finalized = sequence.beats.find(beat => beat.id === "contract-finalized"); const seal = sequence.beats.find(beat => beat.id === "seal");
      const assembling = p.chapter === 5 && finalized?.status === "active"; const assembly = sequence.agreementReady ? smooth(seal?.fraction ?? 1) : assembling ? smooth(finalized?.fraction ?? 0) * .78 : 0;
      agreement.visible = p.chapter > 5 || sequence.agreementReady || assembling; agreement.scale.setScalar(p.chapter > 5 ? .58 : .3 + Math.max(.05, assembly) * .9); agreementCore.rotation.set(t * .16, t * .3, .18);
      (agreementCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = p.chapter > 5 ? .55 : 1.1 + assembly * 1.4;
      fragments.forEach((fragment, i) => {
        const show = p.chapter === 5 && (assembling || sequence.agreementReady) && assembly < .96 && !p.reduced; fragment.visible = show; if (!show) return;
        const phase = fragment.userData.phase as number; const radius = THREE.MathUtils.lerp(1.42, .14, assembly);
        fragment.position.copy(vec("agreement")).add(new THREE.Vector3(Math.cos(phase + t * .16) * radius, Math.sin(phase + t * .16) * radius * .6, Math.sin(phase * 1.6) * .68 * (1 - assembly)));
        fragment.rotation.set(t * .42 + i, t * .35 + phase, t * .26);
      });

      let activePath: Path | undefined;
      paths.forEach(item => {
        const beat = item.chapter === p.chapter ? sequence.beats.find(candidate => candidate.id === item.beat.id) : undefined;
        const active = beat?.status === "active"; const done = beat?.status === "done"; const fraction = beat?.fraction ?? 0;
        item.line.visible = !!(active || done); item.line.material.opacity = active ? .58 : done ? .018 : 0; item.line.geometry.setDrawRange(0, Math.floor(101 * (done || p.reduced ? 1 : smooth(fraction))));
        const custom = item.beat.id === "transfer-start" || item.beat.id === "payload";
        item.token.visible = !!(active && !custom); item.trail.visible = !!(active && !custom && !p.reduced); if (active) activePath = item;
        if (active && !custom) {
          item.curve.getPoint(smooth(fraction), item.token.position); item.token.rotation.set(t * .26, t * .44, t * .18);
          const attr = item.trail.geometry.getAttribute("position") as THREE.BufferAttribute;
          for (let i = 0; i < 8; i++) { item.curve.getPoint(smooth(Math.max(0, fraction - i * .024)), temp); attr.setXYZ(i, temp.x, temp.y, temp.z); }
          attr.needsUpdate = true;
        }
      });

      const transferStart = sequence.beats.find(beat => beat.id === "transfer-start"); const transferPath = paths.find(item => item.beat.id === "transfer-start");
      const edrStage = p.chapter === 6 && ["transfer-start", "edr-ready", "fetch"].includes(current.id);
      edr.visible = edrStage;
      if (edr.visible) {
        if (transferStart?.status === "active" && transferPath) transferPath.curve.getPoint(smooth(transferStart.fraction), edr.position);
        else edr.position.copy(vec("consumer")).add(new THREE.Vector3(-.3, 1.02, .72));
        edr.rotation.set(.2, t * .4, t * .1);
      }

      const payloadBeat = sequence.beats.find(beat => beat.id === "payload"); const payloadPath = paths.find(item => item.beat.id === "payload");
      payload.visible = (p.chapter === 6 && current.id === "payload") || p.chapter === 7 || sequence.copyDelivered;
      payloadWake.visible = p.chapter === 6 && payloadBeat?.status === "active" && !p.reduced;
      if (payload.visible) {
        if (p.chapter === 7 || sequence.copyDelivered) payload.position.copy(vec("consumer")).add(new THREE.Vector3(0, -1.04, .72));
        else if (payloadPath) payloadPath.curve.getPoint(smooth(payloadBeat?.fraction ?? 0), payload.position);
        payloadCore.rotation.set(t * .32, t * .56, t * .16); payloadShell.rotation.set(-t * .2, t * .36, t * .24);
      }
      if (payloadWake.visible && payloadPath && payloadBeat) {
        const attr = payloadWake.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < 10; i++) { payloadPath.curve.getPoint(smooth(Math.max(0, payloadBeat.fraction - i * .02)), temp); attr.setXYZ(i, temp.x, temp.y, temp.z); }
        attr.needsUpdate = true;
      }

      const anchors: Partial<Record<OverlayId, THREE.Vector3>> = {
        provider: providerWorld.group.position.clone(), consumer: consumerWorld.group.position.clone(),
        source: source.position.clone(), offer: offerGlyph.group.position.clone(), identity: identityGlyph.group.position.clone(), policy: policyGlyph.group.position.clone(),
        agreement: agreement.position.clone(), edr: edr.position.clone(), payload: payload.position.clone(),
      };
      if (activePath && activePath.token.visible) anchors.message = activePath.token.position.clone();
      else if (current.id === "transfer-start" && edr.visible) anchors.message = edr.position.clone();
      else if (current.id === "payload" && payload.visible) anchors.message = payload.position.clone();
      layoutLabels(anchors, p.chapter);

      dust.rotation.y = t * .0035;
      if (!mobile && !p.reduced) composer.render(); else renderer.render(scene, camera);
    }

    syncLayout(); raf = requestAnimationFrame(render);
    const lost = (event: Event) => { event.preventDefault(); setUnavailable(true); cancelAnimationFrame(raf); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true; cancelAnimationFrame(raf); resize.disconnect();
      element.removeEventListener("pointermove", onPointerMove); element.removeEventListener("pointerleave", resetPointer); element.removeEventListener("pointerdown", onPointerDown); renderer.domElement.removeEventListener("webglcontextlost", lost);
      composer.dispose(); environmentTarget.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  if (unavailable) return <SimpleScene {...props} />;

  const { specs } = buildOverlaySpecs(props);
  return <div ref={host} className={styles.canvas} role="group" aria-label="Cinematic conceptual Tractus-X exchange with collision-aware semantic labels and one dominant action at a time.">
    {specs.map(spec => {
      const content = <>
        <span style={{ fontSize: spec.active ? "clamp(11px,1vw,13px)" : "clamp(10px,.9vw,12px)", fontWeight: 680, letterSpacing: ".005em" }}>{spec.title}</span>
        <small style={{ fontSize: "clamp(8px,.72vw,10px)", color: spec.color, opacity: spec.active ? .88 : .7 }}>{spec.subtitle}</small>
      </>;
      const common = {
        ref: (el: HTMLElement | null) => { overlays.current[spec.id] = el; },
        style: overlayStyle(spec),
        "data-visible": spec.visible ? "true" : "false",
        "data-priority": String(spec.priority),
      };
      if (spec.nodeId) return <button key={spec.id} {...common} type="button" onClick={() => props.onSelect(spec.nodeId!)} aria-pressed={props.selected === spec.nodeId} tabIndex={spec.visible ? 0 : -1}>{content}</button>;
      return <div key={spec.id} {...common} aria-hidden={!spec.visible}>{content}</div>;
    })}
  </div>;
}

export function SimpleScene({ chapter, progress, fault, selected, onSelect }: SceneProps) {
  const sequence = sequenceFrame(chapter, progress, fault); const marker = useId();
  const positions: Record<NodeId, [number, number]> = { provider: [115, 180], consumer: [605, 180], catalog: [250, 82], identity: [320, 112], policy: [470, 82], agreement: [360, 270] };
  return <div className={styles.simpleScene}>
    <svg viewBox="0 0 720 360" role="img" aria-label={`${chapters[chapter].title}. ${fault ? "Failure snapshot." : sequence.current.title}`}>
      <defs><marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="context-stroke"/></marker></defs>
      {sequence.beats.filter(beat => beat.from && beat.to && (beat.status === "active" || beat.status === "done")).map(beat => {
        const a = positions[beat.from!], b = positions[beat.to!]; const dataLane = beat.kind === "data" || beat.kind === "retrieval"; const bend = dataLane ? 88 : -76;
        return <path key={beat.id} d={`M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 + bend} ${b[0]} ${b[1]}`} fill="none" stroke={chapter === 5 ? contractColor : signalStyles[beat.kind].color} opacity={beat.status === "active" ? 1 : .08} strokeWidth={beat.kind === "data" ? 4 : 2} markerEnd={`url(#${marker})`}/>;
      })}
      {(["provider", "consumer"] as const).map(id => { const [x, y] = positions[id]; const color = id === "provider" ? providerColor : consumerColor; const active = sequence.current.focus === id; return <g key={id}><circle cx={x} cy={y} r="62" fill="#07131f" stroke={color} strokeWidth={active ? 3 : 1.5}/><circle cx={x} cy={y} r="18" fill={color} opacity={active ? 1 : .6}/><text x={x} y={y + 88} fill="#e6f1ff" textAnchor="middle" fontSize="16">{journeyNodes[id].label}</text></g>; })}
      {chapter === 3 && ["credential-check", "access-check"].includes(sequence.current.id) && <g><circle cx="320" cy="112" r="18" fill="#0b1724" stroke={journeyNodes.identity.color}/><text x="320" y="78" fill="#dbe8f7" textAnchor="middle" fontSize="11">Identity + access</text></g>}
      {chapter === 5 && sequence.agreementReady && <><path d="M360 248 l22 22 -22 22 -22 -22 Z" fill="none" stroke={contractColor} strokeWidth="3"/><text x="360" y="322" fill={contractColor} textAnchor="middle" fontSize="10">Finalized agreement</text></>}
      {sequence.edrReady && chapter === 6 && <><circle cx="545" cy="135" r="11" fill="none" stroke={controlColor} strokeWidth="4"/><text x="545" y="110" fill={controlColor} textAnchor="middle" fontSize="10">EDR · access key</text></>}
      {sequence.copyVisible && <><path transform={`translate(${sequence.copyDelivered ? 605 : 360} 214)`} d="M0 -10 l10 10 -10 10 -10 -10 Z" fill={dataColor}/><text x={sequence.copyDelivered ? 605 : 360} y="242" fill={dataColor} textAnchor="middle" fontSize="10">{sequence.copyDelivered ? "Received copy" : "Actual payload"}</text></>}
      {sequence.current.from && sequence.current.to && <text x="360" y="34" fill={chapter === 5 ? contractColor : signalStyles[sequence.current.kind].color} textAnchor="middle" fontSize="12">{sequence.current.title}</text>}
    </svg>
    <div className={styles.simpleNodes}>{(["provider", "consumer", "catalog", "identity", "policy", "agreement"] as NodeId[]).map(id => <button key={id} onClick={() => onSelect(id)} aria-pressed={selected === id}>{journeyNodes[id].label}</button>)}</div>
  </div>;
}
