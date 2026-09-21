import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { NavLink } from "./nav-link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "morale.gg",
  description:
    "morale.gg: statistics, rosters, and event management for organized multiplayer-game communities.",
};

const plannedNav = ["Community", "Audits", "Leaderboards"];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="h-16 border-b border-edge bg-surface">
          <nav className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6 md:px-10">
            <Link
              href="/"
              className="text-xl font-extrabold tracking-tight text-white"
            >
              morale.gg
            </Link>
            <div className="flex items-center gap-5 md:gap-7">
              {plannedNav.map((item) => (
                <span
                  key={item}
                  title="Coming soon"
                  className="hidden cursor-default text-xs font-bold uppercase tracking-[0.1em] text-muted/50 sm:inline"
                >
                  {item}
                </span>
              ))}
              <NavLink href="/events">Events</NavLink>
              <NavLink href="/units">Units</NavLink>
              {/* Auth.js route handler, not a page — plain anchor is intentional. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/api/auth/signin"
                className="rounded-md bg-gold px-4 py-2 text-[13px] font-bold text-gold-ink transition-colors hover:bg-gold-bright"
              >
                Sign in
              </a>
            </div>
          </nav>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
