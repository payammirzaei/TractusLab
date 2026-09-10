"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { chapters, type NodeId } from "@/lib/data-journey";
import { directJourneyScene, directorArtifactOwners, type DirectedArtifact, type SceneArtifact } from "@/lib/journey-director";
import { edcRouteForBeat, type EdcPoint, type EdcRoute } from "@/lib/journey-edc-topology";
import { sequenceFrame, signalStyles } from "@/lib/journey-sequence";
import styles from "./journey.module.css";
import { SimpleScene, type SceneProps } from "./NeuralScene";

const COLORS = {
  provider: "#59edcf",
  consumer: "#aaa4ff",
  control: "#63bfff",
  data: "#55efc8",
  agreement: "#f5d786",
  usage: "#ffb567",
  fault: "#ff7185",
  tractus: "#79d7ff",
} as const;

type FixedLabel = "provider-system" | "provider-edc" | "consumer-edc" | "consumer-system";

type BusinessWorld = {
  group: THREE.Group;
  core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  shell: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  nodes: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
};

type Connector = {
  group: THREE.Group;
  frame: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  control: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  data: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  spine: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  controlRing: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  dataRing: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
};

type Artifact = {
  group: THREE.Group;
  cores: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[];
};

const smooth = (value: number) => {
  const n = THREE.MathUtils.clamp(value, 0, 1);
  return n * n * (3 - 2 * n);
};

function toneColor(tone: DirectedArtifact["tone"]) {
  return COLORS[tone];
}

function TopologyOverlay() {
  return (
    <div style={{ position: "absolute", zIndex: 22, top: 8, left: "50%", transform: "translateX(-50%)", display: "grid", justifyItems: "center", gap: 3, pointerEvents: "none", textAlign: "center" }}>
      <strong style={{ fontSize: "clamp(10px,1vw,13px)", letterSpacing: ".15em", color: "#dff4ff", fontWeight: 760 }}>TRACTUS-X FEDERATED DATASPACE</strong>
      <span style={{ fontSize: 8.5, color: "#66829a", letterSpacing: ".08em" }}>EDC ↔ EDC · no direct company-to-company protocol link</span>
    </div>
  );
}

function SystemLabel({
  labelRef,
  title,
  detail,
  accent,
  active,
  onClick,
  pressed,
}: {
  labelRef: (node: HTMLButtonElement | null) => void;
  title: string;
  detail: string;
  accent: string;
  active: boolean;
  onClick: () => void;
  pressed: boolean;
}) {
  return (
    <button
      ref={labelRef}
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      style={{
        position: "absolute",
        zIndex: 18,
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-100%)",
        border: `1px solid ${accent}${active ? "84" : "34"}`,
        background: active ? "rgba(5,15,23,.9)" : "rgba(4,9,16,.68)",
        color: "#eaf4ff",
        padding: "7px 10px",
        borderRadius: 10,
        display: "grid",
        gap: 2,
        minWidth: 116,
        font: "inherit",
        textAlign: "center",
        opacity: 0,
        cursor: "pointer",
        boxShadow: active ? `0 0 24px ${accent}18` : "none",
      }}
    >
      <strong style={{ fontSize: 11.5 }}>{title}</strong>
      <small style={{ fontSize: 8.3, color: accent }}>{detail}</small>
    </button>
  );
}

function EdcLabel({
  labelRef,
  role,
  active,
  side,
}: {
  labelRef: (node: HTMLDivElement | null) => void;
  role: string;
  active: boolean;
  side: "provider" | "consumer";
}) {
  const accent = side === "provider" ? COLORS.provider : COLORS.consumer;
  return (
    <div
      ref={labelRef}
      style={{
        position: "absolute",
        zIndex: 21,
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-100%)",
        width: "min(190px,24vw)",
        border: `1px solid ${COLORS.tractus}${active ? "9c" : "52"}`,
        background: active ? "rgba(5,15,26,.95)" : "rgba(4,10,18,.84)",
        borderRadius: 12,
        padding: "8px 10px",
        color: "#edf8ff",
        textAlign: "center",
        opacity: 0,
        pointerEvents: "none",
        boxShadow: active ? `0 0 30px ${COLORS.tractus}22` : "none",
      }}
    >
      <div style={{ fontSize: 8, letterSpacing: ".13em", color: COLORS.tractus, fontWeight: 800 }}>TRACTUS-X EDC</div>
      <strong style={{ display: "block", fontSize: 12.5, marginTop: 2 }}>{role}</strong>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 6 }}>
        <span style={{ border: `1px solid ${COLORS.control}4d`, color: COLORS.control, borderRadius: 999, padding: "3px 5px", fontSize: 7.5, fontWeight: 720 }}>CONTROL PLANE</span>
        <span style={{ border: `1px solid ${COLORS.data}4d`, color: COLORS.data, borderRadius: 999, padding: "3px 5px", fontSize: 7.5, fontWeight: 720 }}>DATA PLANE</span>
      </div>
      <small style={{ display: "block", marginTop: 5, color: accent, fontSize: 7.8 }}>{side === "provider" ? "Operated by Company A" : "Operated by Company B"}</small>
    </div>
  );
}

function ArtifactLabel({
  item,
  labelRef,
  onSelect,
}: {
  item: DirectedArtifact;
  labelRef: (node: HTMLDivElement | null) => void;
  onSelect?: () => void;
}) {
  const accent = toneColor(item.tone);
  const style: CSSProperties = {
    position: "absolute",
    zIndex: item.emphasis === "hero" ? 20 : 16,
    left: "50%",
    top: "50%",
    width: item.emphasis === "hero" ? "min(214px,27vw)" : "min(174px,22vw)",
    padding: item.emphasis === "hero" ? "9px 11px" : "7px 9px",
    borderRadius: 11,
    border: `1px solid ${accent}${item.emphasis === "hero" ? "8d" : "42"}`,
    background: item.emphasis === "hero" ? "rgba(4,11,20,.94)" : "rgba(4,10,18,.78)",
    boxShadow: item.emphasis === "hero" ? `0 10px 30px #0008,0 0 24px ${accent}16` : "0 8px 18px #0005",
    color: "#edf6ff",
    opacity: 0,
    pointerEvents: onSelect ? "auto" : "none",
    textAlign: "left",
    cursor: onSelect ? "pointer" : "default",
    backdropFilter: "blur(9px)",
  };
  return (
    <div ref={labelRef} style={style} onClick={onSelect}>
      <strong style={{ display: "block", fontSize: item.emphasis === "hero" ? 12.5 : 10.8 }}>{item.title}</strong>
      <small style={{ display: "block", color: "#8fa5b9", fontSize: item.emphasis === "hero" ? 8.8 : 8, lineHeight: 1.35, marginTop: 3 }}>{item.detail}</small>
    </div>
  );
}

function StoryRail({ labels, active, chapter }: { labels: string[]; active: number; chapter: number }) {
  const accent = chapter === 5 ? COLORS.agreement : chapter === 6 ? COLORS.data : COLORS.control;
  return (
    <div style={{ position: "absolute", zIndex: 17, top: 40, left: "50%", transform: "translateX(-50%)", width: "min(520px,52vw)", display: "grid", gridTemplateColumns: `repeat(${labels.length},1fr)`, pointerEvents: "none" }}>
      {labels.map((label, index) => (
        <div key={label} style={{ display: "grid", justifyItems: "center", gap: 4, position: "relative" }}>
          {index > 0 && <span style={{ position: "absolute", top: 4, right: "50%", width: "100%", height: 1, background: index <= active ? `${accent}72` : "rgba(100,125,150,.14)" }} />}
          <span style={{ position: "relative", zIndex: 1, width: index === active ? 10 : 6, height: index === active ? 10 : 6, borderRadius: 999, border: `1px solid ${index <= active ? accent : "#405166"}`, background: index === active ? accent : index < active ? `${accent}5f` : "#07101b", boxShadow: index === active ? `0 0 13px ${accent}88` : "none" }} />
          <span style={{ fontSize: 7.8, color: index === active ? "#edf7ff" : index < active ? "#849db3" : "#465a6e", fontWeight: index === active ? 700 : 560 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function PlaneLegend({ chapter, lane }: { chapter: number; lane: "none" | "control" | "data" }) {
  if (chapter < 2) return null;
  return (
    <div style={{ position: "absolute", zIndex: 16, left: "50%", bottom: 12, transform: "translateX(-50%)", display: "flex", gap: 8, pointerEvents: "none" }}>
      <span style={{ border: `1px solid ${COLORS.control}${lane === "control" ? "88" : "30"}`, color: lane === "control" ? COLORS.control : "#516579", background: "rgba(4,10,18,.76)", borderRadius: 999, padding: "4px 8px", fontSize: 7.8, fontWeight: 730, letterSpacing: ".08em" }}>EDC CONTROL PLANE · DSP / CATALOG / CONTRACT / EDR</span>
      <span style={{ border: `1px solid ${COLORS.data}${lane === "data" ? "88" : "30"}`, color: lane === "data" ? COLORS.data : "#516579", background: "rgba(4,10,18,.76)", borderRadius: 999, padding: "4px 8px", fontSize: 7.8, fontWeight: 730, letterSpacing: ".08em" }}>EDC DATA PLANE · AUTHORIZED FETCH / PAYLOAD</span>
    </div>
  );
}

export default function EdcJourneyScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  const artifactRefs = useRef<Partial<Record<SceneArtifact, HTMLDivElement | null>>>({});
  const fixedRefs = useRef<Partial<Record<FixedLabel, HTMLElement | null>>>({});
  const [unavailable, setUnavailable] = useState(false);

  const frame = sequenceFrame(props.chapter, props.progress, props.fault);
  const directed = directJourneyScene(props.chapter, frame.current.id, frame.current.kind);
  const route = edcRouteForBeat(props.chapter, frame.current.id, frame.current.kind);

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
    renderer.setClearColor(0x02060b, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.domElement.setAttribute("aria-hidden", "true");
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", transform: "none" });
    element.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02060b, .014);
    const camera = new THREE.PerspectiveCamera(39, 1, .1, 100);
    const cameraTarget = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const pointer = new THREE.Vector2();
    const projected = new THREE.Vector3();
    const temp = new THREE.Vector3();

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
    const material = <T extends THREE.Material>(m: T) => { materials.add(m); return m; };
    const pbr = (color: THREE.ColorRepresentation, emissive = .25, opacity = 1) => material(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: .3, metalness: .46, transparent: opacity < 1, opacity, depthWrite: opacity > .3 }));
    const lineMat = (color: THREE.ColorRepresentation, opacity = .18) => material(new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    room.dispose(); pmrem.dispose(); scene.environment = environment.texture;
    scene.add(new THREE.HemisphereLight(0xbfe4ff, 0x010306, 1));
    const key = new THREE.DirectionalLight(0xe3f8ff, 1.45); key.position.set(-4, 7, 8);
    const rim = new THREE.DirectionalLight(0xb4aaff, 1.1); rim.position.set(6, -1, 5);
    const activeLight = new THREE.PointLight(0x63bfff, 0, 7, 2); scene.add(key, rim, activeLight);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1,1), .3, .23, 1.18); composer.addPass(bloom); composer.addPass(new OutputPass());

    function createBusinessWorld(color: string, seed: number): BusinessWorld {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.34, 2)), pbr(color, .55));
      const shell = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(1.08, 2)), material(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .07, depthWrite: false })));
      const rand = (() => { let v = seed >>> 0; return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296); })();
      const pts: number[] = [];
      for (let i=0;i<10;i++) { const a = i * 2.399963; const z = 1 - 2 * (i + .5) / 10; const r = Math.sqrt(1-z*z) * (.45 + rand()*.3); pts.push(Math.cos(a)*r, Math.sin(a)*r*.84, z*.58); }
      const pg = geometry(new THREE.BufferGeometry()); pg.setAttribute("position", new THREE.Float32BufferAttribute(pts,3));
      const nodes = new THREE.Points(pg, material(new THREE.PointsMaterial({ color, size: .06, transparent: true, opacity: .52, depthWrite: false, blending: THREE.AdditiveBlending })));
      group.add(core, shell, nodes); scene.add(group); return { group, core, shell, nodes };
    }

    function createConnector(sideColor: string): Connector {
      const group = new THREE.Group();
      const frame = new THREE.Mesh(geometry(new THREE.BoxGeometry(1.18, 2.05, .56)), material(new THREE.MeshBasicMaterial({ color: COLORS.tractus, wireframe: true, transparent: true, opacity: .16, depthWrite: false })));
      const control = new THREE.Mesh(geometry(new THREE.BoxGeometry(.84, .54, .62)), pbr(COLORS.control, .48, .94)); control.position.y = .48;
      const data = new THREE.Mesh(geometry(new THREE.BoxGeometry(.84, .54, .62)), pbr(COLORS.data, .34, .9)); data.position.y = -.48;
      const spine = new THREE.Mesh(geometry(new THREE.BoxGeometry(.07, 1.65, .66)), pbr(sideColor, .55, .82)); spine.position.x = -.47;
      const controlRing = new THREE.Mesh(geometry(new THREE.TorusGeometry(.55, .013, 6, 64)), material(new THREE.MeshBasicMaterial({ color: COLORS.control, transparent: true, opacity: .2, depthWrite: false }))); controlRing.rotation.x = Math.PI/2; controlRing.position.y=.48;
      const dataRing = new THREE.Mesh(geometry(new THREE.TorusGeometry(.55, .013, 6, 64)), material(new THREE.MeshBasicMaterial({ color: COLORS.data, transparent: true, opacity: .13, depthWrite: false }))); dataRing.rotation.x = Math.PI/2; dataRing.position.y=-.48;
      group.add(frame, control, data, spine, controlRing, dataRing); scene.add(group); return { group, frame, control, data, spine, controlRing, dataRing };
    }

    function createGem(shape: THREE.BufferGeometry, color: string, scale=1): Artifact {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(shape), pbr(color, 1.05)); core.scale.setScalar(scale); group.add(core); scene.add(group); return { group, cores:[core] };
    }
    function createOffer(): Artifact {
      const group = new THREE.Group(); const cores: Artifact["cores"] = [];
      [-.07,0,.07].forEach((z,i)=>{ const slab=new THREE.Mesh(geometry(new THREE.BoxGeometry(.55-i*.04,.34-i*.025,.055)),pbr(COLORS.control,i===0?1.05:.32,i===0?1:.66)); slab.position.set(-i*.035,i*.03,z); group.add(slab); cores.push(slab); }); scene.add(group); return {group,cores};
    }
    function createAgreement(): Artifact {
      const group = new THREE.Group();
      const a = new THREE.Mesh(geometry(new THREE.TorusGeometry(.3,.05,9,64)),pbr(COLORS.agreement,1.2)); a.rotation.x=Math.PI/2;
      const b = new THREE.Mesh(geometry(new THREE.TorusGeometry(.3,.05,9,64)),pbr(COLORS.agreement,1.2)); b.rotation.set(Math.PI/2,Math.PI/2,0);
      const core = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.16,1)),pbr(COLORS.agreement,1.55)); group.add(a,b,core); scene.add(group); return {group,cores:[a,b,core]};
    }
    function createEdr(): Artifact {
      const group=new THREE.Group(); const ring=new THREE.Mesh(geometry(new THREE.TorusGeometry(.18,.04,8,40)),pbr(COLORS.control,1.35)); const bar=new THREE.Mesh(geometry(new THREE.BoxGeometry(.36,.065,.065)),pbr(COLORS.control,1.35)); bar.position.x=.29; const tooth=new THREE.Mesh(geometry(new THREE.BoxGeometry(.075,.12,.065)),pbr(COLORS.control,1.35)); tooth.position.set(.44,-.065,0); group.add(ring,bar,tooth); scene.add(group); return {group,cores:[ring,bar,tooth]};
    }

    const providerSystem = createBusinessWorld(COLORS.provider, 91);
    const consumerSystem = createBusinessWorld(COLORS.consumer, 133);
    const providerEdc = createConnector(COLORS.provider);
    const consumerEdc = createConnector(COLORS.consumer);
    const source = createGem(new THREE.OctahedronGeometry(.21,1), COLORS.provider);
    const offer = createOffer();
    const dsp = createGem(new THREE.TorusGeometry(.22,.042,8,40), COLORS.control);
    const trust = createGem(new THREE.OctahedronGeometry(.22,1), COLORS.control);
    const usage = createGem(new THREE.TetrahedronGeometry(.25,1), COLORS.usage);
    const agreement = createAgreement();
    const edr = createEdr();
    const payload = createGem(new THREE.CapsuleGeometry(.16,.3,5,10), COLORS.data);
    const copy = createGem(new THREE.CapsuleGeometry(.16,.3,5,10), COLORS.data);
    const artifacts: Record<SceneArtifact, Artifact> = { source, offer, dsp, trust, usage, agreement, edr, payload, copy };

    const controlLaneGeometry=geometry(new THREE.BufferGeometry()); controlLaneGeometry.setAttribute("position",new THREE.Float32BufferAttribute(new Array(6).fill(0),3));
    const dataLaneGeometry=geometry(new THREE.BufferGeometry()); dataLaneGeometry.setAttribute("position",new THREE.Float32BufferAttribute(new Array(6).fill(0),3));
    const providerLocalGeometry=geometry(new THREE.BufferGeometry()); providerLocalGeometry.setAttribute("position",new THREE.Float32BufferAttribute(new Array(6).fill(0),3));
    const consumerLocalGeometry=geometry(new THREE.BufferGeometry()); consumerLocalGeometry.setAttribute("position",new THREE.Float32BufferAttribute(new Array(6).fill(0),3));
    const controlLane=new THREE.Line(controlLaneGeometry,lineMat(COLORS.control,.14)); const dataLane=new THREE.Line(dataLaneGeometry,lineMat(COLORS.data,.08));
    const providerLocal=new THREE.Line(providerLocalGeometry,lineMat(COLORS.provider,.11)); const consumerLocal=new THREE.Line(consumerLocalGeometry,lineMat(COLORS.consumer,.11)); scene.add(controlLane,dataLane,providerLocal,consumerLocal);

    const routeGeometry=geometry(new THREE.BufferGeometry()); routeGeometry.setAttribute("position",new THREE.Float32BufferAttribute(new Array(96*3).fill(0),3));
    const routeLine=new THREE.Line(routeGeometry,lineMat(COLORS.control,.65)); routeLine.frustumCulled=false; scene.add(routeLine);
    const token=new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.11,1)),pbr(COLORS.control,1.5)); scene.add(token);

    const positions: Record<EdcPoint, THREE.Vector3> = {
      "provider-system": new THREE.Vector3(), "provider-source": new THREE.Vector3(), "provider-control": new THREE.Vector3(), "provider-data": new THREE.Vector3(),
      "consumer-control": new THREE.Vector3(), "consumer-data": new THREE.Vector3(), "consumer-system": new THREE.Vector3(),
    };
    const artifactPos: Record<SceneArtifact, THREE.Vector3> = {
      source:new THREE.Vector3(),offer:new THREE.Vector3(),dsp:new THREE.Vector3(),trust:new THREE.Vector3(),usage:new THREE.Vector3(),agreement:new THREE.Vector3(),edr:new THREE.Vector3(),payload:new THREE.Vector3(),copy:new THREE.Vector3(),
    };
    let width=1,height=1,baseDistance=12.2,span=5.2;
    const routePoints: THREE.Vector3[]=[];
    const routeSample=new THREE.Vector3();
    const color=new THREE.Color();

    function setLine(g: THREE.BufferGeometry, a: THREE.Vector3, b: THREE.Vector3) { const attr=g.getAttribute("position") as THREE.BufferAttribute; attr.setXYZ(0,a.x,a.y,a.z); attr.setXYZ(1,b.x,b.y,b.z); attr.needsUpdate=true; }

    function syncLayout() {
      const aspect=camera.aspect || 1;
      span=Math.min(5.6,Math.max(4.3,aspect*2.65));
      const edcX=span*.48;
      positions["provider-system"].set(-span,0,.1); positions["consumer-system"].set(span,0,.1);
      positions["provider-control"].set(-edcX,.48,.32); positions["provider-data"].set(-edcX,-.48,.32);
      positions["consumer-control"].set(edcX,.48,.32); positions["consumer-data"].set(edcX,-.48,.32);
      positions["provider-source"].copy(positions["provider-system"]).add(new THREE.Vector3(.15,-1.05,.55));
      providerSystem.group.position.copy(positions["provider-system"]); consumerSystem.group.position.copy(positions["consumer-system"]);
      providerEdc.group.position.set(-edcX,0,.18); consumerEdc.group.position.set(edcX,0,.18);
      const compact=aspect<1; const ws=compact?.72:.9; const es=compact?.78:1.02; providerSystem.group.scale.setScalar(ws); consumerSystem.group.scale.setScalar(ws); providerEdc.group.scale.setScalar(es); consumerEdc.group.scale.setScalar(es);
      artifactPos.source.copy(positions["provider-source"]);
      artifactPos.offer.copy(positions["provider-control"]).add(new THREE.Vector3(.72,.45,.56));
      artifactPos.dsp.set(0,.48,.75);
      artifactPos.trust.copy(positions["provider-control"]).add(new THREE.Vector3(.58,0,.62));
      artifactPos.usage.copy(positions["consumer-control"]).add(new THREE.Vector3(-.58,.1,.62));
      artifactPos.agreement.set(0,.48,.74);
      artifactPos.edr.copy(positions["consumer-control"]).add(new THREE.Vector3(-.55,.2,.65));
      artifactPos.payload.copy(positions["consumer-data"]).add(new THREE.Vector3(.65,-.25,.6));
      artifactPos.copy.copy(positions["consumer-system"]).add(new THREE.Vector3(-.1,-.9,.55));
      Object.entries(artifacts).forEach(([id,a])=>a.group.position.copy(artifactPos[id as SceneArtifact]));
      setLine(controlLaneGeometry,positions["provider-control"],positions["consumer-control"]); setLine(dataLaneGeometry,positions["provider-data"],positions["consumer-data"]);
      setLine(providerLocalGeometry,positions["provider-system"],providerEdc.group.position); setLine(consumerLocalGeometry,consumerEdc.group.position,positions["consumer-system"]);
      const halfWidth=span+1.35; const halfHeight=3.0; const fov=Math.PI/180*39; const vertical=halfHeight/Math.tan(fov/2); const horizontal=halfWidth/(Math.tan(fov/2)*Math.max(.65,aspect)); baseDistance=Math.max(vertical,horizontal)+1.2;
      camera.position.set(0,.05,baseDistance); cameraTarget.copy(camera.position); lookAt.set(0,0,0); lookTarget.set(0,0,0);
    }

    function artifactHome(id: SceneArtifact, pChapter: number, currentId: string) {
      if (id==="offer") {
        if (pChapter===1) return artifactPos.offer;
        const consumerOffer=positions["consumer-control"].clone().add(new THREE.Vector3(-.72,.45,.56));
        if (pChapter===3 && currentId==="catalog-response") return artifactPos.offer.clone();
        return consumerOffer;
      }
      if (id==="usage" && pChapter===5) return positions["provider-control"].clone().add(new THREE.Vector3(.55,.05,.62));
      return artifactPos[id];
    }

    function cameraCue(chapter:number,cue:string) {
      if (chapter===0) { cameraTarget.set(-span*.28,-.02,baseDistance*.83); lookTarget.copy(positions["provider-system"]).multiplyScalar(.62); return; }
      if (cue==="provider") { cameraTarget.set(-span*.18,.05,baseDistance*.86); lookTarget.lerpVectors(positions["provider-system"],providerEdc.group.position,.72); }
      else if (cue==="consumer") { cameraTarget.set(span*.18,.05,baseDistance*.86); lookTarget.lerpVectors(consumerEdc.group.position,positions["consumer-system"],.38); }
      else if (cue==="data") { cameraTarget.set(0,-.12,baseDistance*.88); lookTarget.set(0,-.48,.2); }
      else if (cue==="center") { cameraTarget.set(0,.04,baseDistance*.84); lookTarget.set(0,.45,.3); }
      else if (cue==="control") { cameraTarget.set(0,.11,baseDistance*.88); lookTarget.set(0,.48,.2); }
      else { cameraTarget.set(0,.05,baseDistance); lookTarget.set(0,0,0); }
    }

    function pointFor(id: EdcPoint) { return positions[id]; }
    function buildRoute(r: EdcRoute) {
      routePoints.length=0; r.points.forEach(id=>routePoints.push(pointFor(id).clone()));
      const attr=routeGeometry.getAttribute("position") as THREE.BufferAttribute;
      if (routePoints.length<2) { routeLine.visible=false; return; }
      const curve = routePoints.length>2 ? new THREE.CatmullRomCurve3(routePoints,false,"centripetal") : null;
      for(let i=0;i<96;i++) {
        const u=i/95;
        if(curve) curve.getPoint(u,routeSample);
        else {
          routeSample.lerpVectors(routePoints[0],routePoints[1],u);
          routeSample.z += Math.sin(Math.PI*u) * (r.mode==="control"?.34:r.mode==="data"?.2:.12);
        }
        attr.setXYZ(i,routeSample.x,routeSample.y,routeSample.z);
      }
      attr.needsUpdate=true; routeLine.visible=true;
    }

    function routePointAt(r: EdcRoute,u:number,out:THREE.Vector3) {
      if(routePoints.length<2) return out.set(0,0,0);
      if(routePoints.length>2) return new THREE.CatmullRomCurve3(routePoints,false,"centripetal").getPoint(u,out);
      out.lerpVectors(routePoints[0],routePoints[1],u); out.z+=Math.sin(Math.PI*u)*(r.mode==="control"?.34:r.mode==="data"?.2:.12); return out;
    }

    function placeFixed(id:FixedLabel, world:THREE.Vector3, yOffset:number) {
      const el=fixedRefs.current[id]; if(!el)return; temp.copy(world).add(new THREE.Vector3(0,yOffset,0)).project(camera); const x=(temp.x*.5+.5)*width; const y=(-temp.y*.5+.5)*height; el.style.left=`${x}px`; el.style.top=`${y}px`; el.style.opacity=temp.z>1?"0":"1";
    }
    function placeArtifact(id:SceneArtifact) {
      const el=artifactRefs.current[id]; if(!el)return; temp.copy(artifacts[id].group.position).project(camera); const x=(temp.x*.5+.5)*width; const y=(-temp.y*.5+.5)*height; el.style.left=`${x}px`; el.style.top=`${y}px`; if(id==="agreement"||id==="dsp") el.style.transform="translate(-50%,30px)"; else if(x<width*.5) el.style.transform="translate(16px,-50%)"; else el.style.transform="translate(calc(-100% - 16px),-50%)"; el.style.opacity=temp.z>1?"0":"1";
    }

    const resize=new ResizeObserver(()=>{ width=Math.max(1,element.clientWidth); height=Math.max(1,element.clientHeight); renderer.setSize(width,height); composer.setSize(width,height); camera.aspect=width/height; camera.updateProjectionMatrix(); syncLayout(); }); resize.observe(element);
    const pointerMove=(event:PointerEvent)=>{ const rect=element.getBoundingClientRect(); if(!rect.width||!rect.height)return; pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-(((event.clientY-rect.top)/rect.height)*2-1)); };
    const pointerLeave=()=>pointer.set(0,0); element.addEventListener("pointermove",pointerMove,{passive:true}); element.addEventListener("pointerleave",pointerLeave);

    let raf=0,last=0,disposed=false;
    function render(now:number) {
      if(disposed)return; raf=requestAnimationFrame(render); if(document.hidden)return;
      const p=live.current; const mobile=width<720; const minGap=p.paused||p.reduced?100:mobile?1000/30:1000/45; if(now-last<minGap)return; last=now;
      const seq=sequenceFrame(p.chapter,p.progress,p.fault); const current=seq.current; const directedFrame=directJourneyScene(p.chapter,current.id,current.kind); const r=edcRouteForBeat(p.chapter,current.id,current.kind); const t=p.reduced?0:seq.position*chapters[p.chapter].duration; const parallax=mobile||p.reduced?0:1;

      cameraCue(p.chapter,directedFrame.camera); cameraTarget.x+=pointer.x*.06*parallax; cameraTarget.y+=pointer.y*.035*parallax; lookTarget.x+=pointer.x*.025*parallax; lookTarget.y+=pointer.y*.02*parallax; if(!p.paused){camera.position.lerp(cameraTarget,p.reduced?1:.038);lookAt.lerp(lookTarget,p.reduced?1:.045);} camera.lookAt(lookAt);

      const providerBusinessActive=p.chapter<=1||current.id==="read-source"||current.id==="payload";
      const consumerBusinessActive=p.chapter===4||p.chapter===7||current.id==="payload";
      [[providerSystem,providerBusinessActive],[consumerSystem,consumerBusinessActive]].forEach(([raw,activeRaw],i)=>{ const world=raw as BusinessWorld; const active=Boolean(activeRaw); world.group.rotation.y=Math.sin(t*.06+i)*.045; world.shell.rotation.y=t*.018*(i?-1:1); world.core.material.emissiveIntensity=active?.9:.2; world.shell.material.opacity=active?.1:.035; world.nodes.material.opacity=active?.64:.18; });

      const providerConnectorActive=p.chapter>=1&&p.chapter<=6;
      const consumerConnectorActive=p.chapter>=2&&p.chapter<=6;
      const dataActive=directedFrame.lane==="data"||r.mode==="data"||r.mode==="payload";
      [[providerEdc,providerConnectorActive],[consumerEdc,consumerConnectorActive]].forEach(([raw,activeRaw],i)=>{ const c=raw as Connector; const active=Boolean(activeRaw); c.group.rotation.y=Math.sin(t*.045+i)*.025; c.frame.material.opacity=active?.22:.08; c.control.material.emissiveIntensity=active&&!dataActive?.9:.28; c.data.material.emissiveIntensity=active&&dataActive?1.05:.24; c.spine.material.emissiveIntensity=active?.8:.28; c.controlRing.material.opacity=active&&!dataActive?.34:.1; c.dataRing.material.opacity=active&&dataActive?.38:.08; c.controlRing.rotation.z=t*.05*(i?-1:1); c.dataRing.rotation.z=t*.04*(i?1:-1); });

      const visible=new Set(directedFrame.artifacts.map(a=>a.id));
      (Object.keys(artifacts) as SceneArtifact[]).forEach(id=>{ artifacts[id].group.visible=visible.has(id)||(id==="agreement"&&p.chapter===6); });
      (Object.keys(artifacts) as SceneArtifact[]).forEach(id=>artifacts[id].group.position.copy(artifactHome(id,p.chapter,current.id)));

      if(p.chapter===3&&current.id==="catalog-response"&&visible.has("offer")) {
        const from=positions["provider-control"].clone().add(new THREE.Vector3(.55,.32,.55)); const to=positions["consumer-control"].clone().add(new THREE.Vector3(-.55,.32,.55)); offer.group.position.lerpVectors(from,to,smooth(current.fraction));
      }
      if(p.chapter===6&&current.id==="transfer-start"&&visible.has("edr")) {
        edr.group.position.lerpVectors(positions["provider-control"],positions["consumer-control"],smooth(current.fraction)); edr.group.position.z+=Math.sin(Math.PI*smooth(current.fraction))*.35;
      }

      buildRoute(r); routeLine.material.color.set(r.mode==="payload"||r.mode==="data"?COLORS.data:r.mode==="local"?(p.chapter===4?COLORS.consumer:COLORS.provider):COLORS.control); routeLine.material.opacity=r.mode==="none"?0:r.mode==="payload"?.72:.5;
      token.visible=r.mode!=="none"&&r.mode!=="payload"&&current.status==="active"; if(token.visible){ const u=smooth(current.fraction); routePointAt(r,u,token.position); color.set(r.mode==="data"?COLORS.data:r.mode==="local"?(p.chapter===4?COLORS.consumer:COLORS.provider):COLORS.control); token.material.color.copy(color);token.material.emissive.copy(color);token.material.emissiveIntensity=1.55;token.rotation.set(t*.2,t*.36,.1); }
      if(r.mode==="payload"&&visible.has("payload")) { routePointAt(r,smooth(current.fraction),payload.group.position); }

      controlLane.visible=p.chapter>=2&&p.chapter<=6; dataLane.visible=p.chapter===6; controlLane.material.opacity=dataActive?.07:.26; dataLane.material.opacity=dataActive?.36:.05;
      providerLocal.material.opacity=providerBusinessActive?.24:.07; consumerLocal.material.opacity=consumerBusinessActive?.24:.07;

      offer.group.rotation.set(.06,t*.08,.02); trust.group.rotation.set(t*.16,t*.28,.08); usage.group.rotation.set(t*.14,t*.2,.06); agreement.group.rotation.y=t*.15; edr.group.rotation.set(.15,t*.22,.04); payload.group.rotation.set(t*.2,t*.4,.08); copy.group.rotation.set(t*.12,t*.18,.06); dsp.group.rotation.set(.3,t*.18,.05);
      const hero=directedFrame.artifacts.find(a=>a.emphasis==="hero"); if(hero){ activeLight.position.copy(artifacts[hero.id].group.position).add(new THREE.Vector3(0,.4,1.8)); activeLight.color.set(toneColor(hero.tone)); activeLight.intensity=1.8; } else { activeLight.intensity=.5; }

      placeFixed("provider-system",positions["provider-system"],1.6); placeFixed("provider-edc",providerEdc.group.position,1.62); placeFixed("consumer-edc",consumerEdc.group.position,1.62); placeFixed("consumer-system",positions["consumer-system"],1.6); directedFrame.artifacts.forEach(a=>placeArtifact(a.id));
      if(!mobile&&!p.reduced)composer.render();else renderer.render(scene,camera);
    }

    syncLayout(); raf=requestAnimationFrame(render);
    const lost=(event:Event)=>{event.preventDefault();setUnavailable(true);cancelAnimationFrame(raf);}; renderer.domElement.addEventListener("webglcontextlost",lost);
    return()=>{disposed=true;cancelAnimationFrame(raf);resize.disconnect();element.removeEventListener("pointermove",pointerMove);element.removeEventListener("pointerleave",pointerLeave);renderer.domElement.removeEventListener("webglcontextlost",lost);composer.dispose();environment.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  },[]);

  if(unavailable)return <SimpleScene {...props}/>;
  const providerSystemActive=props.chapter<=1||frame.current.id==="read-source"||frame.current.id==="payload";
  const consumerSystemActive=props.chapter===4||props.chapter===7||frame.current.id==="payload";
  const providerEdcActive=props.chapter>=1&&props.chapter<=6;
  const consumerEdcActive=props.chapter>=2&&props.chapter<=6;

  return (
    <div ref={host} className={styles.canvas} role="group" aria-label={`Tractus-X EDC mediated journey. ${chapters[props.chapter].title}. ${frame.current.title}.`}>
      <TopologyOverlay/>
      {directed.rail&&<StoryRail labels={directed.rail.labels} active={directed.rail.active} chapter={props.chapter}/>} 
      <SystemLabel labelRef={node=>{fixedRefs.current["provider-system"]=node;}} title="Company A" detail="Business systems · private source" accent={COLORS.provider} active={providerSystemActive} pressed={props.selected==="provider"} onClick={()=>props.onSelect("provider")}/>
      <EdcLabel labelRef={node=>{fixedRefs.current["provider-edc"]=node;}} role="Provider Connector" active={providerEdcActive} side="provider"/>
      <EdcLabel labelRef={node=>{fixedRefs.current["consumer-edc"]=node;}} role="Consumer Connector" active={consumerEdcActive} side="consumer"/>
      <SystemLabel labelRef={node=>{fixedRefs.current["consumer-system"]=node;}} title="Company B" detail="Business systems · data consumer" accent={COLORS.consumer} active={consumerSystemActive} pressed={props.selected==="consumer"} onClick={()=>props.onSelect("consumer")}/>
      {directed.artifacts.map(item=>{
        const owner=directorArtifactOwners[item.id];
        return <ArtifactLabel key={item.id} item={item} labelRef={node=>{artifactRefs.current[item.id]=node;}} onSelect={owner?()=>props.onSelect(owner):undefined}/>;
      })}
      <PlaneLegend chapter={props.chapter} lane={directed.lane}/>
      <div style={{position:"absolute",zIndex:17,right:14,bottom:46,padding:"5px 8px",borderRadius:999,border:`1px solid ${route.mode==="payload"?COLORS.data:"#60758a"}45`,background:"rgba(4,10,18,.8)",color:route.mode==="payload"?COLORS.data:"#72889e",fontSize:7.8,fontWeight:760,letterSpacing:".1em",pointerEvents:"none"}}>
        {frame.copyDelivered||props.chapter===7?"COPY DELIVERED":route.mode==="payload"?"PAYLOAD MOVING THROUGH EDC DATA PLANES":"PAYLOAD NOT MOVED"}
      </div>
    </div>
  );
}
