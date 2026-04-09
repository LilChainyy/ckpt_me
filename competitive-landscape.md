# Competitive Landscape — "GitHub for the AI-Era"

## Closest to ckpt's Vision

### 1. Entire CLI (by ex-GitHub CEO, $60M seed)
**The closest existing tool.** A git observability layer that captures AI reasoning traces, tool calls, and session transcripts alongside commits. Stores checkpoints in a hidden git branch so engineers/agents can see the *why* behind every code change, not just the diff. Think "git blame but for AI reasoning."

- Site: https://ostechnix.com/entire-cli-git-observability-ai-agents/

### 2. GitHub Squad
Multi-agent collaboration directly inside your repo. Agents have charters (who they are) and histories (what they've done) stored in `.squad/` — versioned alongside code. A reviewer protocol forces a *different* agent to review/fix rejected work, giving genuine independent review. Agents share team decisions and project history as committed files.

- Blog: https://github.blog/ai-and-ml/github-copilot/how-squad-runs-coordinated-ai-agents-inside-your-repository/

### 3. Git AI (open source)
A git extension that links every AI-written line to the agent, model, and prompt that generated it. `git-ai blame` is a drop-in replacement for `git blame` showing AI attribution. Tracks code from prompt through code review to production.

- Site: https://usegitai.com/
- GitHub: https://github.com/git-ai-project/git-ai

### 4. Agent Trace (by Cursor, open standard)
An open data specification for recording attribution data for AI-generated code — a standard format for reasoning traces across different tools.

- GitHub: https://github.com/cursor/agent-trace

---

## Orchestration / Parallel Agent Tools (Adjacent)

### 5. Vibe Kanban (open source)
Kanban board for managing multiple AI coding agents in parallel. Isolated git worktrees, built-in diff viewer for reviewing/approving agent changes before merging. Supports Claude Code, Cursor, Copilot, Codex, Gemini CLI, etc.

- Site: https://vibekanban.com/

### 6. Conductor (Mac app)
Run multiple Claude Code instances in parallel, each in its own git worktree. Central dashboard to see what each agent is working on, review PRs, and merge.

- Site: https://www.conductor.build/

### 7. Code Conductor (open source)
GitHub-native orchestration for parallel AI coding agents.

- GitHub: https://github.com/ryanmac/code-conductor

---

## Feature Comparison

| Capability | Entire | Squad | Git AI | Vibe Kanban | **ckpt** |
|---|---|---|---|---|---|
| Compare diffs across agents/engineers | Partial | Yes (PRs) | No | Yes | ? |
| Reasoning traces visible to others | **Yes** | Partial (history.md) | Prompts only | No | ? |
| Multi-agent collaboration | No | **Yes** | No | Yes (orchestration) | ? |
| Works with any tool/agent | Yes | GitHub only | Multi-agent | Multi-agent | ? |
| Open source | No | No | **Yes** | **Yes** | ? |

---

## The Gap

No single tool fully nails the complete picture:

- **Entire** captures reasoning but has no multi-agent collaboration
- **Squad** handles collaboration but is GitHub-only and reasoning visibility is limited
- **Git AI** tracks attribution but doesn't expose reasoning or enable collaboration
- **Vibe Kanban / Conductor** orchestrate parallel agents but don't capture reasoning traces

The closest combo would be **Entire + Squad** — Entire for the reasoning/logistics layer, Squad for multi-agent collaboration and review. But neither is a complete "GitHub for AI-era collaboration" that lets engineers *and* agents see each other's full reasoning chains + diffs in one unified place.

---

## Where ckpt Is Today

### What's built

| Layer | Status | What works |
|-------|--------|------------|
| **CLI** | Most complete | `ckpt add/commit/push/log/status/diff` all work. Local SQLite stores reasoning per commit. Syncs to API. |
| **Web** | Polished demo, but isolated | Landing page, handoff composer, briefing view, step timeline with code diffs. All running on mock data + localStorage. |
| **API** | Skeleton | 5 endpoints defined, Pydantic models, but in-memory dict — no database, no persistence, no CORS. |

### Foundations we have
- A reasoning capture model (reasoning per commit, constraints, dead ends)
- A CLI that wraps git and attaches reasoning at commit-time
- A web UI that can visualize steps, diffs, constraints, and dead ends
- A data model that tracks the *why* not just the *what*

### Progress estimate

```
Where we are:      ██████░░░░░░░░░░░░░░  ~30%
                   ↑                    ↑
              Solo capture         Full collab platform
              (CLI + demo UI)      (the "GitHub for AI-era" vision)
```

---

## What's Missing to Reach the Goal

### 1. The systems don't talk to each other
- CLI stores in SQLite, web reads from localStorage, API stores in-memory
- A checkpoint created via CLI never shows up in the web UI
- No shared persistence layer connecting the three

### 2. No multi-user/multi-agent collaboration
- Single-user only — no concept of teams, orgs, or shared workspaces
- No way for Agent A to see Agent B's reasoning traces
- No auth, no user identity beyond git author

### 3. No agent integration
- CLI requires manual `--reasoning` flags — no auto-capture from Claude Code, Cursor, Copilot, etc.
- No hooks, MCP server, or agent protocol to passively capture reasoning
- Competitors like Git AI and Entire solve this with git hooks and agent SDKs

### 4. No comparison/review workflow
- Can't compare two engineers' or agents' approaches side-by-side
- No PR-like review flow for reasoning (Squad has this)
- No timeline of "Agent A tried X, failed, Agent B tried Y, succeeded"

### 5. No real persistence
- API has no database — restart = data gone
- No hosted version for team access

---

## What Competitors Have That ckpt Doesn't (Yet)

| Competitor | What they have | What ckpt is missing |
|---|---|---|
| **Entire** | Auto-captures reasoning traces from any agent, stores as git-native checkpoints | Agent auto-capture, git-native storage |
| **Squad** | Multi-agent review protocol, shared memory in repo, parallel agent coordination | Multi-agent collab, review protocol |
| **Git AI** | `git blame` with AI attribution, tracks code from prompt to production | Attribution tracking, production lineage |
| **Vibe Kanban** | Side-by-side diff review across multiple agents | Cross-agent comparison UI |

---

## ckpt's Differentiator

None of the competitors combine **reasoning traces + constraints/dead-ends + visual timeline + cross-agent comparison** in one place. That's the gap ckpt can own — but the pieces need to be wired together and the collaboration layer needs to be built.

---

## Sources

- [GitHub Squad Blog Post](https://github.blog/ai-and-ml/github-copilot/how-squad-runs-coordinated-ai-agents-inside-your-repository/)
- [Entire CLI Overview](https://ostechnix.com/entire-cli-git-observability-ai-agents/)
- [Git AI](https://usegitai.com/)
- [Agent Trace by Cursor](https://github.com/cursor/agent-trace)
- [Vibe Kanban](https://vibekanban.com/)
- [Conductor](https://www.conductor.build/)
- [Code Conductor](https://github.com/ryanmac/code-conductor)
- [LangChain on Traces](https://blog.langchain.com/in-software-the-code-documents-the-app-in-ai-the-traces-do/)
- [Agentic Coding Trends Report (Anthropic)](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf)
