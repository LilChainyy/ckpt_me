import Link from "next/link";
import NavServer from "../../../components/nav-server";
import ConstraintPill from "../../../components/constraint-pill";
import DeadEndCard from "../../../components/dead-end-card";
import CommentThread from "../../../components/comment-thread";
import { getCheckpoint } from "../../../lib/api";

interface BriefPageProps {
  params: Promise<{ id: string }>;
}

export default async function BriefPage({ params }: BriefPageProps) {
  const { id } = await params;
  const checkpoint = await getCheckpoint(id);

  if (!checkpoint) {
    return (
      <main className="page">
        <NavServer breadcrumbs={[{ label: "checkpoint" }, { label: "not found" }]} />
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div className="page-tag">checkpoint not found</div>
          <p style={{ color: "var(--muted)", marginTop: 12 }}>
            This checkpoint ID doesn&apos;t exist.
          </p>
          <Link href="/" className="btn btn-secondary" style={{ marginTop: 24, display: "inline-flex" }}>
            ← back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <NavServer
        breadcrumbs={[
          { label: "checkpoint", href: "/" },
          { label: checkpoint.id },
          { label: "brief" },
        ]}
      />

      <div className="page-header">
        <div className="page-tag">briefing · {checkpoint.author}</div>
        <h1 className="page-title">{checkpoint.task}</h1>
        <div className="page-meta">
          {checkpoint.constraints.length} constraint{checkpoint.constraints.length !== 1 ? "s" : ""} ·{" "}
          {checkpoint.deadEnds.length} dead end{checkpoint.deadEnds.length !== 1 ? "s" : ""} ·{" "}
          {checkpoint.openItems.length} open item{checkpoint.openItems.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="brief-layout">
        {/* Handoff note */}
        <div className="brief-section">
          <div className="section-header">handoff note from {checkpoint.author}</div>
          <div className="brief-note">{checkpoint.handoffNote}</div>
        </div>

        {/* Open items */}
        <div className="brief-section">
          <div className="section-header">open items · must fix before ship</div>
          <ul className="open-items-list">
            {checkpoint.openItems.map((item, i) => (
              <li key={i} className="open-item">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Constraints + Dead ends side by side */}
        <div className="brief-grid">
          <div className="brief-section">
            <div className="section-header">constraints · do not break these</div>
            {checkpoint.constraints.map((c) => (
              <ConstraintPill key={c.id} constraint={c} showReason />
            ))}
          </div>

          <div className="brief-section">
            <div className="section-header">dead ends · already tried, don&apos;t repeat</div>
            {checkpoint.deadEnds.map((d) => (
              <DeadEndCard key={d.id} deadEnd={d} />
            ))}
          </div>
        </div>
      </div>

      {/* Discussion */}
      <div className="brief-section">
        <div className="section-header">discussion</div>
        <CommentThread checkpointId={id} />
      </div>

      {/* CTA */}
      <div className="brief-cta">
        <p className="brief-cta-text">
          Ready to explore the implementation step by step?
        </p>
        <Link href={`/checkpoint/${id}/timeline`} className="btn btn-primary">
          Explore the steps →
        </Link>
      </div>
    </main>
  );
}
