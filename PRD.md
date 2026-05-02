# ckpt — Product Requirements Document (v2)

> The reasoning layer for every code change.

---

## Vision

Git captures *what* changed. ckpt captures *why*.

When an engineer or AI agent makes a code change, the reasoning — constraints, dead ends, trade-offs, rejected approaches — disappears. The next person (or the next AI session) starts from zero. ckpt captures that reasoning automatically and surfaces it where it matters most: in pull requests.

## The Problem (validated by industry data)

1. **Code review is the #1 bottleneck.** Teams generate 98% more PRs with AI tools, but reviews take 91% longer. Reviewers can't understand *why* code was written a certain way. (Source: Faros AI, LinearB 2026 analysis of 8.1M PRs)
2. **Context evaporates between sessions.** Every new AI chat starts from scratch. No memory of what was tried, what failed, or what constraints exist.
3. **Dead ends get repeated.** Without tracking, the next person (or agent) wastes time re-discovering the same failures.
4. **96% of developers don't trust AI-generated code.** They need to verify it, but the reasoning behind AI decisions is invisible.

## Target Users

- Engineers using AI coding tools (Claude Code, Cursor, Copilot, Codex) who open PRs daily
- Reviewers who spend hours trying to understand AI-generated code
- Teams running multiple AI agents in parallel on the same codebase

---

## Product: One Core Loop

```
MCP captures reasoning → API stores it → GitHub delivers it to PRs
```

That's the entire product. Everything else is future scope.

### How it works

1. Engineer works with any MCP-compatible AI tool (Claude Code, Cursor, Codex, Copilot)
2. The ckpt MCP server runs alongside the AI tool. The AI agent automatically calls ckpt tools to record reasoning, constraints, and dead ends as it works
3. When the engineer runs `ckpt push` (or pushes to GitHub), reasoning syncs to the ckpt API
4. When a PR is opened, the ckpt GitHub App auto-adds a reasoning summary with constraints and dead ends
5. Reviewer sees the "why" immediately → reviews faster → approves or gives focused feedback

### MCP Tools (the capture layer)

The ckpt MCP server exposes 4 tools to AI agents:

- `ckpt_save_reasoning` — save reasoning context for the current work
- `ckpt_mark_dead_end` — record an approach that was tried and failed
- `ckpt_add_constraint` — record a rule that must not be broken
- `ckpt_get_context` — retrieve existing reasoning for the repo (so the agent doesn't repeat dead ends)

These work with **any** MCP-compatible tool: Claude Code, Cursor, Codex, Copilot, Zed, JetBrains.

---

## Current State

| Layer | Status | What exists |
|-------|--------|-------------|
| **MCP server** | Functional skeleton | 4 tools implemented, syncs to API, needs testing and polish |
| **CLI** | Functional | `ckpt commit/push/log/status/diff` — captures reasoning, syncs to API |
| **API** | Working | Prisma + Neon Postgres, reasoning sync, checkpoint CRUD, protocol webhook |
| **GitHub webhook** | Working skeleton | Receives PR events, looks up reasoning by commit hash, posts comment |
| **Brief page** | Working | Shows reasoning, constraints, dead ends for a checkpoint. Needs to work without auth |
| **Web (other pages)** | Built but not needed yet | Dashboard, compose, compare, timeline, history, analytics, comments |

---

## Phased Plan (new — 3 phases, 6 weeks)

### Phase 1 — End-to-end capture and share (weeks 1–2)

**Goal:** An engineer using Claude Code + ckpt MCP can capture reasoning automatically, push it, and share a brief link that anyone can view.

#### What to build / fix:

**MCP server (`packages/mcp/`)**
- [ ] Auto-detect repo URL from git remote (don't require manual input)
- [ ] Auto-detect current commit hash from git HEAD
- [ ] Bundle reasoning + constraints + dead ends into a single checkpoint on `ckpt push`
- [ ] Add `ckpt_save_checkpoint` tool that creates a full checkpoint (not just individual reasoning records)
- [ ] Test with Claude Code on a real project (this repo)

**API (`apps/web/app/api/`)**
- [ ] Ensure `/api/v1/reasoning/sync` and `/api/v1/checkpoints` work without auth (add auth later)
- [ ] Add endpoint: `GET /api/v1/checkpoints/by-repo?url=...` — list checkpoints for a repo
- [ ] Ensure webhook endpoint works end-to-end
- [ ] Switch off DEMO_MODE — use real data only

**Brief page (`apps/web/app/checkpoint/[id]/brief/`)**
- [ ] Make viewable without login (public read-only page)
- [ ] Remove CommentThread section (re-add in Phase 4)
- [ ] Remove "Explore the steps →" CTA to timeline (re-add in Phase 4)
- [ ] Clean up: this is the "share link" destination — should be self-contained

**CLI (`packages/cli/`)**
- [ ] `ckpt push` should auto-create a checkpoint from accumulated reasoning records
- [ ] Print the brief URL after push: "View reasoning: https://ckpt-web.vercel.app/checkpoint/{id}/brief"

**Web — disable/hide (don't delete):**
- [ ] Remove from nav: Checkpoints, Brief, Timeline links
- [ ] Hide routes behind feature flag or simply remove from nav:
  - `/compose` — handoff composer
  - `/compare` — side-by-side comparison
  - `/analytics` — reasoning analytics
  - `/checkpoint/[id]/timeline` — step timeline
  - `/checkpoint/[id]/history` — version history
  - `/dashboard` — authenticated dashboard (Phase 4)
- [ ] Replace landing page with simple "what is ckpt" + install instructions + link to docs
- [ ] Nav should only show: logo, docs link, and "your checkpoints" (once auth exists)

---

### Phase 2 — GitHub PR integration (weeks 3–4)

**Goal:** When a PR is opened, ckpt auto-adds reasoning summary as a PR comment with a link to the full brief.

#### What to build / fix:

**GitHub App**
- [ ] Register a GitHub App (not just a webhook) so teams can install it on their repos
- [ ] On PR opened/synchronized: look up reasoning records by commit hashes in the PR
- [ ] Also look up the checkpoint for the repo/branch if one exists
- [ ] Format PR comment with: constraints (tagged), dead ends (tagged), reasoning summary, link to full brief

**PR comment format (what the reviewer sees):**
```markdown
## ☐ ckpt reasoning

**Constraints:**
- 🟡 No new Redis instances — infra budget frozen until Q3
- 🟡 p99 latency must stay under 5ms

**Dead ends:**
- 🔴 Tried sliding window — race condition under burst traffic
- 🔴 Tried Redis rate limiter — violated latency constraint

**Reasoning:** Chose in-memory token bucket. Handles single-instance load within constraints. Added TODO for Redis migration in Q3.

→ [View full reasoning brief](https://ckpt-web.vercel.app/checkpoint/{id}/brief)

*Auto-captured by ckpt MCP · Claude Code*
```

**Improvements to webhook (`apps/web/app/api/v1/github/webhook/route.ts`):**
- [ ] Include constraints and dead ends in comment (currently only shows raw reasoning text)
- [ ] Parse metadata to extract structured constraint/dead-end records
- [ ] Add "View full brief" link to the checkpoint page
- [ ] Handle edge cases: no reasoning found, multiple checkpoints per PR

---

### Phase 3 — Polish and multi-tool support (weeks 5–6)

**Goal:** Works reliably across Claude Code, Cursor, and Codex. Ready for other engineers to try.

#### What to build:

- [ ] Test MCP server with Cursor (should work out of the box since Cursor supports MCP)
- [ ] Test MCP server with Codex CLI (should work — Codex supports MCP via config.toml)
- [ ] Write setup docs: "Add ckpt to your project in 2 minutes"
- [ ] Add agent detection: which AI tool captured the reasoning (read from env vars)
- [ ] Add npm package publish for `@ckpt/mcp` so engineers can `npx @ckpt/mcp` to run the server
- [ ] Error handling and retry logic in MCP server
- [ ] Rate limiting on API endpoints

---

### Phase 4 — Re-enable features based on demand (future)

Only build these when users actually ask for them:

- [ ] Auth + dashboard (when teams need to manage checkpoints)
- [ ] Compare view (when teams want to compare agent approaches)
- [ ] Timeline view (when users want step-by-step detail)
- [ ] Comments/discussion (when teams want to discuss reasoning)
- [ ] Analytics (when leads want visibility into reasoning coverage)
- [ ] Compose page (when users want to manually create checkpoints)

---

## Architecture (simplified)

```
┌─────────────────────────────────────────────────────┐
│              Engineer's machine                      │
│                                                      │
│  ┌──────────────┐    ┌──────────────┐               │
│  │ Claude Code  │    │  ckpt MCP    │               │
│  │ / Cursor     │───▶│  server      │               │
│  │ / Codex      │    │              │               │
│  │ / Copilot    │    │ captures     │               │
│  └──────────────┘    │ reasoning    │               │
│                      └──────┬───────┘               │
│                             │                        │
│  ┌──────────────┐           │                        │
│  │  ckpt CLI    │───────────┤                        │
│  │  ckpt push   │           │                        │
│  └──────────────┘           │                        │
└─────────────────────────────┼────────────────────────┘
                              │ sync
                              ▼
┌─────────────────────────────────────────────────────┐
│              ckpt cloud                              │
│                                                      │
│  ┌──────────────┐    ┌──────────────┐               │
│  │   API        │    │  Brief page  │               │
│  │   (Next.js)  │    │  (public)    │               │
│  │   Postgres   │    │              │               │
│  └──────┬───────┘    └──────────────┘               │
│         │                                            │
│  ┌──────▼───────┐                                   │
│  │  GitHub App  │                                   │
│  │  webhook     │──▶ PR comment with reasoning      │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| MCP captures reasoning automatically | Yes | Yes | Yes |
| Reasoning persists across sessions | Yes | Yes | Yes |
| Shareable brief link works | Yes | Yes | Yes |
| Reasoning appears in GitHub PRs | No | Yes | Yes |
| Works with 3+ AI coding tools | No | No | Yes |

## What we're NOT building (yet)

- No user accounts or auth (brief pages are public)
- No team management
- No compare view
- No timeline view
- No analytics dashboard
- No compose/manual checkpoint creation
- No comments or discussions

These are all good ideas. They're just not Phase 1–3 ideas.
