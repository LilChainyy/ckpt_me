import Link from 'next/link';
import NavServer from '../components/nav-server';
import CompareClient from './compare-client';
import { getCheckpoint } from '../lib/api';

/**
 * Compare View — server component that reads ?left={id}&right={id} from
 * search params, fetches both checkpoints in parallel, and passes them
 * to the CompareClient for side-by-side rendering.
 *
 * Design decision: We fetch both checkpoints on the server to avoid
 * waterfalls and keep the client component purely presentational.
 */
interface ComparePageProps {
  searchParams: Promise<{ left?: string; right?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { left, right } = await searchParams;

  // Both IDs are required
  if (!left || !right) {
    return (
      <main className="page">
        <NavServer
          breadcrumbs={[
            { label: 'dashboard', href: '/dashboard' },
            { label: 'compare' },
          ]}
        />
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="page-tag">missing checkpoint ids</div>
          <p style={{ color: 'var(--muted)', marginTop: 12 }}>
            Both <code>left</code> and <code>right</code> query parameters are required.
          </p>
          <p style={{ color: 'var(--border)', marginTop: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
            /compare?left=checkpoint-id&amp;right=checkpoint-id
          </p>
          <Link
            href="/dashboard"
            className="btn btn-secondary"
            style={{ marginTop: 24, display: 'inline-flex' }}
          >
            &larr; back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  // Fetch both checkpoints in parallel
  const [leftCheckpoint, rightCheckpoint] = await Promise.all([
    getCheckpoint(left),
    getCheckpoint(right),
  ]);

  // Handle missing checkpoint(s)
  if (!leftCheckpoint || !rightCheckpoint) {
    const missingIds: string[] = [];
    if (!leftCheckpoint) missingIds.push(left);
    if (!rightCheckpoint) missingIds.push(right);

    return (
      <main className="page">
        <NavServer
          breadcrumbs={[
            { label: 'dashboard', href: '/dashboard' },
            { label: 'compare' },
          ]}
        />
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="page-tag">checkpoint not found</div>
          <p style={{ color: 'var(--muted)', marginTop: 12 }}>
            Could not find checkpoint{missingIds.length > 1 ? 's' : ''}:{' '}
            {missingIds.map((id, i) => (
              <code key={id}>
                {id}
                {i < missingIds.length - 1 ? ', ' : ''}
              </code>
            ))}
          </p>
          <Link
            href="/dashboard"
            className="btn btn-secondary"
            style={{ marginTop: 24, display: 'inline-flex' }}
          >
            &larr; back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wide">
      <NavServer
        breadcrumbs={[
          { label: 'dashboard', href: '/dashboard' },
          { label: 'compare' },
        ]}
      />

      <div className="page-header">
        <div className="page-tag">compare checkpoints</div>
        <h1 className="page-title">
          {leftCheckpoint.author} vs {rightCheckpoint.author}
        </h1>
        <div className="page-meta">
          Comparing checkpoint {leftCheckpoint.id} with {rightCheckpoint.id}
        </div>
      </div>

      <CompareClient left={leftCheckpoint} right={rightCheckpoint} />
    </main>
  );
}
