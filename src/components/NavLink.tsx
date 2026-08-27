"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Nav link with aria-current active-page indicator and active styling. */
export default function NavLink({
  href,
  className = "",
  activeClassName = "text-gold after:scale-x-100",
  children,
}: {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : ""}`}
    >
      {children}
    </Link>
  );
}
