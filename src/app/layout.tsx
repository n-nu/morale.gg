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

const plannedNav = ["Community", "Audits", "Leaderboards"];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="h-16 border-b border-edge bg-surface">
          <nav className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-2 overflow-x-auto px-4 md:gap-7 md:px-10">
            <Link
              href="/"
              className="text-lg font-extrabold tracking-tight text-white md:text-xl"
            >
              morale.gg
            </Link>
            <div className="flex items-center gap-2 md:gap-7">
              {plannedNav.map((item) => (
                <span
                  key={item}
                  title="Coming soon"
                  className="hidden cursor-default text-xs font-bold uppercase tracking-[0.1em] text-muted/50 lg:inline"
                >
                  {item}
                </span>
              ))}
              <NavLink href="/statistics">Statistics</NavLink>
              <NavLink href="/events">Events</NavLink>
              <NavLink href="/units">Units</NavLink>
              <AuthNav />
            </div>
          </nav>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
