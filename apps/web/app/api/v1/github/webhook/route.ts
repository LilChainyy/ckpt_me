import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { webhookLimiter } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/with-rate-limit';
import crypto from 'crypto';

const WEBHOOK_SECRET = env.GITHUB_WEBHOOK_SECRET;
const APP_TOKEN = env.GITHUB_APP_TOKEN;

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

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxAttempts = 3,
): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  // Unreachable, but satisfies TypeScript
  throw new Error('fetchWithRetry: exhausted retries');
}

async function handlePOST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    const event = request.headers.get('x-github-event');
    if (event !== 'pull_request') {
      return NextResponse.json({ ignored: true, reason: `event type '${event}' not handled` });
    }

    let payload: PullRequestPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
    }

    const { action, pull_request: pr } = payload;

    if (action !== 'opened' && action !== 'synchronize') {
      return NextResponse.json({ ignored: true, reason: `action '${action}' not handled` });
    }

    // Fetch PR commits from GitHub to get all commit hashes
    const repoFullName = pr.base.repo.full_name;
    const prNumber = pr.number;
    const githubHeaders = {
      Accept: 'application/vnd.github+json',
      ...(APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {}),
    };

    const commitsResponse = await fetchWithRetry(
      `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/commits`,
      { headers: githubHeaders },
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

    // Idempotency: check if a ckpt comment already exists on the PR
    const existingCommentsResponse = await fetchWithRetry(
      `https://api.github.com/repos/${repoFullName}/issues/${prNumber}/comments`,
      { headers: githubHeaders },
    );

    if (existingCommentsResponse.ok) {
      const existingComments: { body?: string }[] = await existingCommentsResponse.json();
      const alreadyPosted = existingComments.some(
        (c) => typeof c.body === 'string' && c.body.startsWith('## ckpt reasoning summary'),
      );
      if (alreadyPosted) {
        return NextResponse.json({ commented: false, reason: 'ckpt comment already exists' });
      }
    }

    // Post summary comment to the PR
    const commentBody = formatReasoningComment(records);

    const commentResponse = await fetchWithRetry(
      `https://api.github.com/repos/${repoFullName}/issues/${prNumber}/comments`,
      {
        method: 'POST',
        headers: {
          ...githubHeaders,
          'Content-Type': 'application/json',
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
  } catch (error) {
    logger.error('Internal server error', { route: 'POST /api/v1/github/webhook', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

export const POST = withRateLimit(webhookLimiter, handlePOST);
