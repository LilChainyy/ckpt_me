import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

vi.mock('@/lib/db', () => ({
  prisma: {
    reasoning: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/env', () => ({
  env: {
    GITHUB_WEBHOOK_SECRET: 'test-secret',
    GITHUB_APP_TOKEN: undefined,
  },
}));

// Mock global fetch for GitHub API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { POST } from '../github/webhook/route';
import { prisma } from '@/lib/db';

const mockedPrisma = vi.mocked(prisma);

function sign(body: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function makePRPayload(overrides: Record<string, unknown> = {}) {
  return {
    action: 'opened',
    pull_request: {
      number: 42,
      head: { sha: 'headabc', repo: { full_name: 'owner/repo' } },
      base: { repo: { full_name: 'owner/repo' } },
      commits_url: 'https://api.github.com/repos/owner/repo/pulls/42/commits',
    },
    ...overrides,
  };
}

function makeWebhookRequest(
  body: string,
  event = 'pull_request',
  signature?: string,
) {
  return new NextRequest(
    new URL('http://localhost:3000/api/v1/github/webhook'),
    {
      method: 'POST',
      body,
      headers: {
        'x-github-event': event,
        'x-hub-signature-256': signature ?? sign(body, 'test-secret'),
        'content-type': 'application/json',
      },
    },
  );
}

function mockGithubResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('POST /api/v1/github/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('returns 401 for invalid signature', async () => {
    const body = JSON.stringify(makePRPayload());
    // Use a valid-length but wrong signature (same format as a real one)
    const wrongSignature = sign(body, 'wrong-secret');
    const request = makeWebhookRequest(body, 'pull_request', wrongSignature);

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('ignores non-pull_request events', async () => {
    const body = JSON.stringify({ action: 'push' });
    const request = makeWebhookRequest(body, 'push');

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ignored).toBe(true);
  });

  it('ignores actions other than opened/synchronize', async () => {
    const payload = makePRPayload({ action: 'closed' });
    const body = JSON.stringify(payload);
    const request = makeWebhookRequest(body);

    // No fetch calls should be made for ignored actions
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ignored).toBe(true);
    expect(json.reason).toContain('closed');
  });

  it('returns commented:false when no reasoning records match', async () => {
    const payload = makePRPayload();
    const body = JSON.stringify(payload);

    // GitHub commits endpoint
    mockFetch.mockResolvedValueOnce(
      mockGithubResponse(200, [{ sha: 'commit1' }, { sha: 'commit2' }]),
    );

    mockedPrisma.reasoning.findMany.mockResolvedValue([] as never);

    const request = makeWebhookRequest(body);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.commented).toBe(false);
    expect(json.reason).toContain('no reasoning records');
  });

  it('posts comment when reasoning records exist', async () => {
    const payload = makePRPayload();
    const body = JSON.stringify(payload);

    // GitHub commits endpoint
    mockFetch.mockResolvedValueOnce(
      mockGithubResponse(200, [{ sha: 'commit1' }]),
    );

    mockedPrisma.reasoning.findMany.mockResolvedValue([
      { commitHash: 'commit1', reasoning: 'Refactored auth', author: 'dev' },
    ] as never);

    // Existing comments (no ckpt comment yet)
    mockFetch.mockResolvedValueOnce(
      mockGithubResponse(200, [{ body: 'Some other comment' }]),
    );

    // Post comment
    mockFetch.mockResolvedValueOnce(mockGithubResponse(201, { id: 1 }));

    const request = makeWebhookRequest(body);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.commented).toBe(true);
    expect(json.recordCount).toBe(1);

    // Verify the comment POST call
    const postCall = mockFetch.mock.calls[2];
    expect(postCall[0]).toContain('/issues/42/comments');
    const postOptions = postCall[1];
    expect(postOptions.method).toBe('POST');
    const postBody = JSON.parse(postOptions.body);
    expect(postBody.body).toContain('## ckpt reasoning summary');
  });

  it('returns 502 when GitHub API fails to fetch commits', async () => {
    const payload = makePRPayload();
    const body = JSON.stringify(payload);

    mockFetch.mockResolvedValue(mockGithubResponse(500, { message: 'error' }));

    const request = makeWebhookRequest(body);
    const response = await POST(request);

    expect(response.status).toBe(502);
  });
});
