import Link from "next/link";
import Nav from "./components/nav";

const featuredCheckpoints = [
  {
    id: "rate-limiter",
    author: "Sarah",
    date: "2 hours ago",
    task: "Build rate limiter for API gateway",
    constraints: 3,
    deadEnds: 1,
    steps: 8,
    tags: [
      { label: "no Redis", color: "var(--constraint)" },
      { label: "race condition", color: "var(--dead)" },
    ],
  },
  {
    id: "pgvector",
    author: "James",
    date: "Yesterday",
    task: "Add pgvector search to product catalog",
    constraints: 2,
    deadEnds: 2,
    steps: 12,
    tags: [
      { label: "< 200ms p99", color: "var(--constraint)" },
      { label: "cosine similarity", color: "var(--action)" },
    ],
  },
  {
    id: "auth-refactor",
    author: "Maya",
    date: "3 days ago",
    task: "Refactor auth to support SSO + SAML",
    constraints: 4,
    deadEnds: 0,
    steps: 15,
    tags: [
      { label: "backward compat", color: "var(--constraint)" },
      { label: "SAML 2.0", color: "var(--decision)" },
    ],
  },
];

export default function Page() {
  return (
    <main>
      <div className="page-wide">
        <Nav />
      </div>

      {/* ── Section A: Hero ── */}
      <section className="landing-hero">
        <p className="landing-subtitle">The reasoning layer for every code change</p>
        <h1 className="landing-headline">
          Capture the <em>why</em>, not just the diff.
        </h1>
        <p className="landing-body">
          ckpt records constraints, dead ends, and reasoning as you work — so the
          next person (or AI) picks up exactly where you left off. No more
          re-discovering what was already tried.
        </p>
        <div className="landing-ctas">
          <Link href="/dashboard" className="btn btn-primary">
            See checkpoints →
          </Link>
          <span className="btn btn-secondary">brew install ckpt</span>
        </div>

        {/* Featured checkpoint cards */}
        <div className="landing-cards">
          {featuredCheckpoints.map((ckpt) => (
            <Link
              key={ckpt.id}
              href={`/checkpoint/${ckpt.id}/brief`}
              className="landing-card"
            >
              <div className="landing-card-header">
                <span className="landing-card-author">{ckpt.author}</span>
                <span className="landing-card-date">{ckpt.date}</span>
              </div>
              <div className="landing-card-task">{ckpt.task}</div>
              <div className="landing-card-tags">
                {ckpt.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="tag"
                    style={{
                      borderColor: tag.color,
                      color: tag.color,
                    }}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
              <div className="landing-card-meta">
                {ckpt.constraints} constraints · {ckpt.deadEnds} dead ends · {ckpt.steps} steps
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Section B: Pitch ── */}
      <section className="landing-pitch">
        <div className="landing-pitch-grid">
          <div className="landing-pitch-left">
            <h2 className="landing-pitch-headline">
              Context evaporates between sessions.
            </h2>
          </div>
          <div className="landing-pitch-right">
            <p>
              Every coding session produces invisible knowledge — why Redis was
              rejected, which approach hit a wall, what constraint the PM mentioned
              in passing. ckpt captures it all in a structured, portable format
              that travels with the code.
            </p>
          </div>
        </div>

        <div className="landing-features">
          <div className="landing-feature" style={{ borderLeftColor: "var(--constraint)" }}>
            <h3>Constraints</h3>
            <p>
              &ldquo;No Redis&rdquo;, &ldquo;must be SOC2 compliant&rdquo; — the verbal rules that
              never make it into code comments. ckpt logs them as first-class
              objects.
            </p>
          </div>
          <div className="landing-feature" style={{ borderLeftColor: "var(--dead)" }}>
            <h3>Dead ends</h3>
            <p>
              Approaches tried and abandoned — with reasons. Stop the next
              developer from walking the same dead-end path.
            </p>
          </div>
          <div className="landing-feature" style={{ borderLeftColor: "var(--action)" }}>
            <h3>Reasoning</h3>
            <p>
              The decision trace behind each code change. Not just what changed,
              but why it changed — and what alternatives were considered.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section C: CLI Strip ── */}
      <section className="landing-cli">
        <div className="landing-cli-card">
          <div className="landing-cli-header">
            <span className="landing-cli-dot" style={{ background: "#a8413a" }} />
            <span className="landing-cli-dot" style={{ background: "#a87338" }} />
            <span className="landing-cli-dot" style={{ background: "#5a7a5e" }} />
            <span className="landing-cli-title">terminal</span>
          </div>
          <pre className="landing-cli-body">
{`$ ckpt commit
`}<span style={{ color: "var(--muted)" }}>Capturing checkpoint...</span>{`
`}<span style={{ color: "var(--action)" }}>✓</span>{` 3 constraints recorded
`}<span style={{ color: "var(--dead)" }}>✓</span>{` 1 dead end logged
`}<span style={{ color: "var(--decision)" }}>✓</span>{` 8 reasoning steps saved
`}<span style={{ color: "var(--muted)" }}>{`
`}</span>{`$ ckpt push
`}<span style={{ color: "var(--action)" }}>✓</span>{` Pushed to ckpt cloud — `}<span style={{ color: "var(--artifact)" }}>share link copied</span>{`
`}<span style={{ color: "var(--muted)" }}>{`
`}</span>{`$ ckpt handoff --to james
`}<span style={{ color: "var(--action)" }}>✓</span>{` Handoff brief generated
`}<span style={{ color: "var(--constraint)" }}>→</span>{` James will see: constraints, dead ends, open items`}
          </pre>
        </div>
      </section>
    </main>
  );
}
