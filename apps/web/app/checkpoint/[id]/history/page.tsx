import Link from "next/link";
import NavServer from "../../../components/nav-server";
import { getCheckpoint } from "../../../lib/api";
import { prisma } from "../../../../lib/db";
import HistoryClient, { type Version } from "./history-client";

interface HistoryPageProps {
  params: Promise<{ id: string }>;
}

async function getVersions(checkpointId: string): Promise<Version[]> {
  const rows = await prisma.checkpointVersion.findMany({
    where: { checkpointId },
    orderBy: { version: "desc" },
  });

  return rows.map((r) => ({
    version: r.version,
    createdAt: r.createdAt.toISOString(),
    snapshot: r.snapshot as Record<string, unknown>,
  }));
}

export default async function HistoryPage({ params }: HistoryPageProps) {
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
            &larr; back to home
          </Link>
        </div>
      </main>
    );
  }

  const versions = await getVersions(id);

  return (
    <main className="page">
      <NavServer
        breadcrumbs={[
          { label: "checkpoint", href: "/" },
          { label: checkpoint.id },
          { label: "brief", href: `/checkpoint/${id}/brief` },
          { label: "history" },
        ]}
      />

      <div className="page-header">
        <div className="page-tag">version history</div>
        <h1 className="page-title">{checkpoint.task}</h1>
        <div className="page-meta">
          {versions.length} version{versions.length !== 1 ? "s" : ""} recorded
        </div>
      </div>

      <HistoryClient versions={versions} />

      <div className="brief-cta">
        <p className="brief-cta-text">Back to the checkpoint brief?</p>
        <Link href={`/checkpoint/${id}/brief`} className="btn btn-secondary">
          &larr; Brief
        </Link>
      </div>
    </main>
  );
}
