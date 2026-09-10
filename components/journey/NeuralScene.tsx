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
import { journeySequences, sequenceFrame, signalStyles, type SignalKind } from "@/lib/journey-sequence";
import styles from "./journey.module.css";

export type SceneProps = { chapter: number; progress: number; fault: Fault | null; paused: boolean; reduced: boolean; selected: NodeId | null; onSelect: (id: NodeId) => void };
const nodeIds = Object.keys(journeyNodes) as NodeId[];
const smooth = (n: number) => { const v = THREE.MathUtils.clamp(n, 0, 1); return v * v * (3 - 2 * v); };
const cinematicPush = [-.15, .05, .18, -.35, -.42, -.62, .68, .12] as const;

/** Seeded positions keep the neural topology stable across renders and devices. */
function random(seed: number) { let x = seed; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }

export default function NeuralScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Partial<Record<NodeId, HTMLButtonElement | null>>>({});
  const live = useRef(props);
  live.current = props;
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { setUnavailable(true); return; }

    const initialMobile = window.innerWidth < 720;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, initialMobile ? 1.25 : 1.6));
    renderer.setClearColor(0x060d1b, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    element.prepend(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060d1b, .018);
    let layout = journeyLayout(1);
    const vec = (id: NodeId) => new THREE.Vector3(...layout.positions[id]);
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(0, 0, 23);
    const targetCamera = camera.position.clone();
    const lookAt = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();
    const pointer = new THREE.Vector2();
    let width = 1, height = 1;

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    function geometry<T extends THREE.BufferGeometry>(g: T): T { geometries.add(g); return g; }
    function material<T extends THREE.Material>(m: T): T { materials.add(m); return m; }
    function pbr(color: THREE.ColorRepresentation, wireframe = false) {
      return material(new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(.35),
        emissiveIntensity: .12,
        metalness: .48,
        roughness: .3,
        wireframe,
        transparent: true,
        opacity: 1,
      }));
    }
    function mesh(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, wireframe = false) {
      return new THREE.Mesh(geometry(g), pbr(color, wireframe));
    }
    function neon(color: THREE.ColorRepresentation, opacity = .55) {
      return material(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    }
    function glow(color: string, size: number, positions: number[]) {
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const m = material(new THREE.ShaderMaterial({
        uniforms: { tint: { value: new THREE.Color(color) }, size: { value: size }, opacity: { value: 1 }, intensity: { value: .6 } },
        vertexShader: "uniform float size; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(110.0,size*180.0/-p.z);gl_Position=projectionMatrix*p;}",
        fragmentShader: "uniform vec3 tint; uniform float opacity; uniform float intensity; void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;if(d>1.0)discard;float a=pow(1.0-d,3.0);gl_FragColor=vec4(tint*intensity,a*opacity);}",
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      return new THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>(g, m);
    }

    // Neutral environment reflections plus a small three-light rig create sculpted surfaces.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmrem.fromScene(new RoomEnvironment(), .04);
    scene.environment = environmentTarget.texture;
    pmrem.dispose();
    const ambient = new THREE.HemisphereLight(0xaedcff, 0x08111d, 1.35);
    const keyLight = new THREE.DirectionalLight(0xd5f5ff, 2.2); keyLight.position.set(-5, 7, 9);
    const rimLight = new THREE.DirectionalLight(0xb8a4ff, 1.8); rimLight.position.set(7, -3, 5);
    const activeLight = new THREE.PointLight(0x80caff, 0, 10, 2); activeLight.position.set(0, 1.4, 3);
    scene.add(ambient, keyLight, rimLight, activeLight);

    // Bloom is threshold-driven: only the active beat receives enough emissive energy to cross it.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .7, .5, 1.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const coreGeometry = geometry(new THREE.IcosahedronGeometry(.21, 1));
    const ringGeometry = geometry(new THREE.TorusGeometry(.52, .012, 6, 64));
    const nodes = nodeIds.map(id => {
      const group = new THREE.Group(); group.position.copy(vec(id));
      const shape = id === "catalog" ? geometry(new THREE.BoxGeometry(.34, .4, .2)) : id === "policy" ? geometry(new THREE.TetrahedronGeometry(.3)) : id === "agreement" ? geometry(new THREE.OctahedronGeometry(.29)) : coreGeometry;
      const core = new THREE.Mesh(shape, pbr(journeyNodes[id].color)); group.add(core);
      const halo = glow(journeyNodes[id].color, 11, [0, 0, 0]); group.add(halo);
      const rings = Array.from({ length: 3 }, (_, i) => {
        const ring = new THREE.Mesh(ringGeometry, neon(journeyNodes[id].color));
        ring.scale.setScalar(1 + i * .24); ring.rotation.set(i * .8, i * .5, 0); group.add(ring); return ring;
      });
      scene.add(group); return { id, group, core, halo, rings };
    });

    const companyNetworks = (["provider", "consumer"] as NodeId[]).map((id, index) => {
      const group = new THREE.Group(); group.position.copy(vec(id));
      const rand = random(204 + index);
      const points: THREE.Vector3[] = [new THREE.Vector3()];
      for (let i = 0; i < 42; i++) {
        const theta = i * 2.399963, phi = Math.acos(1 - 2 * (i + .5) / 42), radius = 1.15 + rand() * .55;
        points.push(new THREE.Vector3(Math.cos(theta) * Math.sin(phi) * radius, Math.sin(theta) * Math.sin(phi) * radius * .85, Math.cos(phi) * radius * .8));
      }
      const edges: number[] = [], seenEdges = new Set<string>();
      points.forEach((p, i) => {
        const nearest = points.map((q, j) => ({ j, d: p.distanceTo(q) })).filter(x => x.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
        nearest.forEach(({ j }) => {
          const key = `${Math.min(i, j)}:${Math.max(i, j)}`;
          if (!seenEdges.has(key)) { seenEdges.add(key); edges.push(...p.toArray(), ...points[j].toArray()); }
        });
      });
      const edgeGeometry = geometry(new THREE.BufferGeometry()); edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edges, 3));
      const edgeMaterial = material(new THREE.LineBasicMaterial({ color: index ? "#8c83ef" : "#3ca995", transparent: true, opacity: .3 }));
      group.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));
      const particles = glow(index ? "#b8aaff" : "#80ffe0", 2.3, points.flatMap(p => p.toArray())); group.add(particles);
      const satelliteGeometry = geometry(new THREE.IcosahedronGeometry(.035, 0));
      const satelliteMaterial = pbr(index ? "#b8aaff" : "#80ffe0"); satelliteMaterial.roughness = .42; satelliteMaterial.metalness = .25;
      const satellites = new THREE.InstancedMesh(satelliteGeometry, satelliteMaterial, points.length);
      const matrix = new THREE.Matrix4(); points.forEach((p, i) => { matrix.makeTranslation(p.x, p.y, p.z); satellites.setMatrixAt(i, matrix); }); group.add(satellites);
      scene.add(group); return { group, edgeMaterial, particles, satellites };
    });

    type Path = {
      id: string; chapter: number; from: NodeId; to: NodeId; bend: number; lift: number; color: string;
      curve: THREE.CubicBezierCurve3; line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      pulse: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
      token: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; kind: SignalKind;
    };
    const paths: Path[] = [];
    function path(id: string, chapter: number, from: NodeId, to: NodeId, kind: SignalKind) {
      const color = chapter === 5 ? "#f5d786" : signalStyles[kind].color;
      const bend = kind === "data" ? -.42 : from === "consumer" ? 1.25 : -.95;
      const lift = kind === "data" ? 1.55 : kind === "retrieval" ? 1.1 : .82;
      const a = vec(from), b = vec(to);
      const curve = new THREE.CubicBezierCurve3(a, a.clone().lerp(b, .33).add(new THREE.Vector3(0, bend, lift)), a.clone().lerp(b, .67).add(new THREE.Vector3(0, bend, lift)), b);
      const g = geometry(new THREE.BufferGeometry().setFromPoints(curve.getPoints(100)));
      const lineMaterial = material(new THREE.LineBasicMaterial({ color, transparent: true, opacity: .2 }));
      const line = new THREE.Line(g, lineMaterial);
      const pulse = glow(color, kind === "data" ? 6 : 4, new Array(36).fill(0)); pulse.frustumCulled = false;
      const token = mesh(kind === "retrieval" || id.includes("request") ? new THREE.TorusGeometry(.13, .038, 8, 28) : new THREE.BoxGeometry(.24, .17, .08), color);
      token.material.emissive.copy(new THREE.Color(color)); token.material.emissiveIntensity = 1.7;
      scene.add(line, pulse, token); paths.push({ id, chapter, from, to, bend, lift, color, curve, line, pulse, token, kind });
    }
    journeySequences.forEach((beats, chapter) => beats.forEach(beat => { if (beat.from && beat.to) path(beat.id, chapter, beat.from, beat.to, beat.kind); }));

    const sealMaterial = material(new THREE.MeshPhysicalMaterial({ color: "#9f7b22", emissive: "#f5d786", emissiveIntensity: 1.35, metalness: .8, roughness: .16, clearcoat: .8, clearcoatRoughness: .12 }));
    const seal = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.52, 1)), sealMaterial); seal.position.copy(vec("agreement")); scene.add(seal);
    const sealOrbit = new THREE.Mesh(geometry(new THREE.TorusGeometry(.86, .018, 8, 80)), neon("#f5d786", .8)); scene.add(sealOrbit);
    const fragmentGeometry = geometry(new THREE.TetrahedronGeometry(.16));
    const contractFragments = Array.from({ length: 7 }, (_, i) => {
      const fragment = new THREE.Mesh(fragmentGeometry, pbr("#f5d786")); fragment.material.emissive.set("#f5d786"); fragment.material.emissiveIntensity = 1.2;
      fragment.userData.phase = i * Math.PI * 2 / 7; scene.add(fragment); return fragment;
    });

    const original = mesh(new THREE.OctahedronGeometry(.23, 1), "#81ffda"); original.material.metalness = .28; original.material.roughness = .22;
    original.position.copy(vec("provider")).add(new THREE.Vector3(0, -.9, .7)); scene.add(original);
    const copyGroup = new THREE.Group();
    const copy = mesh(new THREE.OctahedronGeometry(.23, 1), "#81ffda"); copy.material.emissive.set("#81ffda"); copy.material.emissiveIntensity = 1.45;
    const copyShell = mesh(new THREE.IcosahedronGeometry(.36, 1), "#81ffda", true); copyShell.material.opacity = .62; copyShell.material.emissive.set("#81ffda"); copyShell.material.emissiveIntensity = 1.8;
    const copyHalo = glow("#81ffda", 8, [0, 0, 0]); copyHalo.material.uniforms.intensity.value = 2.2;
    copyGroup.add(copy, copyShell, copyHalo); scene.add(copyGroup);
    const wake = glow("#81ffda", 3.5, new Array(54).fill(0)); wake.frustumCulled = false; wake.material.uniforms.intensity.value = 2.2; scene.add(wake);

    const ripple = new THREE.Mesh(geometry(new THREE.TorusGeometry(.7, .018, 6, 80)), neon("#75dbff", .75)); scene.add(ripple);
    const processing = new THREE.Mesh(geometry(new THREE.TorusGeometry(.93, .025, 6, 64, Math.PI * 1.4)), neon("#d0b3ff", .75)); scene.add(processing);
    const ruleGeometry = geometry(new THREE.OctahedronGeometry(.1));
    const rules = Array.from({ length: 3 }, () => { const rule = new THREE.Mesh(ruleGeometry, pbr("#ffba77")); rule.material.emissive.set("#ffba77"); rule.material.emissiveIntensity = .8; scene.add(rule); return rule; });
    const transferPath = paths.find(item => item.id === "payload")!;
    const dustRand = random(7);
    const dust = glow("#7094b5", 1.3, Array.from({ length: 240 }, () => (dustRand() - .5) * 32)); dust.material.uniforms.intensity.value = .42; scene.add(dust);

    function updatePathGeometry(item: Path) {
      const a = vec(item.from), b = vec(item.to);
      item.curve.v0.copy(a); item.curve.v3.copy(b);
      item.curve.v1.copy(a).lerp(b, .33).add(new THREE.Vector3(0, item.bend, item.lift));
      item.curve.v2.copy(a).lerp(b, .67).add(new THREE.Vector3(0, item.bend, item.lift));
      const positions = item.line.geometry.getAttribute("position") as THREE.BufferAttribute;
      const p = new THREE.Vector3();
      for (let i = 0; i <= 100; i++) { item.curve.getPoint(i / 100, p); positions.setXYZ(i, p.x, p.y, p.z); }
      positions.needsUpdate = true; item.line.geometry.computeBoundingSphere();
    }

    const resize = new ResizeObserver(() => {
      width = Math.max(element.clientWidth, 1); height = Math.max(element.clientHeight, 1);
      renderer.setSize(width, height); composer.setSize(width, height);
      camera.aspect = width / height; camera.updateProjectionMatrix();
      layout = journeyLayout(camera.aspect);
      nodes.forEach(node => node.group.position.copy(vec(node.id)));
      companyNetworks.forEach((network, i) => network.group.position.copy(vec(i ? "consumer" : "provider")));
      paths.forEach(updatePathGeometry);
      seal.position.copy(vec("agreement")); sealOrbit.position.copy(vec("agreement"));
      original.position.copy(vec("provider")).add(new THREE.Vector3(0, -.85, .7));
      camera.position.set(0, 0, layout.distance); targetCamera.copy(camera.position); lookAt.set(0, 0, 0);
    });
    resize.observe(element);

    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    };
    const resetPointer = () => pointer.set(0, 0);
    element.addEventListener("pointermove", onPointerMove, { passive: true });
    element.addEventListener("pointerleave", resetPointer);

    let frame = 0, lastRender = 0, disposed = false;
    const projected = new THREE.Vector3(), point = new THREE.Vector3(), focus = new THREE.Vector3();
    const red = new THREE.Color("#ff7185"), signalColor = new THREE.Color();

    function render(now: number) {
      if (disposed) return;
      frame = requestAnimationFrame(render);
      const p = live.current;
      if (document.hidden) return;
      const mobile = width < 720;
      const minFrame = p.paused || p.reduced ? 100 : mobile ? 1000 / 30 : 1000 / 45;
      if (now - lastRender < minFrame) return; lastRender = now;

      const sequence = sequenceFrame(p.chapter, p.progress, p.fault);
      const elapsed = sequence.position * chapters[p.chapter].duration;
      const t = p.reduced ? 0 : elapsed;
      const sceneFocus = p.selected ?? sequence.current.focus;
      focus.copy(vec(sceneFocus));
      const parallax = mobile || p.reduced ? 0 : 1;
      targetCamera.set(
        focus.x * .02 + pointer.x * .32 * parallax,
        focus.y * .014 + pointer.y * .18 * parallax,
        layout.distance + cinematicPush[p.chapter] + pointer.y * .06 * parallax,
      );
      targetLookAt.set(mobile || p.reduced ? 0 : focus.x * .045, mobile || p.reduced ? 0 : focus.y * .035, mobile || p.reduced ? 0 : focus.z * .12);
      if (!p.paused) {
        camera.position.lerp(targetCamera, p.reduced ? 1 : .045);
        lookAt.lerp(targetLookAt, p.reduced ? 1 : .055);
      }
      camera.lookAt(lookAt);

      const currentKind = sequence.current.kind;
      signalColor.set(p.fault ? "#ff7185" : p.chapter === 5 && currentKind === "control" ? "#f5d786" : signalStyles[currentKind].color);
      activeLight.color.copy(signalColor); activeLight.position.copy(focus).add(new THREE.Vector3(0, 1.1, 3));
      activeLight.intensity = p.reduced ? .8 : mobile ? 1.6 : sequence.current.status === "active" || sequence.blocked ? 3.2 : 1.1;

      companyNetworks.forEach(({ group, edgeMaterial, particles, satellites }, i) => {
        group.rotation.y = Math.sin(t * .07 + i) * .16 + pointer.x * .04 * parallax * (i ? 1 : -1);
        group.rotation.x = pointer.y * .025 * parallax;
        const activated = i === 0 || sequence.consumerActivated;
        const inBackground = p.chapter > 0 && p.chapter < 7;
        edgeMaterial.opacity = activated ? (inBackground ? .13 : .23) + Math.sin(t * .9) * .025 : .07;
        particles.material.uniforms.opacity.value = activated ? (inBackground ? .42 : .72) : .22;
        particles.material.uniforms.intensity.value = activated && !inBackground ? 1.05 : .48;
        satellites.material.emissiveIntensity = activated && !inBackground ? .4 : .08;
        group.scale.setScalar(activated ? 1 + Math.sin(t * .7) * .015 : 1);
      });

      nodes.forEach(({ id, group, core, halo, rings }) => {
        const isGateway = id === "provider" || id === "consumer";
        const active = id === sceneFocus || (sequence.current.status === "active" && sequence.current.from === id);
        const blocked = sequence.blocked && id === sequence.current.focus;
        const color = blocked ? red : new THREE.Color(journeyNodes[id].color);
        core.material.color.copy(color).multiplyScalar(active ? .72 : .45);
        core.material.emissive.copy(color); core.material.emissiveIntensity = active ? 1.75 : isGateway ? .32 : .09;
        core.material.metalness = active ? .62 : .42; core.material.roughness = active ? .2 : .34;
        halo.material.uniforms.tint.value.copy(color); halo.material.uniforms.opacity.value = active ? 1 : .19; halo.material.uniforms.intensity.value = active ? 2.35 : .42;
        core.material.opacity = active || isGateway ? 1 : .68;
        core.rotation.y = t * .35; core.rotation.x = Math.sin(t * .22 + group.position.z) * .16;
        rings.forEach((ring, i) => {
          ring.material.color.copy(color); ring.material.opacity = active ? .8 : .11;
          const align = ((id === "identity" || isGateway) && p.chapter === 3) || (id === "policy" && p.chapter === 4);
          const alignment = align && (sequence.identityVerified || sequence.policyMatched) ? 1 : 0;
          ring.rotation.x = (i * .8 + t * (.12 + i * .04)) * (1 - alignment);
          ring.rotation.y = (i * .5 + t * .15) * (1 - alignment);
          ring.rotation.z = t * .12;
          ring.scale.setScalar((1 + i * .24) * (active ? 1.12 : 1));
        });
        projected.copy(group.position).add(new THREE.Vector3(0, isGateway ? -1.95 : -1.05, 0)).project(camera);
        const label = labels.current[id];
        if (label) {
          const halfLabel = label.offsetWidth / 2 + 8;
          label.style.left = `${THREE.MathUtils.clamp((projected.x * .5 + .5) * width, halfLabel, width - halfLabel)}px`;
          label.style.top = `${THREE.MathUtils.clamp((-projected.y * .5 + .5) * height, 0, height - label.offsetHeight)}px`;
        }
      });

      paths.forEach(item => {
        const beat = item.chapter === p.chapter ? sequence.beats.find(candidate => candidate.id === item.id) : undefined;
        const active = beat?.status === "active", done = beat?.status === "done", fraction = beat?.fraction ?? 0;
        item.line.visible = !!(active || done); item.line.material.opacity = active ? .7 : .065;
        item.line.geometry.setDrawRange(0, Math.floor(101 * (done || p.reduced ? 1 : smooth(fraction))));
        item.pulse.visible = !!(active && !p.reduced && item.kind !== "data");
        item.pulse.material.uniforms.intensity.value = active ? 2.65 : .3;
        item.token.visible = !!(active && item.kind !== "data");
        item.curve.getPoint(p.reduced ? .5 : smooth(fraction), item.token.position);
        item.token.rotation.set(t * .3, t * .52, t * .42); item.token.material.emissiveIntensity = active ? 2.1 : .2;
        item.pulse.material.uniforms.tint.value.copy(item.line.material.color);
        const position = item.pulse.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < 12; i++) { item.curve.getPoint(smooth(Math.max(0, fraction - i * .014)), point); position.setXYZ(i, point.x, point.y, point.z); }
        position.needsUpdate = true;
      });

      const finalized = sequence.beats.find(beat => beat.id === "contract-finalized");
      const sealBeat = sequence.beats.find(beat => beat.id === "seal");
      const assembly = sequence.agreementReady ? smooth(sealBeat?.fraction ?? 0) : finalized?.status === "active" ? smooth(finalized.fraction) * .35 : 0;
      contractFragments.forEach((fragment, i) => {
        const show = p.chapter === 5 && (finalized?.status === "active" || sequence.agreementReady) && assembly < .98 && !p.reduced;
        fragment.visible = !!show;
        if (!show) return;
        const phase = fragment.userData.phase as number;
        const radius = THREE.MathUtils.lerp(1.45, .18, assembly);
        const center = vec("agreement");
        fragment.position.copy(center).add(new THREE.Vector3(Math.cos(phase + t * .22) * radius, Math.sin(phase + t * .22) * radius * .65, Math.sin(phase * 1.7) * .65 * (1 - assembly)));
        fragment.rotation.set(t * .8 + i, t * .5 + phase, t * .35);
        fragment.scale.setScalar(.55 + assembly * .5);
      });
      seal.visible = sequence.agreementReady;
      seal.scale.setScalar(sequence.agreementReady ? .32 + Math.max(.2, assembly) * .72 : .01);
      seal.rotation.set(t * .17, t * .32, .3); seal.material.emissiveIntensity = 1.25 + assembly * 1.2;
      sealOrbit.visible = sequence.agreementReady; sealOrbit.position.copy(vec("agreement")); sealOrbit.scale.setScalar(.8 + assembly * .15); sealOrbit.rotation.set(.5, t * .2, t * .12);

      const rippleProgress = (sequence.position - sequence.successAt) / (1 - sequence.successAt);
      ripple.visible = !p.reduced && sequence.finished && rippleProgress >= 0 && rippleProgress < 1;
      ripple.position.copy(vec(chapters[p.chapter].focus)); ripple.scale.setScalar(1 + Math.max(0, rippleProgress) * 2.8);
      ripple.material.color.set(journeyNodes[chapters[p.chapter].focus].color); ripple.material.opacity = .75 * (1 - Math.max(0, rippleProgress));

      original.rotation.set(t * .25, t * .5, .2); original.material.emissive.set("#81ffda"); original.material.emissiveIntensity = p.chapter === 0 ? .95 : .35;
      original.scale.setScalar(p.chapter === 0 && !p.reduced ? .1 + smooth(sequence.position / sequence.successAt) * .9 : 1);
      const processingActive = sequence.current.kind === "local" && sequence.current.status === "active";
      processing.visible = processingActive || sequence.blocked; processing.position.copy(vec(sequence.current.focus)); processing.rotation.z = -t * 1.5;
      processing.material.color.set(sequence.blocked ? "#ff7185" : journeyNodes[sequence.current.focus].color);

      rules.forEach((rule, i) => {
        rule.visible = p.chapter === 4;
        const a = i * Math.PI * 2 / 3 + t * .35;
        rule.position.copy(vec("policy")).add(sequence.policyMatched ? new THREE.Vector3((i - 1) * .4, 1.1, .3) : new THREE.Vector3(Math.cos(a) * 1.05, Math.sin(a) * 1.05, Math.sin(a * 1.6) * .4));
        rule.material.color.set(p.fault ? "#7a3040" : "#8f5b28"); rule.material.emissive.set(p.fault ? "#ff7185" : "#ffba77"); rule.material.emissiveIntensity = sequence.current.focus === "policy" ? 1.25 : .45; rule.rotation.y = t;
      });

      const payload = sequence.beats.find(beat => beat.id === "payload");
      copyGroup.visible = sequence.copyVisible;
      if (sequence.copyDelivered) copyGroup.position.copy(vec("consumer")).add(new THREE.Vector3(0, -.85, .72));
      else transferPath.curve.getPoint(p.reduced ? .5 : smooth(payload?.fraction ?? 0), copyGroup.position);
      copy.rotation.copy(original.rotation); copyShell.rotation.set(-t * .38, t * .65, t * .24); copyShell.scale.set(1, 1.18 + Math.sin(t * 2) * .04, 1);
      const payloadActive = payload?.status === "active";
      copy.material.emissiveIntensity = payloadActive ? 2.3 : 1.1; copyShell.material.emissiveIntensity = payloadActive ? 2.8 : 1.2;
      wake.visible = !!(payloadActive && !p.reduced);
      const wakePosition = wake.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < 18; i++) { transferPath.curve.getPoint(smooth(Math.max(0, (payload?.fraction ?? 0) - i * .015)), point); wakePosition.setXYZ(i, point.x, point.y, point.z); }
      wakePosition.needsUpdate = true;

      // Desktop gets the cinematic bloom pass. Mobile and reduced motion keep the same scene with a cheaper direct render.
      if (!mobile && !p.reduced) composer.render(); else renderer.render(scene, camera);
    }

    frame = requestAnimationFrame(render);
    const lost = (event: Event) => { event.preventDefault(); setUnavailable(true); cancelAnimationFrame(frame); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect();
      element.removeEventListener("pointermove", onPointerMove); element.removeEventListener("pointerleave", resetPointer);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      composer.dispose(); environmentTarget.dispose();
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  if (unavailable) return <SimpleScene {...props} />;
  const currentFocus = sequenceFrame(props.chapter, props.progress, props.fault).current.focus;
  return <div ref={host} className={styles.canvas} role="group" aria-label="Interactive conceptual dataspace. Select a component to learn its role.">
    {nodeIds.map(id => <button key={id} ref={el => { labels.current[id] = el; }} className={styles.nodeLabel} data-active={props.selected === id || currentFocus === id} style={{ "--node-color": journeyNodes[id].color } as React.CSSProperties} onClick={() => props.onSelect(id)} aria-pressed={props.selected === id}>
      <span>{journeyNodes[id].label}</span><small>{journeyNodes[id].role}</small>
    </button>)}
  </div>;
}

/** Static snapshots of the SAME ordered beats, including failures and prerequisites. */
export function SimpleScene({ chapter, progress, fault, selected, onSelect }: SceneProps) {
  const sequence = sequenceFrame(chapter, progress, fault);
  const marker = useId();
  const positions: Record<NodeId, [number, number]> = { provider: [110, 180], consumer: [610, 180], catalog: [270, 75], identity: [450, 75], policy: [270, 290], agreement: [450, 290] };
  return <div className={styles.simpleScene}>
    <svg viewBox="0 0 720 360" role="img" aria-label={`${chapters[chapter].title}. ${fault ? "Failure snapshot." : sequence.current.title}`}>
      <defs><marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="context-stroke"/></marker></defs>
      {sequence.beats.filter(beat => beat.from && beat.to && (beat.status === "active" || beat.status === "done")).map(beat => {
        const a = positions[beat.from!], b = positions[beat.to!];
        const bend = beat.from === "consumer" ? -80 : 70;
        return <path key={beat.id} d={`M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 + bend} ${b[0]} ${b[1]}`} fill="none" stroke={chapter === 5 ? "#f5d786" : signalStyles[beat.kind].color} opacity={beat.status === "active" ? 1 : .13} strokeWidth={beat.kind === "data" ? 4 : 2} strokeDasharray={beat.kind === "local" ? "4 6" : undefined} markerEnd={`url(#${marker})`}/>;
      })}
      {nodeIds.map(id => {
        const [x, y] = positions[id], company = id === "provider" || id === "consumer";
        const active = sequence.current.focus === id;
        const color = sequence.blocked && active ? "#ff7185" : journeyNodes[id].color;
        return <g key={id} opacity={company || active ? 1 : .45}><circle cx={x} cy={y} r={company ? 56 : 24} fill="#091526" stroke={color} strokeWidth={active ? 2 : 1}/><circle cx={x} cy={y} r={company ? 38 : 16} fill="none" stroke={color} strokeDasharray="3 8"/><circle cx={x} cy={y} r="6" fill={color}/><text x={x} y={y + (company ? 84 : 43)} fill="#dfeafa" textAnchor="middle" fontSize="16">{journeyNodes[id].label}</text></g>;
      })}
      <path d="M110 205 l9 9 -9 9 -9 -9 Z" fill="#59edcf"/>
      {sequence.agreementReady && <path d="M450 270 l20 20 -20 20 -20 -20 Z" fill="none" stroke="#f5d786" strokeWidth="3"/>}
      {sequence.copyVisible && <path transform={`translate(${sequence.copyDelivered ? 610 : 360} 214)`} d="M0 -9 l9 9 -9 9 -9 -9 Z" fill="#59edcf"/>}
    </svg>
    <div className={styles.simpleNodes}>{nodeIds.map(id => <button key={id} onClick={() => onSelect(id)} aria-pressed={selected === id}>{journeyNodes[id].label}</button>)}</div>
  </div>;
}
