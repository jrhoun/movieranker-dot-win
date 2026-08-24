"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Nav link with aria-current active-page indicator (header spec). */
export default function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}
