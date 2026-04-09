# ckpt — Product Requirements Document

> The reasoning layer for every code change.
> A collaboration platform where engineers and their AI coding agents can compare changes, share reasoning, and learn from each other's decisions.

---

## Vision

ckpt is the "GitHub for AI-era collaboration." Today, when an engineer or agent makes a code change, the *what* is captured in git — but the *why* is lost. Constraints, dead ends, reasoning traces, and decision context disappear between sessions. ckpt captures all of it and makes it visible, comparable, and actionable across people and agents.

## Problem

1. **Context evaporates between sessions.** When an engineer hands off to another person or picks up work the next day, they lose the reasoning behind every decision — what was tried, what failed, and why.
2. **AI agents are black boxes.** When Claude Code, Cursor, or Copilot generates code, there's no record of what the agent considered, rejected, or why it chose a particular approach.
3. **No cross-agent visibility.** If Agent A and Agent B both work on the same problem, there's no way to compare their approaches, reasoning, or trade-offs side by side.
4. **Constraints and dead ends get repeated.** Without explicit tracking, the next person (or agent) wastes time re-discovering the same constraints and re-attempting the same dead ends.

## Target Users

- **Engineers using AI coding tools** (Claude Code, Cursor, Copilot, Codex, Gemini CLI)
- **Teams doing agentic development** (multiple agents working in parallel on the same codebase)
- **Engineering leads** who need visibility into how code decisions are made (by humans and agents)

---

## Current State (~30% complete)

| Layer | Status | What exists |
|-------|--------|-------------|
| **CLI** | Functional | `ckpt add/commit/push/log/status/diff` — wraps git, captures reasoning per commit in local SQLite, syncs to API on push |
| **Web** | Demo | Landing page, handoff composer, briefing view, step timeline with code diffs — all on mock data + localStorage |
| **API** | Skeleton | 5 endpoints (health, sync, query by commit, query with filters) — in-memory dict, no persistence |

### What works today
- Reasoning capture at commit time (CLI)
- Constraint and dead-end modeling (web types)
- Step-by-step timeline with code diffs (web UI)
- Local-first storage with sync-on-push pattern (CLI)

### What doesn't work
- The three layers don't talk to each other
- No real database (API uses in-memory dict)
- Web only loads mock data, can't read from API
- Single-user only — no collaboration
- No agent auto-capture (requires manual `--reasoning` flags)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ckpt Platform                         │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌───────────────────┐  │
│  │  CLI     │    │   API    │    │      Web UI       │  │
│  │          │───▶│          │◀───│                   │  │
│  │ ckpt add │    │ FastAPI  │    │ Next.js           │  │
│  │ ckpt     │    │ Postgres │    │                   │  │
│  │  commit  │    │          │    │ Dashboard         │  │
│  │ ckpt     │    │ Auth     │    │ Timeline Explorer │  │
│  │  push    │    │          │    │ Compare View      │  │
│  └──────────┘    └──────────┘    └───────────────────┘  │
│       │                                                  │
│  ┌──────────┐                                           │
│  │  Agent   │                                           │
│  │  Hooks   │                                           │
│  │          │                                           │
│  │ Claude   │                                           │
│  │ Cursor   │                                           │
│  │ Copilot  │                                           │
│  └──────────┘                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Phased Plan

### Phase 1 — Wire It Together (foundation)

**Goal:** Make CLI, API, and Web actually connected. A reasoning record created via CLI shows up in the web UI.

#### 1.1 Add a real database to the API

**What:** Replace the in-memory `_reasoning_store` dict with PostgreSQL (Supabase or Neon for managed hosting).

**Changes in `apps/api`:**
- Add `sqlalchemy` + `asyncpg` (or `psycopg`) dependencies
- Create `models.py` with SQLAlchemy ORM model for `reasoning` table matching CLI schema:
  ```
  reasoning:
    id            TEXT PRIMARY KEY
    commit_hash   TEXT (indexed)
    reasoning     TEXT
    author        TEXT
    timestamp     TIMESTAMPTZ
    files         JSONB
    parent_hash   TEXT
    metadata      JSONB
    synced        INTEGER DEFAULT 0
    repo_url      TEXT (indexed)     ← NEW: identify which repo
    created_at    TIMESTAMPTZ
    updated_at    TIMESTAMPTZ
  ```
- Create `database.py` with connection pool, session factory
- Add Alembic for schema migrations
- Update all endpoints in `src/index.py` to use database sessions instead of dict
- Add `repo_url` field to `ReasoningRecord` Pydantic model
- Add CORS middleware (`origins=["https://ckpt-web.vercel.app", "http://localhost:3000"]`)
- Add `DATABASE_URL` env var support

**Endpoints to update:**
- `POST /api/v1/reasoning/sync` — INSERT records into Postgres
- `GET /api/v1/reasoning/{commit_hash}` — SELECT from Postgres
- `GET /api/v1/reasoning` — SELECT with filters from Postgres

#### 1.2 CLI sends repo context

**What:** Include repo identity so the API knows which repo records belong to.

**Changes in `packages/cli`:**
- Add `get_repo_url()` to `core/git.py` — reads `git remote get-url origin`
- Add `repo_url` field to reasoning records in `storage/local.py`
- Update `sync/client.py` to include `repo_url` in sync payload
- Update `storage/schema.py` with migration 2: add `repo_url` column to reasoning table

#### 1.3 Web reads from API instead of mock data

**What:** Replace localStorage/mock data with API calls. Keep mock data as fallback for demo mode.

**Changes in `apps/web`:**
- Create `lib/api.ts` — API client with functions:
  - `fetchReasoningByCommit(commitHash: string): Promise<ReasoningRecord>`
  - `fetchReasoningRecords(filters): Promise<ReasoningRecord[]>`
  - `fetchCheckpoint(id: string): Promise<Checkpoint | null>`
- Update `/checkpoint/[id]/brief/page.tsx` — try API first, fall back to mock data
- Update `/checkpoint/[id]/timeline/timeline-client.tsx` — load from API
- Add `NEXT_PUBLIC_API_URL` env var (default: `https://ckpt-api.vercel.app`)

#### 1.4 Unify the data model

**What:** The CLI stores flat `ReasoningRecord`s. The web expects rich `Checkpoint` objects with steps, constraints, dead ends. Bridge the gap.

**Two options (pick one):**

**Option A — Checkpoint is a first-class API resource:**
- Add `checkpoints` table to API:
  ```
  checkpoints:
    id            TEXT PRIMARY KEY
    task          TEXT
    author        TEXT
    repo_url      TEXT
    handoff_note  TEXT
    open_items    JSONB
    constraints   JSONB
    dead_ends     JSONB
    steps         JSONB
    created_at    TIMESTAMPTZ
    updated_at    TIMESTAMPTZ
  ```
- Add new endpoints:
  - `POST /api/v1/checkpoints` — create checkpoint
  - `GET /api/v1/checkpoints/{id}` — get checkpoint
  - `GET /api/v1/checkpoints` — list checkpoints (with repo filter)
  - `PUT /api/v1/checkpoints/{id}` — update checkpoint
- CLI `ckpt push` optionally bundles reasoning records into a checkpoint
- Web compose form POSTs to API instead of localStorage

**Option B — Checkpoint is assembled on-the-fly from reasoning records:**
- API groups reasoning records by session/branch into checkpoint-like views
- Less data modeling, but more complex query logic
- Harder to attach constraints and dead ends

**Recommendation: Option A.** Checkpoints are the core product concept — they deserve a first-class table.

---

### Phase 2 — Multi-User & Auth

**Goal:** Multiple people can share, view, and collaborate on checkpoints within a team.

#### 2.1 Authentication

**What:** Add user identity so reasoning records and checkpoints are owned.

**Changes:**
- Add auth to API (options: GitHub OAuth, API keys, or JWT)
  - Recommended: **GitHub OAuth** — users already have GitHub accounts, and ckpt is git-native
- Add `users` table:
  ```
  users:
    id            TEXT PRIMARY KEY
    github_id     TEXT UNIQUE
    username      TEXT
    email         TEXT
    avatar_url    TEXT
    created_at    TIMESTAMPTZ
  ```
- Add `user_id` foreign key to `reasoning` and `checkpoints` tables
- CLI: `ckpt login` command — opens browser for OAuth flow, stores token in `~/.ckpt/auth.json`
- API: auth middleware that validates tokens on all write endpoints
- Web: login page, session management, redirect unauthenticated users

#### 2.2 Teams and repos

**What:** Group users into teams, associate repos with teams.

**Changes:**
- Add `teams` and `team_members` tables:
  ```
  teams:
    id            TEXT PRIMARY KEY
    name          TEXT
    slug          TEXT UNIQUE
    created_at    TIMESTAMPTZ

  team_members:
    team_id       TEXT REFERENCES teams(id)
    user_id       TEXT REFERENCES users(id)
    role          TEXT (owner | member)
    PRIMARY KEY (team_id, user_id)
  ```
- Add `repos` table:
  ```
  repos:
    id            TEXT PRIMARY KEY
    team_id       TEXT REFERENCES teams(id)
    url           TEXT UNIQUE
    name          TEXT
    created_at    TIMESTAMPTZ
  ```
- API: team CRUD endpoints, repo registration
- Web: team settings page, repo list, member management
- CLI: `ckpt init` — registers repo with team on first push

#### 2.3 Shared checkpoint feed

**What:** A dashboard where team members see all recent checkpoints across their repos.

**Changes in `apps/web`:**
- New route: `/dashboard` — lists recent checkpoints across team repos
- Each card shows: task, author, repo, timestamp, constraint/dead-end counts
- Click through to `/checkpoint/{id}/brief`
- Filter by: repo, author, date range

---

### Phase 3 — Agent Auto-Capture

**Goal:** Reasoning gets captured automatically from AI coding tools without manual `--reasoning` flags.

#### 3.1 Git hook integration

**What:** A post-commit hook that auto-captures context from the working environment.

**Changes:**
- Add `ckpt hooks install` command — installs post-commit hook in `.git/hooks/`
- Hook detects if a commit was made during an active agent session
- Captures: active files, recent terminal output, timestamp
- Stores reasoning record with `source: "hook"` metadata

#### 3.2 Claude Code integration (MCP server)

**What:** An MCP server that Claude Code can use to read/write checkpoints natively.

**Changes:**
- Create `packages/mcp/` — MCP server implementation
- Tools exposed to Claude Code:
  - `ckpt_save_reasoning(reasoning, constraints?, dead_ends?)` — save reasoning for current work
  - `ckpt_get_context(repo)` — retrieve existing checkpoints and reasoning for the repo
  - `ckpt_mark_dead_end(title, attempt, outcome)` — record a dead end
  - `ckpt_add_constraint(label, reason)` — record a constraint
- Claude Code can call these tools during a session, auto-populating the checkpoint
- Install via: add to `.claude/settings.json` mcpServers config

#### 3.3 Agent session tracking

**What:** Track which agent/tool produced each reasoning record.

**Changes:**
- Add `agent` field to reasoning records:
  ```
  agent:
    tool          TEXT    (claude-code | cursor | copilot | manual)
    model         TEXT    (claude-opus-4 | gpt-4o | etc.)
    session_id    TEXT    (unique per session)
  ```
- CLI detects agent context from environment variables:
  - `CLAUDE_CODE_SESSION` → claude-code
  - `CURSOR_SESSION` → cursor
  - Fallback → manual
- Web displays agent badges on reasoning records and checkpoints

---

### Phase 4 — Compare & Review

**Goal:** Engineers and agents can compare approaches side-by-side and review each other's reasoning.

#### 4.1 Compare view

**What:** Side-by-side comparison of two checkpoints (or two agents' approaches to the same task).

**Changes in `apps/web`:**
- New route: `/compare?left={id}&right={id}`
- Layout:
  ```
  ┌──────────────────────┬──────────────────────┐
  │   Checkpoint A       │   Checkpoint B       │
  │   (Sarah / Claude)   │   (James / Cursor)   │
  ├──────────────────────┼──────────────────────┤
  │ Steps timeline       │ Steps timeline       │
  │ Constraints          │ Constraints          │
  │ Dead ends            │ Dead ends            │
  │ Final code diff      │ Final code diff      │
  └──────────────────────┴──────────────────────┘
  ```
- Highlights: shared constraints, overlapping dead ends, divergent approaches
- Can compare: same task by different people/agents, or same file across checkpoints

#### 4.2 Reasoning review / comments

**What:** Team members can comment on reasoning records, flag concerns, ask questions.

**Changes:**
- Add `comments` table:
  ```
  comments:
    id              TEXT PRIMARY KEY
    checkpoint_id   TEXT REFERENCES checkpoints(id)
    step_id         TEXT (nullable, for step-level comments)
    user_id         TEXT REFERENCES users(id)
    body            TEXT
    created_at      TIMESTAMPTZ
  ```
- API: CRUD endpoints for comments
- Web: inline comment UI on briefing and timeline pages
- Agents can also leave comments via MCP tools

#### 4.3 Reasoning diff

**What:** When a checkpoint is updated (new session picks up where the last left off), show what reasoning changed — not just code diffs, but reasoning diffs.

**Changes:**
- Track checkpoint versions (add `version` field or use a `checkpoint_versions` table)
- `/checkpoint/{id}/history` — show evolution of reasoning over time
- Diff display: what constraints were added/removed, what dead ends were discovered, how reasoning evolved

---

### Phase 5 — Ecosystem & Scale

**Goal:** ckpt works with any tool, any team size, any workflow.

#### 5.1 Open protocol for reasoning capture

**What:** Publish a spec so any tool can emit ckpt-compatible reasoning records.

**Deliverables:**
- Open spec (like Agent Trace by Cursor, but richer — includes constraints, dead ends, steps)
- Reference implementations for popular tools
- Webhook endpoint for tools to push reasoning to ckpt

#### 5.2 GitHub / GitLab integration

**What:** Surface ckpt data in pull request workflows.

**Changes:**
- GitHub App that:
  - Adds reasoning context to PR descriptions automatically
  - Shows constraint warnings on PRs that violate tracked constraints
  - Links to ckpt timeline from PR comments
- API: webhook endpoint for GitHub PR events

#### 5.3 Reasoning analytics

**What:** Team-level insights into how decisions are made.

**Changes in `apps/web`:**
- `/analytics` dashboard:
  - How much reasoning is captured per repo, per author, per agent
  - Most common constraints across repos
  - Dead end patterns (what's being retried most)
  - Agent vs human reasoning volume
  - Code that ships with vs without reasoning

---

## Implementation Priority & Dependencies

```
Phase 1: Wire It Together
├── 1.1 Database (API)              ← START HERE
├── 1.2 CLI repo context            ← can parallel with 1.1
├── 1.3 Web reads from API          ← depends on 1.1
└── 1.4 Unify data model            ← depends on 1.1

Phase 2: Multi-User & Auth
├── 2.1 Authentication              ← depends on Phase 1
├── 2.2 Teams and repos             ← depends on 2.1
└── 2.3 Shared checkpoint feed      ← depends on 2.2

Phase 3: Agent Auto-Capture
├── 3.1 Git hook integration        ← depends on Phase 1
├── 3.2 Claude Code MCP server      ← depends on Phase 1
└── 3.3 Agent session tracking      ← depends on 3.1 or 3.2

Phase 4: Compare & Review
├── 4.1 Compare view                ← depends on Phase 2
├── 4.2 Comments                    ← depends on Phase 2
└── 4.3 Reasoning diff              ← depends on 4.1

Phase 5: Ecosystem & Scale
├── 5.1 Open protocol               ← depends on Phase 3
├── 5.2 GitHub integration          ← depends on Phase 2
└── 5.3 Analytics                   ← depends on Phase 2
```

---

## Success Metrics

| Metric | Phase 1 | Phase 2 | Phase 3+ |
|--------|---------|---------|----------|
| CLI → API → Web flow works end-to-end | Yes | Yes | Yes |
| Reasoning persists across server restarts | Yes | Yes | Yes |
| Multiple users can view same checkpoint | No | Yes | Yes |
| Agent reasoning captured automatically | No | No | Yes |
| Side-by-side comparison of approaches | No | No | Yes |
| Works with 3+ AI coding tools | No | No | Yes |

---

## Technical Decisions to Make

1. **Database:** Supabase (Postgres + auth + realtime) vs Neon (just Postgres) vs self-hosted
2. **Auth:** GitHub OAuth (recommended) vs API keys vs magic links
3. **Checkpoint storage:** First-class table (recommended) vs assembled from reasoning records
4. **MCP server language:** Python (consistent with CLI) vs TypeScript (consistent with web)
5. **Deployment:** Stay on Vercel for both API + Web, or move API to Railway/Fly for persistent connections

---

## Competitive Positioning

See [competitive-landscape.md](./competitive-landscape.md) for full analysis.

**ckpt's unique angle:** The only tool that combines reasoning traces + constraints + dead ends + visual timeline + cross-agent comparison in one platform. Entire captures reasoning but can't collaborate. Squad collaborates but doesn't capture reasoning richly. Git AI tracks attribution but not decisions. ckpt does all of it.
