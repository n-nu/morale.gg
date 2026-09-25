"use client";
export default function PlayersError({ reset }: { reset: () => void }) {
  return <div role="alert"><h1 className="text-2xl font-bold">Unable to load Players</h1><p>Please try again.</p><button className="mt-3 underline" onClick={reset}>Retry</button></div>;
}
