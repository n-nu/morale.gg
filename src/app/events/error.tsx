"use client";

export default function EventsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">
        Something went wrong
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
        Events are unavailable right now
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        The events data could not be loaded. This is usually temporary.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-background transition-colors hover:bg-gold-bright"
      >
        Try again
      </button>
    </div>
  );
}
