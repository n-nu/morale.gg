import Link from "next/link";
export default function NotFound() {
  return <><h1 className="text-2xl font-bold">Player not found</h1><Link className="underline" href="/players">Find a Player</Link></>;
}
