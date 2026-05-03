import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import NavServer from '../components/nav-server';
import AnalyticsClient from './analytics-client';

/**
 * Analytics dashboard — server component that aggregates checkpoint and
 * reasoning data via Prisma and hands it to a client component for rendering.
 *
 * Metrics computed:
 *   1. Total checkpoints (count)
 *   2. Total reasoning records (count)
 *   3. Checkpoints grouped by author (top 10)
 *   4. Reasoning grouped by repoUrl (top 10)
 *
 * Auth is required; unauthenticated users are redirected to /login.
 */
export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  // Run independent queries in parallel for speed.
  const [
    checkpointCount,
    reasoningCount,
    authorGroups,
    repoGroups,
  ] = await Promise.all([
    prisma.checkpoint.count(),
    prisma.reasoning.count(),
    prisma.checkpoint.groupBy({
      by: ['author'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.reasoning.groupBy({
      by: ['repoUrl'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  const totalCheckpoints = checkpointCount;
  const totalReasoning = reasoningCount;

  const checkpointsByAuthor = authorGroups.map((g: any) => ({
    author: g.author,
    count: g._count.id,
  }));

  const reasoningByRepo = repoGroups
    .filter((g: any) => g.repoUrl !== null)
    .map((g: any) => ({
      repoUrl: g.repoUrl as string,
      count: g._count.id,
    }));

  return (
    <main className="page">
      <NavServer breadcrumbs={[{ label: 'analytics' }]} />

      <div className="page-header">
        <div className="page-tag">insights</div>
        <h1 className="page-title">Analytics</h1>
      </div>

      <AnalyticsClient
        totalCheckpoints={totalCheckpoints}
        totalReasoning={totalReasoning}
        checkpointsByAuthor={checkpointsByAuthor}
        reasoningByRepo={reasoningByRepo}
      />
    </main>
  );
}
