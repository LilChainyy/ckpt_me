# ckpt

The reasoning layer for every code change.

## Monorepo Structure

```
apps/
  web/       → Next.js frontend (deployed to Vercel as ckpt-web)
  api/       → FastAPI backend (deployed to Vercel as ckpt-api)
packages/
  cli/       → ckpt CLI (pip install -e packages/cli)
```

## Agents

Specialized agents live in `.claude/agents/`. Use them via the Task tool for domain-specific work:

- **api-engineer** — Backend work in `apps/api`: endpoints, performance, docs, code quality

## Conventions

- Keep changes scoped — prefer editing existing files over creating new ones
- Ask for clarification on ambiguous requests instead of assuming
- Readability and maintainability over cleverness
