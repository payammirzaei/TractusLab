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

export type SceneProps = { chapter: number; progress: number; fault: Fault | null; paused: boolean; reduced: boolean; selected: NodeId | null; onSelect: (id: NodeId) => void };
const nodeIds = Object.keys(journeyNodes) as NodeId[];
const providerColor = "#59edcf";
const consumerColor = "#aaa4ff";
const controlColor = "#80caff";
const contractColor = "#f5d786";
const dataColor = "#59edb2";
const smooth = (n: number) => { const v = THREE.MathUtils.clamp(n, 0, 1); return v * v * (3 - 2 * v); };

function roundedShape(width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2, r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y); shape.lineTo(x + width - r, y); shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r); shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

export default function NeuralScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Partial<Record<NodeId, HTMLButtonElement | null>>>({});
  const live = useRef(props); live.current = props;
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { setUnavailable(true); return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.2 : 1.55));
    renderer.setClearColor(0x050b14, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050b14, .012);
    let layout = journeyLayout(1);
    let width = 1, height = 1;
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    const targetCamera = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();
    const pointer = new THREE.Vector2();

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const geometry = <T extends THREE.BufferGeometry>(value: T) => { geometries.add(value); return value; };
    const material = <T extends THREE.Material>(value: T) => { materials.add(value); return value; };
    const rounded = (w: number, h: number, r = .12, depth = .1) => {
      const g = geometry(new THREE.ExtrudeGeometry(roundedShape(w, h, r), { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: .025, bevelThickness: .025, steps: 1 }));
      g.translate(0, 0, -depth / 2); return g;
    };
    const surface = (accent: string, opacity = .96) => material(new THREE.MeshPhysicalMaterial({
      color: "#09131f", emissive: accent, emissiveIntensity: .035, roughness: .38, metalness: .28,
      clearcoat: .2, clearcoatRoughness: .45, transparent: opacity < 1, opacity,
    }));
    const hero = (color: string, intensity = .8) => material(new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(.42), emissive: color, emissiveIntensity: intensity,
      roughness: .22, metalness: .55, transparent: true, opacity: 1,
    }));
    const lineMaterial = (color: string, opacity = .18) => material(new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));

    function textSprite(title: string, subtitle: string, color: string, scale = 1) {
      const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 256;
      const ctx = canvas.getContext("2d")!; ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "600 46px Inter, ui-sans-serif, system-ui, sans-serif"; ctx.fillStyle = "#eef6ff"; ctx.fillText(title, 512, 96);
      ctx.font = "500 27px Inter, ui-sans-serif, system-ui, sans-serif"; ctx.fillStyle = color; ctx.fillText(subtitle, 512, 158);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; textures.add(texture);
      const sprite = new THREE.Sprite(material(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false })));
      sprite.scale.set(3.15 * scale, .79 * scale, 1); sprite.renderOrder = 10; return sprite;
    }

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), .05); pmrem.dispose(); scene.environment = environment.texture;
    const hemisphere = new THREE.HemisphereLight(0xc7e7ff, 0x06101a, 1.05);
    const key = new THREE.DirectionalLight(0xe3f4ff, 1.55); key.position.set(-5, 7, 9);
    const rim = new THREE.DirectionalLight(0xb9adff, 1.05); rim.position.set(7, 1, 7);
    const activeLight = new THREE.PointLight(0x80caff, 0, 7, 2); scene.add(hemisphere, key, rim, activeLight);

    const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .3, .35, 1.15); composer.addPass(bloom); composer.addPass(new OutputPass());

    const floor = new THREE.GridHelper(26, 26, 0x27445b, 0x152536);
    const floorMat = floor.material as THREE.Material & { transparent: boolean; opacity: number };
    floorMat.transparent = true; floorMat.opacity = .12; floor.position.y = -3.2; floor.position.z = -1; scene.add(floor);

    type LayerKey = "business" | "control" | "data" | "bottom";
    type Company = { group: THREE.Group; shell: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>; layers: Record<LayerKey, THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>>; accent: string };
    function makeCompany(side: "provider" | "consumer"): Company {
      const accent = side === "provider" ? providerColor : consumerColor;
      const group = new THREE.Group();
      const shellMat = surface(accent, .93); shellMat.emissiveIntensity = .045;
      const shell = new THREE.Mesh(rounded(4.05, 6.05, .24, .16), shellMat); group.add(shell);
      const shellEdges = new THREE.LineSegments(geometry(new THREE.EdgesGeometry(shell.geometry, 25)), lineMaterial(accent, .24)); shellEdges.position.z = .09; group.add(shellEdges);
      const stripe = new THREE.Mesh(geometry(new THREE.BoxGeometry(.035, 5.15, .04)), hero(accent, .55)); stripe.position.set(side === "provider" ? 1.83 : -1.83, 0, .13); group.add(stripe);

      const definitions: Array<[LayerKey, number, string, string]> = side === "provider" ? [
        ["business", 2.1, "BUSINESS APP", "publishes the offer"], ["control", .72, "CONTROL PLANE", "catalog · contract · transfer"],
        ["data", -.86, "DATA PLANE", "authorized HTTP access"], ["bottom", -2.2, "PRIVATE SOURCE", "battery footprint stays here"],
      ] : [
        ["business", 2.1, "BUSINESS APP", "product-footprint workflow"], ["control", .72, "CONTROL PLANE", "discover · negotiate · start"],
        ["data", -.86, "DATA PLANE", "authorized data request"], ["bottom", -2.2, "LOCAL USE", "received copy becomes value"],
      ];
      const layers = {} as Record<LayerKey, THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>>;
      for (const [layer, y, title, subtitle] of definitions) {
        const mat = surface(accent, .98); const panel = new THREE.Mesh(rounded(3.28, .86, .13, .1), mat); panel.position.set(0, y, .13); group.add(panel); layers[layer] = panel;
        const label = textSprite(title, subtitle, accent, .72); label.position.set(0, y, .24); group.add(label);
      }
      const header = textSprite(side === "provider" ? "COMPANY A" : "COMPANY B", side === "provider" ? "SUPPLIER · PROVIDER" : "MANUFACTURER · CONSUMER", accent, .9);
      header.position.set(0, 3.34, .22); group.add(header);
      scene.add(group); return { group, shell, layers, accent };
    }
    const provider = makeCompany("provider"), consumer = makeCompany("consumer");

    const controlRailGeometry = geometry(new THREE.BufferGeometry());
    const dataRailGeometry = geometry(new THREE.BufferGeometry());
    const controlRail = new THREE.Line(controlRailGeometry, lineMaterial(controlColor, .13));
    const dataRail = new THREE.Line(dataRailGeometry, lineMaterial(dataColor, .12)); scene.add(controlRail, dataRail);

    const corridorControlLabel = textSprite("CONTROL PLANE", "DSP messages · metadata · agreements", controlColor, .68); scene.add(corridorControlLabel);
    const corridorDataLabel = textSprite("DATA PLANE", "EDR-authorized payload access", dataColor, .68); scene.add(corridorDataLabel);

    function card(title: string, subtitle: string, color: string) {
      const group = new THREE.Group(); const mat = surface(color, .98); mat.emissiveIntensity = .12;
      const panel = new THREE.Mesh(rounded(1.9, 1.02, .15, .12), mat); group.add(panel);
      const label = textSprite(title, subtitle, color, .58); label.position.z = .13; group.add(label);
      scene.add(group); return { group, panel };
    }
    const providerOffer = card("DATA OFFER", "battery footprint · terms", controlColor);
    const consumerOffer = card("VISIBLE OFFER", "metadata · usage terms", controlColor);
    const dspCard = card("DSP 2025-1", "/.well-known/dspace-version", controlColor);
    const termsCard = card("USAGE TERMS", "Product-footprint calculation", "#ffba77");
    const edrCard = card("EDR", "endpoint · authorization", dataColor);
    const agreementCard = card("FINALIZED", "contract agreement", contractColor);
    agreementCard.panel.material.color.set("#221e13"); agreementCard.panel.material.emissiveIntensity = .65;

    const gate = new THREE.Group();
    const gateRings = [0, 1].map(i => { const ring = new THREE.Mesh(geometry(new THREE.TorusGeometry(.62 + i * .16, .022, 8, 72)), hero(i ? controlColor : providerColor, .85)); ring.rotation.y = Math.PI / 2; gate.add(ring); return ring; });
    const gateCore = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.16, 1)), hero(controlColor, 1.1)); gate.add(gateCore); scene.add(gate);

    const sourceCore = new THREE.Mesh(geometry(new THREE.CylinderGeometry(.22, .22, .34, 24)), hero(dataColor, .6)); sourceCore.rotation.x = Math.PI / 2; scene.add(sourceCore);
    const consumerCore = new THREE.Mesh(geometry(new THREE.OctahedronGeometry(.22, 1)), hero(dataColor, .9)); scene.add(consumerCore);

    type Path = { id: string; chapter: number; kind: SignalKind; curve: THREE.CubicBezierCurve3; line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>; token: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; from: NodeId; to: NodeId };
    const paths: Path[] = [];
    function tokenGeometry(id: string, kind: SignalKind) {
      if (kind === "retrieval") return geometry(new THREE.TorusGeometry(.13, .035, 8, 28));
      if (id.includes("contract")) return geometry(new THREE.CylinderGeometry(.13, .13, .055, 28));
      if (id === "catalog-response") return geometry(new THREE.BoxGeometry(.34, .21, .055));
      if (id === "transfer-start") return geometry(new THREE.OctahedronGeometry(.15, 1));
      return geometry(new THREE.BoxGeometry(.24, .13, .055));
    }
    function makePath(beat: JourneyBeat, chapter: number) {
      if (!beat.from || !beat.to) return;
      const color = chapter === 5 ? contractColor : beat.kind === "retrieval" || beat.kind === "data" ? dataColor : controlColor;
      const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
      const g = geometry(new THREE.BufferGeometry()); g.setAttribute("position", new THREE.Float32BufferAttribute(new Array(81 * 3).fill(0), 3));
      const lm = lineMaterial(color, .1) as THREE.LineBasicMaterial;
      const line = new THREE.Line(g, lm); const tm = hero(color, 1.5); const token = new THREE.Mesh(tokenGeometry(beat.id, beat.kind), tm);
      if (beat.id.includes("contract")) token.rotation.x = Math.PI / 2;
      scene.add(line, token); paths.push({ id: beat.id, chapter, kind: beat.kind, curve, line, token, from: beat.from, to: beat.to });
    }
    journeySequences.forEach((beats, chapter) => beats.forEach(beat => makePath(beat, chapter)));

    const payload = new THREE.Group();
    const payloadCore = new THREE.Mesh(geometry(new THREE.CapsuleGeometry(.16, .28, 4, 10)), hero(dataColor, 2)); payloadCore.rotation.z = Math.PI / 2; payload.add(payloadCore);
    const payloadShell = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.32, 1)), material(new THREE.MeshBasicMaterial({ color: dataColor, wireframe: true, transparent: true, opacity: .38, depthWrite: false })));
    payload.add(payloadShell); scene.add(payload);
    const trailRings = [0, 1, 2].map(i => { const ring = new THREE.Mesh(geometry(new THREE.TorusGeometry(.18 + i * .018, .012, 6, 40)), material(new THREE.MeshBasicMaterial({ color: dataColor, transparent: true, opacity: .26 - i * .06, depthWrite: false }))); ring.rotation.y = Math.PI / 2; scene.add(ring); return ring; });

    const useLineGeometry = geometry(new THREE.BufferGeometry());
    const useLine = new THREE.Line(useLineGeometry, lineMaterial(dataColor, .4)); scene.add(useLine);

    const tmp = new THREE.Vector3(), projected = new THREE.Vector3(), red = new THREE.Color("#ff7185"), activeColor = new THREE.Color();
    function planeY(kind: SignalKind) { return (kind === "retrieval" || kind === "data" ? -1.05 : .72) * layout.companyScale; }
    function partyAnchor(id: NodeId, kind: SignalKind) {
      const providerSide = id === "provider";
      const x = providerSide ? -layout.companyX + 1.28 * layout.companyScale : layout.companyX - 1.28 * layout.companyScale;
      return new THREE.Vector3(x, planeY(kind), .36);
    }
    function updateCurve(item: Path) {
      const a = partyAnchor(item.from, item.kind), b = partyAnchor(item.to, item.kind);
      const lift = item.kind === "data" ? .5 : item.kind === "retrieval" ? .62 : .72;
      const bend = item.from === "consumer" ? .12 : -.12;
      item.curve.v0.copy(a); item.curve.v3.copy(b);
      item.curve.v1.copy(a).lerp(b, .34).add(new THREE.Vector3(0, bend, lift));
      item.curve.v2.copy(a).lerp(b, .66).add(new THREE.Vector3(0, bend, lift));
      const positions = item.line.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i <= 80; i++) { item.curve.getPoint(i / 80, tmp); positions.setXYZ(i, tmp.x, tmp.y, tmp.z); }
      positions.needsUpdate = true; item.line.geometry.computeBoundingSphere();
    }
    function syncLayout() {
      provider.group.position.set(-layout.companyX, 0, -.24); consumer.group.position.set(layout.companyX, 0, .24);
      provider.group.scale.setScalar(layout.companyScale); consumer.group.scale.setScalar(layout.companyScale);
      const innerLeft = -layout.companyX + 2.28 * layout.companyScale, innerRight = layout.companyX - 2.28 * layout.companyScale;
      const controlY = .72 * layout.companyScale, dataY = -.86 * layout.companyScale;
      controlRailGeometry.setFromPoints([new THREE.Vector3(innerLeft, controlY, .08), new THREE.Vector3(innerRight, controlY, .08)]);
      dataRailGeometry.setFromPoints([new THREE.Vector3(innerLeft, dataY, .08), new THREE.Vector3(innerRight, dataY, .08)]);
      corridorControlLabel.position.set(0, controlY + .5, -.05); corridorDataLabel.position.set(0, dataY + .48, -.05);
      providerOffer.group.position.set(innerLeft - .05, 1.92 * layout.companyScale, .55);
      consumerOffer.group.position.set(innerRight + .05, 1.92 * layout.companyScale, .55);
      dspCard.group.position.set(0, 1.95 * layout.companyScale, .7);
      termsCard.group.position.set(innerRight + .05, 1.92 * layout.companyScale, .62);
      gate.position.copy(partyAnchor("provider", "control")).add(new THREE.Vector3(.05, 0, .45));
      agreementCard.group.position.set(0, controlY, .86);
      edrCard.group.position.set(innerRight + .05, -.05 * layout.companyScale, .72);
      sourceCore.position.set(-layout.companyX + .95 * layout.companyScale, -2.2 * layout.companyScale, .25);
      consumerCore.position.set(layout.companyX - .95 * layout.companyScale, -2.2 * layout.companyScale, .25);
      useLineGeometry.setFromPoints([new THREE.Vector3(layout.companyX, dataY, .16), new THREE.Vector3(layout.companyX, 2.1 * layout.companyScale, .16)]);
      paths.forEach(updateCurve);
      camera.position.set(0, .25, layout.distance); targetCamera.copy(camera.position); lookAt.set(0, 0, 0); targetLookAt.copy(lookAt);
    }

    const resize = new ResizeObserver(() => {
      width = Math.max(element.clientWidth, 1); height = Math.max(element.clientHeight, 1);
      renderer.setSize(width, height); composer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
      layout = journeyLayout(camera.aspect); syncLayout();
    }); resize.observe(element);

    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
    };
    const resetPointer = () => pointer.set(0, 0);
    element.addEventListener("pointermove", onPointerMove, { passive: true }); element.addEventListener("pointerleave", resetPointer);

    let raf = 0, lastRender = 0, disposed = false;
    function setLayer(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>, accent: string, active: boolean) {
      mesh.material.emissive.set(accent); mesh.material.emissiveIntensity = active ? .32 : .035; mesh.material.roughness = active ? .27 : .4;
    }
    function render(now: number) {
      if (disposed) return; raf = requestAnimationFrame(render);
      const p = live.current; if (document.hidden) return;
      const mobile = width < 720; const minFrame = p.paused || p.reduced ? 100 : mobile ? 1000 / 30 : 1000 / 45;
      if (now - lastRender < minFrame) return; lastRender = now;
      const sequence = sequenceFrame(p.chapter, p.progress, p.fault); const t = p.reduced ? 0 : sequence.position * chapters[p.chapter].duration;
      const current = sequence.current; const dataPhase = current.kind === "retrieval" || current.kind === "data" || current.id === "read-source";
      const businessPhase = p.chapter === 7 && (current.id === "use-record" || current.id === "value");
      const sourcePhase = p.chapter === 0 || current.id === "read-source" || current.id === "payload";
      const parallax = mobile || p.reduced ? 0 : 1;
      const chapterX = [-.24, -.18, 0, 0, .12, 0, .08, .22][p.chapter] ?? 0;
      const chapterY = p.chapter === 6 ? -.28 : p.chapter === 7 ? .12 : .12;
      const push = p.chapter === 5 ? -.45 : p.chapter === 6 ? -.25 : 0;
      targetCamera.set(chapterX + pointer.x * .16 * parallax, .25 + pointer.y * .1 * parallax, layout.distance + push);
      targetLookAt.set(chapterX * .3, chapterY, .12);
      if (!p.paused) { camera.position.lerp(targetCamera, p.reduced ? 1 : .045); lookAt.lerp(targetLookAt, p.reduced ? 1 : .055); }
      camera.lookAt(lookAt);

      const signal = p.fault ? red : activeColor.set(p.chapter === 5 ? contractColor : dataPhase ? dataColor : controlColor);
      activeLight.color.copy(signal); activeLight.intensity = p.reduced ? .6 : current.status === "active" || sequence.blocked ? 2.1 : .55;
      if (current.from === "provider" || current.focus === "provider") activeLight.position.copy(dataPhase ? partyAnchor("provider", "data") : partyAnchor("provider", "control"));
      else if (current.from === "consumer" || current.focus === "consumer") activeLight.position.copy(dataPhase ? partyAnchor("consumer", "data") : partyAnchor("consumer", "control"));
      else activeLight.position.set(0, dataPhase ? -.8 : .8, 2.4);
      activeLight.position.z += 2.2;

      const providerInvolved = current.from === "provider" || current.to === "provider" || current.focus === "provider" || current.focus === "catalog" || current.focus === "identity" || current.focus === "policy" || current.focus === "agreement";
      const consumerInvolved = current.from === "consumer" || current.to === "consumer" || current.focus === "consumer" || current.focus === "policy" || current.focus === "agreement";
      setLayer(provider.layers.control, providerColor, providerInvolved && !dataPhase && !sourcePhase); setLayer(consumer.layers.control, consumerColor, consumerInvolved && !dataPhase && !businessPhase);
      setLayer(provider.layers.data, providerColor, providerInvolved && dataPhase); setLayer(consumer.layers.data, consumerColor, consumerInvolved && dataPhase);
      setLayer(provider.layers.bottom, providerColor, sourcePhase); setLayer(consumer.layers.business, consumerColor, businessPhase);
      setLayer(provider.layers.business, providerColor, p.chapter === 1 && current.id === "register-asset"); setLayer(consumer.layers.bottom, consumerColor, p.chapter === 7 && sequence.copyDelivered);
      provider.shell.material.emissiveIntensity = providerInvolved ? .08 : .025; consumer.shell.material.emissiveIntensity = consumerInvolved ? .08 : .025;

      controlRail.material.opacity = dataPhase ? .045 : .14; dataRail.material.opacity = dataPhase ? .22 : .055;
      corridorControlLabel.material.opacity = dataPhase ? .35 : .78; corridorDataLabel.material.opacity = dataPhase ? .9 : .38;

      providerOffer.group.visible = p.chapter >= 1 && p.chapter <= 5; providerOffer.panel.material.emissiveIntensity = p.chapter === 1 ? .55 : .1;
      dspCard.group.visible = p.chapter === 2; dspCard.panel.material.emissiveIntensity = current.id.includes("version") ? .75 : .18;
      const catalogResponse = sequence.beats.find(beat => beat.id === "catalog-response");
      consumerOffer.group.visible = p.chapter === 4 || p.chapter === 5 || (p.chapter === 3 && !!catalogResponse && catalogResponse.status !== "upcoming");
      consumerOffer.panel.material.emissiveIntensity = p.chapter === 3 && catalogResponse?.status === "active" ? .7 : .12;
      termsCard.group.visible = p.chapter === 4; termsCard.panel.material.emissiveIntensity = .38 + (current.focus === "policy" ? .38 : 0);

      const gateActive = p.chapter === 3 && (current.id === "credential-check" || current.id === "access-check" || p.fault === "identity"); gate.visible = gateActive;
      gateRings.forEach((ring, i) => { ring.rotation.z = t * (.22 + i * .08) * (i ? -1 : 1); ring.scale.setScalar(p.fault ? 1.05 : .88 + (sequence.identityVerified ? .12 : Math.sin(t * 1.4 + i) * .04)); (ring.material as THREE.MeshStandardMaterial).emissive.set(p.fault ? "#ff7185" : i ? controlColor : providerColor); });
      gateCore.rotation.y = t * .6; (gateCore.material as THREE.MeshStandardMaterial).emissive.set(p.fault ? "#ff7185" : controlColor);

      const finalized = sequence.beats.find(beat => beat.id === "contract-finalized"); const seal = sequence.beats.find(beat => beat.id === "seal");
      const agreementShowing = p.chapter > 5 || sequence.agreementReady || (p.chapter === 5 && finalized?.status === "active"); agreementCard.group.visible = agreementShowing;
      const agreementFraction = p.chapter === 5 ? smooth(seal?.fraction ?? finalized?.fraction ?? 0) : 1; agreementCard.group.scale.setScalar(.72 + agreementFraction * .28); agreementCard.panel.material.emissiveIntensity = .45 + agreementFraction * .65;

      const transferStart = sequence.beats.find(beat => beat.id === "transfer-start"); edrCard.group.visible = p.chapter > 6 || sequence.edrReady || (p.chapter === 6 && transferStart?.status === "active");
      edrCard.panel.material.emissiveIntensity = transferStart?.status === "active" ? .95 : .28;

      paths.forEach(item => {
        const beat = item.chapter === p.chapter ? sequence.beats.find(candidate => candidate.id === item.id) : undefined; const active = beat?.status === "active", done = beat?.status === "done";
        item.line.visible = !!(active || done); item.line.material.opacity = active ? .78 : .08; item.line.geometry.setDrawRange(0, Math.floor(81 * (done || p.reduced ? 1 : smooth(beat?.fraction ?? 0))));
        item.token.visible = !!(active && item.kind !== "data"); if (active) { item.curve.getPoint(p.reduced ? .5 : smooth(beat?.fraction ?? 0), item.token.position); item.token.rotation.y += .025; item.token.material.emissiveIntensity = 1.8; }
      });

      sourceCore.rotation.z = t * .22; (sourceCore.material as THREE.MeshStandardMaterial).emissiveIntensity = sourcePhase ? 1.75 : .5;
      const payloadBeat = sequence.beats.find(beat => beat.id === "payload"); const payloadPath = paths.find(item => item.id === "payload");
      payload.visible = sequence.copyVisible; trailRings.forEach(r => r.visible = !!(payloadBeat?.status === "active" && !p.reduced));
      if (sequence.copyDelivered) payload.position.copy(partyAnchor("consumer", "data")).add(new THREE.Vector3(.25, -.38, .36));
      else if (payloadPath) payloadPath.curve.getPoint(smooth(payloadBeat?.fraction ?? 0), payload.position);
      payloadCore.rotation.x = t * .38; payloadShell.rotation.set(t * .21, -t * .34, t * .18);
      if (payloadPath && payloadBeat?.status === "active") trailRings.forEach((ring, i) => payloadPath.curve.getPoint(smooth(Math.max(0, payloadBeat.fraction - .045 * (i + 1))), ring.position));

      consumerCore.visible = p.chapter === 7; consumerCore.rotation.y = t * .45; (consumerCore.material as THREE.MeshStandardMaterial).emissiveIntensity = sequence.consumerActivated ? 2.2 : .7;
      useLine.visible = p.chapter === 7; useLine.material.opacity = sequence.consumerActivated ? .8 : .16;

      for (const id of nodeIds) {
        const label = labels.current[id]; if (!label) continue;
        if (id === "provider") projected.set(-layout.companyX, 3.55 * layout.companyScale, .05);
        else if (id === "consumer") projected.set(layout.companyX, 3.55 * layout.companyScale, .05);
        else projected.set(...layout.positions[id]);
        projected.project(camera); const halfLabel = label.offsetWidth / 2 + 8;
        label.style.left = `${THREE.MathUtils.clamp((projected.x * .5 + .5) * width, halfLabel, width - halfLabel)}px`;
        label.style.top = `${THREE.MathUtils.clamp((-projected.y * .5 + .5) * height, 0, height - label.offsetHeight)}px`;
      }

      if (!mobile && !p.reduced) composer.render(); else renderer.render(scene, camera);
    }

    syncLayout(); raf = requestAnimationFrame(render);
    const lost = (event: Event) => { event.preventDefault(); setUnavailable(true); cancelAnimationFrame(raf); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true; cancelAnimationFrame(raf); resize.disconnect(); element.removeEventListener("pointermove", onPointerMove); element.removeEventListener("pointerleave", resetPointer);
      renderer.domElement.removeEventListener("webglcontextlost", lost); composer.dispose(); environment.dispose(); textures.forEach(texture => texture.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  if (unavailable) return <SimpleScene {...props}/>;
  const currentFocus = sequenceFrame(props.chapter, props.progress, props.fault).current.focus;
  return <div ref={host} className={styles.canvas} role="group" aria-label="Conceptual Tractus-X dataspace: Company A and Company B with explicit control-plane and data-plane architecture.">
    {nodeIds.map(id => <button key={id} ref={el => { labels.current[id] = el; }} className={styles.nodeLabel} data-active={props.selected === id || currentFocus === id} style={{ "--node-color": journeyNodes[id].color } as React.CSSProperties} onClick={() => props.onSelect(id)} aria-pressed={props.selected === id}><span>{journeyNodes[id].label}</span><small>{journeyNodes[id].role}</small></button>)}
  </div>;
}

/** Readable fallback that preserves the same causal sequence without WebGL. */
export function SimpleScene({ chapter, progress, fault, selected, onSelect }: SceneProps) {
  const sequence = sequenceFrame(chapter, progress, fault); const marker = useId();
  const party = { provider: { x: 85, control: 135, data: 245 }, consumer: { x: 635, control: 135, data: 245 } } as const;
  const endpoint = (id: NodeId, kind: SignalKind) => id === "provider" || id === "consumer" ? [party[id].x, kind === "retrieval" || kind === "data" ? party[id].data : party[id].control] : id === "agreement" ? [360, 135] : id === "catalog" || id === "identity" ? [210, 80] : [510, 80];
  return <div className={styles.simpleScene}>
    <svg viewBox="0 0 720 350" role="img" aria-label={`${chapters[chapter].title}. ${fault ? "Failure snapshot." : sequence.current.title}`}>
      <defs><marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="context-stroke"/></marker></defs>
      <rect x="20" y="30" width="190" height="285" rx="20" fill="#091622" stroke={providerColor} opacity=".9"/><rect x="510" y="30" width="190" height="285" rx="20" fill="#0d1022" stroke={consumerColor} opacity=".9"/>
      <text x="115" y="60" fill={providerColor} textAnchor="middle" fontSize="15">COMPANY A · PROVIDER</text><text x="605" y="60" fill={consumerColor} textAnchor="middle" fontSize="15">COMPANY B · CONSUMER</text>
      {[{ y: 100, a: "BUSINESS APP", b: "BUSINESS APP" }, { y: 135, a: "CONTROL PLANE", b: "CONTROL PLANE" }, { y: 245, a: "DATA PLANE", b: "DATA PLANE" }, { y: 285, a: "PRIVATE SOURCE", b: "LOCAL USE" }].map(row => <g key={row.y}><rect x="42" y={row.y - 18} width="146" height="34" rx="7" fill="#101f2c" stroke="#28594f"/><rect x="532" y={row.y - 18} width="146" height="34" rx="7" fill="#15192e" stroke="#4d487d"/><text x="115" y={row.y + 5} fill="#d8e7ee" textAnchor="middle" fontSize="11">{row.a}</text><text x="605" y={row.y + 5} fill="#e0def5" textAnchor="middle" fontSize="11">{row.b}</text></g>)}
      <line x1="188" y1="135" x2="532" y2="135" stroke={controlColor} opacity=".18"/><line x1="188" y1="245" x2="532" y2="245" stroke={dataColor} opacity=".18"/>
      <text x="360" y="124" fill={controlColor} textAnchor="middle" fontSize="10">CONTROL PLANE · DSP</text><text x="360" y="234" fill={dataColor} textAnchor="middle" fontSize="10">DATA PLANE · AUTHORIZED PAYLOAD</text>
      {sequence.beats.filter(beat => beat.from && beat.to && (beat.status === "active" || beat.status === "done")).map(beat => { const [x1, y1] = endpoint(beat.from!, beat.kind), [x2, y2] = endpoint(beat.to!, beat.kind); return <path key={beat.id} d={`M${x1} ${y1} C${(x1+x2)/2} ${y1-35} ${(x1+x2)/2} ${y2-35} ${x2} ${y2}`} fill="none" stroke={chapter === 5 ? contractColor : beat.kind === "retrieval" || beat.kind === "data" ? dataColor : controlColor} opacity={beat.status === "active" ? 1 : .18} strokeWidth={beat.kind === "data" ? 4 : 2} markerEnd={`url(#${marker})`}/>; })}
      {sequence.agreementReady && <rect x="300" y="152" width="120" height="34" rx="10" fill="#302813" stroke={contractColor}/>} {sequence.agreementReady && <text x="360" y="174" fill={contractColor} textAnchor="middle" fontSize="10">FINALIZED AGREEMENT</text>}
      {sequence.edrReady && <rect x="430" y="188" width="80" height="30" rx="8" fill="#102b2a" stroke={dataColor}/>} {sequence.edrReady && <text x="470" y="207" fill={dataColor} textAnchor="middle" fontSize="10">EDR</text>}
      {sequence.copyVisible && <circle cx={sequence.copyDelivered ? 605 : 360} cy="245" r="9" fill={dataColor}/>}<circle cx="115" cy="285" r="7" fill={dataColor}/>
    </svg>
    <div className={styles.simpleNodes}>{nodeIds.map(id => <button key={id} onClick={() => onSelect(id)} aria-pressed={selected === id}>{journeyNodes[id].label}</button>)}</div>
  </div>;
}
