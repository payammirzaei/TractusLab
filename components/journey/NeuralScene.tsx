"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { chapters, journeyNodes, type Fault, type NodeId } from "@/lib/data-journey";
import { journeyLayout } from "@/lib/journey-visuals";
import styles from "./journey.module.css";

export type SceneProps = { chapter: number; fault: Fault | null; paused: boolean; speed: number; reduced: boolean; replay: number; selected: NodeId | null; onSelect: (id: NodeId) => void };
const nodeIds = Object.keys(journeyNodes) as NodeId[];
const smooth = (n: number) => { const v = THREE.MathUtils.clamp(n, 0, 1); return v * v * (3 - 2 * v); };

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0x060d1b, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.prepend(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    let layout = journeyLayout(1);
    const vec = (id: NodeId) => new THREE.Vector3(...layout.positions[id]);
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(0, 1, 23);
    const targetCamera = camera.position.clone();
    const lookAt = new THREE.Vector3(0, 0, 0);
    let width = 1, height = 1;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    function geometry<T extends THREE.BufferGeometry>(g: T): T { geometries.add(g); return g; }
    function material<T extends THREE.Material>(m: T): T { materials.add(m); return m; }
    function mesh(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, wireframe = false) {
      return new THREE.Mesh(geometry(g), material(new THREE.MeshBasicMaterial({ color, wireframe, transparent: true, opacity: 1 })));
    }
    function glow(color: string, size: number, positions: number[]) {
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const m = material(new THREE.ShaderMaterial({
        uniforms: { tint: { value: new THREE.Color(color) }, size: { value: size }, opacity: { value: 1 } },
        vertexShader: "uniform float size; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(110.0,size*180.0/-p.z);gl_Position=projectionMatrix*p;}",
        fragmentShader: "uniform vec3 tint; uniform float opacity; void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;if(d>1.0)discard;float a=pow(1.0-d,3.0);gl_FragColor=vec4(tint,a*opacity);}",
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      return new THREE.Points(g, m);
    }
    const coreGeometry = geometry(new THREE.IcosahedronGeometry(.19, 1));
    const ringGeometry = geometry(new THREE.TorusGeometry(.52, .012, 6, 64));
    const nodes = nodeIds.map(id => {
      const group = new THREE.Group(); group.position.copy(vec(id));
      const core = new THREE.Mesh(coreGeometry, material(new THREE.MeshBasicMaterial({ color: journeyNodes[id].color })));
      group.add(core);
      const halo = glow(journeyNodes[id].color, 11, [0, 0, 0]); group.add(halo);
      const rings = Array.from({ length: 3 }, (_, i) => {
        const ring = new THREE.Mesh(ringGeometry, material(new THREE.MeshBasicMaterial({ color: journeyNodes[id].color, transparent: true, opacity: .55 })));
        ring.scale.setScalar(1 + i * .24); ring.rotation.set(i * .8, i * .5, 0); group.add(ring); return ring;
      });
      scene.add(group); return { id, group, core, halo, rings };
    });

    const companyNetworks = ["provider", "consumer"].map((id, index) => {
      const group = new THREE.Group(); group.position.copy(vec(id as NodeId));
      const rand = random(204 + index);
      const points: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
      for (let i = 0; i < 42; i++) {
        // Even angular spacing prevents accidental dense clumps inside the cluster.
        const theta = i * 2.399963, phi = Math.acos(1 - 2 * (i + .5) / 42), radius = 1.15 + rand() * .55;
        points.push(new THREE.Vector3(Math.cos(theta) * Math.sin(phi) * radius, Math.sin(theta) * Math.sin(phi) * radius * .85, Math.cos(phi) * radius * .65));
      }
      const edges: number[] = [];
      const seenEdges = new Set<string>();
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
      const satelliteGeometry = geometry(new THREE.IcosahedronGeometry(.028, 0));
      const satellites = new THREE.InstancedMesh(satelliteGeometry, material(new THREE.MeshBasicMaterial({ color: index ? "#b8aaff" : "#80ffe0" })), points.length);
      const matrix = new THREE.Matrix4(); points.forEach((p, i) => { matrix.makeTranslation(p.x, p.y, p.z); satellites.setMatrixAt(i, matrix); }); group.add(satellites);
      scene.add(group); return { group, edgeMaterial, particles };
    });

    type Path = { from: NodeId; to: NodeId; stages: number[]; bend: number; color: string; curve: THREE.CubicBezierCurve3; line: THREE.Line; pulse: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>; transfer: boolean };
    const paths: Path[] = [];
    function path(from: NodeId, to: NodeId, stages: number[], color: string, bend: number, transfer = false) {
      const a = vec(from), b = vec(to);
      const curve = new THREE.CubicBezierCurve3(a, a.clone().lerp(b, .33).add(new THREE.Vector3(0, bend, .8)), a.clone().lerp(b, .67).add(new THREE.Vector3(0, bend, .8)), b);
      const g = geometry(new THREE.BufferGeometry().setFromPoints(curve.getPoints(100)));
      const line = new THREE.Line(g, material(new THREE.LineBasicMaterial({ color, transparent: true, opacity: .2 })));
      const pulse = glow(color, transfer ? 6 : 4, new Array(36).fill(0));
      pulse.frustumCulled = false;
      scene.add(line, pulse); paths.push({ from, to, stages, bend, color, curve, line, pulse, transfer });
    }
    path("provider", "catalog", [1], "#79bfff", .4);
    path("consumer", "catalog", [2], "#79bfff", 1.2);
    path("catalog", "consumer", [2], "#79bfff", .6);
    path("provider", "identity", [3], "#75dbff", 1.1);
    path("consumer", "identity", [3], "#75dbff", 1.1);
    path("identity", "provider", [3], "#75dbff", .6);
    path("identity", "consumer", [3], "#75dbff", .6);
    path("provider", "policy", [4], "#ffba77", -.8);
    path("consumer", "policy", [4], "#ffba77", -.8);
    path("provider", "agreement", [5], "#f5d786", .9);
    path("agreement", "consumer", [5], "#f5d786", .9);
    path("consumer", "agreement", [5], "#b8aaff", -.8);
    path("agreement", "provider", [5], "#f5d786", -.8);
    path("provider", "consumer", [6, 7], "#59edcf", -.45, true);

    const seal = mesh(new THREE.OctahedronGeometry(.5, 0), "#f5d786", true); seal.position.copy(vec("agreement")); scene.add(seal);
    const original = mesh(new THREE.OctahedronGeometry(.22, 0), "#81ffda"); original.position.copy(vec("provider")).add(new THREE.Vector3(0, -.9, .7)); scene.add(original);
    const copy = mesh(new THREE.OctahedronGeometry(.22, 0), "#81ffda"); scene.add(copy);
    const copyHalo = glow("#81ffda", 8, [0, 0, 0]); copy.add(copyHalo);
    const wake = glow("#81ffda", 3.5, new Array(54).fill(0)); wake.frustumCulled = false; scene.add(wake);
    // One expanding confirmation ripple makes each successful handshake memorable.
    const ripple = mesh(new THREE.TorusGeometry(.7, .018, 6, 80), "#75dbff"); scene.add(ripple);
    const sealOrbit = mesh(new THREE.TorusGeometry(.85, .018, 6, 80), "#f5d786"); scene.add(sealOrbit);
    const ruleGeometry = geometry(new THREE.OctahedronGeometry(.1));
    const rules = Array.from({ length: 3 }, () => {
      const rule = new THREE.Mesh(ruleGeometry, material(new THREE.MeshBasicMaterial({ color: "#ffba77" }))); scene.add(rule); return rule;
    });
    const transferPath = paths[paths.length - 1];
    const rand = random(7);
    const dust = glow("#7094b5", 1.3, Array.from({ length: 240 }, () => (rand() - .5) * 32)); scene.add(dust);
    const resize = new ResizeObserver(() => {
      width = Math.max(element.clientWidth, 1); height = Math.max(element.clientHeight, 1);
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
      layout = journeyLayout(camera.aspect);
      nodes.forEach(node => node.group.position.copy(vec(node.id)));
      companyNetworks.forEach((network, i) => network.group.position.copy(vec(i ? "consumer" : "provider")));
      paths.forEach(path => {
        const a = vec(path.from), b = vec(path.to);
        path.curve.v0.copy(a); path.curve.v3.copy(b);
        path.curve.v1.copy(a).lerp(b, .33).add(new THREE.Vector3(0, path.bend, .8));
        path.curve.v2.copy(a).lerp(b, .67).add(new THREE.Vector3(0, path.bend, .8));
        const positions = path.line.geometry.getAttribute("position") as THREE.BufferAttribute;
        const point = new THREE.Vector3();
        for (let i = 0; i <= 100; i++) { path.curve.getPoint(i / 100, point); positions.setXYZ(i, point.x, point.y, point.z); }
        positions.needsUpdate = true; path.line.geometry.computeBoundingSphere();
      });
      seal.position.copy(vec("agreement")); sealOrbit.position.copy(vec("agreement"));
      original.position.copy(vec("provider")).add(new THREE.Vector3(0, -.85, .7));
      // Fit immediately on resize. Only chapter-focus motion is interpolated.
      camera.position.set(0, 0, layout.distance);
    }); resize.observe(element);
    let frame = 0, last = performance.now(), time = 0, elapsed = 0, previousReplay = -1, previousChapter = -1, lastRender = 0;
    let disposed = false;
    const projected = new THREE.Vector3();
    const point = new THREE.Vector3();
    const red = new THREE.Color("#ff7185");

    function render(now: number) {
      if (disposed) return;
      frame = requestAnimationFrame(render);
      const p = live.current;
      const dt = Math.min((now - last) / 1000, .05); last = now;
      if (p.replay !== previousReplay || p.chapter !== previousChapter) { elapsed = 0; previousReplay = p.replay; previousChapter = p.chapter; }
      if (document.hidden) return;
      if (!p.paused) { time += dt * p.speed; elapsed += dt * p.speed; }
      const minFrame = p.paused || p.reduced ? 100 : 1000 / 45;
      if (now - lastRender < minFrame) return; lastRender = now;
      const t = p.reduced ? 0 : time;
      const progress = p.reduced ? 1 : smooth(elapsed / 5);
      const sceneFocus = p.selected ?? chapters[p.chapter].focus;
      const mobile = width < 640;
      targetCamera.set(mobile || p.reduced ? 0 : vec(sceneFocus).x * .035, 0, layout.distance);
      camera.position.lerp(targetCamera, p.reduced ? 1 : .05); camera.lookAt(lookAt);
      companyNetworks.forEach(({ group, edgeMaterial, particles }, i) => {
        group.rotation.y = Math.sin(t * .07 + i) * .13;
        const activated = i === 0 || p.chapter === 7;
        const inBackground = p.chapter > 0 && p.chapter < 7;
        edgeMaterial.opacity = activated ? (inBackground ? .15 : .25) + Math.sin(t * .9) * .025 : .09;
        particles.material.uniforms.opacity.value = activated ? (inBackground ? .5 : .8) : .28;
        group.scale.setScalar(activated ? 1 + Math.sin(t * .7) * .015 : 1);
      });
      nodes.forEach(({ id, group, core, halo, rings }) => {
        const isGateway = id === "provider" || id === "consumer";
        const active = id === sceneFocus || (p.chapter === 3 && isGateway);
        const blocked = !!p.fault && ((p.fault === "identity" && id === "identity") || (p.fault === "policy" && id === "policy") || (p.fault === "offline" && id === "consumer"));
        const color = blocked ? red : new THREE.Color(journeyNodes[id].color);
        core.material.color.copy(color); halo.material.uniforms.tint.value.copy(color);
        halo.material.uniforms.opacity.value = active ? 1 : .23;
        core.material.transparent = true; core.material.opacity = active || isGateway ? 1 : .45;
        core.rotation.y = t * .35;
        rings.forEach((ring, i) => {
          ring.material.color.copy(color); ring.material.opacity = active ? .8 : .13;
          // Identity rings converge on a shared orientation; policy rings align after evaluation.
          const align = ((id === "identity" || isGateway) && p.chapter === 3) || (id === "policy" && p.chapter === 4);
          const alignment = align && !p.fault ? progress : 0;
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
      paths.forEach(path => {
        const active = path.stages.includes(p.chapter);
        const blocked = active && !!p.fault;
        path.line.visible = active || (p.chapter > 1 && path.from === "provider" && path.to === "catalog");
        const lineMat = path.line.material as THREE.LineBasicMaterial;
        lineMat.color.set(blocked ? "#ff7185" : path.color);
        lineMat.opacity = active ? .6 : .05;
        path.line.geometry.setDrawRange(0, Math.floor(101 * (blocked ? .48 : progress)));
        path.pulse.visible = active && !p.reduced;
        path.pulse.material.uniforms.tint.value.copy(lineMat.color);
        const position = path.pulse.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < 12; i++) {
          let u = ((elapsed * (path.transfer ? .11 : .19) - i * .014) % 1 + 1) % 1;
          if (blocked) u *= .45;
          path.curve.getPoint(u * progress, point); position.setXYZ(i, point.x, point.y, point.z);
        }
        position.needsUpdate = true;
      });
      seal.visible = p.chapter >= 5;
      seal.scale.setScalar(p.chapter === 5 ? .05 + progress * 1.25 : .8);
      seal.rotation.set(t * .17, t * .32, .3);
      sealOrbit.visible = p.chapter >= 5;
      sealOrbit.scale.setScalar(.4 + progress * .8); sealOrbit.rotation.set(.5, t * .2, t * .12);
      const milestone = p.chapter === 6 ? 10 : 5;
      const rippleProgress = (elapsed - milestone) / 2.5;
      ripple.visible = !p.reduced && !p.fault && [3, 4, 5, 6, 7].includes(p.chapter) && rippleProgress >= 0 && rippleProgress <= 1;
      ripple.position.copy(vec(chapters[p.chapter].focus)); ripple.scale.setScalar(1 + Math.max(0, rippleProgress) * 2.8);
      ripple.material.color.set(journeyNodes[chapters[p.chapter].focus].color);
      ripple.material.opacity = .75 * (1 - Math.max(0, rippleProgress));
      original.rotation.set(t * .25, t * .5, .2);
      original.scale.setScalar(p.chapter === 0 ? .1 + progress * .9 : 1);
      rules.forEach((rule, i) => {
        rule.visible = p.chapter === 4;
        const a = i * Math.PI * 2 / 3 + t * (p.fault ? 1.4 : .35) * (1 - progress * .75);
        rule.position.copy(vec("policy")).add(new THREE.Vector3(Math.cos(a) * 1.05, Math.sin(a) * 1.05, .3));
        rule.material.color.set(p.fault ? "#ff7185" : "#ffba77"); rule.rotation.y = t;
      });
      copy.visible = p.chapter >= 6 && !p.fault;
      if (p.chapter === 7) copy.position.copy(vec("consumer")).add(new THREE.Vector3(0, -.9, .7));
      else transferPath.curve.getPoint(p.reduced ? .7 : smooth((elapsed - 1) / 9), copy.position);
      copy.rotation.copy(original.rotation);
      wake.visible = p.chapter === 6 && !p.fault && !p.reduced && elapsed < 11;
      const wakePosition = wake.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < 18; i++) {
        transferPath.curve.getPoint(smooth((elapsed - 1 - i * .065) / 9), point);
        wakePosition.setXYZ(i, point.x, point.y, point.z);
      }
      wakePosition.needsUpdate = true;
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(render);
    const lost = (event: Event) => { event.preventDefault(); setUnavailable(true); cancelAnimationFrame(frame); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  if (unavailable) return <SimpleScene {...props} />;
  return <div ref={host} className={styles.canvas} role="group" aria-label="Interactive conceptual dataspace. Select a component to learn its role.">
    {nodeIds.map(id => <button key={id} ref={el => { labels.current[id] = el; }} className={styles.nodeLabel} data-active={props.selected === id || chapters[props.chapter].focus === id} style={{ "--node-color": journeyNodes[id].color } as React.CSSProperties} onClick={() => props.onSelect(id)} aria-pressed={props.selected === id}>
      <span>{journeyNodes[id].label}</span><small>{journeyNodes[id].role}</small>
    </button>)}
  </div>;
}

/** Fully operable, intentionally static alternative for low-power/no-WebGL devices. */
export function SimpleScene({ chapter, fault, selected, onSelect }: SceneProps) {
  return <div className={styles.simpleScene}>
    <p className={styles.simpleNote}>Schematic view · same journey, lighter rendering</p>
    <svg viewBox="0 0 720 360" role="img" aria-label={`${chapters[chapter].title}. ${fault ? "Exchange blocked." : chapters[chapter].signal}`}>
      <defs><linearGradient id="journey-path"><stop stopColor="#59edcf"/><stop offset="1" stopColor="#a5a0ff"/></linearGradient></defs>
      <path d="M110 180 Q260 10 360 75 Q480 20 610 180 M110 180 Q300 355 360 285 Q500 335 610 180" fill="none" stroke="#416080" strokeWidth="2" strokeDasharray="6 9"/>
      <path d="M110 180 Q360 120 610 180" fill="none" stroke={fault ? "#ff7185" : "url(#journey-path)"} strokeWidth="3"/>
      {[110, 610].map((x, i) => <g key={x}><circle cx={x} cy="180" r="65" fill="none" stroke={i ? "#a5a0ff" : "#59edcf"}/><circle cx={x} cy="180" r="43" fill="none" stroke={i ? "#a5a0ff" : "#59edcf"} strokeDasharray="3 8"/><circle cx={x} cy="180" r="9" fill={i ? "#a5a0ff" : "#59edcf"}/><text x={x} y="275" fill="#dfeafa" textAnchor="middle" fontSize="18">Company {i ? "B" : "A"}</text></g>)}
      <circle cx="360" cy="75" r="13" fill="#75dbff"/><text x="360" y="43" fill="#dfeafa" textAnchor="middle" fontSize="16">Trust</text>
      <circle cx="360" cy="285" r="13" fill="#ffba77"/><text x="360" y="329" fill="#dfeafa" textAnchor="middle" fontSize="16">Policy</text>
      {chapter >= 5 && <path d="M360 125 L380 145 L360 165 L340 145 Z" fill="none" stroke="#f5d786" strokeWidth="3"/>}
      {chapter >= 6 && !fault && <circle cx="500" cy="160" r="8" fill="#59edcf"/>}
    </svg>
    <div className={styles.simpleNodes}>{nodeIds.map(id => <button key={id} onClick={() => onSelect(id)} aria-pressed={selected === id}>{journeyNodes[id].label}</button>)}</div>
  </div>;
}
