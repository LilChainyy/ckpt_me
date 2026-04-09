'use client';

import type { Checkpoint } from '../lib/types';
import ConstraintPill from '../components/constraint-pill';
import DeadEndCard from '../components/dead-end-card';

/**
 * CompareClient renders two checkpoints side-by-side with highlights for
 * overlapping constraints and dead ends.
 *
 * Matching logic:
 * - Constraints match by exact `label` (case-insensitive).
 * - Dead ends match by exact `title` (case-insensitive).
 *
 * Design decision: We use simple case-insensitive string matching rather
 * than fuzzy matching. This keeps behavior predictable and avoids false
 * positives. The matching is computed once per render via Set lookups,
 * so performance is O(n) for each section.
 */
interface CompareClientProps {
  left: Checkpoint;
  right: Checkpoint;
}

function getSharedValues<T>(a: T[], b: T[], key: (item: T) => string): Set<string> {
  const setA = new Set(a.map((item) => key(item).toLowerCase()));
  const shared = new Set<string>();
  for (const item of b) {
    const k = key(item).toLowerCase();
    if (setA.has(k)) shared.add(k);
  }
  return shared;
}

export default function CompareClient({ left, right }: CompareClientProps) {
  const sharedConstraints = getSharedValues(left.constraints, right.constraints, (c) => c.label);
  const sharedDeadEnds = getSharedValues(left.deadEnds, right.deadEnds, (d) => d.title);

  return (
    <>
      {/* Legend explaining the highlight colors */}
      {(sharedConstraints.size > 0 || sharedDeadEnds.size > 0) && (
        <div className="compare-legend">
          {sharedConstraints.size > 0 && (
            <div className="compare-legend-item">
              <span
                className="compare-legend-swatch"
                style={{ borderColor: 'var(--team1)' }}
              />
              shared constraint
            </div>
          )}
          {sharedDeadEnds.size > 0 && (
            <div className="compare-legend-item">
              <span
                className="compare-legend-swatch"
                style={{ borderColor: 'var(--artifact)' }}
              />
              overlapping dead end
            </div>
          )}
        </div>
      )}

      <div className="compare-grid">
        {/* Left column */}
        <CompareColumn
          checkpoint={left}
          sharedConstraints={sharedConstraints}
          sharedDeadEnds={sharedDeadEnds}
        />

        {/* Right column */}
        <CompareColumn
          checkpoint={right}
          sharedConstraints={sharedConstraints}
          sharedDeadEnds={sharedDeadEnds}
        />
      </div>
    </>
  );
}

/* ─── Column component (reused for left and right) ─────────────── */

interface CompareColumnProps {
  checkpoint: Checkpoint;
  sharedConstraints: Set<string>;
  sharedDeadEnds: Set<string>;
}

function CompareColumn({
  checkpoint,
  sharedConstraints,
  sharedDeadEnds,
}: CompareColumnProps) {
  return (
    <div className="compare-col">
      {/* Header: author + task */}
      <div className="compare-col-header">
        <div className="compare-col-author">{checkpoint.author}</div>
        <div className="compare-col-task">{checkpoint.task}</div>
      </div>

      <div className="compare-col-body">
        {/* Handoff Note */}
        <div className="compare-section">
          <div className="compare-section-header">handoff note</div>
          {checkpoint.handoffNote ? (
            <div className="brief-note">{checkpoint.handoffNote}</div>
          ) : (
            <div className="compare-empty">No handoff note</div>
          )}
        </div>

        {/* Constraints */}
        <div className="compare-section">
          <div className="compare-section-header">
            constraints
            {sharedConstraints.size > 0 && (
              <span style={{ color: 'var(--team1)', marginLeft: 8 }}>
                {sharedConstraints.size} shared
              </span>
            )}
          </div>
          <div className="compare-section-items">
            {checkpoint.constraints.length > 0 ? (
              checkpoint.constraints.map((c) => {
                const isShared = sharedConstraints.has(c.label.toLowerCase());
                return (
                  <div
                    key={c.id}
                    className={isShared ? 'compare-match' : ''}
                  >
                    <ConstraintPill constraint={c} showReason />
                  </div>
                );
              })
            ) : (
              <div className="compare-empty">No constraints</div>
            )}
          </div>
        </div>

        {/* Dead Ends */}
        <div className="compare-section">
          <div className="compare-section-header">
            dead ends
            {sharedDeadEnds.size > 0 && (
              <span style={{ color: 'var(--artifact)', marginLeft: 8 }}>
                {sharedDeadEnds.size} overlapping
              </span>
            )}
          </div>
          <div className="compare-section-items">
            {checkpoint.deadEnds.length > 0 ? (
              checkpoint.deadEnds.map((d) => {
                const isShared = sharedDeadEnds.has(d.title.toLowerCase());
                return (
                  <div
                    key={d.id}
                    className={isShared ? 'compare-match-dead' : ''}
                  >
                    <DeadEndCard deadEnd={d} />
                  </div>
                );
              })
            ) : (
              <div className="compare-empty">No dead ends</div>
            )}
          </div>
        </div>

        {/* Open Items */}
        <div className="compare-section">
          <div className="compare-section-header">open items</div>
          {checkpoint.openItems.length > 0 ? (
            <ul className="open-items-list">
              {checkpoint.openItems.map((item, i) => (
                <li key={i} className="open-item">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <div className="compare-empty">No open items</div>
          )}
        </div>
      </div>
    </div>
  );
}
