"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Premiere Night identity control: gold ✦ @handle trigger opening a menu
// panel (fade/scale-in 200ms ease-out; dies under reduced motion). Items are
// >=44px with focus-visible gold rings and arrow-key navigation.
const itemCls =
  "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text transition-colors duration-150 ease-out hover:bg-white/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-gold";

export default function IdentityDropdown({
  handle,
  signOut,
  isOwner = false,
}: {
  handle: string | null;
  signOut: () => Promise<void>;
  /**
   * Decided on the server from OWNER_EMAIL. A boolean, never the email itself —
   * shipping that would publish the one address the admin gate is keyed on.
   *
   * Hiding the link is a courtesy, not a control: /admin's API routes each
   * re-check the gate and answer 404 to anyone else, so a visitor who types the
   * URL still sees nothing.
   */
  isOwner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape; Escape returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown"
        ? items[(i + 1) % items.length]
        : items[(i - 1 + items.length) % items.length];
    next?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            panelRef.current
              ?.querySelector<HTMLElement>('[role="menuitem"]')
              ?.focus();
          }
        }}
        className="flex min-h-9 items-center gap-1.5 rounded-full border border-gold/30 bg-surface/50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-text transition-colors duration-200 ease-out hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <span aria-hidden="true" className="text-gold">
          ✦
        </span>
        {handle ? `@${handle}` : "Account"}
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={`h-3 w-3 fill-none stroke-current stroke-[1.5] transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {/* Always mounted so the fade/scale transition can play both ways. */}
      <div
        ref={panelRef}
        role="menu"
        aria-label="Account menu"
        onKeyDown={onKeyDown}
        className={`absolute right-0 top-full z-50 mt-1.5 w-52 origin-top-right rounded-xl bg-surface/95 p-1.5 shadow-2xl ring-1 ring-gold/40 border border-white/5 backdrop-blur-md transition duration-200 ease-out motion-reduce:transition-none ${
          open
            ? "visible scale-100 opacity-100"
            : "pointer-events-none invisible scale-95 opacity-0"
        }`}
      >
        <Link role="menuitem" href="/u/profile" className={itemCls} tabIndex={open ? 0 : -1}>
          <span aria-hidden="true" className="text-gold">✦</span>
          My Profile &amp; Lists
        </Link>
        <Link role="menuitem" href="/settings" className={itemCls} tabIndex={open ? 0 : -1}>
          <span aria-hidden="true">⚙</span>
          Settings
        </Link>
        {isOwner && (
          <Link role="menuitem" href="/admin" className={itemCls} tabIndex={open ? 0 : -1}>
            <span aria-hidden="true">🎛</span>
            Admin
          </Link>
        )}
        <div role="separator" className="my-1 h-px bg-white/10" />
        <form action={signOut}>
          <button role="menuitem" type="submit" className={`${itemCls} w-full text-left`} tabIndex={open ? 0 : -1}>
            <span aria-hidden="true">↳</span>
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
