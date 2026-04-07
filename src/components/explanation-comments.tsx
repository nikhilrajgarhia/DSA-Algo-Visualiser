import { useEffect, useMemo, useState } from "react";

interface ExplanationComment {
  id: string;
  text: string;
  createdAt: string;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Saved comment";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ExplanationComments({
  storageKey,
  title = "Comments",
}: {
  storageKey: string;
  title?: string;
}) {
  const resolvedStorageKey = useMemo(() => `ui-ds:${storageKey}:comments`, [storageKey]);
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState<ExplanationComment[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const saved = window.localStorage.getItem(resolvedStorageKey);
      if (saved) {
        setComments(JSON.parse(saved) as ExplanationComment[]);
      }
    } catch {
      setComments([]);
    } finally {
      setIsReady(true);
    }
  }, [resolvedStorageKey]);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(resolvedStorageKey, JSON.stringify(comments));
  }, [comments, isReady, resolvedStorageKey]);

  const addComment = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }

    setComments((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setDraft("");
  };

  const removeComment = (id: string) => {
    setComments((current) => current.filter((comment) => comment.id !== id));
  };

  const clearComments = () => {
    setComments([]);
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">Add your notes, reminders, or follow-up questions for this explanation.</p>
        </div>
        <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {comments.length} {comments.length === 1 ? "note" : "notes"}
        </span>
      </div>

      <div className="space-y-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a comment about this visualizer..."
          className="min-h-24 w-full rounded-xl border border-border bg-muted/35 px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={addComment}
            disabled={draft.trim().length === 0}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Comment
          </button>
          <button
            onClick={() => setDraft("")}
            disabled={draft.length === 0}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Draft
          </button>
          <button
            onClick={clearComments}
            disabled={comments.length === 0}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
            No comments yet. Add one to keep track of what you want to revisit here.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-border bg-muted/25 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{comment.text}</p>
                <button
                  onClick={() => removeComment(comment.id)}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Delete
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{formatTimestamp(comment.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
