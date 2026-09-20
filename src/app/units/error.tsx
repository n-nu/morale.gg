"use client";

import Link from "next/link";

export default function UnitsError({ reset }: { reset: () => void }) {
  return (
    <div role="alert">
      <h1 className="text-3xl font-semibold">Unable to load units</h1>
      <p className="mt-3 text-neutral-400">Unit information is temporarily unavailable. Please try again.</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button onClick={reset} className="rounded-lg bg-white px-5 py-3 text-black">Try again</button>
        <Link href="/units" className="py-3 text-white underline">All units</Link>
      </div>
    </div>
  );
}

