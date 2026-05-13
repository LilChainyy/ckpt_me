import { DEFAULT_API_URL } from '@ckpt/shared';

export const apiUrl = process.env.CKPT_API_URL ?? DEFAULT_API_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public override cause?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

const BACKOFF_MS = [1000, 2000, 4000];

async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    let res: Response;
    try {
      res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);

      // Last attempt — throw as NetworkError
      if (attempt === maxAttempts - 1) {
        throw new NetworkError(
          `Failed to reach ${url} after ${maxAttempts} attempts`,
          error instanceof Error ? error : undefined,
        );
      }

      await sleep(BACKOFF_MS[attempt]);
      continue;
    }

    // 4xx — don't retry, throw immediately
    if (res.status >= 400 && res.status < 500) {
      const body = await res.text().catch(() => '');
      throw new ApiError(res.status, `${res.status}: ${body || res.statusText}`);
    }

    // 5xx — retry if attempts remain
    if (res.status >= 500) {
      if (attempt === maxAttempts - 1) {
        throw new ApiError(res.status, `Server error ${res.status} after ${maxAttempts} attempts`);
      }
      await sleep(BACKOFF_MS[attempt]);
      continue;
    }

    return res;
  }

  // Unreachable, satisfies TypeScript
  throw new NetworkError('fetchWithRetry: exhausted retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiGet(path: string): Promise<unknown> {
  const res = await fetchWithRetry(`${apiUrl}${path}`, {});
  return res.json();
}

export async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetchWithRetry(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetchWithRetry(`${apiUrl}/api/v1/health`, {});
    return res.ok;
  } catch {
    return false;
  }
}
