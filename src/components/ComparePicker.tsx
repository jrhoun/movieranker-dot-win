"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractListId } from "@/lib/versus";

/** v1 picker: paste a movieranker list URL or id; validation happens again
 * (with access checks) server-side on the compare page. */
export default function ComparePicker({ listId }: { listId: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = extractListId(value);
    if (!id) {
      setError("Paste a movieranker.win list link or list id.");
      return;
    }
    if (id === listId) {
      setError("That's this very ranking — pick someone else's.");
      return;
    }
    router.push(`/compare/${listId}/${id}`);
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <label htmlFor="compare-with" className="block text-sm font-medium">
        Paste their list link
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="compare-with"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="movieranker.win/l/…  or a list id"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded bg-surface-raised px-3 text-sm ring-1 ring-white/15 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded bg-accent px-5 text-sm font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
        >
          Compare
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-accent-red">
          {error}
        </p>
      )}
    </form>
  );
}
