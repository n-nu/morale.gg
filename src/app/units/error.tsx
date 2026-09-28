"use client";

import Link from "next/link";

export default function UnitsError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="border-y border-edge py-8">
      <h1 className="text-xl font-extrabold text-white">Unable to load Units</h1>
      <p className="mt-2 text-sm text-muted">Unit information is temporarily unavailable.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button onClick={reset} className="min-h-10 rounded-md bg-gold px-4 py-2 text-sm font-bold text-gold-ink transition-colors hover:bg-gold-bright">Try again</button>
        <Link href="/units" className="text-sm font-bold text-gold underline underline-offset-4">All Units</Link>
      </div>
    </div>
  );
}
