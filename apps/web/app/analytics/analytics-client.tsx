'use client';

/**
 * Client component that renders aggregate analytics data as summary cards
 * and horizontal bar charts. Uses pure CSS for visualization (no charting
 * library). All colours come from the design-system CSS custom properties.
 *
 * Props are computed server-side in page.tsx via Prisma groupBy/count queries.
 */

interface AnalyticsData {
  totalCheckpoints: number;
  totalReasoning: number;
  checkpointsByAuthor: { author: string; count: number }[];
  reasoningByRepo: { repoUrl: string; count: number }[];
}

export default function AnalyticsClient({
  totalCheckpoints,
  totalReasoning,
  checkpointsByAuthor,
  reasoningByRepo,
}: AnalyticsData) {
  const maxAuthorCount = Math.max(
    ...checkpointsByAuthor.map((a) => a.count),
    1,
  );
  const maxRepoCount = Math.max(
    ...reasoningByRepo.map((r) => r.count),
    1,
  );

  return (
    <>
      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="analytics-summary">
        <div className="analytics-stat-card">
          <div className="analytics-stat-value">{totalCheckpoints}</div>
          <div className="analytics-stat-label">Total checkpoints</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-value">{totalReasoning}</div>
          <div className="analytics-stat-label">Total reasoning records</div>
        </div>
      </div>

      {/* ── Checkpoints by author ──────────────────────────────── */}
      <div className="analytics-chart">
        <div className="analytics-chart-title">Checkpoints by author</div>
        {checkpointsByAuthor.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            No checkpoint data yet.
          </p>
        ) : (
          checkpointsByAuthor.map((item) => (
            <div key={item.author} className="analytics-bar-row">
              <span className="analytics-bar-label" title={item.author}>
                {item.author}
              </span>
              <div className="analytics-bar-track">
                <div
                  className="analytics-bar-fill"
                  style={{
                    width: `${(item.count / maxAuthorCount) * 100}%`,
                  }}
                />
              </div>
              <span className="analytics-bar-count">{item.count}</span>
            </div>
          ))
        )}
      </div>

      {/* ── Reasoning by repo ──────────────────────────────────── */}
      <div className="analytics-chart">
        <div className="analytics-chart-title">Reasoning by repository</div>
        {reasoningByRepo.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            No reasoning data yet.
          </p>
        ) : (
          reasoningByRepo.map((item) => (
            <div key={item.repoUrl} className="analytics-bar-row">
              <span className="analytics-bar-label" title={item.repoUrl}>
                {item.repoUrl}
              </span>
              <div className="analytics-bar-track">
                <div
                  className="analytics-bar-fill"
                  style={{
                    width: `${(item.count / maxRepoCount) * 100}%`,
                    background: 'var(--team2)',
                  }}
                />
              </div>
              <span className="analytics-bar-count">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
