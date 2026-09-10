"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, CircleHelp, Expand, GitBranch, Pause, Play, RotateCcw, ScanLine, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { LearnerNav } from "@/components/LearnerNav";
import { chapters, faults, initialJourney, journeyNodes, journeyReducer, type Depth, type Fault, type NodeId } from "@/lib/data-journey";
import { journeyMoments } from "@/lib/journey-visuals";
import { advanceJourneyProgress, sequenceFrame, signalStyles } from "@/lib/journey-sequence";
import styles from "./journey.module.css";

const NeuralScene = dynamic(() => import("./NeuralScene"), { ssr: false, loading: () => <div className={styles.sceneLoading} role="status"><ScanLine size={30}/><span>Opening the dataspace architecture…</span></div> });
const SimpleScene = dynamic(() => import("./NeuralScene").then(module => module.SimpleScene), { ssr: false });
const questionCount = chapters.filter(chapter => chapter.question).length;

export function DataJourney() {
  const [state, dispatch] = useReducer(journeyReducer, initialJourney);
  const [depth, setDepth] = useState<Depth>("story");
  const [guided, setGuided] = useState(true);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reduced, setReduced] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const [simple, setSimple] = useState(false);
  const [cinema, setCinema] = useState(false);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const sequenceKey = `${state.chapter}:${state.replay}`;
  const [clock, setClock] = useState({ key: sequenceKey, progress: 0 });
  const progress = clock.key === sequenceKey ? clock.progress : 0;
  const sequence = sequenceFrame(state.chapter, progress, state.fault);
  const signal = state.chapter === 5 && sequence.current.kind === "control" ? { label: "Control plane · contract", color: "#f5d786" } : signalStyles[sequence.current.kind];
  const chapter = chapters[state.chapter];
  const moment = journeyMoments[state.chapter];
  const answered = state.answered.includes(state.chapter);
  const needsAnswer = guided && !!chapter.question && !answered;
  const motionReduced = reduced || systemReduced;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches); update();
    media.addEventListener("change", update); return () => media.removeEventListener("change", update);
  }, []);

  const liveProgress = useRef({ key: sequenceKey, progress: 0 });
  useEffect(() => {
    if (liveProgress.current.key !== sequenceKey) liveProgress.current = { key: sequenceKey, progress: 0 };
    let last = performance.now();
    let timer = 0, advanced = false;
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      if (delta < 1 / 45) { timer = requestAnimationFrame(tick); return; }
      last = now;
      const previous = liveProgress.current.progress;
      const next = advanceJourneyProgress(previous, delta, chapter.duration, speed, document.hidden || paused || state.complete || !!state.fault);
      liveProgress.current = { key: sequenceKey, progress: next };
      if (next !== previous) setClock(liveProgress.current);
      if (!guided && next === 1 && !advanced && !state.fault && !state.complete && !paused) {
        advanced = true;
        dispatch({ type: "next", guided: false });
      }
      timer = requestAnimationFrame(tick);
    };
    const visibility = () => { last = performance.now(); };
    document.addEventListener("visibilitychange", visibility);
    timer = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [sequenceKey, chapter.duration, paused, speed, state.complete, state.fault, guided]);

  useEffect(() => {
    if (!cinema) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setCinema(false); };
    window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape);
  }, [cinema]);

  function navigate(index: number) { setSelected(null); dispatch({ type: "go", chapter: index }); }
  function restart() { dispatch({ type: "reset" }); setPaused(false); setSelected(null); }
  const sceneProps = { chapter: state.chapter, progress, fault: state.fault, paused: paused || state.complete, reduced: motionReduced, selected, onSelect: (id: NodeId) => setSelected(current => current === id ? null : id) };
  const Scene = simple ? SimpleScene : NeuralScene;
  const sequenceNote = state.chapter === 3 ? "Credential verification and access-policy filtering happen inside the catalogue interaction itself."
    : state.chapter === 4 ? "Company B is choosing an offer here; provider-side usage-policy enforcement happens during contract negotiation."
    : state.chapter === 5 ? "Access policy already controlled catalogue visibility. Usage/contract policy is evaluated here during negotiation."
    : null;

  return <main className={styles.page} lang="en">
    {!cinema && <LearnerNav active="journey" eyebrow="Experience the exchange"/>}
    <div className={`${styles.workspace} ${cinema ? styles.cinema : ""}`}>
      <header className={styles.heading}>
        <div className={styles.titleRow}><div className={styles.logo}><GitBranch size={22}/></div><div><p className={styles.eyebrow}>TRACTUSLAB / INTERACTIVE EXPERIENCE</p><h1>Data Journey<span>.</span></h1></div></div>
        <div className={styles.topControls}>
          <div className={styles.segment} role="group" aria-label="Learning mode">
            <button aria-pressed={guided} onClick={() => setGuided(true)}><Zap size={14}/> Explore</button>
            <button aria-pressed={!guided} onClick={() => { setGuided(false); setPaused(false); }}><Play size={14}/> Watch</button>
          </div>
          <button className={styles.iconButton} onClick={() => setCinema(!cinema)} aria-label={cinema ? "Exit immersive view" : "Enter immersive view"} title={cinema ? "Exit immersive view (Escape)" : "Immersive view"}>{cinema ? <X size={19}/> : <Expand size={19}/>}</button>
        </div>
      </header>

      <div className={styles.experience}>
        <section className={styles.stage} aria-label="Tractus-X data exchange visualization" data-reduced={motionReduced} style={{ "--phase-color": state.fault ? "#ff8ea3" : journeyNodes[chapter.focus].color } as React.CSSProperties}>
          <div className={styles.stageTop}><span className={styles.stageTag}><span className={styles.liveDot}/> {state.fault ? "EXCHANGE BLOCKED" : "FEDERATED DATASPACE"}</span><span className={styles.simulationBadge}>Conceptual Tractus-X flow</span></div>
          <Scene {...sceneProps}/>
          <div className={styles.signalReadout} style={{ "--signal-color": state.fault ? "#ff8ea3" : signal.color } as React.CSSProperties}>
            <span className={styles.signalNumber}>{String(sequence.beats.indexOf(sequence.current) + 1).padStart(2, "0")}</span>
            <div aria-live="polite" aria-atomic="true"><span>{state.fault ? "FAILURE SNAPSHOT" : sequence.finished ? moment.result : signal.label}</span><strong>{state.fault ? faults[state.fault].title : sequence.current.title}</strong><small>{sequence.current.from && sequence.current.to ? `${journeyNodes[sequence.current.from].label} → ${journeyNodes[sequence.current.to].label}` : `At ${journeyNodes[sequence.current.focus].label}`}</small></div>
            {sequence.finished && <Check size={21} className={styles.signalCheck}/>}
          </div>
          <div className={styles.sceneCaption} aria-live="polite" key={state.chapter}><span>{String(state.chapter + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")} · {chapter.signal}</span><h2>{state.fault ? faults[state.fault].title : moment.title}</h2><small>{state.fault ? "Repair the exchange to continue" : moment.detail}</small></div>
          <div className={styles.legend}><span><i style={{ background: "#d0b3ff" }}/>Local</span><span><i style={{ background: "#80caff" }}/>DSP / control</span><span><i style={{ background: "#f5d786" }}/>Agreement</span><span><i style={{ background: "#59edcf" }}/>Payload / data</span></div>
          {state.complete && <div className={styles.completion} role="status"><div className={styles.completeSeal}><ShieldCheck size={38}/></div><p className={styles.eyebrow}>CONNECTION COMPLETE</p><h2>Understanding,<br/>transferred.</h2><p>You followed a record from its private source through governed access to business use.</p><p>{state.answered.length}/{questionCount} understanding checks passed · {state.attempts} attempts</p><div className={styles.completeActions}><button onClick={restart}><RotateCcw size={16}/> Replay journey</button><Link href="/scenarios">Explore more scenarios <ArrowRight size={16}/></Link></div></div>}
        </section>

        <aside className={styles.guide} aria-label="Journey guide">
          <div className={styles.guideHeading}><span className={styles.eyebrow}>THE EXCHANGE, EXPLAINED</span><span className={styles.chapterCount}>{state.chapter + 1} / {chapters.length}</span></div>
          <div className={styles.depths} role="group" aria-label="Explanation depth">{(["story", "architect", "developer"] as Depth[]).map(value => <button key={value} aria-pressed={depth === value} onClick={() => setDepth(value)}>{value === "story" ? "Story" : value === "architect" ? "Architect" : "Developer"}</button>)}</div>
          {selected && <section className={styles.inspector}><div><span className={styles.eyebrow}>COMPONENT INSPECTOR</span><button onClick={() => setSelected(null)} aria-label="Close component inspector"><X size={16}/></button></div><h3>{journeyNodes[selected].label}</h3><p>{journeyNodes[selected].description}</p></section>}
          <div className={styles.chapterCopy} key={`${chapter.id}-${depth}`}><h2>{chapter.title}</h2><p>{chapter[depth]}</p></div>
          <section className={styles.sequencePanel} aria-label="Ordered actions in this chapter">
            <div className={styles.sequenceHeading}><span>FOLLOW THE ORDER</span><span>{sequence.beats.filter(beat => beat.status === "done").length}/{sequence.beats.length}</span></div>
            <ol>{sequence.beats.map((beat, index) => <li key={beat.id} data-status={beat.status} aria-current={beat === sequence.current ? "step" : undefined}>
              <span className={styles.beatNumber}>{beat.status === "done" ? <Check size={12}/> : beat.status === "blocked" ? <X size={12}/> : String(index + 1).padStart(2, "0")}</span><span>{beat.title}</span>
            </li>)}</ol>
            <p className={styles.beatDetail} aria-live="polite">{state.fault ? "Snapshot at the failed check. Later actions have not happened. Repair to replay the sequence." : sequence.current.detail}</p>
            {sequenceNote && <p className={styles.sequenceNote}>{sequenceNote}</p>}
          </section>
          <div className={styles.takeaway}><Sparkles size={17}/><p>{chapter.takeaway}</p></div>
          {depth === "developer" && <details className={styles.message}><summary>Inspect example message</summary><p>Illustrative fields only. Not a live API response or a complete DSP payload.</p><pre>{JSON.stringify(chapter.message, null, 2)}</pre></details>}
          {state.fault ? <section className={styles.fault} role="alert"><h3>{faults[state.fault].title}</h3><p>{faults[state.fault].reason}</p><button onClick={() => dispatch({ type: "repair" })}><RotateCcw size={16}/>{faults[state.fault].repair}</button></section> : guided && chapter.question ? <section className={styles.challenge}>
            <p className={styles.eyebrow}>{answered ? "UNDERSTANDING CHECKED" : "YOUR TURN"}</p><h3>{chapter.question.prompt}</h3>
            <div className={styles.choices}>{chapter.question.choices.map((choice, i) => <button key={choice} disabled={answered} data-result={state.choice === i ? answered ? "correct" : "incorrect" : undefined} onClick={() => dispatch({ type: "answer", choice: i })}><span>{answered && chapter.question?.answer === i ? <Check size={14}/> : String.fromCharCode(65 + i)}</span>{choice}</button>)}</div>
            {state.choice !== null && <p className={styles.feedback} role="status">{answered ? chapter.question.explanation : "Not quite. " + chapter.question.explanation + " Try again."}</p>}
          </section> : <div className={styles.watchHint}><CircleHelp size={17}/><p>{guided ? "Watch the signal, then continue when you’re ready." : "Watch mode moves automatically. Switch to Explore to make the decisions yourself."}</p></div>}
          <div className={styles.guideFooter}><button className={styles.next} disabled={!sequence.finished || needsAnswer || !!state.fault || state.complete} onClick={() => { setSelected(null); dispatch({ type: "next", guided }); }}>{!sequence.finished ? state.fault ? "Repair to continue" : "Follow the sequence…" : needsAnswer ? "Choose an answer to continue" : chapter.verb}<ArrowRight size={18}/></button><span>{state.answered.length}/{questionCount} checks · this session</span></div>
        </aside>
      </div>

      <section className={styles.transport} aria-label="Playback controls">
        <div className={styles.playback}><button className={styles.playButton} onClick={() => setPaused(!paused)} aria-label={paused ? "Play animation" : "Pause animation"}>{paused ? <Play size={18}/> : <Pause size={18}/>}</button><button className={styles.iconButton} disabled={state.chapter === 0} onClick={() => navigate(state.chapter - 1)} aria-label="Previous chapter"><ChevronLeft size={19}/></button><button className={styles.iconButton} onClick={() => dispatch({ type: "replay" })} aria-label="Replay this chapter" title="Replay this chapter"><RotateCcw size={17}/></button><label className={styles.speed}>Speed<select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option></select></label></div>
        <div className={styles.playProgress}><div className={styles.progressTrack} role="progressbar" aria-label="Chapter animation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(sequence.position * 100)}><span style={{ width: `${sequence.position * 100}%` }}/></div><span>{state.fault ? "Blocked · failure snapshot" : paused ? "Paused" : state.complete ? "Complete" : sequence.finished ? "Ready to continue" : "Following the signal"}</span></div>
        <div className={styles.renderControls}><label><input type="checkbox" checked={simple} onChange={event => setSimple(event.target.checked)}/> Schematic</label><label><input type="checkbox" checked={motionReduced} disabled={systemReduced} onChange={event => setReduced(event.target.checked)}/> Reduced motion</label></div>
      </section>

      <nav className={styles.timeline} aria-label="Journey chapters">{chapters.map((item, index) => <button key={item.id} aria-current={state.chapter === index ? "step" : undefined} onClick={() => navigate(index)}><span className={styles.timelineNumber}>{state.answered.includes(index) ? <Check size={15}/> : String(index + 1).padStart(2, "0")}</span><span>{item.label}</span><i/></button>)}</nav>

      <footer className={styles.bottomBar}><details className={styles.faultMenu}><summary><GitBranch size={16}/> What if something goes wrong?</summary><div>{(Object.keys(faults) as Fault[]).map(id => <button key={id} onClick={() => { dispatch({ type: "fault", fault: id }); setSelected(null); }}>{faults[id].title}<ArrowRight size={14}/></button>)}</div></details><p>Fictional companies & data · Tractus-X / DSP teaching model · No real transfer</p></footer>
    </div>
  </main>;
}
