"use client";

import { useState } from "react";
import StepCard from "../../../components/step-card";
import ConstraintPill from "../../../components/constraint-pill";
import DeadEndCard from "../../../components/dead-end-card";
import type { Checkpoint, Step } from "../../../lib/types";

const typeColors: Record<Step["type"], string> = {
  action: "var(--team1)",
  constraint: "var(--constraint)",
  "dead-end": "var(--dead)",
  decision: "var(--team2)",
};

const typeLabels: Record<Step["type"], string> = {
  action: "action",
  constraint: "constraint",
  "dead-end": "dead end",
  decision: "decision",
};

interface TimelineClientProps {
  checkpoint: Checkpoint;
}

export default function TimelineClient({ checkpoint }: TimelineClientProps) {
  const [activeStepId, setActiveStepId] = useState<string>(
    checkpoint.steps[0]?.id ?? ""
  );

  const activeStep = checkpoint.steps.find((s) => s.id === activeStepId) ?? null;

  const constraintMap = Object.fromEntries(
    checkpoint.constraints.map((c) => [c.id, c])
  );
  const deadEndMap = Object.fromEntries(
    checkpoint.deadEnds.map((d) => [d.id, d])
  );

  return (
    <div className="timeline-layout">
      {/* Sidebar — step list */}
      <div className="timeline-sidebar">
        <div className="timeline-sidebar-header">
          {checkpoint.steps.length} steps
        </div>
        <div className="timeline-steps">
          {checkpoint.steps.map((step) => {
            const stepConstraints = (step.constraintIds ?? [])
              .map((cid) => constraintMap[cid])
              .filter(Boolean);

            return (
              <StepCard
                key={step.id}
                step={step}
                isActive={step.id === activeStepId}
                onClick={() => setActiveStepId(step.id)}
                constraints={stepConstraints}
              />
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="timeline-detail">
        {!activeStep ? (
          <div className="timeline-detail-empty">select a step</div>
        ) : (
          <div className="timeline-detail-content">
            {/* Step header */}
            <div className="detail-step-header">
              <span className="detail-step-num">
                {String(activeStep.index).padStart(2, "0")}
              </span>
              <span
                className="detail-step-type"
                style={{
                  background: `color-mix(in srgb, ${typeColors[activeStep.type]} 12%, transparent)`,
                  color: typeColors[activeStep.type],
                  border: `1px solid color-mix(in srgb, ${typeColors[activeStep.type]} 30%, transparent)`,
                }}
              >
                {typeLabels[activeStep.type]}
              </span>
              <h2 className="detail-step-title">{activeStep.title}</h2>
            </div>

            {/* Reasoning */}
            <div>
              <div className="detail-section-label">reasoning</div>
              <p className="detail-reasoning">{activeStep.reasoning}</p>
            </div>

            {/* Constraints triggered */}
            {activeStep.constraintIds && activeStep.constraintIds.length > 0 && (
              <div>
                <div className="detail-section-label">constraints active</div>
                <div className="detail-constraints">
                  {activeStep.constraintIds.map((cid) => {
                    const c = constraintMap[cid];
                    return c ? <ConstraintPill key={cid} constraint={c} /> : null;
                  })}
                </div>
              </div>
            )}

            {/* Dead end */}
            {activeStep.deadEndId && deadEndMap[activeStep.deadEndId] && (
              <div className="detail-dead-end">
                <div className="detail-section-label">dead end recorded</div>
                <DeadEndCard deadEnd={deadEndMap[activeStep.deadEndId]} />
              </div>
            )}

            {/* Code snapshot */}
            {activeStep.codeSnapshot && (
              <div>
                <div className="detail-section-label">code snapshot</div>
                <pre className="detail-code">{activeStep.codeSnapshot}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
