import { DEFAULT_API_URL } from '@ckpt/shared';

const apiUrl = process.env.CKPT_API_URL ?? DEFAULT_API_URL;

export async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${apiUrl}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
