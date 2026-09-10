"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { chapters, journeyNodes, type Fault, type NodeId } from "@/lib/data-journey";
import { journeyLayout } from "@/lib/journey-visuals";
import { journeySequences, sequenceFrame, signalStyles, type JourneyBeat, type SignalKind } from "@/lib/journey-sequence";
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

const providerColor = "#59edcf";
const consumerColor = "#aaa4ff";
const controlColor = "#80caff";
const contractColor = "#f5d786";
const usageColor = "#ffb567";
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

const railConfig: Partial<Record<number, { labels: string[]; groups: string[][] }>> = {
  3: {
    labels: ["Request", "Trust", "Access", "Return", "Visible"],
    groups: [
      ["catalog-request"],
      ["credential-check"],
      ["access-check"],
      ["catalog-response"],
      ["offer-found"],
    ],
  },
  5: {
    labels: ["Request", "Policy", "Agreement", "Verify", "Finalize"],
    groups: [
      ["contract-request"],
      ["contract-policy-check"],
      ["contract-agreement"],
      ["contract-verification"],
      ["contract-finalized", "seal"],
    ],
  },
  6: {
    labels: ["Transfer", "Authorize", "EDR", "Fetch", "Payload"],
    groups: [
      ["transfer-request"],
      ["authorize-transfer"],
      ["transfer-start", "edr-ready"],
      ["fetch", "read-source"],
      ["payload"],
    ],
  },
};

function participantLabel(id?: NodeId) {
  if (!id) return "";
  if (id === "provider") return "Company A";
  if (id === "consumer") return "Company B";
  return journeyNodes[id].label;
}

function stepAccent(chapter: number, kind: SignalKind, blocked: boolean) {
  if (blocked) return faultColor;
  if (chapter === 5) return contractColor;
  if (kind === "data" || kind === "retrieval") return dataColor;
  return signalStyles[kind].color;
}

function panelBase(accent: string, active = false): CSSProperties {
  return {
    border: `1px solid ${accent}${active ? "bb" : "66"}`,
    background: active ? "rgba(7, 15, 28, .96)" : "rgba(5, 12, 22, .88)",
    boxShadow: active ? `0 0 32px ${accent}22, inset 0 1px 0 rgba(255,255,255,.05)` : "inset 0 1px 0 rgba(255,255,255,.03)",
    backdropFilter: "blur(12px)",
    color: "#eef5ff",
  };
}

function CompanyBadge({
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
        ...panelBase(accent, active),
        position: "absolute",
        zIndex: 12,
        top: 20,
        [side]: "clamp(16px, 5vw, 72px)",
        minWidth: 126,
        padding: "8px 12px",
        borderRadius: 11,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        alignItems: "center",
        font: "inherit",
        cursor: "pointer",
        opacity: active ? 1 : .78,
        transition: "opacity .2s ease, border-color .2s ease, box-shadow .2s ease",
      }}
    >
      <strong style={{ fontSize: 13, lineHeight: 1.1 }}>{title}</strong>
      <small style={{ fontSize: 9, color: accent, opacity: .86 }}>{role}</small>
    </button>
  );
}

function ActiveStepCard({
  chapter,
  beat,
  blocked,
}: {
  chapter: number;
  beat: ReturnType<typeof sequenceFrame>["current"];
  blocked: boolean;
}) {
  const accent = stepAccent(chapter, beat.kind, blocked);
  const direction = beat.from && beat.to
    ? `${participantLabel(beat.from)} → ${participantLabel(beat.to)}`
    : "Inside one participant";

  return (
    <div
      style={{
        ...panelBase(accent, true),
        position: "absolute",
        zIndex: 14,
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(390px, 46vw)",
        minWidth: 250,
        padding: "10px 14px 11px",
        borderRadius: 13,
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".14em", color: accent, textTransform: "uppercase", marginBottom: 4 }}>
        {blocked ? "Blocked step" : signalStyles[beat.kind].label}
      </div>
      <div style={{ fontSize: "clamp(13px, 1.25vw, 17px)", fontWeight: 720, lineHeight: 1.15 }}>
        {beat.title}
      </div>
      <div style={{ fontSize: 9.5, color: "#aebfd2", marginTop: 4, lineHeight: 1.25 }}>
        {direction}
      </div>
    </div>
  );
}

function ProcessRail({
  chapter,
  currentId,
  blocked,
}: {
  chapter: number;
  currentId: string;
  blocked: boolean;
}) {
  const config = railConfig[chapter];
  if (!config) return null;
  const activeIndex = Math.max(0, config.groups.findIndex(group => group.includes(currentId)));
  const accent = blocked ? faultColor : chapter === 5 ? contractColor : chapter === 6 ? dataColor : controlColor;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        zIndex: 11,
        top: 91,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(630px, 66vw)",
        display: "grid",
        gridTemplateColumns: `repeat(${config.labels.length}, minmax(0, 1fr))`,
        alignItems: "center",
        gap: 0,
        pointerEvents: "none",
      }}
    >
      {config.labels.map((label, index) => {
        const past = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div key={label} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            {index > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: "50%",
                  width: "100%",
                  height: 1,
                  background: past || active ? `${accent}88` : "rgba(122, 151, 181, .16)",
                }}
              />
            )}
            <span
              style={{
                position: "relative",
                zIndex: 2,
                width: active ? 12 : 8,
                height: active ? 12 : 8,
                borderRadius: 999,
                border: `1px solid ${active || past ? accent : "#4b6279"}`,
                background: active ? accent : past ? `${accent}77` : "#07111d",
                boxShadow: active ? `0 0 16px ${accent}88` : "none",
              }}
            />
            <span
              style={{
                fontSize: 8.5,
                fontWeight: active ? 700 : 560,
                color: active ? "#eef6ff" : past ? "#9fb4c8" : "#5e7185",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ArtifactCard({
  eyebrow,
  title,
  accent,
  position,
  rows,
  active = false,
  nodeId,
  selected,
  onSelect,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  position: CSSProperties;
  rows: { label: string; value: string; strong?: boolean }[];
  active?: boolean;
  nodeId?: NodeId;
  selected?: NodeId | null;
  onSelect?: (id: NodeId) => void;
}) {
  const common: CSSProperties = {
    ...panelBase(accent, active),
    position: "absolute",
    zIndex: active ? 13 : 10,
    width: "min(236px, 29vw)",
    padding: "10px 12px",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 7,
    textAlign: "left",
    pointerEvents: nodeId ? "auto" : "none",
    font: "inherit",
    ...position,
  };

  const body = (
    <>
      <div>
        <div style={{ fontSize: 8, fontWeight: 760, letterSpacing: ".13em", color: accent, textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ fontSize: "clamp(12px, 1.1vw, 15px)", fontWeight: 730, marginTop: 2 }}>{title}</div>
      </div>
      <div style={{ display: "grid", gap: 5 }}>
        {rows.map(row => (
          <div key={`${row.label}-${row.value}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <span style={{ fontSize: 8.5, color: "#7f94a9", whiteSpace: "nowrap" }}>{row.label}</span>
            <span style={{ fontSize: 8.8, color: row.strong ? accent : "#c9d7e6", fontWeight: row.strong ? 700 : 540, textAlign: "right" }}>{row.value}</span>
          </div>
        ))}
      </div>
    </>
  );

  if (nodeId && onSelect) {
    return (
      <button type="button" onClick={() => onSelect(nodeId)} aria-pressed={selected === nodeId} style={{ ...common, cursor: "pointer" }}>
        {body}
      </button>
    );
  }
  return <div style={common}>{body}</div>;
}

function DataStateBadge({
  chapter,
  currentId,
  copyVisible,
  copyDelivered,
}: {
  chapter: number;
  currentId: string;
  copyVisible: boolean;
  copyDelivered: boolean;
}) {
  const moving = chapter === 6 && currentId === "payload" && copyVisible && !copyDelivered;
  const delivered = copyDelivered || chapter === 7;
  const accent = delivered || moving ? dataColor : "#7c91a7";
  const label = delivered ? "COPY DELIVERED" : moving ? "PAYLOAD MOVING NOW" : "PAYLOAD NOT MOVED";

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 10,
        left: "50%",
        bottom: 15,
        transform: "translateX(-50%)",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${accent}55`,
        background: "rgba(4, 10, 18, .86)",
        color: accent,
        fontSize: 8.5,
        fontWeight: 760,
        letterSpacing: ".12em",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function LaneGuide({ kind }: { kind: SignalKind }) {
  const dataActive = kind === "data" || kind === "retrieval";
  return (
    <>
      <div
        style={{
          position: "absolute",
          zIndex: 8,
          left: "50%",
          top: "45%",
          transform: "translate(-50%, -50%)",
          color: dataActive ? "#53677b" : controlColor,
          fontSize: 8,
          letterSpacing: ".13em",
          fontWeight: 760,
          opacity: dataActive ? .45 : .9,
          pointerEvents: "none",
        }}
      >
        CONTROL PLANE
      </div>
      <div
        style={{
          position: "absolute",
          zIndex: 8,
          left: "50%",
          top: "64%",
          transform: "translate(-50%, -50%)",
          color: dataActive ? dataColor : "#53677b",
          fontSize: 8,
          letterSpacing: ".13em",
          fontWeight: 760,
          opacity: dataActive ? .9 : .45,
          pointerEvents: "none",
        }}
      >
        DATA PLANE
      </div>
    </>
  );
}

export default function NeuralScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.1 : 1.4));
    renderer.setClearColor(0x050a12, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.pointerEvents = "none";
    element.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a12, .012);

    let width = 1;
    let height = 1;
    let layout = journeyLayout(1);
    const vec = (id: NodeId) => new THREE.Vector3(...layout.positions[id]);

    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(0, .05, layout.distance);
    const cameraTarget = camera.position.clone();
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
      roughness: .3,
      metalness: .48,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity > .35,
    }));

    const lineMat = (color: THREE.ColorRepresentation, opacity = .2) => material(new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));

    const glowPoints = (color: string, size: number, positions: number[]) => {
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const m = material(new THREE.ShaderMaterial({
        uniforms: {
          tint: { value: new THREE.Color(color) },
          size: { value: size },
          opacity: { value: 1 },
          energy: { value: 1 },
        },
        vertexShader: "uniform float size; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(72.0,size*145.0/-p.z);gl_Position=projectionMatrix*p;}",
        fragmentShader: "uniform vec3 tint;uniform float opacity;uniform float energy;void main(){float d=length(gl_PointCoord-vec2(.5))*2.;if(d>1.)discard;float a=pow(1.-d,3.4);gl_FragColor=vec4(tint*energy,a*opacity);}",
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      return new THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>(g, m);
    };

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environmentTarget = pmrem.fromScene(room, .04);
    room.dispose();
    pmrem.dispose();
    scene.environment = environmentTarget.texture;

    scene.add(new THREE.HemisphereLight(0xb8dcff, 0x02060b, 1.25));
    const key = new THREE.DirectionalLight(0xd7f4ff, 1.8);
    key.position.set(-5, 7, 8);
    const rim = new THREE.DirectionalLight(0xb5a7ff, 1.45);
    rim.position.set(6, -2, 6);
    const activeLight = new THREE.PointLight(0x80caff, 0, 8, 2);
    scene.add(key, rim, activeLight);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .36, .28, 1.12);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    type World = {
      group: THREE.Group;
      core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      shell: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      network: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      nodes: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
      ring: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      halo: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    };

    function createWorld(color: string, seed: number): World {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.38, 2)), pbr(color, .58));
      group.add(core);

      const shell = new THREE.Mesh(
        geometry(new THREE.IcosahedronGeometry(1.48, 2)),
        material(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .1, depthWrite: false })),
      );
      group.add(shell);

      const ring = new THREE.Mesh(
        geometry(new THREE.TorusGeometry(1.12, .012, 6, 72)),
        material(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .13, depthWrite: false })),
      );
      ring.rotation.set(.72, .5, .2);
      group.add(ring);

      const halo = glowPoints(color, 13, [0, 0, 0]);
      halo.material.uniforms.opacity.value = .56;
      halo.material.uniforms.energy.value = 1.15;
      group.add(halo);

      const rand = seeded(seed);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 18; i++) {
        const theta = i * 2.399963;
        const phi = Math.acos(1 - 2 * (i + .5) / 18);
        const radius = .68 + rand() * .58;
        pts.push(new THREE.Vector3(
          Math.cos(theta) * Math.sin(phi) * radius,
          Math.sin(theta) * Math.sin(phi) * radius * .88,
          Math.cos(phi) * radius * .8,
        ));
      }

      const edges: number[] = [];
      pts.forEach((point, i) => {
        let nearest = -1;
        let distance = Infinity;
        pts.forEach((candidate, j) => {
          if (i === j) return;
          const d = point.distanceToSquared(candidate);
          if (d < distance) { distance = d; nearest = j; }
        });
        if (nearest > i) edges.push(...point.toArray(), ...pts[nearest].toArray());
      });
      const edgeGeometry = geometry(new THREE.BufferGeometry());
      edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edges, 3));
      const network = new THREE.LineSegments(edgeGeometry, lineMat(color, .14));
      group.add(network);

      const nodes = glowPoints(color, 2.25, pts.flatMap(point => point.toArray()));
      nodes.material.uniforms.opacity.value = .65;
      nodes.material.uniforms.energy.value = .82;
      group.add(nodes);

      scene.add(group);
      return { group, core, shell, network, nodes, ring, halo };
    }

    type Artifact = {
      group: THREE.Group;
      core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      shell: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      halo: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    };

    function createArtifact(shape: THREE.BufferGeometry, color: string, scale = 1): Artifact {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(shape), pbr(color, 1.1));
      core.scale.setScalar(scale);
      const shell = new THREE.Mesh(
        geometry(shape.clone()),
        material(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .28, depthWrite: false })),
      );
      shell.scale.setScalar(scale * 1.34);
      const halo = glowPoints(color, 8, [0, 0, 0]);
      halo.material.uniforms.opacity.value = .28;
      halo.material.uniforms.energy.value = 1.3;
      group.add(core, shell, halo);
      scene.add(group);
      return { group, core, shell, halo };
    }

    const providerWorld = createWorld(providerColor, 91);
    const consumerWorld = createWorld(consumerColor, 133);

    const source = createArtifact(new THREE.OctahedronGeometry(.22, 1), dataColor, 1);
    const providerOffer = createArtifact(new THREE.BoxGeometry(.48, .3, .12), controlColor, 1);
    const visibleOffer = createArtifact(new THREE.BoxGeometry(.48, .3, .12), controlColor, 1);
    const trust = createArtifact(new THREE.OctahedronGeometry(.25, 1), "#75dbff", 1);
    const usage = createArtifact(new THREE.TetrahedronGeometry(.29, 1), usageColor, 1);
    const agreement = createArtifact(new THREE.DodecahedronGeometry(.34, 1), contractColor, 1);
    const dsp = createArtifact(new THREE.TorusGeometry(.22, .045, 8, 36), controlColor, 1);

    const edr = new THREE.Group();
    const edrRing = new THREE.Mesh(geometry(new THREE.TorusGeometry(.19, .045, 8, 34)), pbr(controlColor, 1.4));
    const edrBar = new THREE.Mesh(geometry(new THREE.BoxGeometry(.34, .075, .075)), pbr(controlColor, 1.4));
    edrBar.position.x = .29;
    const edrGlow = glowPoints(controlColor, 7.5, [0, 0, 0]);
    edr.add(edrRing, edrBar, edrGlow);
    scene.add(edr);

    const payload = createArtifact(new THREE.OctahedronGeometry(.24, 1), dataColor, 1);
    payload.shell.scale.setScalar(1.65);

    const activeLineGeometry = geometry(new THREE.BufferGeometry());
    activeLineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(73 * 3).fill(0), 3));
    const activeLine = new THREE.Line(activeLineGeometry, lineMat(controlColor, .7));
    activeLine.frustumCulled = false;
    scene.add(activeLine);

    const token = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.13, 1)), pbr(controlColor, 1.5));
    scene.add(token);

    const trail = glowPoints(controlColor, 3.2, new Array(10 * 3).fill(0));
    trail.frustumCulled = false;
    trail.material.uniforms.opacity.value = .65;
    scene.add(trail);

    const relationshipGeometry = geometry(new THREE.BufferGeometry());
    relationshipGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(2 * 3).fill(0), 3));
    const relationship = new THREE.Line(relationshipGeometry, lineMat(contractColor, .14));
    scene.add(relationship);

    const controlLaneGeometry = geometry(new THREE.BufferGeometry());
    controlLaneGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(2 * 3).fill(0), 3));
    const controlLane = new THREE.Line(controlLaneGeometry, lineMat(controlColor, .14));
    const dataLaneGeometry = geometry(new THREE.BufferGeometry());
    dataLaneGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(2 * 3).fill(0), 3));
    const dataLane = new THREE.Line(dataLaneGeometry, lineMat(dataColor, .14));
    scene.add(controlLane, dataLane);

    const focusRing = new THREE.Mesh(
      geometry(new THREE.TorusGeometry(.5, .012, 6, 64)),
      material(new THREE.MeshBasicMaterial({ color: controlColor, transparent: true, opacity: .45, depthWrite: false })),
    );
    focusRing.rotation.x = .72;
    scene.add(focusRing);

    const dustRand = seeded(7);
    const dustPositions: number[] = [];
    for (let i = 0; i < 58; i++) {
      dustPositions.push((dustRand() - .5) * 24, (dustRand() - .5) * 9, (dustRand() - .5) * 8 - 2);
    }
    const dust = glowPoints("#6487a5", .9, dustPositions);
    dust.material.uniforms.opacity.value = .13;
    dust.material.uniforms.energy.value = .36;
    scene.add(dust);

    const providerOfferPos = new THREE.Vector3();
    const visibleOfferPos = new THREE.Vector3();
    const trustPos = new THREE.Vector3();
    const usagePos = new THREE.Vector3();
    const agreementPos = new THREE.Vector3();
    const dspPos = new THREE.Vector3();
    const sourcePos = new THREE.Vector3();
    const edrHome = new THREE.Vector3();
    const payloadHome = new THREE.Vector3();
    const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
    const point = new THREE.Vector3();
    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    const color = new THREE.Color();

    function semanticPositions() {
      const companyScale = layout.companyScale ?? 1;
      sourcePos.copy(vec("provider")).add(new THREE.Vector3(0, -1.25 * companyScale, .72));
      providerOfferPos.copy(vec("provider")).add(new THREE.Vector3(1.35 * companyScale, 1.18 * companyScale, .8));
      visibleOfferPos.copy(vec("consumer")).add(new THREE.Vector3(-1.35 * companyScale, 1.14 * companyScale, .78));
      trustPos.copy(vec("provider")).add(new THREE.Vector3(1.28 * companyScale, .48 * companyScale, .9));
      usagePos.copy(vec("consumer")).add(new THREE.Vector3(-1.28 * companyScale, .7 * companyScale, .92));
      agreementPos.set(0, .18, 1.15);
      dspPos.set(0, .65, 1.0);
      edrHome.copy(vec("consumer")).add(new THREE.Vector3(-1.15 * companyScale, .88 * companyScale, .85));
      payloadHome.copy(vec("consumer")).add(new THREE.Vector3(-.78 * companyScale, -1.05 * companyScale, .82));
    }

    function syncLayout() {
      const compact = camera.aspect < .9;
      const worldScale = compact ? .72 : .9;
      providerWorld.group.position.copy(vec("provider"));
      consumerWorld.group.position.copy(vec("consumer"));
      providerWorld.group.scale.setScalar(worldScale);
      consumerWorld.group.scale.setScalar(worldScale);

      semanticPositions();
      source.group.position.copy(sourcePos);
      providerOffer.group.position.copy(providerOfferPos);
      visibleOffer.group.position.copy(visibleOfferPos);
      trust.group.position.copy(trustPos);
      usage.group.position.copy(usagePos);
      agreement.group.position.copy(agreementPos);
      dsp.group.position.copy(dspPos);
      edr.position.copy(edrHome);
      payload.group.position.copy(payloadHome);

      const rel = relationshipGeometry.getAttribute("position") as THREE.BufferAttribute;
      rel.setXYZ(0, vec("provider").x, .25, .15);
      rel.setXYZ(1, vec("consumer").x, .25, .15);
      rel.needsUpdate = true;

      const control = controlLaneGeometry.getAttribute("position") as THREE.BufferAttribute;
      control.setXYZ(0, vec("provider").x + 1.25, .72, .05);
      control.setXYZ(1, vec("consumer").x - 1.25, .72, .05);
      control.needsUpdate = true;

      const data = dataLaneGeometry.getAttribute("position") as THREE.BufferAttribute;
      data.setXYZ(0, vec("provider").x + 1.25, -1.05, .05);
      data.setXYZ(1, vec("consumer").x - 1.25, -1.05, .05);
      data.needsUpdate = true;

      camera.position.set(0, .05, layout.distance);
      cameraTarget.copy(camera.position);
      lookAt.set(0, 0, 0);
      lookTarget.set(0, 0, 0);
    }

    function participantPoint(id: NodeId, target: THREE.Vector3) {
      if (id === "provider") return target.copy(vec("provider"));
      if (id === "consumer") return target.copy(vec("consumer"));
      if (id === "identity") return target.copy(trustPos);
      if (id === "policy") return target.copy(usagePos);
      if (id === "agreement") return target.copy(agreementPos);
      return target.copy(visibleOfferPos);
    }

    const resize = new ResizeObserver(() => {
      width = Math.max(1, element.clientWidth);
      height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height);
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      layout = journeyLayout(camera.aspect);
      syncLayout();
    });
    resize.observe(element);

    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1),
      );
    };
    const resetPointer = () => pointer.set(0, 0);
    element.addEventListener("pointermove", onPointerMove, { passive: true });
    element.addEventListener("pointerleave", resetPointer);

    let raf = 0;
    let lastRender = 0;
    let disposed = false;

    function render(now: number) {
      if (disposed) return;
      raf = requestAnimationFrame(render);
      const p = live.current;
      if (document.hidden) return;

      const mobile = width < 720;
      const frameGap = p.paused || p.reduced ? 100 : mobile ? 1000 / 30 : 1000 / 45;
      if (now - lastRender < frameGap) return;
      lastRender = now;

      const sequence = sequenceFrame(p.chapter, p.progress, p.fault);
      const current = sequence.current;
      const t = p.reduced ? 0 : sequence.position * chapters[p.chapter].duration;
      const parallax = mobile || p.reduced ? 0 : 1;

      cameraTarget.set(pointer.x * .18 * parallax, .05 + pointer.y * .08 * parallax, layout.distance);
      lookTarget.set(pointer.x * .08 * parallax, pointer.y * .04 * parallax, 0);
      if (!p.paused) {
        camera.position.lerp(cameraTarget, p.reduced ? 1 : .045);
        lookAt.lerp(lookTarget, p.reduced ? 1 : .05);
      }
      camera.lookAt(lookAt);

      const providerInvolved = current.from === "provider" || current.to === "provider" || current.focus === "provider" || current.focus === "identity";
      const consumerInvolved = current.from === "consumer" || current.to === "consumer" || current.focus === "consumer" || current.focus === "policy";
      [providerWorld, consumerWorld].forEach((world, index) => {
        const active = index === 0 ? providerInvolved : consumerInvolved;
        world.group.rotation.y = Math.sin(t * .08 + index) * .08 + pointer.x * .022 * parallax * (index ? 1 : -1);
        world.group.rotation.x = pointer.y * .012 * parallax;
        world.shell.rotation.y = t * .025 * (index ? -1 : 1);
        world.ring.rotation.z = t * .035 * (index ? -1 : 1);
        world.core.rotation.set(t * .12, t * .2 * (index ? -1 : 1), .12);
        world.core.material.emissiveIntensity = active ? 1.0 : .42;
        world.shell.material.opacity = active ? .15 : .08;
        world.network.material.opacity = active ? .22 : .1;
        world.nodes.material.uniforms.opacity.value = active ? .8 : .48;
        world.halo.material.uniforms.opacity.value = active ? .7 : .38;
      });

      source.group.visible = p.chapter === 0 || p.chapter === 1 || (p.chapter === 6 && (current.id === "read-source" || current.id === "payload")) || p.chapter === 7;
      source.group.position.copy(sourcePos);
      source.core.rotation.set(t * .18, t * .38, .2);
      source.core.material.emissiveIntensity = current.id === "read-source" || current.id === "payload" || p.chapter === 0 ? 1.7 : .85;

      providerOffer.group.visible = p.chapter === 1;
      providerOffer.group.position.copy(providerOfferPos);
      providerOffer.core.rotation.set(.12, t * .12, .04);
      providerOffer.core.material.emissiveIntensity = current.id === "publish-offer" || current.id === "offer-ready" ? 1.65 : .8;

      const trustActive = p.chapter === 3 && (current.id === "credential-check" || current.id === "access-check");
      trust.group.visible = trustActive;
      trust.group.position.copy(trustPos);
      trust.core.rotation.set(t * .2, t * .36, .1);
      trust.core.material.emissiveIntensity = trustActive ? 1.8 : .7;

      usage.group.visible = p.chapter === 4 || (p.chapter === 5 && current.id === "contract-policy-check");
      usage.group.position.copy(p.chapter === 5 ? trustPos : usagePos);
      usage.core.rotation.set(t * .18, t * .28, t * .08);
      usage.core.material.emissiveIntensity = current.focus === "policy" ? 1.8 : .75;

      dsp.group.visible = p.chapter === 2;
      dsp.group.position.copy(dspPos);
      dsp.group.rotation.set(.4, t * .22, t * .08);
      dsp.core.material.emissiveIntensity = 1.45;

      const catalogResponse = p.chapter === 3 ? sequence.beats.find(beat => beat.id === "catalog-response") : undefined;
      const offerFound = p.chapter === 3 ? sequence.beats.find(beat => beat.id === "offer-found") : undefined;
      const visibleOfferShown = p.chapter === 4 || !!catalogResponse && catalogResponse.status !== "upcoming" || !!offerFound && offerFound.status !== "upcoming";
      visibleOffer.group.visible = visibleOfferShown;
      if (p.chapter === 3 && catalogResponse?.status === "active") {
        visibleOffer.group.position.copy(providerOfferPos).lerp(visibleOfferPos, smooth(catalogResponse.fraction));
      } else {
        visibleOffer.group.position.copy(visibleOfferPos);
      }
      visibleOffer.core.rotation.set(.08, t * .1, .03);
      visibleOffer.core.material.emissiveIntensity = p.chapter === 4 || current.id === "offer-found" ? 1.55 : 1.05;

      const agreementBeat = p.chapter === 5 ? sequence.beats.find(beat => beat.id === "contract-agreement") : undefined;
      const agreementVisible = p.chapter > 5 || sequence.agreementReady || !!agreementBeat && agreementBeat.status !== "upcoming";
      agreement.group.visible = agreementVisible;
      agreement.group.position.copy(agreementPos);
      const agreementScale = sequence.agreementReady ? 1 : agreementBeat?.status === "active" ? .55 + smooth(agreementBeat.fraction) * .45 : .8;
      agreement.group.scale.setScalar(agreementScale);
      agreement.core.rotation.set(t * .14, t * .24, .18);
      agreement.core.material.emissiveIntensity = sequence.agreementReady || current.id === "contract-finalized" || current.id === "seal" ? 2.0 : 1.05;

      relationship.visible = p.chapter >= 5 && (sequence.agreementReady || current.id === "contract-finalized" || current.id === "seal");
      relationship.material.opacity = sequence.agreementReady ? .18 : .08;

      const transferStart = p.chapter === 6 ? sequence.beats.find(beat => beat.id === "transfer-start") : undefined;
      const edrVisible = p.chapter > 6 || sequence.edrReady || !!transferStart && transferStart.status !== "upcoming";
      edr.visible = edrVisible;
      if (p.chapter === 6 && transferStart?.status === "active") {
        participantPoint("provider", start);
        participantPoint("consumer", end);
        curve.v0.copy(start);
        curve.v3.copy(end);
        curve.v1.copy(start).lerp(end, .34).add(new THREE.Vector3(0, .8, .7));
        curve.v2.copy(start).lerp(end, .66).add(new THREE.Vector3(0, .8, .7));
        curve.getPoint(smooth(transferStart.fraction), edr.position);
      } else {
        edr.position.copy(edrHome);
      }
      edr.rotation.set(.22, t * .32, .08);
      edrRing.material.emissiveIntensity = current.id === "transfer-start" || current.id === "edr-ready" ? 2 : .85;
      edrBar.material.emissiveIntensity = edrRing.material.emissiveIntensity;

      const payloadBeat = p.chapter === 6 ? sequence.beats.find(beat => beat.id === "payload") : undefined;
      payload.group.visible = sequence.copyVisible;
      if (p.chapter === 6 && payloadBeat?.status === "active") {
        participantPoint("provider", start);
        participantPoint("consumer", end);
        curve.v0.copy(start);
        curve.v3.copy(end);
        curve.v1.copy(start).lerp(end, .33).add(new THREE.Vector3(0, -1.05, .72));
        curve.v2.copy(start).lerp(end, .67).add(new THREE.Vector3(0, -1.05, .72));
        curve.getPoint(smooth(payloadBeat.fraction), payload.group.position);
      } else {
        payload.group.position.copy(payloadHome);
      }
      payload.core.rotation.set(t * .25, t * .5, t * .12);
      payload.core.material.emissiveIntensity = current.id === "payload" || p.chapter === 7 ? 2.1 : 1.0;

      controlLane.visible = p.chapter === 6;
      dataLane.visible = p.chapter === 6;
      if (p.chapter === 6) {
        const dataActive = current.kind === "data" || current.kind === "retrieval";
        controlLane.material.opacity = dataActive ? .07 : .2;
        dataLane.material.opacity = dataActive ? .2 : .07;
      }

      activeLine.visible = false;
      token.visible = false;
      trail.visible = false;

      const moving = !!current.from && !!current.to && (current.status === "active" || current.status === "blocked");
      const special = current.id === "catalog-response" || current.id === "transfer-start" || current.id === "payload";
      if (moving) {
        participantPoint(current.from!, start);
        participantPoint(current.to!, end);
        const dataMove = current.kind === "data" || current.kind === "retrieval";
        const liftY = dataMove ? -1.05 : .78;
        const liftZ = dataMove ? .72 : .62;
        curve.v0.copy(start);
        curve.v3.copy(end);
        curve.v1.copy(start).lerp(end, .34).add(new THREE.Vector3(0, liftY, liftZ));
        curve.v2.copy(start).lerp(end, .66).add(new THREE.Vector3(0, liftY, liftZ));

        const attr = activeLineGeometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < 73; i++) {
          curve.getPoint(i / 72, point);
          attr.setXYZ(i, point.x, point.y, point.z);
        }
        attr.needsUpdate = true;
        const fraction = smooth(current.fraction);
        activeLine.visible = true;
        activeLine.geometry.setDrawRange(0, Math.max(2, Math.floor(73 * (p.reduced ? 1 : fraction))));
        color.set(stepAccent(p.chapter, current.kind, sequence.blocked));
        activeLine.material.color.copy(color);
        activeLine.material.opacity = sequence.blocked ? .72 : .58;

        if (!special) {
          token.visible = true;
          curve.getPoint(fraction, token.position);
          token.rotation.set(t * .3, t * .48, .12);
          token.material.color.copy(color);
          token.material.emissive.copy(color);
          token.material.emissiveIntensity = 1.65;

          if (!p.reduced) {
            trail.visible = true;
            trail.material.uniforms.tint.value.copy(color);
            const trailAttr = trail.geometry.getAttribute("position") as THREE.BufferAttribute;
            for (let i = 0; i < 10; i++) {
              curve.getPoint(Math.max(0, fraction - i * .025), point);
              trailAttr.setXYZ(i, point.x, point.y, point.z);
            }
            trailAttr.needsUpdate = true;
          }
        }
      }

      let focusPos: THREE.Vector3;
      if (current.focus === "provider") focusPos = vec("provider");
      else if (current.focus === "consumer") focusPos = vec("consumer");
      else if (current.focus === "identity") focusPos = trustPos;
      else if (current.focus === "policy") focusPos = p.chapter === 5 ? trustPos : usagePos;
      else if (current.focus === "agreement") focusPos = agreementPos;
      else focusPos = p.chapter === 1 ? providerOfferPos : visibleOfferPos;
      focusRing.position.copy(focusPos);
      focusRing.visible = !moving || special;
      focusRing.material.color.set(stepAccent(p.chapter, current.kind, sequence.blocked));
      focusRing.material.opacity = .34 + (p.reduced ? 0 : Math.sin(t * 1.8) * .08);
      focusRing.rotation.z = t * .12;

      activeLight.color.set(stepAccent(p.chapter, current.kind, sequence.blocked));
      activeLight.position.copy(focusPos).add(new THREE.Vector3(0, .6, 2.2));
      activeLight.intensity = 2.0;

      dust.rotation.y = t * .003;
      if (!mobile && !p.reduced) composer.render();
      else renderer.render(scene, camera);
    }

    syncLayout();
    raf = requestAnimationFrame(render);

    const lost = (event: Event) => {
      event.preventDefault();
      setUnavailable(true);
      cancelAnimationFrame(raf);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", resetPointer);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      composer.dispose();
      environmentTarget.dispose();
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (unavailable) return <SimpleScene {...props} />;

  const sequence = sequenceFrame(props.chapter, props.progress, props.fault);
  const current = sequence.current;
  const providerActive = current.from === "provider" || current.to === "provider" || current.focus === "provider" || current.focus === "identity";
  const consumerActive = current.from === "consumer" || current.to === "consumer" || current.focus === "consumer" || current.focus === "policy";
  const catalogResponse = sequence.beats.find(beat => beat.id === "catalog-response");
  const visibleOfferReady = props.chapter > 3 || (props.chapter === 3 && !!catalogResponse && catalogResponse.status !== "upcoming");
  const agreementShown = props.chapter > 5 || sequence.agreementReady || (props.chapter === 5 && ["contract-agreement", "contract-verification", "contract-finalized", "seal"].includes(current.id));
  const transferStart = sequence.beats.find(beat => beat.id === "transfer-start");
  const edrShown = props.chapter > 6 || sequence.edrReady || (props.chapter === 6 && !!transferStart && transferStart.status !== "upcoming");

  return (
    <div
      ref={host}
      className={styles.canvas}
      role="group"
      aria-label={`Conceptual Tractus-X journey. ${chapters[props.chapter].title} Current step: ${current.title}.`}
    >
      <CompanyBadge
        side="left"
        title="Company A"
        role="Supplier · Provider"
        accent={providerColor}
        active={providerActive}
        pressed={props.selected === "provider"}
        onClick={() => props.onSelect("provider")}
      />
      <CompanyBadge
        side="right"
        title="Company B"
        role="Manufacturer · Consumer"
        accent={consumerColor}
        active={consumerActive}
        pressed={props.selected === "consumer"}
        onClick={() => props.onSelect("consumer")}
      />

      <ActiveStepCard chapter={props.chapter} beat={current} blocked={sequence.blocked} />
      <ProcessRail chapter={props.chapter} currentId={current.id} blocked={sequence.blocked} />

      {(props.chapter === 0 || props.chapter === 1) && (
        <ArtifactCard
          eyebrow="Private source"
          title="Battery-footprint record"
          accent={dataColor}
          position={{ left: "clamp(20px, 8vw, 110px)", bottom: 62 }}
          rows={[
            { label: "Location", value: "Company A" },
            { label: "Payload moved", value: "No", strong: true },
          ]}
        />
      )}

      {props.chapter === 1 && (
        <ArtifactCard
          eyebrow="Provider offer"
          title="What Company A is publishing"
          accent={controlColor}
          active={current.id === "publish-offer" || current.id === "offer-ready"}
          position={{ left: "26%", top: "31%", transform: "translate(-50%, -50%)" }}
          rows={[
            { label: "Asset", value: "battery-pcf-demo" },
            { label: "Access", value: "Trusted partner" },
            { label: "Usage", value: "Product-footprint" },
            { label: "Payload", value: "Not included", strong: true },
          ]}
          nodeId="catalog"
          selected={props.selected}
          onSelect={props.onSelect}
        />
      )}

      {props.chapter === 2 && (
        <ArtifactCard
          eyebrow="DSP discovery"
          title="Compatible connector found"
          accent={controlColor}
          active
          position={{ left: "50%", top: "34%", transform: "translate(-50%, -50%)" }}
          rows={[
            { label: "Discovery", value: "/.well-known/dspace-version" },
            { label: "Selected", value: "DSP 2025-1", strong: true },
            { label: "Next", value: "Catalogue request" },
          ]}
        />
      )}

      {props.chapter === 3 && (current.id === "credential-check" || current.id === "access-check") && (
        <ArtifactCard
          eyebrow="Provider gate"
          title="Identity + access check"
          accent={current.id === "credential-check" ? "#75dbff" : controlColor}
          active
          position={{ left: "28%", top: "37%", transform: "translate(-50%, -50%)" }}
          rows={[
            { label: "Credentials", value: current.id === "credential-check" ? "Verifying…" : "Accepted" },
            { label: "Access policy", value: current.id === "access-check" ? "Filtering…" : "Next" },
            { label: "Payload moved", value: "No" },
          ]}
          nodeId="identity"
          selected={props.selected}
          onSelect={props.onSelect}
        />
      )}

      {props.chapter === 3 && visibleOfferReady && (
        <ArtifactCard
          eyebrow={current.id === "catalog-response" ? "Returning offer" : "Visible offer"}
          title="Battery-footprint offer"
          accent={controlColor}
          active={current.id === "catalog-response" || current.id === "offer-found"}
          position={{ right: "9%", top: "32%", transform: "translateY(-50%)" }}
          rows={[
            { label: "Visible to", value: "Company B" },
            { label: "Reason", value: "Access check passed" },
            { label: "Payload", value: "Still at Company A", strong: true },
          ]}
          nodeId="catalog"
          selected={props.selected}
          onSelect={props.onSelect}
        />
      )}

      {props.chapter === 4 && (
        <ArtifactCard
          eyebrow="Visible offer"
          title="Company B chooses the allowed use"
          accent={usageColor}
          active
          position={{ right: "8%", top: "31%", transform: "translateY(-50%)" }}
          rows={[
            { label: "Offer", value: "battery-pcf-demo" },
            { label: "Usage purpose", value: "Product-footprint", strong: true },
            { label: "Provider evaluation", value: "Not yet" },
            { label: "Next", value: "Negotiate" },
          ]}
          nodeId="policy"
          selected={props.selected}
          onSelect={props.onSelect}
        />
      )}

      {props.chapter === 5 && agreementShown && (
        <ArtifactCard
          eyebrow="Contract agreement"
          title={sequence.agreementReady ? "Finalized agreement" : "Agreement in progress"}
          accent={contractColor}
          active={current.id === "contract-agreement" || current.id === "contract-verification" || current.id === "contract-finalized" || current.id === "seal"}
          position={{ left: "50%", top: "57%", transform: "translate(-50%, -50%)" }}
          rows={[
            { label: "Offer", value: "battery-pcf-demo" },
            { label: "State", value: sequence.agreementReady ? "FINALIZED" : current.id === "contract-verification" ? "VERIFYING" : "NEGOTIATING", strong: true },
            { label: "Payload moved", value: "No" },
          ]}
          nodeId="agreement"
          selected={props.selected}
          onSelect={props.onSelect}
        />
      )}

      {props.chapter === 6 && <LaneGuide kind={current.kind} />}

      {props.chapter === 6 && edrShown && (
        <ArtifactCard
          eyebrow="EDR"
          title="Access key, not the data"
          accent={controlColor}
          active={current.id === "transfer-start" || current.id === "edr-ready"}
          position={{ right: "8%", top: "31%", transform: "translateY(-50%)" }}
          rows={[
            { label: "Contains", value: "Endpoint + authorization" },
            { label: "Purpose", value: "Unlock data plane" },
            { label: "Payload", value: sequence.copyVisible ? "Moving separately" : "Not received", strong: true },
          ]}
        />
      )}

      {props.chapter === 6 && current.id === "payload" && (
        <ArtifactCard
          eyebrow="Actual payload"
          title="The battery record moves now"
          accent={dataColor}
          active
          position={{ left: "50%", top: "72%", transform: "translate(-50%, -50%)" }}
          rows={[
            { label: "From", value: "Company A data plane" },
            { label: "To", value: "Company B" },
            { label: "Original", value: "Stays at Company A", strong: true },
          ]}
        />
      )}

      {props.chapter === 7 && (
        <>
          <ArtifactCard
            eyebrow="Received copy"
            title="Company B can use the record"
            accent={dataColor}
            active
            position={{ right: "8%", top: "34%", transform: "translateY(-50%)" }}
            rows={[
              { label: "Value", value: "42.6 kg CO₂e" },
              { label: "Use", value: "Product-footprint" },
              { label: "Agreement", value: "Obligations continue" },
            ]}
          />
          <ArtifactCard
            eyebrow="Original"
            title="Source remains with Company A"
            accent={providerColor}
            position={{ left: "clamp(20px, 8vw, 110px)", bottom: 62 }}
            rows={[
              { label: "System of record", value: "Company A" },
              { label: "Relocated", value: "No", strong: true },
            ]}
          />
        </>
      )}

      <DataStateBadge
        chapter={props.chapter}
        currentId={current.id}
        copyVisible={sequence.copyVisible}
        copyDelivered={sequence.copyDelivered}
      />
    </div>
  );
}

/** Lightweight fallback with the same causal story. */
export function SimpleScene({ chapter, progress, fault, selected, onSelect }: SceneProps) {
  const sequence = sequenceFrame(chapter, progress, fault);
  const marker = useId();
  const current = sequence.current;
  const positions: Record<NodeId, [number, number]> = {
    provider: [120, 190],
    consumer: [600, 190],
    catalog: [270, 95],
    identity: [285, 190],
    policy: [475, 95],
    agreement: [360, 250],
  };
  const accent = stepAccent(chapter, current.kind, sequence.blocked);

  return (
    <div className={styles.simpleScene}>
      <svg viewBox="0 0 720 360" role="img" aria-label={`${chapters[chapter].title}. ${current.title}`}>
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" />
          </marker>
        </defs>

        <text x="360" y="28" textAnchor="middle" fill={accent} fontSize="13" fontWeight="700">{current.title}</text>
        {current.from && current.to && (
          <text x="360" y="46" textAnchor="middle" fill="#8198ae" fontSize="9">
            {participantLabel(current.from)} → {participantLabel(current.to)}
          </text>
        )}

        {(["provider", "consumer"] as const).map(id => {
          const [x, y] = positions[id];
          const color = id === "provider" ? providerColor : consumerColor;
          const active = current.from === id || current.to === id || current.focus === id;
          return (
            <g key={id}>
              <circle cx={x} cy={y} r="62" fill="#07131f" stroke={color} strokeWidth={active ? 3 : 1.5} />
              <circle cx={x} cy={y} r="44" fill="none" stroke={color} opacity=".28" />
              <circle cx={x} cy={y} r="16" fill={color} opacity={active ? 1 : .6} />
              <text x={x} y={y - 82} fill="#e6f1ff" textAnchor="middle" fontSize="15">{journeyNodes[id].label}</text>
              <text x={x} y={y - 67} fill={color} textAnchor="middle" fontSize="9">{journeyNodes[id].role}</text>
            </g>
          );
        })}

        {current.from && current.to && (
          <path
            d={`M${positions[current.from][0]} ${positions[current.from][1]} Q360 ${current.kind === "data" || current.kind === "retrieval" ? 285 : 105} ${positions[current.to][0]} ${positions[current.to][1]}`}
            fill="none"
            stroke={accent}
            strokeWidth={current.kind === "data" ? 4 : 2}
            markerEnd={`url(#${marker})`}
          />
        )}

        {chapter === 1 && (
          <g>
            <rect x="205" y="90" width="150" height="70" rx="12" fill="#091827" stroke={controlColor} />
            <text x="280" y="112" textAnchor="middle" fill={controlColor} fontSize="10">PROVIDER OFFER</text>
            <text x="280" y="130" textAnchor="middle" fill="#eaf2fb" fontSize="11">Asset + access + usage</text>
            <text x="280" y="147" textAnchor="middle" fill="#8499ad" fontSize="9">Payload not included</text>
          </g>
        )}

        {chapter === 4 && (
          <g>
            <rect x="430" y="86" width="170" height="82" rx="12" fill="#16120b" stroke={usageColor} />
            <text x="515" y="108" textAnchor="middle" fill={usageColor} fontSize="10">VISIBLE OFFER</text>
            <text x="515" y="128" textAnchor="middle" fill="#eaf2fb" fontSize="11">Usage: Product-footprint</text>
            <text x="515" y="148" textAnchor="middle" fill="#8499ad" fontSize="9">Provider evaluation comes next</text>
          </g>
        )}

        {sequence.agreementReady && (
          <g>
            <path d="M360 230 l20 20 -20 20 -20 -20 Z" fill="none" stroke={contractColor} strokeWidth="3" />
            <text x="360" y="292" fill={contractColor} textAnchor="middle" fontSize="10">FINALIZED AGREEMENT</text>
          </g>
        )}

        {sequence.edrReady && (
          <g>
            <circle cx="545" cy="135" r="11" fill="none" stroke={controlColor} strokeWidth="4" />
            <line x1="556" y1="135" x2="580" y2="135" stroke={controlColor} strokeWidth="4" />
            <text x="560" y="112" fill={controlColor} textAnchor="middle" fontSize="10">EDR · ACCESS KEY</text>
          </g>
        )}

        {sequence.copyVisible && (
          <>
            <path transform={`translate(${sequence.copyDelivered ? 600 : 360} 225)`} d="M0 -10 l10 10 -10 10 -10 -10 Z" fill={dataColor} />
            <text x={sequence.copyDelivered ? 600 : 360} y="250" fill={dataColor} textAnchor="middle" fontSize="10">
              {sequence.copyDelivered ? "RECEIVED COPY" : "ACTUAL PAYLOAD"}
            </text>
          </>
        )}
      </svg>

      <div className={styles.simpleNodes}>
        {(Object.keys(journeyNodes) as NodeId[]).map(id => (
          <button key={id} onClick={() => onSelect(id)} aria-pressed={selected === id}>
            {journeyNodes[id].label}
          </button>
        ))}
      </div>
    </div>
  );
}
