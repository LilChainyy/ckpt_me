"use client";

import { useState, useEffect } from "react";

interface CommentData {
  id: string;
  userName: string | null;
  body: string;
  createdAt: string;
}

interface CommentThreadProps {
  checkpointId: string;
  stepId?: string;
}

function relativeTime(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function CommentThread({ checkpointId, stepId }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComments() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (stepId) params.set("stepId", stepId);
        const qs = params.toString() ? `?${params.toString()}` : "";
        const res = await fetch(`/api/v1/checkpoints/${checkpointId}/comments${qs}`);
        if (!res.ok) throw new Error(`Failed to load comments (${res.status})`);
        const data = await res.json();
        setComments(data.comments ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load comments");
      } finally {
        setLoading(false);
      }
    }
    fetchComments();
  }, [checkpointId, stepId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/checkpoints/${checkpointId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), stepId }),
      });
      if (!res.ok) throw new Error(`Failed to post comment (${res.status})`);
      const created = await res.json();
      setComments((prev) => [...prev, created]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="comment-thread">
      {/* Comment list */}
      {loading && (
        <p className="comment-body" style={{ color: "var(--muted)" }}>
          Loading comments...
        </p>
      )}

      {!loading && comments.length === 0 && !error && (
        <p className="comment-body" style={{ color: "var(--muted)" }}>
          No comments yet.
        </p>
      )}

      {comments.map((c) => (
        <div key={c.id} className="comment-item">
          <div className="comment-header">
            <span className="comment-author">{c.userName ?? "Anonymous"}</span>
            <span className="comment-time">{relativeTime(c.createdAt)}</span>
          </div>
          <div className="comment-body">{c.body}</div>
        </div>
      ))}

      {error && (
        <p className="comment-body" style={{ color: "var(--dead)" }}>
          {error}
        </p>
      )}

      {/* Add comment form */}
      <form className="comment-form" onSubmit={handleSubmit}>
        <textarea
          className="form-input form-textarea"
          placeholder="Add a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          style={{ minHeight: 72 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={posting || !body.trim()}
          style={{ alignSelf: "flex-end", opacity: posting ? 0.6 : 1 }}
        >
          {posting ? "Posting..." : "Post comment"}
        </button>
      </form>
    </div>
  );
}
