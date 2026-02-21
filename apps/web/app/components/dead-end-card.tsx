import type { DeadEnd } from '../lib/types';

interface DeadEndCardProps {
  deadEnd: DeadEnd;
}

export default function DeadEndCard({ deadEnd }: DeadEndCardProps) {
  return (
    <div className="dead-end-card">
      <div className="dead-end-header">
        <span className="dead-end-badge">dead end</span>
        <span className="dead-end-title">{deadEnd.title}</span>
      </div>
      <ul className="dead-end-attempts">
        {deadEnd.attempts.map((attempt, i) => (
          <li key={i} className="dead-end-attempt">
            <span className="dead-end-attempt-label">{attempt.label}</span>
            <span className="dead-end-attempt-outcome">{attempt.outcome}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
