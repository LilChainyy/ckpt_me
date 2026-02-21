import type { Step, Constraint } from '../lib/types';

interface StepCardProps {
  step: Step;
  isActive: boolean;
  onClick: () => void;
  constraints?: Constraint[];
}

const typeColors: Record<Step['type'], string> = {
  action: 'var(--team1)',
  constraint: 'var(--constraint)',
  'dead-end': 'var(--dead)',
  decision: 'var(--team2)',
};

const typeLabels: Record<Step['type'], string> = {
  action: 'action',
  constraint: 'constraint',
  'dead-end': 'dead end',
  decision: 'decision',
};

export default function StepCard({ step, isActive, onClick, constraints }: StepCardProps) {
  return (
    <button
      className={`step-card${isActive ? ' step-card--active' : ''}${step.type === 'dead-end' ? ' step-card--dead' : ''}`}
      onClick={onClick}
      style={{ '--step-color': typeColors[step.type] } as React.CSSProperties}
    >
      <div className="step-card-header">
        <span className="step-card-index">{String(step.index).padStart(2, '0')}</span>
        <span className="step-card-type" style={{ color: typeColors[step.type] }}>
          {typeLabels[step.type]}
        </span>
      </div>
      <div className="step-card-title">{step.title}</div>
      {constraints && constraints.length > 0 && (
        <div className="step-card-pills">
          {constraints.map((c) => (
            <span key={c.id} className="constraint-pill constraint-pill--sm">
              {c.label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
