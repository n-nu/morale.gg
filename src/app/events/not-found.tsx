import Link from "next/link";

export default function EventNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">
        Not found
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
        This event does not exist
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        It may have been removed, or the link may be wrong.
      </p>
      <Link
        href="/events"
        className="mt-8 text-sm font-semibold text-gold hover:text-gold-bright"
      >
        ← All events
      </Link>
    </div>
  );
}
