import Link from "next/link";
import { Breadcrumbs, PageHeader } from "@/app/presentation";

export default function UnitNotFound() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Community", href: "/events" }, { label: "Units", href: "/units" }, { label: "Not found" }]} />
      <PageHeader category="Unit directory" title="Unit not found" description="This Unit does not exist or is no longer available." actions={<Link href="/units" className="text-sm font-bold text-gold underline underline-offset-4 hover:text-gold-bright">Browse all Units</Link>} />
    </>
  );
}
