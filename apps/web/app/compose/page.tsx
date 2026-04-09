"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/nav";

interface ConstraintItem {
  label: string;
  reason: string;
}

interface DeadEndItem {
  title: string;
  attempt: string;
  outcome: string;
}

export default function ComposePage() {
  const router = useRouter();

  const [task, setTask] = useState("Build rate limiter for API gateway");
  const [handoffNote, setHandoffNote] = useState(
    "Race condition in step 4 is unresolved — needs fix before ship. The in-memory token bucket approach is solid otherwise. Do NOT reach for Redis (Q3 migration) and keep burst traffic as a soft-reject."
  );
  const [openItems, setOpenItems] = useState<string[]>([
    "Fix race condition when 2 requests arrive at exact same millisecond",
    "Add integration test for burst traffic scenario",
  ]);
  const [constraints, setConstraints] = useState<ConstraintItem[]>([
    { label: "No Redis", reason: "Q3 infrastructure migration — Redis is being deprecated." },
    { label: "Soft reject on burst", reason: "Hard 429s cause client retries that amplify the spike." },
    { label: "No plaintext payload logging", reason: "SOC2 audit next month." },
  ]);
  const [deadEnds, setDeadEnds] = useState<DeadEndItem[]>([
    {
      title: "Race condition — mutex lock",
      attempt: "Mutex lock around counter",
      outcome: "Caused timeout under load — p99 latency spiked to 340ms.",
    },
    {
      title: "Race condition — compare-and-swap",
      attempt: "CAS loop on atomic counter",
      outcome: "Still drops requests incorrectly under concurrent load.",
    },
  ]);

  function addOpenItem() {
    setOpenItems((prev) => [...prev, ""]);
  }
  function updateOpenItem(i: number, val: string) {
    setOpenItems((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }
  function removeOpenItem(i: number) {
    setOpenItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addConstraint() {
    setConstraints((prev) => [...prev, { label: "", reason: "" }]);
  }
  function updateConstraint(i: number, field: keyof ConstraintItem, val: string) {
    setConstraints((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: val } : c))
    );
  }
  function removeConstraint(i: number) {
    setConstraints((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addDeadEnd() {
    setDeadEnds((prev) => [...prev, { title: "", attempt: "", outcome: "" }]);
  }
  function updateDeadEnd(i: number, field: keyof DeadEndItem, val: string) {
    setDeadEnds((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, [field]: val } : d))
    );
  }
  function removeDeadEnd(i: number) {
    setDeadEnds((prev) => prev.filter((_, idx) => idx !== i));
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setSaving(true);
    setError(null);

    const payload = {
      task,
      author: "Sarah",
      handoffNote,
      openItems: openItems.filter(Boolean),
      constraints: constraints
        .filter((c) => c.label)
        .map((c, i) => ({ id: `c${i + 1}`, ...c })),
      deadEnds: deadEnds
        .filter((d) => d.title)
        .map((d, i) => ({
          id: `d${i + 1}`,
          title: d.title,
          attempts: [{ label: d.attempt, outcome: d.outcome }],
        })),
      steps: [],
    };

    try {
      const res = await fetch("/api/v1/checkpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error (${res.status})`);
      }

      const data = await res.json();
      router.push(`/checkpoint/${data.id}/brief`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checkpoint");
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <Nav breadcrumbs={[{ label: "compose" }]} />

      <div className="page-header">
        <div className="page-tag">handoff composer</div>
        <h1 className="page-title">Annotate your session</h1>
        <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.6 }}>
          Capture what you learned — constraints, dead ends, and what&apos;s left open — so the next person starts with full context.
        </p>
      </div>

      <div className="compose-form">
        {/* Task */}
        <div className="form-group">
          <label className="form-label">Task title</label>
          <input
            className="form-input"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What were you building?"
          />
        </div>

        {/* Handoff note */}
        <div className="form-group">
          <label className="form-label">Handoff note</label>
          <div className="form-hint">Plain-language summary for the next person</div>
          <textarea
            className="form-input form-textarea"
            value={handoffNote}
            onChange={(e) => setHandoffNote(e.target.value)}
            placeholder="What should they know? What's unfinished? What should they watch out for?"
            style={{ minHeight: "120px" }}
          />
        </div>

        {/* Open items */}
        <div className="form-group">
          <label className="form-label">Open items</label>
          <div className="form-hint">Things that need to be done before this is shippable</div>
          <div className="form-list-items">
            {openItems.map((item, i) => (
              <div key={i} className="form-list-item">
                <input
                  className="form-input"
                  value={item}
                  onChange={(e) => updateOpenItem(i, e.target.value)}
                  placeholder="Open item..."
                />
                <button className="btn-remove" onClick={() => removeOpenItem(i)} type="button">
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-add" onClick={addOpenItem} type="button">
            + add item
          </button>
        </div>

        {/* Constraints */}
        <div className="form-group">
          <label className="form-label">Constraints</label>
          <div className="form-hint">Hard rules that must not be broken — with the reason why</div>
          <div className="form-list-items">
            {constraints.map((c, i) => (
              <div key={i} className="constraint-form-item">
                <div className="form-list-item">
                  <input
                    className="form-input"
                    value={c.label}
                    onChange={(e) => updateConstraint(i, "label", e.target.value)}
                    placeholder='Constraint label (e.g. "No Redis")'
                    style={{ flex: 1 }}
                  />
                  <button className="btn-remove" onClick={() => removeConstraint(i)} type="button">
                    ×
                  </button>
                </div>
                <input
                  className="form-input"
                  value={c.reason}
                  onChange={(e) => updateConstraint(i, "reason", e.target.value)}
                  placeholder="Why? (this is the important part)"
                />
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-add" onClick={addConstraint} type="button">
            + add constraint
          </button>
        </div>

        {/* Dead ends */}
        <div className="form-group">
          <label className="form-label">Dead ends</label>
          <div className="form-hint">Approaches you tried that didn&apos;t work — so the next person doesn&apos;t repeat them</div>
          <div className="form-list-items">
            {deadEnds.map((d, i) => (
              <div key={i} className="constraint-form-item">
                <div className="form-list-item">
                  <input
                    className="form-input"
                    value={d.title}
                    onChange={(e) => updateDeadEnd(i, "title", e.target.value)}
                    placeholder="What was the dead end?"
                    style={{ flex: 1 }}
                  />
                  <button className="btn-remove" onClick={() => removeDeadEnd(i)} type="button">
                    ×
                  </button>
                </div>
                <input
                  className="form-input"
                  value={d.attempt}
                  onChange={(e) => updateDeadEnd(i, "attempt", e.target.value)}
                  placeholder="What did you try?"
                />
                <input
                  className="form-input"
                  value={d.outcome}
                  onChange={(e) => updateDeadEnd(i, "outcome", e.target.value)}
                  placeholder="Why did it fail?"
                />
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-add" onClick={addDeadEnd} type="button">
            + add dead end
          </button>
        </div>

        {/* Submit */}
        <div className="compose-submit">
          {error && (
            <p style={{ color: "var(--dead)", fontSize: "13px", marginBottom: 12 }}>{error}</p>
          )}
          <button className="btn btn-primary" onClick={handleGenerate} type="button" disabled={saving}>
            {saving ? "Saving..." : "Generate checkpoint →"}
          </button>
        </div>
      </div>
    </main>
  );
}
