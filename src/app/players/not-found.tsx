import Link from "next/link";
import { Breadcrumbs, PageHeader } from "@/app/presentation";

export default function NotFound() {
  return <>
    <Breadcrumbs items={[{ label: "Community", href: "/events" }, { label: "Players", href: "/players" }, { label: "Not found" }]} />
    <PageHeader category="Player record" title="Player not found" description="This public Player record could not be resolved." actions={<Link className="text-sm font-bold text-gold underline underline-offset-4 hover:text-gold-bright" href="/players">Find a Player</Link>} />
  </>;
}
