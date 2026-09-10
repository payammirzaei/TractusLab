"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";
import { chapters, journeyNodes, type Fault, type NodeId } from "@/lib/data-journey";
import { journeyLayout } from "@/lib/journey-visuals";
import { journeySequences, sequenceFrame, signalStyles, type SignalKind } from "@/lib/journey-sequence";
import styles from "./journey.module.css";

export type SceneProps = { chapter: number; progress: number; fault: Fault | null; paused: boolean; reduced: boolean; selected: NodeId | null; onSelect: (id: NodeId) => void };
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
      const shape = id === "catalog" ? geometry(new THREE.BoxGeometry(.3, .36, .13)) : id === "policy" ? geometry(new THREE.TetrahedronGeometry(.26)) : id === "agreement" ? geometry(new THREE.OctahedronGeometry(.25)) : coreGeometry;
      const core = new THREE.Mesh(shape, material(new THREE.MeshBasicMaterial({ color: journeyNodes[id].color })));
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

    type Path = { id: string; chapter: number; from: NodeId; to: NodeId; bend: number; color: string; curve: THREE.CubicBezierCurve3; line: THREE.Line; pulse: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>; token: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; kind: SignalKind };
    const paths: Path[] = [];
    function path(id: string, chapter: number, from: NodeId, to: NodeId, kind: SignalKind) {
      const color = chapter === 5 ? "#f5d786" : signalStyles[kind].color;
      const bend = kind === "data" ? -.45 : from === "consumer" ? 1.25 : -.95;
      const a = vec(from), b = vec(to);
      const curve = new THREE.CubicBezierCurve3(a, a.clone().lerp(b, .33).add(new THREE.Vector3(0, bend, .8)), a.clone().lerp(b, .67).add(new THREE.Vector3(0, bend, .8)), b);
      const g = geometry(new THREE.BufferGeometry().setFromPoints(curve.getPoints(100)));
      const line = new THREE.Line(g, material(new THREE.LineBasicMaterial({ color, transparent: true, opacity: .2 })));
      const pulse = glow(color, kind === "data" ? 6 : 4, new Array(36).fill(0));
      pulse.frustumCulled = false;
      const token = mesh(kind === "retrieval" || id.includes("request") ? new THREE.TorusGeometry(.12, .035, 6, 24) : new THREE.BoxGeometry(.23, .16, .06), color);
      scene.add(line, pulse, token); paths.push({ id, chapter, from, to, bend, color, curve, line, pulse, token, kind });
    }
    journeySequences.forEach((beats, chapter) => beats.forEach(beat => {
      if (beat.from && beat.to) path(beat.id, chapter, beat.from, beat.to, beat.kind);
    }));

    const seal = mesh(new THREE.OctahedronGeometry(.5, 0), "#f5d786", true); seal.position.copy(vec("agreement")); scene.add(seal);
    const original = mesh(new THREE.OctahedronGeometry(.22, 0), "#81ffda"); original.position.copy(vec("provider")).add(new THREE.Vector3(0, -.9, .7)); scene.add(original);
    const copy = mesh(new THREE.OctahedronGeometry(.22, 0), "#81ffda"); scene.add(copy);
    const copyHalo = glow("#81ffda", 8, [0, 0, 0]); copy.add(copyHalo);
    const wake = glow("#81ffda", 3.5, new Array(54).fill(0)); wake.frustumCulled = false; scene.add(wake);
    // One expanding confirmation ripple makes each successful handshake memorable.
    const ripple = mesh(new THREE.TorusGeometry(.7, .018, 6, 80), "#75dbff"); scene.add(ripple);
    const sealOrbit = mesh(new THREE.TorusGeometry(.85, .018, 6, 80), "#f5d786"); scene.add(sealOrbit);
    const processing = mesh(new THREE.TorusGeometry(.93, .025, 6, 64, Math.PI * 1.4), "#d0b3ff"); scene.add(processing);
    const ruleGeometry = geometry(new THREE.OctahedronGeometry(.1));
    const rules = Array.from({ length: 3 }, () => {
      const rule = new THREE.Mesh(ruleGeometry, material(new THREE.MeshBasicMaterial({ color: "#ffba77" }))); scene.add(rule); return rule;
    });
    const transferPath = paths.find(path => path.id === "payload")!;
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
    let frame = 0, lastRender = 0;
    let disposed = false;
    const projected = new THREE.Vector3();
    const point = new THREE.Vector3();
    const red = new THREE.Color("#ff7185");

    function render(now: number) {
      if (disposed) return;
      frame = requestAnimationFrame(render);
      const p = live.current;
      if (document.hidden) return;
      const minFrame = p.paused || p.reduced ? 100 : 1000 / 45;
      if (now - lastRender < minFrame) return; lastRender = now;
      const sequence = sequenceFrame(p.chapter, p.progress, p.fault);
      const elapsed = sequence.position * chapters[p.chapter].duration;
      const t = p.reduced ? 0 : elapsed;
      const sceneFocus = p.selected ?? sequence.current.focus;
      const mobile = width < 640;
      targetCamera.set(mobile || p.reduced ? 0 : vec(sceneFocus).x * .035, 0, layout.distance);
      if (!p.paused) camera.position.lerp(targetCamera, p.reduced ? 1 : .05);
      camera.lookAt(lookAt);
      companyNetworks.forEach(({ group, edgeMaterial, particles }, i) => {
        group.rotation.y = Math.sin(t * .07 + i) * .13;
        const activated = i === 0 || sequence.consumerActivated;
        const inBackground = p.chapter > 0 && p.chapter < 7;
        edgeMaterial.opacity = activated ? (inBackground ? .15 : .25) + Math.sin(t * .9) * .025 : .09;
        particles.material.uniforms.opacity.value = activated ? (inBackground ? .5 : .8) : .28;
        group.scale.setScalar(activated ? 1 + Math.sin(t * .7) * .015 : 1);
      });
      nodes.forEach(({ id, group, core, halo, rings }) => {
        const isGateway = id === "provider" || id === "consumer";
        const active = id === sceneFocus || (sequence.current.status === "active" && sequence.current.from === id);
        const blocked = sequence.blocked && id === sequence.current.focus;
        const color = blocked ? red : new THREE.Color(journeyNodes[id].color);
        core.material.color.copy(color); halo.material.uniforms.tint.value.copy(color);
        halo.material.uniforms.opacity.value = active ? 1 : .23;
        core.material.transparent = true; core.material.opacity = active || isGateway ? 1 : .45;
        core.rotation.y = t * .35;
        rings.forEach((ring, i) => {
          ring.material.color.copy(color); ring.material.opacity = active ? .8 : .13;
          // Identity rings converge on a shared orientation; policy rings align after evaluation.
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
      paths.forEach(path => {
        const beat = path.chapter === p.chapter ? sequence.beats.find(beat => beat.id === path.id) : undefined;
        const active = beat?.status === "active";
        const done = beat?.status === "done";
        const fraction = beat?.fraction ?? 0;
        path.line.visible = active || done;
        const lineMat = path.line.material as THREE.LineBasicMaterial;
        lineMat.opacity = active ? .65 : .075;
        path.line.geometry.setDrawRange(0, Math.floor(101 * (done || p.reduced ? 1 : smooth(fraction))));
        path.pulse.visible = active && !p.reduced && path.kind !== "data";
        path.token.visible = active && path.kind !== "data";
        path.curve.getPoint(p.reduced ? .5 : smooth(fraction), path.token.position);
        path.token.rotation.z = t * .45;
        path.pulse.material.uniforms.tint.value.copy(lineMat.color);
        const position = path.pulse.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < 12; i++) {
          path.curve.getPoint(smooth(Math.max(0, fraction - i * .014)), point); position.setXYZ(i, point.x, point.y, point.z);
        }
        position.needsUpdate = true;
      });
      const sealBeat = sequence.beats.find(beat => beat.id === "seal");
      seal.visible = sequence.agreementReady;
      seal.scale.setScalar(p.chapter === 5 && !p.reduced ? .4 + smooth(sealBeat?.fraction ?? 0) * .85 : .8);
      seal.rotation.set(t * .17, t * .32, .3);
      sealOrbit.visible = sequence.agreementReady;
      sealOrbit.scale.setScalar(.8); sealOrbit.rotation.set(.5, t * .2, t * .12);
      const rippleProgress = (sequence.position - sequence.successAt) / (1 - sequence.successAt);
      ripple.visible = !p.reduced && sequence.finished && rippleProgress >= 0 && rippleProgress < 1;
      ripple.position.copy(vec(chapters[p.chapter].focus)); ripple.scale.setScalar(1 + Math.max(0, rippleProgress) * 2.8);
      ripple.material.color.set(journeyNodes[chapters[p.chapter].focus].color);
      ripple.material.opacity = .75 * (1 - Math.max(0, rippleProgress));
      original.rotation.set(t * .25, t * .5, .2);
      original.scale.setScalar(p.chapter === 0 && !p.reduced ? .1 + smooth(sequence.position / sequence.successAt) * .9 : 1);
      const processingActive = sequence.current.kind === "local" && sequence.current.status === "active";
      processing.visible = processingActive || sequence.blocked;
      processing.position.copy(vec(sequence.current.focus));
      processing.rotation.z = -t * 1.5;
      processing.material.color.set(sequence.blocked ? "#ff7185" : journeyNodes[sequence.current.focus].color);
      rules.forEach((rule, i) => {
        rule.visible = p.chapter === 4;
        const a = i * Math.PI * 2 / 3 + t * .35;
        rule.position.copy(vec("policy")).add(sequence.policyMatched ? new THREE.Vector3((i - 1) * .4, 1.1, .3) : new THREE.Vector3(Math.cos(a) * 1.05, Math.sin(a) * 1.05, .3));
        rule.material.color.set(p.fault ? "#ff7185" : "#ffba77"); rule.rotation.y = t;
      });
      const payload = sequence.beats.find(beat => beat.id === "payload");
      copy.visible = sequence.copyVisible;
      if (sequence.copyDelivered) copy.position.copy(vec("consumer")).add(new THREE.Vector3(0, -.85, .7));
      else transferPath.curve.getPoint(p.reduced ? .5 : smooth(payload?.fraction ?? 0), copy.position);
      copy.rotation.copy(original.rotation);
      wake.visible = payload?.status === "active" && !p.reduced;
      const wakePosition = wake.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < 18; i++) {
        transferPath.curve.getPoint(smooth(Math.max(0, (payload?.fraction ?? 0) - i * .015)), point);
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
