"use client";

import { useState } from "react";

/**
 * HistoryClient -- renders checkpoint version list with expandable JSON snapshots.
 *
 * Receives pre-fetched versions from the server component. Each version is
 * rendered as a row with version number, timestamp, and a toggle to reveal
 * the full JSON snapshot.
 */

export interface Version {
  version: number;
  createdAt: string;
  snapshot: Record<string, unknown>;
}

interface HistoryClientProps {
  versions: Version[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function HistoryClient({ versions }: HistoryClientProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(version: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  }

  if (versions.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 14 }}>
        No version history available for this checkpoint.
      </p>
    );
  }

  return (
    <div className="version-list">
      {versions.map((v) => (
        <div key={v.version} className="version-item">
          <button
            type="button"
            className="version-header"
            onClick={() => toggle(v.version)}
            aria-expanded={expanded.has(v.version)}
          >
            <span className="version-number">v{v.version}</span>
            <span className="version-date">{formatDate(v.createdAt)}</span>
            <span className="version-toggle">
              {expanded.has(v.version) ? "Hide snapshot" : "View snapshot"}
            </span>
          </button>

          {expanded.has(v.version) && (
            <pre className="version-snapshot">
              {JSON.stringify(v.snapshot, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
