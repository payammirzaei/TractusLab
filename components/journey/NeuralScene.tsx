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

type OverlayId = NodeId | "source" | "edr" | "payload" | "message";
type OverlaySpec = {
  id: OverlayId;
  title: string;
  subtitle: string;
  color: string;
  visible: boolean;
  active: boolean;
  nodeId?: NodeId;
};

const providerColor = "#59edcf";
const consumerColor = "#aaa4ff";
const controlColor = "#80caff";
const contractColor = "#f5d786";
const dataColor = "#59edcf";
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

function overlayStyle(spec: OverlaySpec): React.CSSProperties {
  return {
    position: "absolute",
    zIndex: spec.active ? 8 : 6,
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    minWidth: spec.active ? 118 : 92,
    maxWidth: "min(220px, 40vw)",
    padding: spec.active ? "7px 11px" : "5px 9px",
    borderRadius: 10,
    border: `1px solid ${spec.color}${spec.active ? "aa" : "55"}`,
    background: spec.active ? "rgba(7, 15, 28, .94)" : "rgba(5, 12, 22, .78)",
    boxShadow: spec.active ? `0 0 28px ${spec.color}22, inset 0 1px 0 rgba(255,255,255,.05)` : "inset 0 1px 0 rgba(255,255,255,.03)",
    backdropFilter: "blur(10px)",
    color: spec.active ? "#f4f8ff" : "#d6e1ef",
    opacity: spec.visible ? 1 : 0,
    visibility: spec.visible ? "visible" : "hidden",
    pointerEvents: spec.visible && spec.nodeId ? "auto" : "none",
    transition: "opacity .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease",
    cursor: spec.nodeId ? "pointer" : "default",
    font: "inherit",
    lineHeight: 1.15,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
}

export default function NeuralScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const overlays = useRef<Partial<Record<OverlayId, HTMLElement | null>>>({});
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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.15 : 1.5));
    renderer.setClearColor(0x050a12, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
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

    const pbr = (color: THREE.ColorRepresentation, emissive = .18, opacity = 1) => material(new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: emissive,
      roughness: .28,
      metalness: .5,
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
        vertexShader: "uniform float size; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(90.0,size*160.0/-p.z);gl_Position=projectionMatrix*p;}",
        fragmentShader: "uniform vec3 tint;uniform float opacity;uniform float energy;void main(){float d=length(gl_PointCoord-vec2(.5))*2.;if(d>1.)discard;float a=pow(1.-d,3.2);gl_FragColor=vec4(tint*energy,a*opacity);}",
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

    scene.add(new THREE.HemisphereLight(0xb8dcff, 0x03070d, 1.45));
    const key = new THREE.DirectionalLight(0xd8f5ff, 2.1);
    key.position.set(-5, 7, 8);
    const rim = new THREE.DirectionalLight(0xb8aaff, 1.8);
    rim.position.set(6, -2, 6);
    const activeLight = new THREE.PointLight(0x80caff, 0, 9, 2);
    scene.add(key, rim, activeLight);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .58, .42, 1.02);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const hitMeshes: THREE.Object3D[] = [];

    type World = {
      group: THREE.Group;
      core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      shell: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      halo: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
      network: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      nodes: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
      rings: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
      id: "provider" | "consumer";
    };

    function createWorld(id: "provider" | "consumer", color: string, seed: number): World {
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.42, 2)), pbr(color, .55));
      core.userData.nodeId = id;
      hitMeshes.push(core);
      group.add(core);

      const shell = new THREE.Mesh(
        geometry(new THREE.IcosahedronGeometry(1.58, 2)),
        material(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .11, depthWrite: false })),
      );
      group.add(shell);

      const halo = glowPoints(color, 15, [0, 0, 0]);
      halo.material.uniforms.energy.value = 1.4;
      group.add(halo);

      const rings = [0, 1, 2].map((_, index) => {
        const ring = new THREE.Mesh(
          geometry(new THREE.TorusGeometry(1.12 + index * .18, .012, 6, 72)),
          material(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .14, depthWrite: false })),
        );
        ring.rotation.set(.5 + index * .7, index * .9, .2 + index * .4);
        group.add(ring);
        return ring;
      });

      const rand = seeded(seed);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 28; i++) {
        const theta = i * 2.399963;
        const phi = Math.acos(1 - 2 * (i + .5) / 28);
        const radius = .72 + rand() * .72;
        pts.push(new THREE.Vector3(
          Math.cos(theta) * Math.sin(phi) * radius,
          Math.sin(theta) * Math.sin(phi) * radius * .88,
          Math.cos(phi) * radius * .84,
        ));
      }

      const edgeData: number[] = [];
      pts.forEach((point, i) => {
        let nearest = -1;
        let distance = Infinity;
        pts.forEach((candidate, j) => {
          if (i === j) return;
          const d = point.distanceToSquared(candidate);
          if (d < distance) { distance = d; nearest = j; }
        });
        if (nearest >= 0 && nearest > i) edgeData.push(...point.toArray(), ...pts[nearest].toArray());
      });
      const edgeGeometry = geometry(new THREE.BufferGeometry());
      edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgeData, 3));
      const network = new THREE.LineSegments(edgeGeometry, lineMat(color, .18));
      group.add(network);

      const nodePoints = glowPoints(color, 2.5, pts.flatMap(point => point.toArray()));
      nodePoints.material.uniforms.opacity.value = .72;
      group.add(nodePoints);

      scene.add(group);
      return { group, core, shell, halo, network, nodes: nodePoints, rings, id };
    }

    const providerWorld = createWorld("provider", providerColor, 91);
    const consumerWorld = createWorld("consumer", consumerColor, 133);

    type Glyph = {
      id: Exclude<NodeId, "provider" | "consumer">;
      group: THREE.Group;
      core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      rings: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
      halo: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    };

    function createGlyph(id: Glyph["id"], shape: THREE.BufferGeometry): Glyph {
      const color = journeyNodes[id].color;
      const group = new THREE.Group();
      const core = new THREE.Mesh(geometry(shape), pbr(color, .35));
      core.userData.nodeId = id;
      hitMeshes.push(core);
      group.add(core);
      const halo = glowPoints(color, 8, [0, 0, 0]);
      halo.material.uniforms.opacity.value = .22;
      group.add(halo);
      const rings = [0, 1].map((_, i) => {
        const ring = new THREE.Mesh(
          geometry(new THREE.TorusGeometry(.38 + i * .12, .009, 6, 56)),
          material(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .11, depthWrite: false })),
        );
        ring.rotation.set(i * .8 + .4, i * .6, i * .5);
        group.add(ring);
        return ring;
      });
      scene.add(group);
      return { id, group, core, rings, halo };
    }

    const glyphs: Glyph[] = [
      createGlyph("catalog", new THREE.BoxGeometry(.38, .32, .18)),
      createGlyph("identity", new THREE.OctahedronGeometry(.28, 1)),
      createGlyph("policy", new THREE.TetrahedronGeometry(.34, 1)),
      createGlyph("agreement", new THREE.DodecahedronGeometry(.32, 1)),
    ];

    const source = new THREE.Group();
    const sourceCore = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.25, 1)), pbr(dataColor, 1.2));
    const sourceShell = new THREE.Mesh(
      geometry(new THREE.IcosahedronGeometry(.4, 1)),
      material(new THREE.MeshBasicMaterial({ color: dataColor, wireframe: true, transparent: true, opacity: .35, depthWrite: false })),
    );
    source.add(sourceCore, sourceShell);
    scene.add(source);

    type Path = {
      beat: JourneyBeat;
      chapter: number;
      curve: THREE.CubicBezierCurve3;
      line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      token: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      trail: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    };
    const paths: Path[] = [];

    function tokenGeometry(beat: JourneyBeat) {
      if (beat.id.includes("version")) return geometry(new THREE.TorusGeometry(.15, .035, 8, 28));
      if (beat.id === "catalog-response") return geometry(new THREE.BoxGeometry(.3, .19, .08));
      if (beat.id.includes("contract")) return geometry(new THREE.OctahedronGeometry(.15, 1));
      if (beat.id === "fetch") return geometry(new THREE.TorusGeometry(.14, .03, 8, 30));
      return geometry(new THREE.BoxGeometry(.24, .13, .07));
    }

    function createPath(beat: JourneyBeat, chapter: number) {
      if (!beat.from || !beat.to) return;
      const color = chapter === 5 ? contractColor : signalStyles[beat.kind].color;
      const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(new Array(101 * 3).fill(0), 3));
      const line = new THREE.Line(g, lineMat(color, .08));
      const token = new THREE.Mesh(tokenGeometry(beat), pbr(color, 1.8));
      const trail = glowPoints(color, beat.kind === "data" ? 5.5 : 3.5, new Array(12 * 3).fill(0));
      trail.frustumCulled = false;
      trail.material.uniforms.opacity.value = .8;
      scene.add(line, token, trail);
      paths.push({ beat, chapter, curve, line, token, trail });
    }
    journeySequences.forEach((beats, chapter) => beats.forEach(beat => createPath(beat, chapter)));

    const focusRing = new THREE.Group();
    const focusRings = [0, 1].map((_, i) => {
      const ring = new THREE.Mesh(
        geometry(new THREE.TorusGeometry(.58 + i * .15, .014, 6, 72)),
        material(new THREE.MeshBasicMaterial({ color: controlColor, transparent: true, opacity: .7, depthWrite: false })),
      );
      ring.rotation.set(.6 + i * .7, .2 + i, .1);
      focusRing.add(ring);
      return ring;
    });
    scene.add(focusRing);

    const agreementGroup = new THREE.Group();
    const agreementCore = new THREE.Mesh(
      geometry(new THREE.DodecahedronGeometry(.48, 1)),
      material(new THREE.MeshPhysicalMaterial({
        color: "#8b6b1e",
        emissive: contractColor,
        emissiveIntensity: 1.45,
        metalness: .82,
        roughness: .16,
        clearcoat: .9,
        clearcoatRoughness: .08,
      })),
    );
    agreementGroup.add(agreementCore);
    const agreementHalo = glowPoints(contractColor, 12, [0, 0, 0]);
    agreementHalo.material.uniforms.energy.value = 2.2;
    agreementGroup.add(agreementHalo);
    scene.add(agreementGroup);

    const fragments = Array.from({ length: 8 }, (_, i) => {
      const fragment = new THREE.Mesh(geometry(new THREE.TetrahedronGeometry(.15)), pbr(contractColor, 1.2));
      fragment.userData.phase = i * Math.PI * 2 / 8;
      scene.add(fragment);
      return fragment;
    });

    const edr = new THREE.Group();
    const edrRing = new THREE.Mesh(geometry(new THREE.TorusGeometry(.21, .05, 8, 36)), pbr(controlColor, 1.8));
    const edrBar = new THREE.Mesh(geometry(new THREE.BoxGeometry(.34, .09, .09)), pbr(controlColor, 1.8));
    edrBar.position.x = .3;
    const edrGlow = glowPoints(controlColor, 9, [0, 0, 0]);
    edr.add(edrRing, edrBar, edrGlow);
    scene.add(edr);

    const payload = new THREE.Group();
    const payloadCore = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.25, 1)), pbr(dataColor, 2.2));
    const payloadShell = new THREE.Mesh(
      geometry(new THREE.IcosahedronGeometry(.42, 1)),
      material(new THREE.MeshBasicMaterial({ color: dataColor, wireframe: true, transparent: true, opacity: .55, depthWrite: false })),
    );
    const payloadGlow = glowPoints(dataColor, 12, [0, 0, 0]);
    payloadGlow.material.uniforms.energy.value = 2.4;
    payload.add(payloadCore, payloadShell, payloadGlow);
    scene.add(payload);

    const payloadWake = glowPoints(dataColor, 4, new Array(18 * 3).fill(0));
    payloadWake.frustumCulled = false;
    payloadWake.material.uniforms.energy.value = 2;
    scene.add(payloadWake);

    const dustRand = seeded(7);
    const dustPositions: number[] = [];
    for (let i = 0; i < 90; i++) {
      dustPositions.push((dustRand() - .5) * 24, (dustRand() - .5) * 9, (dustRand() - .5) * 8 - 2);
    }
    const dust = glowPoints("#6487a5", 1.05, dustPositions);
    dust.material.uniforms.opacity.value = .2;
    dust.material.uniforms.energy.value = .45;
    scene.add(dust);

    function updatePathGeometry(item: Path) {
      const a = vec(item.beat.from!);
      const b = vec(item.beat.to!);
      const direction = item.beat.from === "consumer" ? 1 : -1;
      const dataLane = item.beat.kind === "data" || item.beat.kind === "retrieval";
      const liftY = dataLane ? -1.05 : .95;
      const liftZ = item.beat.kind === "data" ? 1.6 : item.beat.kind === "retrieval" ? 1.25 : .85;
      item.curve.v0.copy(a);
      item.curve.v3.copy(b);
      item.curve.v1.copy(a).lerp(b, .34).add(new THREE.Vector3(0, liftY + direction * .08, liftZ));
      item.curve.v2.copy(a).lerp(b, .66).add(new THREE.Vector3(0, liftY - direction * .08, liftZ));
      const attr = item.line.geometry.getAttribute("position") as THREE.BufferAttribute;
      const point = new THREE.Vector3();
      for (let i = 0; i <= 100; i++) {
        item.curve.getPoint(i / 100, point);
        attr.setXYZ(i, point.x, point.y, point.z);
      }
      attr.needsUpdate = true;
      item.line.geometry.computeBoundingSphere();
    }

    function syncLayout() {
      providerWorld.group.position.copy(vec("provider"));
      consumerWorld.group.position.copy(vec("consumer"));
      glyphs.forEach(glyph => glyph.group.position.copy(vec(glyph.id)));
      const compact = camera.aspect < .9;
      const worldScale = compact ? .78 : .96;
      providerWorld.group.scale.setScalar(worldScale);
      consumerWorld.group.scale.setScalar(worldScale);
      glyphs.forEach(glyph => glyph.group.scale.setScalar(compact ? .82 : 1));
      source.position.copy(vec("provider")).add(new THREE.Vector3(0, -1.25 * worldScale, .7));
      agreementGroup.position.copy(vec("agreement"));
      paths.forEach(updatePathGeometry);
      camera.position.set(0, .1, layout.distance);
      cameraTarget.copy(camera.position);
      lookAt.set(0, 0, 0);
      lookTarget.set(0, 0, 0);
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

    const raycaster = new THREE.Raycaster();
    const rayPointer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    };
    const resetPointer = () => pointer.set(0, 0);
    const onPointerDown = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      rayPointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
      raycaster.setFromCamera(rayPointer, camera);
      const hit = raycaster.intersectObjects(hitMeshes, false)[0]?.object;
      const id = hit?.userData.nodeId as NodeId | undefined;
      if (id) live.current.onSelect(id);
    };
    element.addEventListener("pointermove", onPointerMove, { passive: true });
    element.addEventListener("pointerleave", resetPointer);
    element.addEventListener("pointerdown", onPointerDown);

    const point = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const labelPoint = new THREE.Vector3();
    const signalColor = new THREE.Color();
    const faultColor = new THREE.Color("#ff7185");

    function projectOverlay(id: OverlayId, world: THREE.Vector3, offsetY = 0) {
      const label = overlays.current[id];
      if (!label) return;
      projected.copy(world).project(camera);
      const marginX = Math.min(96, Math.max(56, width * .07));
      const marginY = 34;
      const x = THREE.MathUtils.clamp((projected.x * .5 + .5) * width, marginX, width - marginX);
      const y = THREE.MathUtils.clamp((-projected.y * .5 + .5) * height + offsetY, marginY, height - marginY);
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
    }

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
      const focusId = p.selected ?? current.focus;
      const focus = vec(focusId);
      const parallax = mobile || p.reduced ? 0 : 1;

      const chapterPush = [-.1, .05, .16, -.18, -.08, -.42, .28, .04][p.chapter] ?? 0;
      cameraTarget.set(pointer.x * .24 * parallax + focus.x * .015, .08 + pointer.y * .12 * parallax + focus.y * .01, layout.distance + chapterPush);
      lookTarget.set(focus.x * .035 * parallax, focus.y * .025 * parallax, focus.z * .08 * parallax);
      if (!p.paused) {
        camera.position.lerp(cameraTarget, p.reduced ? 1 : .05);
        lookAt.lerp(lookTarget, p.reduced ? 1 : .06);
      }
      camera.lookAt(lookAt);

      signalColor.copy(p.fault ? faultColor : new THREE.Color(p.chapter === 5 ? contractColor : signalStyles[current.kind].color));
      activeLight.color.copy(signalColor);
      activeLight.position.copy(focus).add(new THREE.Vector3(0, .6, 2.5));
      activeLight.intensity = p.reduced ? .8 : current.status === "active" || sequence.blocked ? 3.1 : .7;

      const providerActive = current.from === "provider" || current.to === "provider" || current.focus === "provider" || current.focus === "catalog" || current.focus === "identity";
      const consumerActive = current.from === "consumer" || current.to === "consumer" || current.focus === "consumer" || current.focus === "policy";
      [providerWorld, consumerWorld].forEach((world, index) => {
        const active = index === 0 ? providerActive : consumerActive;
        const activated = index === 0 || sequence.copyDelivered || p.chapter === 7;
        world.group.rotation.y = Math.sin(t * .11 + index) * .12 + pointer.x * .035 * parallax * (index ? 1 : -1);
        world.group.rotation.x = pointer.y * .02 * parallax;
        world.shell.rotation.y = -t * .055 * (index ? 1 : -1);
        world.core.rotation.set(t * .16, t * .27 * (index ? -1 : 1), .15);
        world.core.material.emissiveIntensity = active ? 1.25 : activated ? .48 : .16;
        world.shell.material.opacity = active ? .24 : activated ? .12 : .06;
        world.network.material.opacity = active ? .38 : activated ? .17 : .07;
        world.nodes.material.uniforms.opacity.value = active ? .95 : activated ? .58 : .25;
        world.nodes.material.uniforms.energy.value = active ? 1.5 : .7;
        world.halo.material.uniforms.opacity.value = active ? .82 : activated ? .42 : .18;
        world.rings.forEach((ring, i) => {
          ring.rotation.x += p.reduced ? 0 : .0009 * (i + 1);
          ring.rotation.y += p.reduced ? 0 : .0012 * (i + 1) * (index ? -1 : 1);
          ring.material.opacity = active ? .38 - i * .06 : .12 - i * .02;
        });
      });

      const glyphRelevant = (id: Glyph["id"]) => {
        if (id === "catalog") return p.chapter === 1 || p.chapter === 3 || p.chapter === 4;
        if (id === "identity") return p.chapter === 3;
        if (id === "policy") return p.chapter === 1 || p.chapter === 4 || p.chapter === 5;
        return false;
      };

      glyphs.forEach(glyph => {
        glyph.group.visible = glyphRelevant(glyph.id);
        if (!glyph.group.visible) return;
        const active = glyph.id === focusId;
        const blocked = sequence.blocked && glyph.id === current.focus;
        const color = blocked ? faultColor : new THREE.Color(journeyNodes[glyph.id].color);
        glyph.core.material.color.copy(color).multiplyScalar(active ? .78 : .4);
        glyph.core.material.emissive.copy(color);
        glyph.core.material.emissiveIntensity = active ? 1.75 : .12;
        glyph.halo.material.uniforms.tint.value.copy(color);
        glyph.halo.material.uniforms.opacity.value = active ? .95 : .12;
        glyph.halo.material.uniforms.energy.value = active ? 2 : .5;
        glyph.core.rotation.set(t * .19, t * .34, t * .11);
        glyph.rings.forEach((ring, i) => {
          ring.material.color.copy(color);
          ring.material.opacity = active ? .62 - i * .15 : .08;
          ring.rotation.z = t * (.08 + i * .04);
        });
      });

      focusRing.position.copy(focus);
      focusRing.visible = current.status === "active" || sequence.blocked;
      focusRings.forEach((ring, i) => {
        ring.material.color.copy(signalColor);
        ring.material.opacity = p.reduced ? .4 : .52 + Math.sin(t * 1.8 + i) * .13;
        ring.rotation.z = t * (.22 + i * .08) * (i ? -1 : 1);
        ring.scale.setScalar(1 + Math.sin(t * 1.5 + i) * .05);
      });
      const processingLocal = current.kind === "local" && current.status === "active";
      focusRing.scale.setScalar(processingLocal ? .88 + Math.sin(t * 2.1) * .08 : 1);

      let activePath: Path | undefined;
      paths.forEach(item => {
        const beat = item.chapter === p.chapter ? sequence.beats.find(candidate => candidate.id === item.beat.id) : undefined;
        const active = beat?.status === "active";
        const done = beat?.status === "done";
        const fraction = beat?.fraction ?? 0;
        item.line.visible = !!(active || done);
        item.line.material.opacity = active ? .72 : done ? .028 : 0;
        item.line.geometry.setDrawRange(0, Math.floor(101 * (done || p.reduced ? 1 : smooth(fraction))));
        const custom = item.beat.id === "transfer-start" || item.beat.id === "payload";
        item.token.visible = !!(active && !custom);
        item.trail.visible = !!(active && !custom && !p.reduced);
        if (active) activePath = item;
        if (active && !custom) {
          item.curve.getPoint(smooth(fraction), item.token.position);
          item.token.rotation.set(t * .3, t * .5, t * .22);
          const attr = item.trail.geometry.getAttribute("position") as THREE.BufferAttribute;
          for (let i = 0; i < 12; i++) {
            item.curve.getPoint(smooth(Math.max(0, fraction - i * .02)), point);
            attr.setXYZ(i, point.x, point.y, point.z);
          }
          attr.needsUpdate = true;
        }
      });

      sourceCore.rotation.set(t * .23, t * .48, .2);
      sourceShell.rotation.set(-t * .15, t * .22, .1);
      const sourceActive = p.chapter === 0 || current.id === "read-source" || current.id === "payload";
      sourceCore.material.emissiveIntensity = sourceActive ? 1.8 : .6;
      source.scale.setScalar(p.chapter === 0 ? .8 + smooth(sequence.position) * .25 : 1);
      source.visible = p.chapter === 0 || p.chapter === 1 || p.chapter === 6 || p.chapter === 7;

      const finalized = sequence.beats.find(beat => beat.id === "contract-finalized");
      const sealBeat = sequence.beats.find(beat => beat.id === "seal");
      const assembling = p.chapter === 5 && finalized?.status === "active";
      const assembly = sequence.agreementReady ? smooth(sealBeat?.fraction ?? 0) : assembling ? smooth(finalized?.fraction ?? 0) * .75 : 0;
      agreementGroup.visible = p.chapter > 5 || sequence.agreementReady || assembling;
      agreementGroup.scale.setScalar(.3 + Math.max(.05, assembly) * .9);
      agreementCore.rotation.set(t * .18, t * .32, .2);
      agreementCore.material.emissiveIntensity = 1.2 + assembly * 1.4;
      fragments.forEach((fragment, i) => {
        const show = p.chapter === 5 && (assembling || sequence.agreementReady) && assembly < .96 && !p.reduced;
        fragment.visible = show;
        if (!show) return;
        const phase = fragment.userData.phase as number;
        const radius = THREE.MathUtils.lerp(1.5, .16, assembly);
        fragment.position.copy(vec("agreement")).add(new THREE.Vector3(
          Math.cos(phase + t * .18) * radius,
          Math.sin(phase + t * .18) * radius * .62,
          Math.sin(phase * 1.7) * .75 * (1 - assembly),
        ));
        fragment.rotation.set(t * .5 + i, t * .4 + phase, t * .3);
      });

      const transferStart = sequence.beats.find(beat => beat.id === "transfer-start");
      const edrPath = paths.find(item => item.beat.id === "transfer-start");
      edr.visible = p.chapter > 6 || sequence.edrReady || !!(transferStart && transferStart.status === "active");
      if (p.chapter > 6 || sequence.edrReady) {
        edr.position.copy(vec("consumer")).add(new THREE.Vector3(-.15, 1.05, .72));
      } else if (edrPath && transferStart?.status === "active") {
        edrPath.curve.getPoint(smooth(transferStart.fraction), edr.position);
      }
      edr.rotation.set(.25, t * .45, t * .13);
      const edrEnergy = transferStart?.status === "active" ? 2.2 : .9;
      (edrRing.material as THREE.MeshStandardMaterial).emissiveIntensity = edrEnergy;
      (edrBar.material as THREE.MeshStandardMaterial).emissiveIntensity = edrEnergy;

      const payloadBeat = sequence.beats.find(beat => beat.id === "payload");
      const payloadPath = paths.find(item => item.beat.id === "payload");
      payload.visible = sequence.copyVisible;
      payloadWake.visible = !!(payloadBeat?.status === "active" && !p.reduced);
      if (sequence.copyDelivered) {
        payload.position.copy(vec("consumer")).add(new THREE.Vector3(0, -1.05, .72));
      } else if (payloadPath) {
        payloadPath.curve.getPoint(smooth(payloadBeat?.fraction ?? 0), payload.position);
      }
      payloadCore.rotation.set(t * .35, t * .62, t * .18);
      payloadShell.rotation.set(-t * .22, t * .4, t * .28);
      if (payloadPath && payloadBeat?.status === "active") {
        const attr = payloadWake.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < 18; i++) {
          payloadPath.curve.getPoint(smooth(Math.max(0, payloadBeat.fraction - i * .017)), point);
          attr.setXYZ(i, point.x, point.y, point.z);
        }
        attr.needsUpdate = true;
      }

      projectOverlay("provider", labelPoint.copy(vec("provider")).add(new THREE.Vector3(0, 1.92, .2)), -2);
      projectOverlay("consumer", labelPoint.copy(vec("consumer")).add(new THREE.Vector3(0, 1.92, .2)), -2);
      projectOverlay("source", labelPoint.copy(source.position).add(new THREE.Vector3(0, -.58, .12)), 0);
      projectOverlay("catalog", labelPoint.copy(vec("catalog")).add(new THREE.Vector3(0, .58, .12)), -2);
      projectOverlay("identity", labelPoint.copy(vec("identity")).add(new THREE.Vector3(0, .58, .12)), -2);
      projectOverlay("policy", labelPoint.copy(vec("policy")).add(new THREE.Vector3(0, .62, .12)), -2);
      projectOverlay("agreement", labelPoint.copy(agreementGroup.position).add(new THREE.Vector3(0, .72, .12)), -2);
      projectOverlay("edr", labelPoint.copy(edr.position).add(new THREE.Vector3(0, .48, .12)), -2);
      projectOverlay("payload", labelPoint.copy(payload.position).add(new THREE.Vector3(0, .55, .12)), -2);
      if (activePath && activePath.token.visible) {
        projectOverlay("message", labelPoint.copy(activePath.token.position).add(new THREE.Vector3(0, .45, .1)), -4);
      } else if (current.id === "transfer-start" && edr.visible) {
        projectOverlay("message", labelPoint.copy(edr.position).add(new THREE.Vector3(0, .7, .1)), -4);
      } else if (current.id === "payload" && payload.visible) {
        projectOverlay("message", labelPoint.copy(payload.position).add(new THREE.Vector3(0, .78, .1)), -4);
      }

      dust.rotation.y = t * .004;
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
      element.removeEventListener("pointerdown", onPointerDown);
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
  const focus = props.selected ?? sequence.current.focus;
  const current = sequence.current;
  const movingMessage = !!current.from && !!current.to;
  const catalogTitle = props.chapter === 3 && sequence.catalogReady ? "Visible offer" : "Data offer";
  const agreementVisible = props.chapter > 5 || sequence.agreementReady || (props.chapter === 5 && current.id === "contract-finalized");
  const edrVisible = props.chapter > 6 || sequence.edrReady || (props.chapter === 6 && current.id === "transfer-start");

  const specs: OverlaySpec[] = [
    { id: "provider", title: "Company A", subtitle: "Supplier · Provider", color: providerColor, visible: true, active: focus === "provider", nodeId: "provider" },
    { id: "consumer", title: "Company B", subtitle: "Manufacturer · Consumer", color: consumerColor, visible: true, active: focus === "consumer", nodeId: "consumer" },
    { id: "source", title: "Private source", subtitle: "Original stays at Company A", color: dataColor, visible: [0, 1, 6, 7].includes(props.chapter), active: props.chapter === 0 || current.id === "read-source" || current.id === "payload" },
    { id: "catalog", title: catalogTitle, subtitle: props.chapter === 3 ? "Requester-visible catalogue offer" : "Provider offer configuration", color: controlColor, visible: props.chapter === 1 || props.chapter === 3 || props.chapter === 4, active: focus === "catalog", nodeId: "catalog" },
    { id: "identity", title: "Trust check", subtitle: "VC + access policy", color: journeyNodes.identity.color, visible: props.chapter === 3, active: focus === "identity" || props.fault === "identity", nodeId: "identity" },
    { id: "policy", title: "Usage terms", subtitle: props.chapter === 5 ? "Provider evaluates contract policy" : "Contract policy", color: journeyNodes.policy.color, visible: props.chapter === 1 || props.chapter === 4 || props.chapter === 5, active: focus === "policy" || props.fault === "policy", nodeId: "policy" },
    { id: "agreement", title: sequence.agreementReady ? "Finalized agreement" : "Agreement", subtitle: "Control plane · contract", color: contractColor, visible: agreementVisible, active: focus === "agreement" || current.id === "contract-finalized" || current.id === "seal", nodeId: "agreement" },
    { id: "edr", title: "EDR", subtitle: "Endpoint + authorization", color: controlColor, visible: edrVisible, active: current.id === "transfer-start" || current.id === "edr-ready" },
    { id: "payload", title: sequence.copyDelivered ? "Received copy" : "Actual payload", subtitle: "Battery-footprint record", color: dataColor, visible: sequence.copyVisible, active: current.id === "payload" || props.chapter === 7 },
    { id: "message", title: current.title, subtitle: current.from && current.to ? `${journeyNodes[current.from].label} → ${journeyNodes[current.to].label}` : "", color: props.chapter === 5 ? contractColor : signalStyles[current.kind].color, visible: movingMessage && (current.status === "active" || current.status === "blocked"), active: true },
  ];

  return (
    <div ref={host} className={styles.canvas} role="group" aria-label="Cinematic conceptual Tractus-X dataspace with clearly labelled company worlds, semantic objects and protocol messages.">
      {specs.map(spec => {
        const content = <>
          <span style={{ fontSize: spec.active ? "clamp(11px,1vw,13px)" : "clamp(10px,.9vw,12px)", fontWeight: 650, letterSpacing: ".01em" }}>{spec.title}</span>
          <small style={{ fontSize: "clamp(8px,.72vw,10px)", color: spec.color, opacity: .82 }}>{spec.subtitle}</small>
        </>;
        if (spec.nodeId) {
          return <button
            key={spec.id}
            ref={el => { overlays.current[spec.id] = el; }}
            type="button"
            style={overlayStyle(spec)}
            onClick={() => props.onSelect(spec.nodeId!)}
            aria-pressed={props.selected === spec.nodeId}
            tabIndex={spec.visible ? 0 : -1}
          >{content}</button>;
        }
        return <div
          key={spec.id}
          ref={el => { overlays.current[spec.id] = el; }}
          style={overlayStyle(spec)}
          aria-hidden={!spec.visible}
        >{content}</div>;
      })}
    </div>
  );
}

/** Lightweight fallback using the same ordered teaching beats. */
export function SimpleScene({ chapter, progress, fault, selected, onSelect }: SceneProps) {
  const sequence = sequenceFrame(chapter, progress, fault);
  const marker = useId();
  const positions: Record<NodeId, [number, number]> = {
    provider: [110, 180], consumer: [610, 180], catalog: [265, 78],
    identity: [360, 78], policy: [455, 78], agreement: [360, 282],
  };
  return <div className={styles.simpleScene}>
    <svg viewBox="0 0 720 360" role="img" aria-label={`${chapters[chapter].title}. ${fault ? "Failure snapshot." : sequence.current.title}`}>
      <defs>
        <marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke"/>
        </marker>
      </defs>
      {sequence.beats.filter(beat => beat.from && beat.to && (beat.status === "active" || beat.status === "done")).map(beat => {
        const a = positions[beat.from!], b = positions[beat.to!];
        const dataLane = beat.kind === "data" || beat.kind === "retrieval";
        const bend = dataLane ? 88 : -78;
        return <path
          key={beat.id}
          d={`M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 + bend} ${b[0]} ${b[1]}`}
          fill="none"
          stroke={chapter === 5 ? contractColor : signalStyles[beat.kind].color}
          opacity={beat.status === "active" ? 1 : .1}
          strokeWidth={beat.kind === "data" ? 4 : 2}
          markerEnd={`url(#${marker})`}
        />;
      })}
      {(["provider", "consumer"] as const).map(id => {
        const [x, y] = positions[id];
        const color = id === "provider" ? providerColor : consumerColor;
        const active = sequence.current.focus === id;
        return <g key={id}>
          <circle cx={x} cy={y} r="62" fill="#07131f" stroke={color} strokeWidth={active ? 3 : 1.5}/>
          <circle cx={x} cy={y} r="47" fill="none" stroke={color} opacity=".35" strokeDasharray="3 8"/>
          <circle cx={x} cy={y} r="18" fill={color} opacity={active ? 1 : .6}/>
          <text x={x} y={y + 88} fill="#e6f1ff" textAnchor="middle" fontSize="16">{journeyNodes[id].label}</text>
        </g>;
      })}
      {(["catalog", "identity", "policy", "agreement"] as const).map(id => {
        const [x, y] = positions[id];
        const active = sequence.current.focus === id;
        return <g key={id} opacity={active ? 1 : .36}>
          <circle cx={x} cy={y} r={active ? 23 : 17} fill="#0b1724" stroke={journeyNodes[id].color}/>
          <circle cx={x} cy={y} r="6" fill={journeyNodes[id].color}/>
          <text x={x} y={y - 30} fill="#dbe8f7" textAnchor="middle" fontSize="11">{journeyNodes[id].label}</text>
        </g>;
      })}
      <path d="M110 205 l9 9 -9 9 -9 -9 Z" fill={dataColor}/>
      <text x="110" y="238" fill={dataColor} textAnchor="middle" fontSize="10">Private source</text>
      {sequence.agreementReady && <><path d="M360 258 l22 22 -22 22 -22 -22 Z" fill="none" stroke={contractColor} strokeWidth="3"/><text x="360" y="330" fill={contractColor} textAnchor="middle" fontSize="10">Finalized agreement</text></>}
      {sequence.edrReady && <><circle cx="545" cy="135" r="11" fill="none" stroke={controlColor} strokeWidth="4"/><text x="545" y="112" fill={controlColor} textAnchor="middle" fontSize="10">EDR</text></>}
      {sequence.copyVisible && <><path transform={`translate(${sequence.copyDelivered ? 610 : 360} 214)`} d="M0 -10 l10 10 -10 10 -10 -10 Z" fill={dataColor}/><text x={sequence.copyDelivered ? 610 : 360} y="242" fill={dataColor} textAnchor="middle" fontSize="10">{sequence.copyDelivered ? "Received copy" : "Actual payload"}</text></>}
      {sequence.current.from && sequence.current.to && <text x="360" y="34" fill={chapter === 5 ? contractColor : signalStyles[sequence.current.kind].color} textAnchor="middle" fontSize="12">{sequence.current.title}</text>}
    </svg>
    <div className={styles.simpleNodes}>
      {(Object.keys(journeyNodes) as NodeId[]).map(id => <button key={id} onClick={() => onSelect(id)} aria-pressed={selected === id}>{journeyNodes[id].label}</button>)}
    </div>
  </div>;
}
