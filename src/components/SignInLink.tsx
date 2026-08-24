"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sign-in link that remembers the current page via /login?next=<path>. */
export default function SignInLink({ className }: { className: string }) {
  const pathname = usePathname();
  const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
  return (
    <Link href={`/login${next}`} className={className}>
      Sign in
    </Link>
  );
}
