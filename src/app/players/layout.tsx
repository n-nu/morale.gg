import Link from "next/link";

export const metadata = { title: "Players | morale.gg" };

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-6 py-10">
    <nav className="mb-8 flex gap-6 text-sm"><Link className="underline" href="/units">Units and rosters</Link><Link className="underline" href="/players">Players</Link></nav>
    {children}
  </div>;
}
