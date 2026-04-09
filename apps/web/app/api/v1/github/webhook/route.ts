import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const APP_TOKEN = process.env.GITHUB_APP_TOKEN;

function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return !WEBHOOK_SECRET;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature),
  );
}

interface PullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    head: {
      sha: string;
      repo: {
        full_name: string;
      };
    };
    base: {
      repo: {
        full_name: string;
      };
    };
    commits_url: string;
  };
}

function formatReasoningComment(records: { commitHash: string; reasoning: string | null; author: string | null }[]): string {
  const lines = ['## ckpt reasoning summary\n'];

  for (const record of records) {
    const shortHash = record.commitHash.slice(0, 7);
    lines.push(`### \`${shortHash}\` (${record.author ?? 'unknown'})`);
    lines.push(record.reasoning ?? '_No reasoning recorded._');
    lines.push('');
  }

  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const event = request.headers.get('x-github-event');
  if (event !== 'pull_request') {
    return NextResponse.json({ ignored: true, reason: `event type '${event}' not handled` });
  }

  const payload: PullRequestPayload = JSON.parse(rawBody);
  const { action, pull_request: pr } = payload;

  if (action !== 'opened' && action !== 'synchronize') {
    return NextResponse.json({ ignored: true, reason: `action '${action}' not handled` });
  }

  // Fetch PR commits from GitHub to get all commit hashes
  const repoFullName = pr.base.repo.full_name;
  const prNumber = pr.number;

  const commitsResponse = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/commits`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {}),
      },
    },
  );

  if (!commitsResponse.ok) {
    return NextResponse.json(
      { error: 'failed to fetch PR commits from GitHub' },
      { status: 502 },
    );
  }

  const commits: { sha: string }[] = await commitsResponse.json();
  const commitHashes = commits.map((c) => c.sha);

  // Look up reasoning records matching those commit hashes
  const records = await prisma.reasoning.findMany({
    where: { commitHash: { in: commitHashes } },
    orderBy: { timestamp: 'asc' },
  });

  if (records.length === 0) {
    return NextResponse.json({ commented: false, reason: 'no reasoning records found for PR commits' });
  }

  // Post summary comment to the PR
  const commentBody = formatReasoningComment(records);

  const commentResponse = await fetch(
    `https://api.github.com/repos/${repoFullName}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        ...(APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {}),
      },
      body: JSON.stringify({ body: commentBody }),
    },
  );

  if (!commentResponse.ok) {
    return NextResponse.json(
      { error: 'failed to post comment to GitHub' },
      { status: 502 },
    );
  }

  return NextResponse.json({ commented: true, recordCount: records.length });
}
