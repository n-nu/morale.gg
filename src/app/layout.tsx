import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { AuthNav } from "./auth-nav";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="h-16 border-b border-edge bg-surface">
          <nav className="page-shell flex h-full items-center justify-between gap-2 overflow-x-auto md:gap-6">
            <Link
              href="/"
              className="text-lg font-extrabold tracking-tight text-white md:text-xl"
            >
              morale.gg
            </Link>
            <div className="flex shrink-0 items-center gap-2 md:gap-7">
              <NavLink href="/leaderboard">Leaderboard</NavLink>
              <NavLink href="/players">Players</NavLink>
              <NavLink href="/statistics">Statistics</NavLink>
              <NavLink href="/events">Events</NavLink>
              <NavLink href="/units">Units</NavLink>
              <NavLink href="/audits">Audits</NavLink>
              <AuthNav />
            </div>
          </nav>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
