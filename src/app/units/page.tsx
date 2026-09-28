import { UnitTable } from "@/modules/units/components/unit-table";
import { listUnits } from "@/modules/units/server/queries";
import { Breadcrumbs, PageEmptyState, PageHeader } from "@/app/presentation";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const units = await listUnits();

  return (
    <>
      <Breadcrumbs items={[{ label: "Community", href: "/events" }, { label: "Units" }]} />
      <PageHeader category="Directory" title="Units" count={units.length} description="Organization hierarchy and direct subunits." />
      {units.length === 0 ? (
        <PageEmptyState title="No units are available yet." />
      ) : (
        <UnitTable units={units} />
      )}
    </>
  );
}
