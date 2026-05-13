interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private max: number;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(options: { windowMs?: number; max?: number } = {}) {
    this.windowMs = options.windowMs ?? 60_000;
    this.max = options.max ?? 100;

    // Clean up expired entries every 60 seconds
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    // Allow the process to exit without waiting for the timer
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    // If no entry or window expired, start a new window
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { success: true, remaining: this.max - 1, resetAt };
    }

    // Within the current window
    entry.count++;

    if (entry.count > this.max) {
      return { success: false, remaining: 0, resetAt: entry.resetAt };
    }

    return { success: true, remaining: this.max - entry.count, resetAt: entry.resetAt };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

/** General API routes: 100 requests per 60s */
export const apiLimiter = new RateLimiter({ max: 100, windowMs: 60_000 });

/** Reasoning sync (expensive): 30 requests per 60s */
export const syncLimiter = new RateLimiter({ max: 30, windowMs: 60_000 });

/** GitHub webhooks: 20 requests per 60s */
export const webhookLimiter = new RateLimiter({ max: 20, windowMs: 60_000 });
