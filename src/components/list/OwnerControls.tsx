"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputCls =
  "h-11 w-full rounded bg-bg px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-150 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const btn =
  "min-h-11 rounded px-4 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export default function OwnerControls({
  listId,
  title,
  description,
  participants,
}: {
  listId: string;
  title: string;
  description: string | null;
  participants: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editParticipants, setEditParticipants] = useState(participants.join(", "));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parts = editParticipants
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!editTitle.trim()) {
      setNote("Title can't be empty.");
      return;
    }
    setBusy(true);
    setNote(null);
    let res: Response;
    try {
      res = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        title: editTitle.trim(),
        participants: parts,
        description: editDescription.trim() || null,
      }),
      });
    } catch {
      setBusy(false);
      setNote("Saving failed — try again.");
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setNote("Saving failed — try again.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this list permanently? This can't be undone.")) return;
    setBusy(true);
    setNote(null);
    let res: Response;
    try {
      res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    } catch {
      setBusy(false);
      setNote("Delete failed — try again.");
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setBusy(false);
      setNote("Delete failed — try again.");
      return;
    }
    router.push("/u/me");
  }

  return (
    <section aria-label="Owner controls" className="rounded bg-surface p-4 ring-1 ring-white/10">
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <input
            type="text"
            required
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="List title"
            aria-label="List title"
            className={inputCls}
          />
          <input
            type="text"
            value={editParticipants}
            onChange={(e) => setEditParticipants(e.target.value)}
            placeholder="Participants (comma-separated)"
            aria-label="Participants, comma-separated"
            className={inputCls}
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What's the story behind this ranking? (optional)"
            aria-label="List description"
            className={`${inputCls} h-auto py-2 leading-relaxed`}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className={`${btn} bg-accent font-semibold text-bg hover:-translate-y-0.5`}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditTitle(title);
                setEditDescription(description ?? "");
                setEditParticipants(participants.join(", "));
                setNote(null);
              }}
              disabled={busy}
              className={`${btn} bg-surface-raised hover:bg-white/10`}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">This is your list.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={busy}
              className={`${btn} bg-surface-raised hover:bg-white/10`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className={`${btn} text-accent-red ring-1 ring-accent-red/40 hover:bg-accent-red/10`}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {note && (
        <p role="status" className="mt-3 text-xs text-accent">
          {note}
        </p>
      )}
    </section>
  );
}
