"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={
        active
          ? "border-b-2 border-gold pb-1 text-xs font-bold uppercase tracking-[0.1em] text-white"
          : "text-xs font-bold uppercase tracking-[0.1em] text-muted transition-colors hover:text-white"
      }
    >
      {children}
    </Link>
  );
}
