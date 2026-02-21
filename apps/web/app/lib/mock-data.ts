import type { Checkpoint } from './types';

// ─── Codebase snapshots ───────────────────────────────────────────────────────
// Each step carries the COMPLETE state of every file at that moment.
// Files accumulate — later steps include all files from earlier steps,
// with modifications where relevant.

const s1_files = {
  'ratelimiter/types.go': `package ratelimiter

// RateLimiter is the public interface consumed by the gateway middleware.
// Callers only need Allow() — they don't need to know the algorithm.
type RateLimiter interface {
\tAllow(key string) bool
\tStats() LimiterStats
}

// LimiterStats holds counters for observability.
type LimiterStats struct {
\tTotalRequests int64
\tAllowedCount  int64
\tRejectedCount int64
}`,

  'go.mod': `module github.com/example/api-gateway

go 1.22`,
};

const s2_files = {
  ...s1_files,

  'ratelimiter/bucket.go': `package ratelimiter

import (
\t"sync"
\t"time"
)

// tokenBucket is an in-memory token bucket implementation.
// NOTE: no Redis — see constraint C1 (Q3 migration).
type tokenBucket struct {
\tmu         sync.Mutex
\ttokens     float64
\tmaxTokens  float64
\trefillRate float64 // tokens per second
\tlastRefill time.Time
}

func newTokenBucket(rate float64, burst float64) *tokenBucket {
\treturn &tokenBucket{
\t\ttokens:     burst,
\t\tmaxTokens:  burst,
\t\trefillRate: rate,
\t\tlastRefill: time.Now(),
\t}
}`,
};

const s3_files = {
  ...s2_files,

  // bucket.go grows: adds burstQueue field + Allow() method
  'ratelimiter/bucket.go': `package ratelimiter

import (
\t"container/list"
\t"math"
\t"sync"
\t"time"
)

// tokenBucket is an in-memory token bucket implementation.
// NOTE: no Redis — see constraint C1 (Q3 migration).
type tokenBucket struct {
\tmu         sync.Mutex
\ttokens     float64
\tmaxTokens  float64
\trefillRate float64 // tokens per second
\tlastRefill time.Time

\t// burst queue — soft-reject: queue requests instead of hard 429
\t// see constraint C2
\tburstQueue *list.List
\tmaxBurst   int
}

func newTokenBucket(rate float64, burst float64, maxBurst int) *tokenBucket {
\treturn &tokenBucket{
\t\ttokens:     burst,
\t\tmaxTokens:  burst,
\t\trefillRate: rate,
\t\tlastRefill: time.Now(),
\t\tburstQueue: list.New(),
\t\tmaxBurst:   maxBurst,
\t}
}

// Allow returns true if the request should proceed.
// When the bucket is empty, requests are queued up to maxBurst
// and drained as tokens refill — no hard 429s on burst traffic.
func (tb *tokenBucket) Allow(key string) bool {
\ttb.mu.Lock()
\tdefer tb.mu.Unlock()

\tnow := time.Now()
\telapsed := now.Sub(tb.lastRefill).Seconds()
\ttb.tokens = math.Min(tb.maxTokens, tb.tokens+elapsed*tb.refillRate)
\ttb.lastRefill = now

\tif tb.tokens >= 1 {
\t\ttb.tokens--
\t\treturn true
\t}

\t// soft reject: queue if burst buffer has space
\tif tb.burstQueue.Len() < tb.maxBurst {
\t\ttb.burstQueue.PushBack(key)
\t\treturn true // will be drained async
\t}

\treturn false
}

// Stats implements RateLimiter.
func (tb *tokenBucket) Stats() LimiterStats {
\ttb.mu.Lock()
\tdefer tb.mu.Unlock()
\treturn tb.stats
}`,
};

const s4_files = {
  ...s3_files,

  // bucket.go: adds broken drain goroutine that races
  'ratelimiter/bucket.go': `package ratelimiter

import (
\t"container/list"
\t"math"
\t"sync"
\t"time"
)

type tokenBucket struct {
\tmu         sync.Mutex
\ttokens     float64
\tmaxTokens  float64
\trefillRate float64
\tlastRefill time.Time
\tburstQueue *list.List
\tmaxBurst   int
\tstats      LimiterStats
}

func newTokenBucket(rate float64, burst float64, maxBurst int) *tokenBucket {
\ttb := &tokenBucket{
\t\ttokens:     burst,
\t\tmaxTokens:  burst,
\t\trefillRate: rate,
\t\tlastRefill: time.Now(),
\t\tburstQueue: list.New(),
\t\tmaxBurst:   maxBurst,
\t}
\tgo tb.drainLoop() // BUG: races with Allow()
\treturn tb
}

func (tb *tokenBucket) Allow(key string) bool {
\ttb.mu.Lock()
\tdefer tb.mu.Unlock()

\tnow := time.Now()
\telapsed := now.Sub(tb.lastRefill).Seconds()
\ttb.tokens = math.Min(tb.maxTokens, tb.tokens+elapsed*tb.refillRate)
\ttb.lastRefill = now

\ttb.stats.TotalRequests++

\tif tb.tokens >= 1 {
\t\ttb.tokens--
\t\ttb.stats.AllowedCount++
\t\treturn true
\t}

\tif tb.burstQueue.Len() < tb.maxBurst {
\t\ttb.burstQueue.PushBack(key)
\t\ttb.stats.AllowedCount++
\t\treturn true
\t}

\ttb.stats.RejectedCount++
\treturn false
}

// drainLoop reads tokens WITHOUT holding the mutex — RACE CONDITION.
// goroutine A (Allow): reads tokens=0.9, queues request
// goroutine B (drainLoop): reads tokens=0.9 (stale), decrements
// result: both proceed, effective rate exceeded
func (tb *tokenBucket) drainLoop() {
\tfor {
\t\ttime.Sleep(10 * time.Millisecond)
\t\t// BUG: not holding tb.mu here
\t\tif tb.tokens >= 1 && tb.burstQueue.Len() > 0 {
\t\t\ttb.tokens-- // unsynchronised write
\t\t\ttb.burstQueue.Remove(tb.burstQueue.Front())
\t\t}
\t}
}

func (tb *tokenBucket) Stats() LimiterStats {
\ttb.mu.Lock()
\tdefer tb.mu.Unlock()
\treturn tb.stats
}`,
};

const s5_files = {
  ...s4_files,

  // middleware.go is new — structured logging with metadata only (no payloads)
  'gateway/middleware.go': `package gateway

import (
\t"log/slog"
\t"net/http"
\t"time"

\t"github.com/example/api-gateway/ratelimiter"
)

type rateLimitMiddleware struct {
\tnext    http.Handler
\tlimiter ratelimiter.RateLimiter
\tlogger  *slog.Logger
}

func NewRateLimitMiddleware(
\tnext http.Handler,
\tlimiter ratelimiter.RateLimiter,
\tlogger *slog.Logger,
) http.Handler {
\treturn &rateLimitMiddleware{next: next, limiter: limiter, logger: logger}
}

func (m *rateLimitMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
\tstart := time.Now()
\tallowed := m.limiter.Allow(r.RemoteAddr)

\tif !allowed {
\t\thttp.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
\t\t// SOC2: log metadata only — no body, no query params, no headers
\t\tm.logger.Info("request rejected",
\t\t\t"method",      r.Method,
\t\t\t"path",        r.URL.Path, // path only, not full URL (strips query)
\t\t\t"status",      429,
\t\t\t"latency_ms",  time.Since(start).Milliseconds(),
\t\t\t"rate_limited", true,
\t\t)
\t\treturn
\t}

\trw := &responseWriter{ResponseWriter: w, status: 200}
\tm.next.ServeHTTP(rw, r)

\tm.logger.Info("request allowed",
\t\t"method",     r.Method,
\t\t"path",       r.URL.Path,
\t\t"status",     rw.status,
\t\t"latency_ms", time.Since(start).Milliseconds(),
\t)
}

type responseWriter struct {
\thttp.ResponseWriter
\tstatus int
}

func (rw *responseWriter) WriteHeader(code int) {
\trw.status = code
\trw.ResponseWriter.WriteHeader(code)
}`,

  'go.mod': `module github.com/example/api-gateway

go 1.22

require log/slog v0.0.0 // stdlib in Go 1.21+`,
};

const s6_files = {
  ...s5_files,

  // Add a TODO file documenting the open race condition for James
  'ratelimiter/TODO.md': `# Open: race condition in drainLoop

## Status
UNRESOLVED — session closed with this bug present.

## What's broken
\`drainLoop()\` in \`bucket.go\` reads and writes \`tb.tokens\` without holding
\`tb.mu\`. When two goroutines race (Allow + drainLoop), both can see
\`tokens >= 1\` and both proceed — effective rate exceeded.

## What was tried
1. **Mutex around drainLoop body** — caused p99 latency spike 12ms → 340ms
   under load. Lock contention too high.
2. **atomic.Int64 + CAS loop** — still racy on drain because the window
   between read and write in the CAS loop is exploitable.

## Recommended fix for James
Replace the shared \`tokens\` float64 with a dedicated **limiter goroutine**
that is the ONLY reader/writer of the token state:

\`\`\`
Allow() ──── request chan ────► limiter goroutine ──── response chan ────► caller
\`\`\`

The limiter goroutine serialises all reads and writes. No mutex needed.
stdlib reference: https://pkg.go.dev/golang.org/x/time/rate`,
};

// ─── Checkpoint ──────────────────────────────────────────────────────────────

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
      files: Object.entries(s1_files).map(([path, content]) => ({ path, content })),
      changedFiles: ['ratelimiter/types.go', 'go.mod'],
    },
    {
      id: 's2',
      index: 2,
      type: 'constraint',
      title: 'Redis token bucket rejected — using in-memory',
      reasoning:
        'Claude suggested a Redis-backed token bucket as the standard distributed approach. Sarah blocked this: Q3 migration means no new Redis dependencies. Pivoted to in-memory token bucket with the understanding that this is single-node for now (distributed coordination is a post-migration problem).',
      constraintIds: ['c1'],
      files: Object.entries(s2_files).map(([path, content]) => ({ path, content })),
      changedFiles: ['ratelimiter/bucket.go'],
    },
    {
      id: 's3',
      index: 3,
      type: 'action',
      title: 'Implement Allow() with soft-reject burst queue',
      reasoning:
        'Implemented the core Allow() method. When the bucket is empty, instead of returning false immediately (hard reject), requests are queued up to a configurable burst buffer and drained as tokens refill. This satisfies the soft-reject constraint.',
      constraintIds: ['c2'],
      files: Object.entries(s3_files).map(([path, content]) => ({ path, content })),
      changedFiles: ['ratelimiter/bucket.go'],
    },
    {
      id: 's4',
      index: 4,
      type: 'dead-end',
      title: 'Race condition under concurrent requests',
      reasoning:
        'Discovered a race condition when two requests arrive within the same millisecond. The refill calculation and token decrement are not atomic even with the mutex — the issue is the burst queue drain goroutine reading tokens concurrently. Two approaches tried, both failed.',
      deadEndId: 'd1',
      files: Object.entries(s4_files).map(([path, content]) => ({ path, content })),
      changedFiles: ['ratelimiter/bucket.go'],
    },
    {
      id: 's5',
      index: 5,
      type: 'action',
      title: 'Add structured logging (metadata only)',
      reasoning:
        'Added request logging to the middleware layer. Logged only metadata per the SOC2 constraint: method, path, status code, latency, and whether the request was rate-limited. No body, no query params with PII, no headers.',
      constraintIds: ['c3'],
      files: Object.entries(s5_files).map(([path, content]) => ({ path, content })),
      changedFiles: ['gateway/middleware.go', 'go.mod'],
    },
    {
      id: 's6',
      index: 6,
      type: 'decision',
      title: 'Session closed — race condition unresolved',
      reasoning:
        'Sarah closed the session with the race condition still open. The rest of the implementation (interface, token bucket, soft-reject queue, structured logging) is solid. The fix most likely needs a single drain goroutine that owns all token writes, communicated via a channel. James should pick this up.',
      files: Object.entries(s6_files).map(([path, content]) => ({ path, content })),
      changedFiles: ['ratelimiter/TODO.md'],
    },
  ],
};

export const checkpoints: Record<string, Checkpoint> = {
  demo: demoCheckpoint,
};
