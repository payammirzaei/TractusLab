"use client";

import { useId } from "react";
import { chapters } from "@/lib/data-journey";
import { edcRouteForBeat, type EdcPoint } from "@/lib/journey-edc-topology";
import { sequenceFrame } from "@/lib/journey-sequence";
import styles from "./journey.module.css";
import type { SceneProps } from "./journey-scene-types";

const points: Record<EdcPoint, [number, number]> = {
  "provider-system": [85, 180],
  "provider-source": [85, 245],
  "provider-control": [250, 145],
  "provider-data": [250, 220],
  "consumer-control": [470, 145],
  "consumer-data": [470, 220],
  "consumer-system": [635, 180],
};

export default function SimpleJourneyScene(props: SceneProps) {
  const frame = sequenceFrame(props.chapter, props.progress, props.fault);
  const route = edcRouteForBeat(props.chapter, frame.current.id, frame.current.kind);
  const marker = useId();
  const path = route.points.map((id, i) => `${i ? "L" : "M"}${points[id][0]} ${points[id][1]}`).join(" ");

  return (
    <div className={styles.simpleScene}>
      <svg viewBox="0 0 720 360" role="img" aria-label={`Tractus-X EDC journey. ${chapters[props.chapter].title}. ${frame.current.title}.`}>
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" />
          </marker>
        </defs>
        <text x="360" y="24" textAnchor="middle" fill="#dff4ff" fontSize="12" fontWeight="700">TRACTUS-X FEDERATED DATASPACE</text>
        <text x="360" y="40" textAnchor="middle" fill="#7890a7" fontSize="8">Company systems connect through their own EDC connectors</text>

        <circle cx="85" cy="180" r="52" fill="#07131f" stroke="#59edcf" />
        <text x="85" y="170" textAnchor="middle" fill="#eaf6ff" fontSize="12">Company A</text>
        <text x="85" y="187" textAnchor="middle" fill="#59edcf" fontSize="8">Business systems</text>

        <circle cx="635" cy="180" r="52" fill="#0a0d1a" stroke="#aaa4ff" />
        <text x="635" y="170" textAnchor="middle" fill="#eaf6ff" fontSize="12">Company B</text>
        <text x="635" y="187" textAnchor="middle" fill="#aaa4ff" fontSize="8">Business systems</text>

        {[{x:250,label:"Provider EDC",side:"A"},{x:470,label:"Consumer EDC",side:"B"}].map(item => (
          <g key={item.label}>
            <rect x={item.x-58} y="100" width="116" height="150" rx="14" fill="#07111e" stroke="#79d7ff" strokeWidth="1.5" />
            <text x={item.x} y="120" textAnchor="middle" fill="#79d7ff" fontSize="9" fontWeight="700">TRACTUS-X EDC</text>
            <text x={item.x} y="134" textAnchor="middle" fill="#eaf6ff" fontSize="10">{item.label}</text>
            <rect x={item.x-43} y="144" width="86" height="35" rx="7" fill="#0b2030" stroke="#63bfff" />
            <text x={item.x} y="165" textAnchor="middle" fill="#63bfff" fontSize="8">CONTROL PLANE</text>
            <rect x={item.x-43} y="195" width="86" height="35" rx="7" fill="#0a211c" stroke="#55efc8" />
            <text x={item.x} y="216" textAnchor="middle" fill="#55efc8" fontSize="8">DATA PLANE</text>
            <text x={item.x} y="241" textAnchor="middle" fill="#758ca3" fontSize="7">Operated by Company {item.side}</text>
          </g>
        ))}

        <line x1="137" y1="180" x2="192" y2="180" stroke="#59edcf" opacity=".35" />
        <line x1="528" y1="180" x2="583" y2="180" stroke="#aaa4ff" opacity=".35" />
        <line x1="308" y1="145" x2="412" y2="145" stroke="#63bfff" opacity=".32" />
        <line x1="308" y1="220" x2="412" y2="220" stroke="#55efc8" opacity=".18" />
        <text x="360" y="137" textAnchor="middle" fill="#63bfff" fontSize="7">DSP / catalogue / contract / EDR</text>
        <text x="360" y="238" textAnchor="middle" fill="#55efc8" fontSize="7">authorized fetch / payload</text>

        {path && <path d={path} fill="none" stroke={route.mode === "data" || route.mode === "payload" ? "#55efc8" : "#63bfff"} strokeWidth="3" markerEnd={`url(#${marker})`} />}
        <text x="360" y="315" textAnchor="middle" fill="#dbeaff" fontSize="11" fontWeight="600">{route.label}</text>
      </svg>
    </div>
  );
}
