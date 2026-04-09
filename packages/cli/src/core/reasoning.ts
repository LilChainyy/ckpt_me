import type { LocalStore } from '../storage/local.js';

export function resolveReasoning(
  flagValue: string | undefined,
  store?: LocalStore
): string | undefined {
  if (flagValue) return flagValue;

  // Check for piped stdin
  if (!process.stdin.isTTY) {
    try {
      const { readFileSync } = require('fs');
      const input = readFileSync(0, 'utf-8').trim();
      if (input) return input;
    } catch {
      // stdin not available
    }
  }

  // Check staging records
  if (store) {
    const staging = store.getStagingReasoning();
    if (staging) return staging;
  }

  return undefined;
}
