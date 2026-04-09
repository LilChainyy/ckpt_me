import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import NavServer from '../components/nav-server';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const checkpoints = await prisma.checkpoint.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <main className="page">
      <NavServer
        breadcrumbs={[{ label: 'dashboard' }]}
      />

      <div className="page-header">
        <div className="page-tag">
          {session.user.name ?? session.user.email}
        </div>
        <h1 className="page-title">Your checkpoints</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
        <Link href="/analytics" className="btn btn-secondary">
          Analytics
        </Link>
        <Link href="/compose" className="btn btn-primary">
          + New checkpoint
        </Link>
      </div>

      {checkpoints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <p>No checkpoints yet.</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Create one from the compose page or push reasoning from the CLI.
          </p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {checkpoints.map((cp) => (
            <Link
              key={cp.id}
              href={`/checkpoint/${cp.id}/brief`}
              className="checkpoint-card"
            >
              <div className="checkpoint-card-header">
                <span className="checkpoint-card-author">{cp.author}</span>
                <span className="checkpoint-card-date">
                  {new Date(cp.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="checkpoint-card-task">{cp.task}</div>
              <div className="checkpoint-card-meta">
                {(cp.constraints as unknown[])?.length ?? 0} constraints ·{' '}
                {(cp.deadEnds as unknown[])?.length ?? 0} dead ends
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
