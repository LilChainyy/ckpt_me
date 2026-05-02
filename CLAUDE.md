# ckpt

The reasoning layer for every code change. Captures *why* code changed — constraints, dead ends, reasoning — and surfaces it in pull requests.

## Current Focus

**Phase 1: End-to-end capture and share.** MCP captures reasoning → API stores it → brief page shows it via shareable link.

Everything else (compare view, timeline, analytics, compose, dashboard, auth) is disabled/hidden until Phase 1 is validated.

## Monorepo Structure

```
apps/
  web/       → Next.js 15 frontend + API routes (deployed to Vercel)
packages/
  shared/    → @ckpt/shared (types, Zod schemas, constants)
  cli/       → @ckpt/cli (TypeScript CLI, local SQLite)
  mcp/       → @ckpt/mcp (MCP server — the core product)
```

Full-stack TypeScript. API routes live in `apps/web/app/api/`.

## Database

Prisma ORM with Neon Postgres (prod) / SQLite (dev). Schema at `apps/web/prisma/schema.prisma`.

## The Core Loop

```
AI agent (Claude Code / Cursor / Codex)
  → calls ckpt MCP tools (save_reasoning, mark_dead_end, add_constraint)
  → reasoning syncs to API
  → brief page shows it (public, no auth)
  → GitHub App posts it as a PR comment
```

## Key Files

- `packages/mcp/src/index.ts` — MCP server with 4 tools. This IS the product.
- `packages/mcp/src/client.ts` — API client for MCP server
- `apps/web/app/api/v1/reasoning/sync/route.ts` — sync endpoint
- `apps/web/app/api/v1/checkpoints/route.ts` — checkpoint CRUD
- `apps/web/app/api/v1/github/webhook/route.ts` — GitHub PR integration
- `apps/web/app/checkpoint/[id]/brief/page.tsx` — the shareable brief page

## Agents

Specialized agents live in `.claude/agents/`. Use them via the Task tool for domain-specific work:

- **api-engineer** — Backend work in `apps/web/app/api/`: endpoints, Prisma queries, validation
- **frontend-engineer** — Frontend work in `apps/web`: React components, pages, styling

## Conventions

- Keep changes scoped — prefer editing existing files over creating new ones
- Ask for clarification on ambiguous requests instead of assuming
- Readability and maintainability over cleverness
- All types come from `@ckpt/shared` — never duplicate type definitions
- Validate API inputs with Zod schemas from `@ckpt/shared`
- Tests go in `__tests__/` directories next to the code they test (vitest)

## Don'ts

- Don't build new UI pages — Phase 1 only needs the brief page
- Don't add auth/login flows — brief pages are public for now
- Don't use mock data — DEMO_MODE should be off, use real Prisma data
- Don't put API logic in React components — keep it in API routes and lib/api.ts
- Don't hardcode secrets — always use env variables
- Don't create features from the old PRD phases (compare, analytics, teams) — those are Phase 4+

## Disabled Pages (don't delete, just hidden from nav)

- `/compose` — handoff composer
- `/compare` — side-by-side comparison
- `/analytics` — reasoning analytics
- `/checkpoint/[id]/timeline` — step timeline
- `/checkpoint/[id]/history` — version history
- `/dashboard` — authenticated dashboard
