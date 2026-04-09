import NavServer from "../../../components/nav-server";
import Link from "next/link";
import TimelineClient from "./timeline-client";
import { getCheckpoint } from "../../../lib/api";

interface TimelinePageProps {
  params: Promise<{ id: string }>;
}

export default async function TimelinePage({ params }: TimelinePageProps) {
  const { id } = await params;
  const checkpoint = await getCheckpoint(id);

  if (!checkpoint) {
    return (
      <main className="page">
        <NavServer breadcrumbs={[{ label: "checkpoint" }, { label: "not found" }]} />
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div className="page-tag">checkpoint not found</div>
          <Link href="/" className="btn btn-secondary" style={{ marginTop: 24, display: "inline-flex" }}>
            ← back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="tl-page">
      <div className="tl-page-header">
        <NavServer
          breadcrumbs={[
            { label: "checkpoint", href: "/" },
            { label: checkpoint.id },
            { label: "brief", href: `/checkpoint/${id}/brief` },
            { label: "timeline" },
          ]}
        />
        <div style={{ marginBottom: 20 }}>
          <div className="page-tag">step explorer</div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{checkpoint.task}</h1>
        </div>
      </div>

      <TimelineClient checkpoint={checkpoint} />
    </main>
  );
}
