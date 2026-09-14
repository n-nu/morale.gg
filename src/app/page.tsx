export default function Home() {
  return (
    <div className="mx-auto flex max-w-5xl flex-1 flex-col items-start justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        morale.gg
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
        Application foundation is running. Feature modules (units, players,
        events, audits, statistics) will be added under{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">
          src/app
        </code>{" "}
        by future tickets.
      </p>
    </div>
  );
}
