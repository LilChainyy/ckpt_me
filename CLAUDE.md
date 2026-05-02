# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ckpt

The reasoning layer for every code change. Captures *why* code changed — constraints, dead ends, reasoning — and surfaces it in pull requests.

## Current Focus

**Phase 1: End-to-end capture and share.** MCP captures reasoning → API stores it → brief page shows it via shareable link.

Everything else (compare view, timeline, analytics, compose, dashboard, auth) is disabled/hidden until Phase 1 is validated.

## Commands

This is a pnpm monorepo orchestrated by Turborepo. Node 22.

```bash
pnpm install              # Install all dependencies
pnpm build                # Build all packages (turbo)
pnpm dev                  # Dev mode for all packages (turbo)
pnpm lint                 # Lint all packages (turbo)
pnpm typecheck            # Type-check all packages (turbo, depends on build)

# Testing (vitest)
pnpm test                 # Run all tests once
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Run tests with v8 coverage
npx vitest run packages/shared/src/__tests__/schemas.test.ts  # Run a single test file

# Database (Prisma, from apps/web)
cd apps/web && npx prisma generate   # Generate Prisma client
cd apps/web && npx prisma db push    # Push schema to database
cd apps/web && npx prisma studio     # Open Prisma Studio

# Individual packages
pnpm --filter @ckpt/web dev          # Run Next.js dev server
pnpm --filter @ckpt/shared build     # Build shared package
pnpm --filter @ckpt/mcp build        # Build MCP server
pnpm --filter @ckpt/cli build        # Build CLI
```

## Monorepo Structure

```
apps/
  web/       → Next.js 15 frontend + API routes (deployed to Vercel)
packages/
  shared/    → @ckpt/shared (types, Zod schemas, constants) — built with tsup
  cli/       → @ckpt/cli (TypeScript CLI, local SQLite) — built with tsup
  mcp/       → @ckpt/mcp (MCP server — the core product) — built with tsup
```

Full-stack TypeScript. API routes live in `apps/web/app/api/v1/`. Packages use ES2022 target, apps/web uses ES2017.

## The Core Loop

```
AI agent (Claude Code / Cursor / Codex)
  → calls ckpt MCP tools (save_reasoning, mark_dead_end, add_constraint)
  → reasoning syncs to API
  → brief page shows it (public, no auth)
  → GitHub App posts it as a PR comment
```

## Database

Prisma ORM with Neon Postgres (prod) / SQLite (dev). Schema at `apps/web/prisma/schema.prisma`. Environment variable: `DATABASE_URL`.

## Key Files

- `packages/mcp/src/index.ts` — MCP server with 4 tools. This IS the product.
- `packages/mcp/src/client.ts` — API client for MCP server
- `apps/web/app/api/v1/reasoning/sync/route.ts` — sync endpoint
- `apps/web/app/api/v1/checkpoints/route.ts` — checkpoint CRUD
- `apps/web/app/api/v1/github/webhook/route.ts` — GitHub PR integration
- `apps/web/app/checkpoint/[id]/brief/page.tsx` — the shareable brief page
- `apps/web/app/lib/db.ts` — Prisma client and DB utilities
- `apps/web/app/lib/auth.ts` — NextAuth configuration
- `vitest.config.ts` — Test config with path aliases (`@` → apps/web, `@ckpt/shared` → packages/shared/src)

## Architecture Notes

- **Shared types flow one way**: `@ckpt/shared` exports types, Zod schemas, and constants consumed by all other packages. Never duplicate definitions.
- **Build order matters**: Turbo handles this — `shared` must build before packages that depend on it. `turbo run build` resolves the graph automatically.
- **API routes are Next.js Route Handlers** (app router) — not Pages API routes.
- **MCP and CLI are standalone Node binaries** built with tsup, declared as `bin` in their package.json.
- **Test coverage** is scoped to `packages/shared/src/**` and `apps/web/app/api/**`.

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
