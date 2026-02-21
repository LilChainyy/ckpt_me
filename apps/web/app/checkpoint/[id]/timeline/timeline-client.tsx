"use client";

import { useState, useEffect } from "react";
import StepCard from "../../../components/step-card";
import ConstraintPill from "../../../components/constraint-pill";
import DeadEndCard from "../../../components/dead-end-card";
import FileTree from "../../../components/file-tree";
import CodeDiff from "../../../components/code-diff";
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

  const activeStepIndex = checkpoint.steps.findIndex((s) => s.id === activeStepId);
  const activeStep = checkpoint.steps[activeStepIndex] ?? null;
  const prevStep = activeStepIndex > 0 ? checkpoint.steps[activeStepIndex - 1] : null;

  // Default to first changed file, or just first file
  const defaultFile = (step: typeof activeStep) => {
    if (!step?.files?.length) return "";
    const changed = step.changedFiles?.[0];
    if (changed && step.files.some((f) => f.path === changed)) return changed;
    return step.files[0].path;
  };

  const [activeFilePath, setActiveFilePath] = useState<string>(() => defaultFile(activeStep));

  // When step changes, reset to that step's default file
  useEffect(() => {
    setActiveFilePath(defaultFile(activeStep));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepId]);

  const constraintMap = Object.fromEntries(
    checkpoint.constraints.map((c) => [c.id, c])
  );
  const deadEndMap = Object.fromEntries(
    checkpoint.deadEnds.map((d) => [d.id, d])
  );

  // Resolve active file content for current and previous step
  const activeFileContent = activeStep?.files?.find((f) => f.path === activeFilePath)?.content;
  const prevFileContent   = prevStep?.files?.find((f) => f.path === activeFilePath)?.content;

  return (
    <div className="tl-layout">

      {/* ── Col 1: step list ── */}
      <div className="tl-steps-col">
        <div className="tl-col-header">{checkpoint.steps.length} steps</div>
        <div className="tl-steps-scroll">
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

      {/* ── Col 2: file tree ── */}
      <div className="tl-files-col">
        <div className="tl-col-header">
          {activeStep?.files?.length ?? 0} files
        </div>
        <div className="tl-files-scroll">
          {activeStep?.files?.length ? (
            <FileTree
              files={activeStep.files}
              changedFiles={activeStep.changedFiles ?? []}
              activeFile={activeFilePath}
              onSelect={setActiveFilePath}
            />
          ) : (
            <div className="tl-empty-hint">no files</div>
          )}
        </div>
      </div>

      {/* ── Col 3: detail + code ── */}
      <div className="tl-detail-col">
        {!activeStep ? (
          <div className="tl-detail-empty">select a step</div>
        ) : (
          <div className="tl-detail-scroll">

            {/* Step meta */}
            <div className="tl-detail-inner">
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

              <div>
                <div className="detail-section-label">reasoning</div>
                <p className="detail-reasoning">{activeStep.reasoning}</p>
              </div>

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

              {activeStep.deadEndId && deadEndMap[activeStep.deadEndId] && (
                <div className="detail-dead-end">
                  <div className="detail-section-label">dead end recorded</div>
                  <DeadEndCard deadEnd={deadEndMap[activeStep.deadEndId]} />
                </div>
              )}
            </div>

            {/* File diff — full width, scrollable */}
            {activeFilePath && activeFileContent != null && (
              <div className="tl-file-viewer">
                <div className="tl-file-viewer-header">
                  <span className="tl-file-path">{activeFilePath}</span>
                  {(activeStep.changedFiles ?? []).includes(activeFilePath) && (
                    <span className="tl-file-changed-badge">changed</span>
                  )}
                  {prevStep && !prevFileContent && (
                    <span className="tl-file-new-badge">new file</span>
                  )}
                </div>
                <CodeDiff
                  oldCode={prevFileContent}
                  newCode={activeFileContent}
                />
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
