import type { Checkpoint } from './types';

export const demoCheckpoint: Checkpoint = {
  id: 'demo',
  task: 'Build rate limiter for API gateway',
  author: 'Sarah',
  handoffNote:
    'Race condition in step 4 is unresolved — needs fix before ship. The in-memory token bucket approach is solid otherwise. Do NOT reach for Redis (Q3 migration) and keep burst traffic as a soft-reject (queue, not hard 429). SOC2 audit next month: no payload logging.',
  openItems: [
    'Fix race condition when 2 requests arrive at exact same millisecond',
    'Add integration test for burst traffic scenario',
    'Document the constraint reasons in the API spec',
  ],
  constraints: [
    {
      id: 'c1',
      label: 'No Redis',
      reason: 'Q3 infrastructure migration — Redis is being deprecated in favour of the new cache layer. Adding a new Redis dependency now would conflict with that migration.',
    },
    {
      id: 'c2',
      label: 'Soft reject on burst',
      reason: 'Product requirement: hard 429s cause client retries that amplify the spike. Burst traffic should be queued and drained gracefully, not hard-rejected.',
    },
    {
      id: 'c3',
      label: 'No plaintext payload logging',
      reason: 'SOC2 audit is next month. Logging raw request payloads would be a finding. Log metadata only (method, path, status, latency).',
    },
  ],
  deadEnds: [
    {
      id: 'd1',
      title: 'Race condition — mutex lock approach',
      attempts: [
        {
          label: 'Mutex lock around counter',
          outcome: 'Caused timeout under load — p99 latency spiked from 12ms to 340ms in load test. Lock contention too high for the request volume.',
        },
      ],
    },
    {
      id: 'd2',
      title: 'Race condition — compare-and-swap loop',
      attempts: [
        {
          label: 'CAS loop on atomic counter',
          outcome: 'Still drops requests incorrectly under concurrent load. The window between read and write is still exploitable. Needs a different approach — possibly channel-based serialisation.',
        },
      ],
    },
  ],
  steps: [
    {
      id: 's1',
      index: 1,
      type: 'action',
      title: 'Define rate limiter interface',
      reasoning:
        'Started with the public interface before any implementation. Decided on a simple Allow(key string) bool signature so the caller does not need to know the underlying algorithm. This keeps the gateway handler clean.',
      codeSnapshot: `type RateLimiter interface {
  Allow(key string) bool
  Stats() LimiterStats
}

type LimiterStats struct {
  TotalRequests  int64
  AllowedCount   int64
  RejectedCount  int64
}`,
    },
    {
      id: 's2',
      index: 2,
      type: 'constraint',
      title: 'Redis token bucket rejected — using in-memory',
      reasoning:
        'Claude suggested a Redis-backed token bucket as the standard distributed approach. Sarah blocked this: Q3 migration means no new Redis dependencies. Pivoted to in-memory token bucket with the understanding that this is single-node for now (distributed coordination is a post-migration problem).',
      codeSnapshot: `// in-memory token bucket — no Redis
type tokenBucket struct {
  mu       sync.Mutex
  tokens   float64
  maxTokens float64
  refillRate float64 // tokens per second
  lastRefill time.Time
}

func newTokenBucket(rate float64, burst float64) *tokenBucket {
  return &tokenBucket{
    tokens:     burst,
    maxTokens:  burst,
    refillRate: rate,
    lastRefill: time.Now(),
  }
}`,
      constraintIds: ['c1'],
    },
    {
      id: 's3',
      index: 3,
      type: 'action',
      title: 'Implement Allow() with soft-reject burst queue',
      reasoning:
        'Implemented the core Allow() method. When the bucket is empty, instead of returning false immediately (hard reject), requests are queued up to a configurable burst buffer and drained as tokens refill. This satisfies the soft-reject constraint.',
      constraintIds: ['c2'],
      codeSnapshot: `func (tb *tokenBucket) Allow(key string) bool {
  tb.mu.Lock()
  defer tb.mu.Unlock()

  now := time.Now()
  elapsed := now.Sub(tb.lastRefill).Seconds()
  tb.tokens = math.Min(tb.maxTokens, tb.tokens + elapsed*tb.refillRate)
  tb.lastRefill = now

  if tb.tokens >= 1 {
    tb.tokens--
    return true
  }

  // soft reject: queue if burst buffer has space
  if tb.burstQueue.Len() < tb.maxBurst {
    tb.burstQueue.Push(key)
    return true // will be drained async
  }

  return false
}`,
    },
    {
      id: 's4',
      index: 4,
      type: 'dead-end',
      title: 'Race condition under concurrent requests',
      reasoning:
        'Discovered a race condition when two requests arrive within the same millisecond. The refill calculation and token decrement are not atomic even with the mutex — the issue is the burst queue drain goroutine reading tokens concurrently. Two approaches tried, both failed.',
      deadEndId: 'd1',
      codeSnapshot: `// BROKEN: this has a race condition
// goroutine A: reads tokens=0.9, queues request
// goroutine B: reads tokens=0.9 (stale), also queues
// both get through, effective rate exceeded

// attempt 1: mutex around everything — too slow
// attempt 2: CAS on atomic int64 — still racy on drain

// TODO: needs channel-based serialisation
// drain goroutine should be the ONLY writer to tokens`,
    },
    {
      id: 's5',
      index: 5,
      type: 'action',
      title: 'Add structured logging (metadata only)',
      reasoning:
        'Added request logging to the middleware layer. Logged only metadata per the SOC2 constraint: method, path, status code, latency, and whether the request was rate-limited. No body, no query params with PII, no headers.',
      constraintIds: ['c3'],
      codeSnapshot: `func (m *rateLimitMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
  start := time.Now()
  allowed := m.limiter.Allow(r.RemoteAddr)

  if !allowed {
    http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
    m.logger.Info("request rejected",
      "method", r.Method,
      "path",   r.URL.Path,  // no query params
      "status", 429,
      "latency_ms", time.Since(start).Milliseconds(),
      "rate_limited", true,
    )
    return
  }

  m.next.ServeHTTP(w, r)
  // ... log allowed request metadata
}`,
    },
    {
      id: 's6',
      index: 6,
      type: 'decision',
      title: 'Session closed — race condition unresolved',
      reasoning:
        'Sarah closed the session with the race condition still open. The rest of the implementation (interface, token bucket, soft-reject queue, structured logging) is solid. The fix most likely needs a single drain goroutine that owns all token writes, communicated via a channel. James should pick this up.',
      codeSnapshot: `// OPEN: race condition in drain goroutine
// Recommended approach for James:
//   - replace mutex-guarded tokens with a dedicated
//     "limiter goroutine" that serialises all reads/writes
//   - Allow() sends a request on a channel
//   - limiter goroutine responds with allow/deny
//   - eliminates concurrent token access entirely
//
// See: https://pkg.go.dev/golang.org/x/time/rate
// (stdlib leaky bucket uses this pattern)`,
    },
  ],
};

export const checkpoints: Record<string, Checkpoint> = {
  demo: demoCheckpoint,
};
