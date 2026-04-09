import { getApiUrl } from '../core/config.js';

export async function syncReasoning(records: Record<string, unknown>[]): Promise<string[]> {
  const url = `${getApiUrl()}/api/v1/reasoning/sync`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(`Sync failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = (await response.json()) as { syncedIds: string[] };
    return data.syncedIds ?? [];
  } catch (error) {
    console.error(`Sync error: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}
