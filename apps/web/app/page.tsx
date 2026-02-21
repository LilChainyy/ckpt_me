"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "./components/nav";

type NodeType = "team1" | "team2" | "artifact" | "dead" | "constraint";

interface NodeDetail {
  items: Array<{ label?: string; text: string }>;
}

interface WorkflowNodeProps {
  tag: string;
  title: string;
  desc: string;
  type: NodeType;
  detail: NodeDetail;
}

function WorkflowNode({ tag, title, desc, type, detail }: WorkflowNodeProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`node ${type}${open ? " active" : ""}`}
      onClick={() => setOpen((o) => !o)}
    >
      <div className="node-tag">{tag}</div>
      <div className="node-title">{title}</div>
      <div className="node-desc">{desc}</div>
      <div className={`node-detail${open ? " open" : ""}`}>
        <ul>
          {detail.items.map((item, i) => (
            <li key={i}>
              {item.label && <strong>{item.label} </strong>}
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="connector">
      <div className="connector-arrow">↓</div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="page">
      <Nav />

      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-logo">ckpt</div>
        <h2 className="landing-title">
          Never lose context<br />between sessions.
        </h2>
        <p className="landing-sub">
          ckpt captures constraints, dead ends, and reasoning as you work —
          so the next person (or Claude) picks up exactly where you left off.
        </p>
        <div className="landing-ctas">
          <Link href="/compose" className="btn btn-primary">
            I&apos;m handing off →
          </Link>
          <Link href="/checkpoint/demo/brief" className="btn btn-secondary">
            I&apos;m receiving a handoff →
          </Link>
        </div>
      </div>

      {/* Workflow diagram */}
      <div className="landing-diagram">
        <div className="landing-diagram-label">how it works · click any node to expand</div>

        <div className="legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--team1)" }} />
            Team 1 (Sarah + Claude 1)
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--team2)" }} />
            Team 2 (James + Claude 2)
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--artifact)" }} />
            .ckpt.json artifact
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--constraint)" }} />
            Constraint / &quot;no&quot; moment
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--dead)" }} />
            Dead end
          </div>
        </div>

        <div className="workflow">
          {/* HEADERS */}
          <div className="col-label team1">Team 1 · capture phase</div>
          <div className="col-label center">artifact</div>
          <div className="col-label team2">Team 2 · consume phase</div>

          {/* LEFT: Team 1 capture phase */}
          <div className="col left">
            <div className="v-group">
              <WorkflowNode
                type="team1"
                tag="trigger"
                title="Sarah gets the task"
                desc="Boss + standup context loaded in"
                detail={{
                  items: [
                    { label: "Boss says:", text: "no new Redis deps, migration coming Q3" },
                    { label: "Boss says:", text: "handle burst traffic gracefully, don't hard-reject" },
                    { label: "Boss says:", text: "SOC2 audit next month, no plaintext logging of payloads" },
                    { text: "None of this is written anywhere yet" },
                  ],
                }}
              />
              <Connector />
              <WorkflowNode
                type="team1"
                tag="action"
                title="Sarah opens Claude Code"
                desc="Starts session, describes the task"
                detail={{
                  items: [
                    { text: 'Tells Claude: "build a rate limiter for the API gateway"' },
                    { text: "Boss constraints live only in Sarah's head at this point" },
                    { text: "Claude starts reasoning about implementation options" },
                  ],
                }}
              />
              <Connector />
              <WorkflowNode
                type="constraint"
                tag="constraint captured"
                title='"No Redis"'
                desc="Claude proposes Redis → Sarah says no → logged"
                detail={{
                  items: [
                    { text: "Claude suggests Redis token bucket — natural choice" },
                    { text: 'Sarah blocks it: "avoid Redis"' },
                    { label: "ckpt logs:", text: 'constraint · "no Redis" · reason: Q3 migration' },
                    { text: "Claude pivots to in-memory implementation" },
                  ],
                }}
              />
              <Connector />
              <WorkflowNode
                type="dead"
                tag="dead end"
                title="Race condition — unresolved"
                desc="Two approaches tried, neither worked"
                detail={{
                  items: [
                    { text: "Bug: weird behavior when 2 requests arrive at exact same ms" },
                    { label: "Attempt 1:", text: "mutex lock around counter — caused timeout under load" },
                    { label: "Attempt 2:", text: "compare-and-swap loop — still drops requests incorrectly" },
                    { text: "Session ends unresolved. Sarah notes it's open." },
                    { label: "ckpt logs:", text: "dead-end · race condition · both attempts + why each failed" },
                  ],
                }}
              />
              <Connector />
              <WorkflowNode
                type="team1"
                tag="session end"
                title="Sarah closes the session"
                desc="ckpt file generated automatically"
                detail={{
                  items: [
                    { text: "Claude writes the .ckpt.json at session close" },
                    { text: "Contains: constraints, dead ends, current state, next steps" },
                    { text: 'Sarah can add a handoff note: "race condition in step 4, needs fix before ship"' },
                  ],
                }}
              />
            </div>
          </div>

          {/* CENTER: artifact column */}
          <div className="col center-col">
            <div style={{ height: "108px" }} />
            <div className="artifact-node">
              <div className="node-tag">generated</div>
              <div className="node-title" style={{ color: "var(--artifact)" }}>.ckpt.json</div>
            </div>
            <div style={{ height: "16px" }} />
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontFamily: "'IBM Plex Mono', monospace",
                textAlign: "center",
                lineHeight: 1.8,
              }}
            >
              constraints<br />
              dead ends<br />
              code steps<br />
              reasoning<br />
              open items
            </div>
          </div>

          {/* RIGHT: awaiting handoff placeholder */}
          <div className="col right">
            <div style={{ height: "108px" }} />
            <div
              style={{
                height: "200px",
                borderLeft: "1px dashed var(--border)",
                marginLeft: "20px",
                display: "flex",
                alignItems: "center",
                paddingLeft: "16px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--border)",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                awaiting handoff →
              </span>
            </div>
          </div>

          {/* HANDOFF BAR */}
          <div className="handoff-row">
            <div className="handoff-line" />
            <div className="handoff-badge">⟶ &nbsp; handoff &nbsp; ⟶</div>
            <div className="handoff-line" />
          </div>

          {/* CONSUME PHASE: left spacer */}
          <div className="col left">
            <div
              style={{
                height: "40px",
                borderRight: "1px dashed var(--border)",
                marginRight: "20px",
              }}
            />
          </div>

          {/* CONSUME PHASE: center artifact loaded */}
          <div className="col center-col">
            <div className="artifact-node" style={{ marginBottom: 0 }}>
              <div className="node-tag">loaded by james</div>
              <div className="node-title" style={{ color: "var(--artifact)" }}>.ckpt.json</div>
            </div>
          </div>

          {/* CONSUME PHASE: right — Team 2 */}
          <div className="col right">
            <div className="v-group">
              <WorkflowNode
                type="team2"
                tag="onboarding view"
                title="James sees the brief first"
                desc="Constraints + dead ends before touching code"
                detail={{
                  items: [
                    { label: "Constraints shown upfront:", text: "no Redis, SOC2 no payload logging, burst = soft reject" },
                    { label: "Dead ends shown:", text: "mutex tried + failed, CAS tried + failed" },
                    { label: "Open item:", text: "race condition unresolved, needs fix before ship" },
                    { text: "James knows what not to do before he opens a single file" },
                  ],
                }}
              />
              <Connector />
              <WorkflowNode
                type="team2"
                tag="exploration view"
                title="James drills into the code"
                desc="Side-by-side: code left, reasoning right"
                detail={{
                  items: [
                    { text: "Each step shows the code snapshot + why that decision was made" },
                    { text: "James can see exactly where the race condition is introduced" },
                    { text: "Claude 2 is also loaded with this context — won't suggest Redis" },
                  ],
                }}
              />
              <Connector />
              <WorkflowNode
                type="team2"
                tag="continue work"
                title="James + Claude 2 pick up cleanly"
                desc="Full context, no repeated mistakes"
                detail={{
                  items: [
                    { text: "Claude 2 knows the constraints — won't suggest Redis" },
                    { text: "James doesn't simplify the burst handling — knows it was intentional" },
                    { text: "Both focus on the actual open problem: the race condition" },
                    { text: "James generates a new .ckpt.json at end of his session for Team 3" },
                  ],
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
