import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <Image
          src="/maps/fallback-winter-battle.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>
      <div className="relative mx-auto flex w-full max-w-[1280px] flex-1 flex-col items-start justify-center px-6 py-20 md:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">
          Community
        </p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight text-white">
          morale.gg
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted">
          Statistics, rosters, and event management for organized Napoleonic
          Wars communities. Feature modules (units, players, audits,
          statistics) are being added incrementally.
        </p>
        <Link
          href="/events"
          className="mt-8 rounded-lg bg-gold px-6 py-3 text-sm font-bold text-gold-ink transition-colors hover:bg-gold-bright"
        >
          Browse events
        </Link>
      </div>
    </div>
  );
}
