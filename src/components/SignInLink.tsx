"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sign-in link that remembers the current page via /login?next=<path>. */
export default function SignInLink({ className }: { className: string }) {
  const pathname = usePathname();
  const onLogin = pathname === "/login";
  // Redundant on the sign-in page itself — /login already IS this action.
  if (onLogin) return null;
  const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
  return (
    <Link href={`/login${next}`} className={`${className} whitespace-nowrap`}>
      <span className="hidden sm:inline">Sign in / Join</span>
      <span className="sm:hidden">Sign in</span>
    </Link>
  );
}
