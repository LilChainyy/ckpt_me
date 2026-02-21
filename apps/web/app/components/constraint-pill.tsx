import type { Constraint } from '../lib/types';

interface ConstraintPillProps {
  constraint: Constraint;
  showReason?: boolean;
}

export default function ConstraintPill({ constraint, showReason }: ConstraintPillProps) {
  if (showReason) {
    return (
      <div className="constraint-card">
        <div className="constraint-pill">{constraint.label}</div>
        <p className="constraint-reason">{constraint.reason}</p>
      </div>
    );
  }

  return <span className="constraint-pill">{constraint.label}</span>;
}
