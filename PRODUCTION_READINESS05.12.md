# ckpt — Production Readiness Guide

Step-by-step instructions to take ckpt from working prototype to production-ready MVP. Each phase is designed to be executed as a single Claude Code prompt. Copy the prompt, paste it into Claude Code at the repo root, and let it run.

---

## Phase 1: Error Handling & Resilience

**Why first:** Every API route currently has zero try-catch blocks. A single database timeout or malformed JSON body will crash with an unhandled exception and return a 500 with a stack trace. This is the highest-risk gap.

**Scope:** All 9 API route files + MCP server + API client.

### Prompt

```
I need you to add proper error handling to every API route and the MCP server in this project. Here's what exists today:

**API routes (all have zero try-catch, any Prisma or JSON parse error crashes):**
- apps/web/app/api/v1/reasoning/sync/route.ts (POST)
- apps/web/app/api/v1/reasoning/route.ts (GET)
- apps/web/app/api/v1/reasoning/[commitHash]/route.ts
- apps/web/app/api/v1/checkpoints/route.ts (GET, POST)
- apps/web/app/api/v1/checkpoints/[id]/route.ts (GET, PUT)
- apps/web/app/api/v1/checkpoints/[id]/comments/route.ts (GET, POST)
- apps/web/app/api/v1/checkpoints/[id]/versions/route.ts
- apps/web/app/api/v1/teams/route.ts
- apps/web/app/api/v1/github/webhook/route.ts (POST — also needs retry logic for GitHub API calls)
- apps/web/app/api/v1/webhook/route.ts

**MCP server (tool handlers have no try-catch, errors propagate as unhandled rejections):**
- packages/mcp/src/index.ts — all 4 tool handlers
- packages/mcp/src/client.ts — apiGet/apiPost throw on non-ok but caller never catches

**Requirements:**

1. Wrap every route handler body in try-catch. Catch blocks should:
   - Log the error with `console.error` and include the route name for grep-ability, e.g. `console.error('[POST /api/v1/reasoning/sync]', error)`
   - Return `NextResponse.json({ error: 'internal server error' }, { status: 500 })` — never leak stack traces
   - For JSON parse errors specifically (`request.json()` can throw), return 400 with `{ error: 'invalid JSON body' }`

2. For the GitHub webhook route (`apps/web/app/api/v1/github/webhook/route.ts`):
   - Add retry logic (3 attempts, 1s delay) for the two `fetch()` calls to GitHub API
   - Add a 10-second timeout using AbortController on each fetch
   - Add idempotency: before posting a comment, check if a ckpt comment already exists on the PR (fetch existing comments, look for one starting with "## ckpt reasoning summary")

3. For MCP tool handlers in `packages/mcp/src/index.ts`:
   - Wrap each tool handler in try-catch
   - On error, return `{ content: [{ type: 'text', text: 'Error: <message>' }], isError: true }`
   - In `packages/mcp/src/client.ts`, add a 15-second timeout via AbortController to both apiGet and apiPost

4. Do NOT add any new dependencies. Use only built-in Node APIs (AbortController, setTimeout).

5. Do NOT change any business logic, Zod schemas, or response shapes for success cases.

After making changes, run `pnpm build` and `pnpm test` to verify nothing breaks. Fix any type errors.
```

---

## Phase 2: Database Migrations

**Why:** The project uses `prisma db push` which doesn't create migration files. Production databases need versioned, repeatable migrations.

### Prompt

```
Set up proper Prisma migrations for this project. The schema is at apps/web/prisma/schema.prisma and currently uses `prisma db push` with no migration history.

**Steps:**

1. Create a baseline migration from the current schema:
   ```
   cd apps/web && npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0001_baseline/migration.sql
   ```
   Create the directory structure `prisma/migrations/0001_baseline/` first.

2. Create a `prisma/migrations/migration_lock.toml` with:
   ```toml
   provider = "postgresql"
   ```

3. Add convenience scripts to `apps/web/package.json`:
   ```json
   "db:migrate:dev": "prisma migrate dev",
   "db:migrate:deploy": "prisma migrate deploy",
   "db:migrate:status": "prisma migrate status",
   "db:seed": "tsx prisma/seed.ts",
   "db:studio": "prisma studio"
   ```

4. Create a seed file at `apps/web/prisma/seed.ts` that inserts minimal test data:
   - 1 Reasoning record with a fake commit hash
   - 1 Checkpoint with a task, author, one constraint, one dead end, and a handoff note
   This is for local dev only — guard it with a check that DATABASE_URL contains "localhost" or "127.0.0.1".

5. Add to `apps/web/package.json`:
   ```json
   "prisma": {
     "seed": "tsx prisma/seed.ts"
   }
   ```

6. Verify by running `pnpm build` from the root.

Do NOT run `prisma migrate dev` or connect to any database — just generate the migration SQL file from the schema. The developer will run the actual migration themselves.
```

---

## Phase 3: CI/CD Pipeline

**Why:** No automated checks exist. A single PR can break the build with no one noticing until deploy.

### Prompt

```
Create a GitHub Actions CI pipeline for this pnpm monorepo. There is no existing .github directory.

**Create `.github/workflows/ci.yml`:**

Trigger on: push to `main`, pull requests to `main`.

Jobs:

1. **lint-typecheck-test** (runs on ubuntu-latest):
   - Checkout code
   - Setup Node 22 via actions/setup-node@v4
   - Setup pnpm 9 via pnpm/action-setup@v4
   - Cache pnpm store (use `pnpm store path` for cache key)
   - `pnpm install --frozen-lockfile`
   - `pnpm lint`
   - `pnpm build` (needed before typecheck since shared must build first)
   - `pnpm typecheck`
   - `pnpm test`

2. **build-check** (runs on ubuntu-latest, needs lint-typecheck-test):
   - Same setup steps
   - `pnpm install --frozen-lockfile`
   - `pnpm build`
   - Verify the build succeeded (exit code 0 is sufficient)

Environment variables needed for build (set as env, not secrets — these are just for the build to pass type checking):
```yaml
env:
  DATABASE_URL: "postgresql://fake:fake@localhost:5432/fake"
  NEXTAUTH_SECRET: "ci-test-secret"
  NEXTAUTH_URL: "http://localhost:3000"
```

**Also create `.github/workflows/deploy.yml`:**

Trigger on: push to `main` (after CI passes).

This should be a placeholder that documents the Vercel deployment step:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: []
    steps:
      - name: Deploy to Vercel
        run: echo "TODO - Connect Vercel GitHub integration or add vercel CLI deploy here"
```

Do NOT add any secrets or tokens. Do NOT install extra actions beyond the ones listed. Keep it minimal and working.

After creating the files, verify YAML syntax is valid by checking indentation carefully.
```

---

## Phase 4: Request Logging & Startup Validation

**Why:** When something goes wrong in production, you currently have zero visibility. No request logs, no env var validation at startup.

### Prompt

```
Add request logging and environment variable validation to the Next.js app. No external dependencies.

**Part 1: Request logging middleware**

Create `apps/web/middleware.ts` (Next.js middleware at the app root):

```ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  
  // Log after response is prepared
  const duration = Date.now() - start;
  const log = {
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(log));
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

**Part 2: Environment variable validation**

Create `apps/web/lib/env.ts`:

Define a Zod schema that validates all required env vars at import time. Required vars:
- `DATABASE_URL` (string, starts with "postgresql://")
- `NEXTAUTH_SECRET` (string, min 16 chars)

Optional vars (validated format if present):
- `GITHUB_ID` (string)
- `GITHUB_SECRET` (string)
- `GITHUB_WEBHOOK_SECRET` (string)
- `GITHUB_APP_TOKEN` (string, starts with "github_" or "ghp_" if present)
- `NEXTAUTH_URL` (string, valid URL if present)

The module should:
- Parse `process.env` against the schema
- Export a typed `env` object
- Log a clear error message listing which vars failed and exit if validation fails in production (`NODE_ENV === 'production'`)
- In development, log warnings but don't exit

**Part 3: Use the validated env**

Update `apps/web/lib/db.ts` to import DATABASE_URL from `./env` instead of relying on process.env directly through Prisma.

Update `apps/web/app/api/v1/github/webhook/route.ts` to import GITHUB_WEBHOOK_SECRET and GITHUB_APP_TOKEN from `@/lib/env` instead of reading process.env at module level.

Run `pnpm build` and `pnpm test` to verify.
```

---

## Phase 5: Rate Limiting

**Why:** All API routes are completely open. A single bot or misbehaving client can overwhelm the database.

### Prompt

```
Add in-memory rate limiting to the API routes. No external dependencies — use a simple sliding window counter in memory.

**Create `apps/web/lib/rate-limit.ts`:**

Implement a rate limiter class:
- Uses a Map<string, { count: number; resetAt: number }> for tracking
- Key is IP address (from x-forwarded-for header or request.ip)
- Configurable window (default 60s) and max requests (default 100)
- Returns { success: boolean; remaining: number; resetAt: number }
- Cleans up expired entries every 60 seconds to prevent memory leaks
- Export pre-configured instances:
  - `apiLimiter` — 100 requests per 60s (general API)
  - `syncLimiter` — 30 requests per 60s (reasoning sync, more expensive)
  - `webhookLimiter` — 20 requests per 60s (GitHub webhooks)

**Create `apps/web/lib/with-rate-limit.ts`:**

A helper that wraps a route handler:
```ts
export function withRateLimit(limiter: RateLimiter, handler: RouteHandler): RouteHandler
```

It should:
- Extract IP from request headers
- Check the limiter
- If rate limited, return 429 with `{ error: 'too many requests' }` and `Retry-After` header
- If allowed, add `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers to the response
- Call the original handler

**Apply rate limiting to these routes:**
- All routes under `apps/web/app/api/v1/reasoning/` — use `syncLimiter`
- All routes under `apps/web/app/api/v1/checkpoints/` — use `apiLimiter`
- `apps/web/app/api/v1/github/webhook/route.ts` — use `webhookLimiter`

Apply by wrapping the exported handler functions. Keep the existing function signatures and logic unchanged.

Run `pnpm build` and `pnpm test` after.
```

---

## Phase 6: MCP Server Resilience

**Why:** If the API is down, every MCP tool call fails silently with an unhandled error. The agent using the tools gets no useful feedback.

### Prompt

```
Make the MCP server in packages/mcp more resilient for production use.

**Current state:**
- packages/mcp/src/client.ts has bare fetch calls with no timeout, no retry
- packages/mcp/src/index.ts tool handlers don't catch errors (Phase 1 should have added basic try-catch — build on that)

**Changes to packages/mcp/src/client.ts:**

1. Add retry logic: 3 attempts with exponential backoff (1s, 2s, 4s) for network errors and 5xx responses. Don't retry 4xx.
2. Add 15s timeout via AbortController on every request.
3. Add a `healthCheck()` function that calls GET /api/v1/health and returns boolean.
4. Add structured error types:
```ts
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

**Changes to packages/mcp/src/index.ts:**

1. On server startup (in `main()`), run a health check and log the result (don't fail if unhealthy — just warn).
2. In each tool handler's catch block, distinguish between ApiError and NetworkError to give the agent a more useful error message:
   - NetworkError: "ckpt API is unreachable at {url}. Check CKPT_API_URL and network connectivity."
   - ApiError 4xx: "Request rejected: {message}"
   - ApiError 5xx: "ckpt API error (will retry automatically on next call)"

3. Log errors to stderr so they don't interfere with MCP stdio transport.

Do NOT add any npm dependencies. Run `pnpm --filter @ckpt/mcp build` to verify.
```

---

## Phase 7: Tests for Critical Paths

**Why:** Only 5 test files exist. The core sync and webhook flows have minimal coverage.

### Prompt

```
Add integration tests for the critical API routes. The project uses vitest. Existing tests are in:
- apps/web/app/api/v1/__tests__/checkpoints.test.ts
- apps/web/app/api/v1/__tests__/reasoning-sync.test.ts
- apps/web/app/api/v1/__tests__/health.test.ts
- packages/shared/src/__tests__/schemas.test.ts
- packages/shared/src/__tests__/constants.test.ts

Look at the existing test files to understand the mocking patterns (they likely mock Prisma). Follow the same patterns.

**Add these test files:**

1. `apps/web/app/api/v1/__tests__/reasoning-query.test.ts`
   Test the GET /api/v1/reasoning route:
   - Returns records with default limit
   - Filters by repo query param
   - Filters by author query param
   - Filters by since (date) query param
   - Respects limit param, clamps to 1-500 range
   - Returns empty array when no matches
   - Returns 500 on database error (if Phase 1 error handling is in place)

2. `apps/web/app/api/v1/__tests__/checkpoint-crud.test.ts`
   Test GET/PUT on /api/v1/checkpoints/[id]:
   - GET returns 404 for non-existent id
   - GET returns checkpoint data for valid id
   - PUT validates input with Zod, returns 400 for invalid
   - PUT returns 404 for non-existent id
   - PUT creates a version snapshot before updating
   - PUT returns updated checkpoint

3. `apps/web/app/api/v1/__tests__/comments.test.ts`
   Test /api/v1/checkpoints/[id]/comments:
   - GET returns comments with user info
   - POST requires auth (returns 401 without session)
   - POST validates body (returns 400 for empty body)
   - POST returns 404 if checkpoint doesn't exist
   - POST creates comment and returns it with 201

4. `apps/web/app/api/v1/__tests__/github-webhook.test.ts`
   Test /api/v1/github/webhook:
   - Returns 401 for invalid signature
   - Ignores non-pull_request events
   - Ignores actions other than opened/synchronize
   - Returns { commented: false } when no reasoning records match PR commits
   - Posts comment when reasoning records exist (mock the GitHub API fetch calls)
   - Handles GitHub API failure gracefully (returns 502)

5. `packages/mcp/src/__tests__/client.test.ts`
   Test the API client:
   - apiGet makes GET request to correct URL
   - apiPost sends JSON body
   - Both throw on non-ok response
   - Both respect timeout (if AbortController was added in Phase 6)

Use `vi.mock()` for Prisma and external fetch calls. Don't make real HTTP requests or database calls.

Run `pnpm test` after to verify all tests pass.
```

---

## Phase 8: Vercel Deployment Configuration

**Why:** The project targets Vercel but has zero deployment configuration.

### Prompt

```
Configure the project for Vercel deployment. The app to deploy is apps/web (Next.js 15).

**Create `vercel.json` at the repo root:**

```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

**Update `apps/web/next.config.ts`:**

The current config is essentially empty. Update it to:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Output standalone build for containerized deployments
  output: 'standalone',
  
  // Strict mode for catching issues early
  reactStrictMode: true,
  
  // Transpile workspace packages
  transpilePackages: ['@ckpt/shared'],
  
  // Security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Create `apps/web/.env.production.example`:**

Document every env var needed for production:
```
# Required
DATABASE_URL=               # Neon Postgres connection string
NEXTAUTH_SECRET=            # Random 32+ char secret (openssl rand -base64 32)
NEXTAUTH_URL=               # Production URL (https://your-domain.com)

# GitHub OAuth (required for auth)
GITHUB_ID=                  # GitHub OAuth App client ID
GITHUB_SECRET=              # GitHub OAuth App client secret

# GitHub Integration (required for PR comments)
GITHUB_WEBHOOK_SECRET=      # Webhook secret configured in GitHub App
GITHUB_APP_TOKEN=           # GitHub App installation token or PAT
```

**Update turbo.json:**

Add NEXTAUTH_URL to the env list if not already there. Add NODE_ENV.

Run `pnpm build` to verify.
```

---

## Phase 9: Health Check & Monitoring Foundation

**Why:** You need a way to know if the app is healthy after deploying, and a pattern for adding monitoring later.

### Prompt

```
Enhance the health check endpoint and add basic monitoring hooks.

**Update `apps/web/app/api/v1/health/route.ts`:**

Currently it's minimal. Make it check actual system health:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? 'unknown',
    uptime: process.uptime(),
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch (error) {
    health.status = 'degraded';
    health.database = 'disconnected';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
```

**Create `apps/web/lib/logger.ts`:**

A minimal structured logger that outputs JSON to stdout (Vercel captures this):

```ts
type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  const output = level === 'error' ? console.error : console.log;
  output(JSON.stringify(entry));
}

export const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
};
```

**Replace console.error calls in API routes:**

Go through every `console.error` that was added in Phase 1 and replace with `logger.error`. Import from `@/lib/logger`.

This gives structured JSON logs that Vercel, Datadog, or any log aggregator can parse.

Run `pnpm build` and `pnpm test` to verify.
```

---

## Execution Order & Dependencies

```
Phase 1 (Error Handling)     — no dependencies, do first
Phase 2 (DB Migrations)      — no dependencies, can parallel with 1
Phase 3 (CI/CD)              — no dependencies, can parallel with 1-2
Phase 4 (Logging & Env)      — after Phase 1 (replaces console.error calls)
Phase 5 (Rate Limiting)      — after Phase 1 (wraps route handlers)
Phase 6 (MCP Resilience)     — after Phase 1 (builds on try-catch)
Phase 7 (Tests)              — after Phases 1, 5, 6 (tests the new error paths)
Phase 8 (Vercel Config)      — after Phase 4 (uses env validation)
Phase 9 (Health & Logging)   — after Phase 4 (replaces console calls)
```

Recommended order if doing sequentially: **1 → 2 → 3 → 4 → 9 → 5 → 6 → 7 → 8**

After all phases, run the full verification:
```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```
