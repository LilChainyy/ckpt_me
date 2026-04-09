# ckpt

The reasoning layer for every code change.

## Monorepo Structure

```
apps/
  web/       → Next.js 15 frontend + API routes (deployed to Vercel)
packages/
  shared/    → @ckpt/shared (types, Zod schemas, constants)
  cli/       → @ckpt/cli (TypeScript CLI, local SQLite)
```

Full-stack TypeScript. API routes live in `apps/web/app/api/`.

## Database

Prisma ORM with Neon Postgres (prod) / SQLite (dev). Schema at `apps/web/prisma/schema.prisma`.

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
