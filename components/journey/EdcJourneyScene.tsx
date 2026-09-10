"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
import styles from "./journey.module.css";
import SimpleJourneyScene from "./SimpleJourneyScene";
import type { SceneProps } from "./journey-scene-types";

const C = {
  provider: "#59edcf",
  consumer: "#aaa4ff",
  control: "#63bfff",
  data: "#55efc8",
  agreement: "#f5d786",
  usage: "#ffb567",
  tractus: "#79d7ff",
} as const;

type FixedLabel = "provider-system" | "provider-edc" | "consumer-edc" | "consumer-system";
type Artifact = { group: THREE.Group; meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] };
type Connector = {
  group: THREE.Group;
  frame: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  control: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  data: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
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

function TopologyTitle() {
  return (
    <div style={{ position: "absolute", zIndex: 24, top: 5, left: "50%", transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none", whiteSpace: "nowrap" }}>
      <strong style={{ display: "block", fontSize: "clamp(10px,1vw,13px)", color: "#e3f6ff", letterSpacing: ".14em" }}>TRACTUS-X FEDERATED DATASPACE</strong>
      <span style={{ display: "block", marginTop: 3, fontSize: 8, color: "#688399", letterSpacing: ".07em" }}>Company A → Provider EDC ⇄ Consumer EDC → Company B</span>
    </div>
  );
}

function EdcBadge({ labelRef, role, company, active }: { labelRef: (node: HTMLDivElement | null) => void; role: string; company: string; active: boolean }) {
  return (
    <div ref={labelRef} style={{ position: "absolute", zIndex: 22, left: "50%", top: "50%", opacity: 0, transform: "translate(-50%,-100%)", width: "min(190px,23vw)", padding: "8px 10px", borderRadius: 12, border: `1px solid ${C.tractus}${active ? "a0" : "55"}`, background: active ? "rgba(5,15,25,.96)" : "rgba(4,10,18,.84)", boxShadow: active ? `0 0 30px ${C.tractus}22` : "none", textAlign: "center", color: "#edf8ff", pointerEvents: "none" }}>
      <span style={{ display: "block", fontSize: 8, color: C.tractus, fontWeight: 800, letterSpacing: ".13em" }}>TRACTUS-X EDC</span>
      <strong style={{ display: "block", marginTop: 2, fontSize: 12.5 }}>{role}</strong>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 6 }}>
        <span style={{ border: `1px solid ${C.control}55`, borderRadius: 999, padding: "3px 4px", color: C.control, fontSize: 7.2, fontWeight: 720 }}>CONTROL PLANE</span>
        <span style={{ border: `1px solid ${C.data}55`, borderRadius: 999, padding: "3px 4px", color: C.data, fontSize: 7.2, fontWeight: 720 }}>DATA PLANE</span>
      </div>
      <small style={{ display: "block", marginTop: 5, color: "#7f96aa", fontSize: 7.6 }}>Operated by {company}</small>
    </div>
  );
}

function SystemBadge({ labelRef, title, detail, accent, active, pressed, onClick }: { labelRef: (node: HTMLButtonElement | null) => void; title: string; detail: string; accent: string; active: boolean; pressed: boolean; onClick: () => void }) {
  return (
    <button ref={labelRef} type="button" aria-pressed={pressed} onClick={onClick} style={{ position: "absolute", zIndex: 20, left: "50%", top: "50%", opacity: 0, transform: "translate(-50%,-100%)", minWidth: 116, padding: "7px 10px", borderRadius: 10, border: `1px solid ${accent}${active ? "88" : "3d"}`, background: active ? "rgba(5,15,23,.92)" : "rgba(4,9,16,.7)", color: "#edf6ff", display: "grid", gap: 2, textAlign: "center", font: "inherit", cursor: "pointer", boxShadow: active ? `0 0 24px ${accent}18` : "none" }}>
      <strong style={{ fontSize: 11.5 }}>{title}</strong>
      <small style={{ fontSize: 8, color: accent }}>{detail}</small>
    </button>
  );
}

function ArtifactBadge({ item, labelRef, onClick }: { item: DirectedArtifact; labelRef: (node: HTMLDivElement | null) => void; onClick?: () => void }) {
  const accent = toneColor(item.tone);
  const style: CSSProperties = {
    position: "absolute", zIndex: item.emphasis === "hero" ? 21 : 17, left: "50%", top: "50%", opacity: 0,
    width: item.emphasis === "hero" ? "min(210px,26vw)" : "min(170px,22vw)", padding: item.emphasis === "hero" ? "9px 11px" : "7px 9px",
    borderRadius: 11, border: `1px solid ${accent}${item.emphasis === "hero" ? "8e" : "46"}`, background: item.emphasis === "hero" ? "rgba(4,11,20,.95)" : "rgba(4,10,18,.8)",
    boxShadow: item.emphasis === "hero" ? `0 10px 28px #0008,0 0 24px ${accent}15` : "0 8px 18px #0005", color: "#eef7ff", pointerEvents: onClick ? "auto" : "none", cursor: onClick ? "pointer" : "default", backdropFilter: "blur(8px)",
  };
  return <div ref={labelRef} onClick={onClick} style={style}><strong style={{ display: "block", fontSize: item.emphasis === "hero" ? 12.5 : 10.5 }}>{item.title}</strong><small style={{ display: "block", marginTop: 3, color: "#8fa5ba", fontSize: 8.3, lineHeight: 1.35 }}>{item.detail}</small></div>;
}

function Rail({ labels, active, chapter }: { labels: string[]; active: number; chapter: number }) {
  const accent = chapter === 5 ? C.agreement : chapter === 6 ? C.data : C.control;
  return <div style={{ position: "absolute", zIndex: 18, top: 37, left: "50%", transform: "translateX(-50%)", width: "min(500px,50vw)", display: "grid", gridTemplateColumns: `repeat(${labels.length},1fr)`, pointerEvents: "none" }}>{labels.map((label, i) => <div key={label} style={{ position: "relative", display: "grid", justifyItems: "center", gap: 4 }}>{i > 0 && <i style={{ position: "absolute", top: 4, right: "50%", width: "100%", height: 1, background: i <= active ? `${accent}72` : "rgba(100,125,150,.14)" }}/>}<b style={{ position: "relative", zIndex: 1, width: i === active ? 10 : 6, height: i === active ? 10 : 6, borderRadius: 999, border: `1px solid ${i <= active ? accent : "#405166"}`, background: i === active ? accent : i < active ? `${accent}60` : "#07101b", boxShadow: i === active ? `0 0 13px ${accent}88` : "none" }}/><span style={{ fontSize: 7.6, color: i === active ? "#edf7ff" : i < active ? "#849db3" : "#465a6e", fontWeight: i === active ? 700 : 560 }}>{label}</span></div>)}</div>;
}

function PlaneLegend({ chapter, lane }: { chapter: number; lane: "none" | "control" | "data" }) {
  if (chapter < 2) return null;
  return <div style={{ position: "absolute", zIndex: 17, left: "50%", bottom: 10, transform: "translateX(-50%)", display: "flex", gap: 7, pointerEvents: "none" }}><span style={{ border: `1px solid ${C.control}${lane === "control" ? "88" : "30"}`, color: lane === "control" ? C.control : "#516579", borderRadius: 999, background: "rgba(4,10,18,.78)", padding: "4px 7px", fontSize: 7.4, fontWeight: 720 }}>EDC CONTROL · DSP / CATALOG / CONTRACT / EDR</span><span style={{ border: `1px solid ${C.data}${lane === "data" ? "88" : "30"}`, color: lane === "data" ? C.data : "#516579", borderRadius: 999, background: "rgba(4,10,18,.78)", padding: "4px 7px", fontSize: 7.4, fontWeight: 720 }}>EDC DATA · AUTHORIZED FETCH / PAYLOAD</span></div>;
}

export default function EdcJourneyScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  const fixedRefs = useRef<Partial<Record<FixedLabel, HTMLElement | null>>>({});
  const artifactRefs = useRef<Partial<Record<SceneArtifact, HTMLDivElement | null>>>({});
  const [unavailable, setUnavailable] = useState(false);
  const frame = sequenceFrame(props.chapter, props.progress, props.fault);
  const directed = directJourneyScene(props.chapter, frame.current.id, frame.current.kind);
  const route = edcRouteForBeat(props.chapter, frame.current.id, frame.current.kind);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch { setUnavailable(true); return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.05 : 1.35));
    renderer.setClearColor(0x02060b, 0); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute("aria-hidden", "true"); Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", transform: "none" }); element.prepend(renderer.domElement);

    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x02060b, .014);
    const camera = new THREE.PerspectiveCamera(39, 1, .1, 100); const cameraTarget = new THREE.Vector3(); const lookAt = new THREE.Vector3(); const lookTarget = new THREE.Vector3(); const pointer = new THREE.Vector2(); const temp = new THREE.Vector3(); const sample = new THREE.Vector3();
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
    const geo = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
    const mat = <T extends THREE.Material>(m: T) => { materials.add(m); return m; };
    const pbr = (color: THREE.ColorRepresentation, emissive = .3, opacity = 1) => mat(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: .3, metalness: .45, transparent: opacity < 1, opacity, depthWrite: opacity > .3 }));
    const lineMat = (color: THREE.ColorRepresentation, opacity = .18) => mat(new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));

    const pmrem = new THREE.PMREMGenerator(renderer); const room = new RoomEnvironment(); const env = pmrem.fromScene(room, .04); room.dispose(); pmrem.dispose(); scene.environment = env.texture;
    scene.add(new THREE.HemisphereLight(0xbfe4ff, 0x010306, 1)); const key = new THREE.DirectionalLight(0xe3f8ff, 1.4); key.position.set(-4, 7, 8); const rim = new THREE.DirectionalLight(0xb4aaff, 1.05); rim.position.set(6, -1, 5); const activeLight = new THREE.PointLight(0x63bfff, 0, 7, 2); scene.add(key, rim, activeLight);
    const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), .28, .22, 1.18)); composer.addPass(new OutputPass());

    function createWorld(color: string): World {
      const group = new THREE.Group(); const core = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(.34, 2)), pbr(color, .55)); const shell = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(1.05, 2)), mat(new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .08, depthWrite: false }))); group.add(core, shell); scene.add(group); return { group, core, shell };
    }
    function createConnector(sideColor: string): Connector {
      const group = new THREE.Group(); const frame = new THREE.Mesh(geo(new THREE.BoxGeometry(1.18, 2.05, .58)), mat(new THREE.MeshBasicMaterial({ color: C.tractus, wireframe: true, transparent: true, opacity: .2, depthWrite: false }))); const control = new THREE.Mesh(geo(new THREE.BoxGeometry(.84, .54, .62)), pbr(C.control, .55)); control.position.y = .48; const data = new THREE.Mesh(geo(new THREE.BoxGeometry(.84, .54, .62)), pbr(C.data, .32)); data.position.y = -.48; const spine = new THREE.Mesh(geo(new THREE.BoxGeometry(.07, 1.62, .64)), pbr(sideColor, .55)); spine.position.x = -.47; group.add(frame, control, data, spine); scene.add(group); return { group, frame, control, data };
    }
    function gem(shape: THREE.BufferGeometry, color: string): Artifact { const group = new THREE.Group(); const core = new THREE.Mesh(geo(shape), pbr(color, 1.05)); group.add(core); scene.add(group); return { group, meshes: [core] }; }
    function offerArtifact(): Artifact { const group = new THREE.Group(); const meshes: Artifact["meshes"] = []; [-.06,0,.06].forEach((z,i) => { const m = new THREE.Mesh(geo(new THREE.BoxGeometry(.54-i*.04,.33-i*.025,.05)), pbr(C.control, i===0?1:.3, i===0?1:.7)); m.position.set(-i*.035,i*.03,z); group.add(m); meshes.push(m); }); scene.add(group); return { group, meshes }; }
    function agreementArtifact(): Artifact { const group = new THREE.Group(); const a = new THREE.Mesh(geo(new THREE.TorusGeometry(.29,.05,9,60)), pbr(C.agreement,1.2)); a.rotation.x=Math.PI/2; const b = new THREE.Mesh(geo(new THREE.TorusGeometry(.29,.05,9,60)), pbr(C.agreement,1.2)); b.rotation.set(Math.PI/2,Math.PI/2,0); const core = new THREE.Mesh(geo(new THREE.OctahedronGeometry(.15,1)), pbr(C.agreement,1.5)); group.add(a,b,core); scene.add(group); return { group, meshes:[a,b,core] }; }
    function edrArtifact(): Artifact { const group = new THREE.Group(); const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(.17,.04,8,36)), pbr(C.control,1.3)); const bar = new THREE.Mesh(geo(new THREE.BoxGeometry(.34,.06,.06)), pbr(C.control,1.3)); bar.position.x=.27; const tooth = new THREE.Mesh(geo(new THREE.BoxGeometry(.07,.11,.06)), pbr(C.control,1.3)); tooth.position.set(.41,-.06,0); group.add(ring,bar,tooth); scene.add(group); return { group, meshes:[ring,bar,tooth] }; }

    const providerSystem=createWorld(C.provider), consumerSystem=createWorld(C.consumer), providerEdc=createConnector(C.provider), consumerEdc=createConnector(C.consumer);
    const artifacts: Record<SceneArtifact, Artifact> = { source:gem(new THREE.OctahedronGeometry(.2,1),C.provider), offer:offerArtifact(), dsp:gem(new THREE.TorusGeometry(.21,.04,8,36),C.control), trust:gem(new THREE.OctahedronGeometry(.21,1),C.control), usage:gem(new THREE.TetrahedronGeometry(.24,1),C.usage), agreement:agreementArtifact(), edr:edrArtifact(), payload:gem(new THREE.CapsuleGeometry(.15,.28,5,10),C.data), copy:gem(new THREE.CapsuleGeometry(.15,.28,5,10),C.data) };

    const positions: Record<EdcPoint, THREE.Vector3> = { "provider-system":new THREE.Vector3(), "provider-source":new THREE.Vector3(), "provider-control":new THREE.Vector3(), "provider-data":new THREE.Vector3(), "consumer-control":new THREE.Vector3(), "consumer-data":new THREE.Vector3(), "consumer-system":new THREE.Vector3() };
    const homes: Record<SceneArtifact, THREE.Vector3> = { source:new THREE.Vector3(), offer:new THREE.Vector3(), dsp:new THREE.Vector3(), trust:new THREE.Vector3(), usage:new THREE.Vector3(), agreement:new THREE.Vector3(), edr:new THREE.Vector3(), payload:new THREE.Vector3(), copy:new THREE.Vector3() };
    const controlGeo=geo(new THREE.BufferGeometry()); controlGeo.setAttribute("position",new THREE.Float32BufferAttribute(new Array(6).fill(0),3)); const dataGeo=geo(new THREE.BufferGeometry()); dataGeo.setAttribute("position",new THREE.Float32BufferAttribute(new Array(6).fill(0),3)); const localAGeo=geo(new THREE.BufferGeometry()); localAGeo.setAttribute("position",new THREE.Float32BufferAttribute(new Array(6).fill(0),3)); const localBGeo=geo(new THREE.BufferGeometry()); localBGeo.setAttribute("position",new THREE.Float32BufferAttribute(new Array(6).fill(0),3));
    const controlLane=new THREE.Line(controlGeo,lineMat(C.control,.16)), dataLane=new THREE.Line(dataGeo,lineMat(C.data,.08)), localA=new THREE.Line(localAGeo,lineMat(C.provider,.1)), localB=new THREE.Line(localBGeo,lineMat(C.consumer,.1)); scene.add(controlLane,dataLane,localA,localB);
    const routeGeo=geo(new THREE.BufferGeometry()); routeGeo.setAttribute("position",new THREE.Float32BufferAttribute(new Array(96*3).fill(0),3)); const routeLine=new THREE.Line(routeGeo,lineMat(C.control,.58)); routeLine.frustumCulled=false; scene.add(routeLine); const token=new THREE.Mesh(geo(new THREE.OctahedronGeometry(.11,1)),pbr(C.control,1.45)); scene.add(token);

    let width=1,height=1,span=5,baseDistance=12; const routePoints:THREE.Vector3[]=[]; const routeCurve=new THREE.CatmullRomCurve3([],false,"centripetal");
    function setLine(g:THREE.BufferGeometry,a:THREE.Vector3,b:THREE.Vector3){const attr=g.getAttribute("position") as THREE.BufferAttribute;attr.setXYZ(0,a.x,a.y,a.z);attr.setXYZ(1,b.x,b.y,b.z);attr.needsUpdate=true;}
    function syncLayout(){const aspect=Math.max(.65,camera.aspect||1);span=Math.min(5.6,Math.max(4.3,aspect*2.65));const ex=span*.48;positions["provider-system"].set(-span,0,.05);positions["consumer-system"].set(span,0,.05);positions["provider-control"].set(-ex,.48,.28);positions["provider-data"].set(-ex,-.48,.28);positions["consumer-control"].set(ex,.48,.28);positions["consumer-data"].set(ex,-.48,.28);positions["provider-source"].copy(positions["provider-system"]).add(new THREE.Vector3(.18,-.95,.5));providerSystem.group.position.copy(positions["provider-system"]);consumerSystem.group.position.copy(positions["consumer-system"]);providerEdc.group.position.set(-ex,0,.16);consumerEdc.group.position.set(ex,0,.16);const compact=aspect<1;providerSystem.group.scale.setScalar(compact?.72:.88);consumerSystem.group.scale.setScalar(compact?.72:.88);providerEdc.group.scale.setScalar(compact?.78:1);consumerEdc.group.scale.setScalar(compact?.78:1);homes.source.copy(positions["provider-source"]);homes.offer.copy(positions["provider-control"]).add(new THREE.Vector3(.66,.4,.52));homes.dsp.set(0,.48,.7);homes.trust.copy(positions["provider-control"]).add(new THREE.Vector3(.55,0,.56));homes.usage.copy(positions["consumer-control"]).add(new THREE.Vector3(-.55,.08,.56));homes.agreement.set(0,.48,.7);homes.edr.copy(positions["consumer-control"]).add(new THREE.Vector3(-.52,.18,.58));homes.payload.copy(positions["consumer-data"]).add(new THREE.Vector3(.58,-.2,.54));homes.copy.copy(positions["consumer-system"]).add(new THREE.Vector3(-.08,-.82,.5));(Object.keys(artifacts) as SceneArtifact[]).forEach(id=>artifacts[id].group.position.copy(homes[id]));setLine(controlGeo,positions["provider-control"],positions["consumer-control"]);setLine(dataGeo,positions["provider-data"],positions["consumer-data"]);setLine(localAGeo,positions["provider-system"],providerEdc.group.position);setLine(localBGeo,consumerEdc.group.position,positions["consumer-system"]);const halfW=span+1.25,halfH=2.9,fov=39*Math.PI/180;baseDistance=Math.max(halfH/Math.tan(fov/2),halfW/(Math.tan(fov/2)*aspect))+1.1;camera.position.set(0,.04,baseDistance);cameraTarget.copy(camera.position);lookAt.set(0,0,0);lookTarget.set(0,0,0);}
    function cameraCue(chapter:number,cue:string){if(chapter===0){cameraTarget.set(-span*.28,0,baseDistance*.84);lookTarget.copy(positions["provider-system"]).multiplyScalar(.62);return;}if(cue==="provider"){cameraTarget.set(-span*.16,.04,baseDistance*.88);lookTarget.lerpVectors(positions["provider-system"],providerEdc.group.position,.7);}else if(cue==="consumer"){cameraTarget.set(span*.16,.04,baseDistance*.88);lookTarget.lerpVectors(consumerEdc.group.position,positions["consumer-system"],.35);}else if(cue==="data"){cameraTarget.set(0,-.1,baseDistance*.9);lookTarget.set(0,-.48,.18);}else if(cue==="center"){cameraTarget.set(0,.03,baseDistance*.86);lookTarget.set(0,.45,.25);}else if(cue==="control"){cameraTarget.set(0,.09,baseDistance*.9);lookTarget.set(0,.48,.18);}else{cameraTarget.set(0,.04,baseDistance);lookTarget.set(0,0,0);}}
    function artifactHome(id:SceneArtifact,chapter:number,currentId:string){if(id==="offer"){if(chapter===1)return homes.offer;const consumerOffer=positions["consumer-control"].clone().add(new THREE.Vector3(-.66,.4,.52));if(chapter===3&&currentId==="catalog-response")return homes.offer;return consumerOffer;}if(id==="usage"&&chapter===5)return positions["provider-control"].clone().add(new THREE.Vector3(.52,.02,.56));return homes[id];}
    function buildRoute(r:EdcRoute){routePoints.length=0;r.points.forEach(id=>routePoints.push(positions[id].clone()));const attr=routeGeo.getAttribute("position") as THREE.BufferAttribute;if(routePoints.length<2){routeLine.visible=false;return;}routeCurve.points=routePoints;for(let i=0;i<96;i++){const u=i/95;if(routePoints.length>2)routeCurve.getPoint(u,sample);else{sample.lerpVectors(routePoints[0],routePoints[1],u);sample.z+=Math.sin(Math.PI*u)*(r.mode==="control"?.32:r.mode==="data"?.18:.1);}attr.setXYZ(i,sample.x,sample.y,sample.z);}attr.needsUpdate=true;routeLine.visible=true;}
    function pointOnRoute(r:EdcRoute,u:number,out:THREE.Vector3){if(routePoints.length<2)return out.set(0,0,0);if(routePoints.length>2)return routeCurve.getPoint(u,out);out.lerpVectors(routePoints[0],routePoints[1],u);out.z+=Math.sin(Math.PI*u)*(r.mode==="control"?.32:r.mode==="data"?.18:.1);return out;}
    function place(id:FixedLabel,world:THREE.Vector3,offset:number){const el=fixedRefs.current[id];if(!el)return;temp.copy(world).add(new THREE.Vector3(0,offset,0)).project(camera);el.style.left=`${(temp.x*.5+.5)*width}px`;el.style.top=`${(-temp.y*.5+.5)*height}px`;el.style.opacity=temp.z>1?"0":"1";}
    function placeArtifact(id:SceneArtifact){const el=artifactRefs.current[id];if(!el)return;temp.copy(artifacts[id].group.position).project(camera);const x=(temp.x*.5+.5)*width,y=(-temp.y*.5+.5)*height;el.style.left=`${x}px`;el.style.top=`${y}px`;el.style.transform=id==="agreement"||id==="dsp"?"translate(-50%,28px)":x<width*.5?"translate(15px,-50%)":"translate(calc(-100% - 15px),-50%)";el.style.opacity=temp.z>1?"0":"1";}

    const resize=new ResizeObserver(()=>{width=Math.max(1,element.clientWidth);height=Math.max(1,element.clientHeight);renderer.setSize(width,height);composer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();syncLayout();});resize.observe(element);
    const move=(e:PointerEvent)=>{const r=element.getBoundingClientRect();if(!r.width||!r.height)return;pointer.set(((e.clientX-r.left)/r.width)*2-1,-(((e.clientY-r.top)/r.height)*2-1));};const leave=()=>pointer.set(0,0);element.addEventListener("pointermove",move,{passive:true});element.addEventListener("pointerleave",leave);
    let raf=0,last=0,disposed=false;
    function render(now:number){if(disposed)return;raf=requestAnimationFrame(render);if(document.hidden)return;const p=live.current,mobile=width<720,minGap=p.paused||p.reduced?100:mobile?1000/30:1000/45;if(now-last<minGap)return;last=now;const seq=sequenceFrame(p.chapter,p.progress,p.fault),current=seq.current,d=directJourneyScene(p.chapter,current.id,current.kind),r=edcRouteForBeat(p.chapter,current.id,current.kind),t=p.reduced?0:seq.position*chapters[p.chapter].duration,parallax=mobile||p.reduced?0:1;cameraCue(p.chapter,d.camera);cameraTarget.x+=pointer.x*.05*parallax;cameraTarget.y+=pointer.y*.03*parallax;lookTarget.x+=pointer.x*.02*parallax;lookTarget.y+=pointer.y*.015*parallax;if(!p.paused){camera.position.lerp(cameraTarget,p.reduced?1:.04);lookAt.lerp(lookTarget,p.reduced?1:.045);}camera.lookAt(lookAt);
      const providerBusiness=p.chapter<=1||current.id==="read-source"||current.id==="payload",consumerBusiness=p.chapter===4||p.chapter===7||current.id==="payload";providerSystem.core.material.emissiveIntensity=providerBusiness?.9:.2;providerSystem.shell.material.opacity=providerBusiness?.1:.035;consumerSystem.core.material.emissiveIntensity=consumerBusiness?.9:.2;consumerSystem.shell.material.opacity=consumerBusiness?.1:.035;providerSystem.group.rotation.y=Math.sin(t*.06)*.04;consumerSystem.group.rotation.y=Math.sin(t*.06+1)*.04;
      const dataActive=d.lane==="data"||r.mode==="data"||r.mode==="payload";for(const connector of [providerEdc,consumerEdc]){connector.frame.material.opacity=.2;connector.control.material.emissiveIntensity=dataActive?.28:.9;connector.data.material.emissiveIntensity=dataActive?1.05:.25;connector.group.rotation.y=Math.sin(t*.04)*.02;}
      const visible=new Set(d.artifacts.map(a=>a.id));(Object.keys(artifacts) as SceneArtifact[]).forEach(id=>{artifacts[id].group.visible=visible.has(id)||(id==="agreement"&&p.chapter===6);artifacts[id].group.position.copy(artifactHome(id,p.chapter,current.id));});if(p.chapter===3&&current.id==="catalog-response"&&visible.has("offer")){const from=positions["provider-control"].clone().add(new THREE.Vector3(.5,.3,.5)),to=positions["consumer-control"].clone().add(new THREE.Vector3(-.5,.3,.5));artifacts.offer.group.position.lerpVectors(from,to,ease(current.fraction));}if(p.chapter===6&&current.id==="transfer-start"&&visible.has("edr")){artifacts.edr.group.position.lerpVectors(positions["provider-control"],positions["consumer-control"],ease(current.fraction));artifacts.edr.group.position.z+=Math.sin(Math.PI*ease(current.fraction))*.32;}
      buildRoute(r);routeLine.material.color.set(r.mode==="data"||r.mode==="payload"?C.data:r.mode==="local"?(p.chapter===4?C.consumer:C.provider):C.control);routeLine.material.opacity=r.mode==="payload"?.72:.5;token.visible=r.mode!=="none"&&r.mode!=="payload"&&current.status==="active";if(token.visible){pointOnRoute(r,ease(current.fraction),token.position);token.material.color.set(r.mode==="data"?C.data:C.control);token.material.emissive.copy(token.material.color);token.material.emissiveIntensity=1.5;token.rotation.set(t*.2,t*.36,.1);}if(r.mode==="payload"&&visible.has("payload"))pointOnRoute(r,ease(current.fraction),artifacts.payload.group.position);
      controlLane.visible=p.chapter>=2&&p.chapter<=6;dataLane.visible=p.chapter===6;controlLane.material.opacity=dataActive?.06:.28;dataLane.material.opacity=dataActive?.38:.05;localA.material.opacity=providerBusiness?.24:.07;localB.material.opacity=consumerBusiness?.24:.07;artifacts.offer.group.rotation.y=t*.08;artifacts.trust.group.rotation.y=t*.22;artifacts.usage.group.rotation.y=t*.18;artifacts.agreement.group.rotation.y=t*.14;artifacts.edr.group.rotation.y=t*.2;artifacts.payload.group.rotation.y=t*.34;artifacts.copy.group.rotation.y=t*.16;const hero=d.artifacts.find(a=>a.emphasis==="hero");if(hero){activeLight.position.copy(artifacts[hero.id].group.position).add(new THREE.Vector3(0,.4,1.8));activeLight.color.set(toneColor(hero.tone));activeLight.intensity=1.7;}else activeLight.intensity=.45;
      place("provider-system",positions["provider-system"],1.45);place("provider-edc",providerEdc.group.position,1.48);place("consumer-edc",consumerEdc.group.position,1.48);place("consumer-system",positions["consumer-system"],1.45);d.artifacts.forEach(a=>placeArtifact(a.id));if(!mobile&&!p.reduced)composer.render();else renderer.render(scene,camera);
    }
    syncLayout();raf=requestAnimationFrame(render);const lost=(event:Event)=>{event.preventDefault();setUnavailable(true);cancelAnimationFrame(raf);};renderer.domElement.addEventListener("webglcontextlost",lost);return()=>{disposed=true;cancelAnimationFrame(raf);resize.disconnect();element.removeEventListener("pointermove",move);element.removeEventListener("pointerleave",leave);renderer.domElement.removeEventListener("webglcontextlost",lost);composer.dispose();env.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  },[]);

  if(unavailable)return <SimpleJourneyScene {...props}/>;
  const providerSystemActive=props.chapter<=1||frame.current.id==="read-source"||frame.current.id==="payload";
  const consumerSystemActive=props.chapter===4||props.chapter===7||frame.current.id==="payload";
  return <div ref={host} className={styles.canvas} role="group" aria-label={`Tractus-X EDC mediated journey. ${chapters[props.chapter].title}. ${frame.current.title}.`}>
    <TopologyTitle/>
    {directed.rail&&<Rail labels={directed.rail.labels} active={directed.rail.active} chapter={props.chapter}/>} 
    <SystemBadge labelRef={node=>{fixedRefs.current["provider-system"]=node;}} title="Company A" detail="Business systems · private source" accent={C.provider} active={providerSystemActive} pressed={props.selected==="provider"} onClick={()=>props.onSelect("provider")}/>
    <EdcBadge labelRef={node=>{fixedRefs.current["provider-edc"]=node;}} role="Provider Connector" company="Company A" active={props.chapter>=1&&props.chapter<=6}/>
    <EdcBadge labelRef={node=>{fixedRefs.current["consumer-edc"]=node;}} role="Consumer Connector" company="Company B" active={props.chapter>=2&&props.chapter<=6}/>
    <SystemBadge labelRef={node=>{fixedRefs.current["consumer-system"]=node;}} title="Company B" detail="Business systems · data consumer" accent={C.consumer} active={consumerSystemActive} pressed={props.selected==="consumer"} onClick={()=>props.onSelect("consumer")}/>
    <span aria-hidden="true" style={{display:"none"}}/>
    {directed.artifacts.map(item=>{const owner=directorArtifactOwners[item.id];return <ArtifactBadge key={item.id} item={item} labelRef={node=>{artifactRefs.current[item.id]=node;}} onClick={owner?()=>props.onSelect(owner):undefined}/>;})}
    <PlaneLegend chapter={props.chapter} lane={directed.lane}/>
    <div style={{position:"absolute",zIndex:18,right:12,bottom:42,padding:"5px 8px",borderRadius:999,border:`1px solid ${(route.mode==="payload"?C.data:"#60758a")}45`,background:"rgba(4,10,18,.8)",color:route.mode==="payload"?C.data:"#72889e",fontSize:7.6,fontWeight:760,letterSpacing:".09em",pointerEvents:"none"}}>{frame.copyDelivered||props.chapter===7?"COPY DELIVERED":route.mode==="payload"?"PAYLOAD MOVING THROUGH EDC DATA PLANES":"PAYLOAD NOT MOVED"}</div>
  </div>;
}
