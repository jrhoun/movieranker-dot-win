"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ParticipantChips from "@/components/ParticipantChips";
import type { ParticipantChip } from "@/lib/participants";

const inputCls =
  "h-10 w-full rounded bg-bg px-3 text-sm text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-150 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const btn =
  "min-h-9 rounded px-3.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export default function OwnerControls({
  listId,
  title,
  description,
  participants,
  isCurated = false,
  chips = [],
}: {
  listId: string;
  title: string;
  description: string | null;
  participants: string[];
  isCurated?: boolean;
  chips?: ParticipantChip[];
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
          ...(isCurated ? {} : { title: editTitle.trim() }),
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
    router.push("/u/profile");
  }

  if (editing) {
    return (
      <form
        onSubmit={save}
        className="mt-2 space-y-3 rounded-xl bg-surface p-4 ring-1 ring-white/10"
      >
        {!isCurated ? (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
              List Title
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="List title"
              aria-label="List title"
              className={inputCls}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded bg-white/5 px-3 py-2 text-xs text-muted ring-1 ring-white/5">
            <span aria-hidden="true">🔒</span>
            <span>Weekly Marquee title is curated and cannot be edited.</span>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Participants
          </label>
          <input
            type="text"
            value={editParticipants}
            onChange={(e) => setEditParticipants(e.target.value)}
            placeholder="Participants (comma-separated, e.g. Maya, Chris)"
            aria-label="Participants, comma-separated"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Story / Description (optional)
          </label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What's the story behind this ranking?"
            aria-label="List description"
            className={`${inputCls} h-auto py-2 leading-relaxed`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className={`${btn} bg-accent text-bg hover:-translate-y-0.5`}
            >
              {busy ? "Saving…" : "Save changes"}
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
              className={`${btn} bg-surface-raised text-text hover:bg-white/10`}
            >
              Cancel
            </button>
          </div>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="rounded px-2.5 py-1 text-xs text-muted transition-colors hover:bg-accent-red/10 hover:text-accent-red"
          >
            Delete list
          </button>
        </div>

        {note && (
          <p role="status" className="text-xs text-accent">
            {note}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {participants.length > 0 ? (
          <p className="text-sm text-muted">
            Ranked by <ParticipantChips chips={chips} />
          </p>
        ) : (
          <p className="text-xs italic text-muted/60">No participants listed</p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-muted transition-colors hover:bg-white/5 hover:text-gold"
            aria-label="Edit list details"
          >
            <span aria-hidden="true">✎</span>
            <span>Edit</span>
          </button>
          <span className="text-white/20">·</span>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="rounded px-1.5 py-0.5 text-muted transition-colors hover:bg-accent-red/10 hover:text-accent-red"
            aria-label="Delete this list"
          >
            Delete
          </button>
        </div>
      </div>

      {description ? (
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block pt-0.5 text-xs text-muted/60 transition-colors hover:text-gold"
        >
          + Add story behind this ranking
        </button>
      )}
    </div>
  );
}
