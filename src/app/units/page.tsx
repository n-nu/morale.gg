import { UnitTable } from "@/modules/units/components/unit-table";
import { listPublicUnitDirectory } from "@/modules/units/server/queries";
import { getTopLevelUnitDirectoryEntries } from "@/modules/units/public-presentation";
import { Breadcrumbs, PageEmptyState, PageHeader } from "@/app/presentation";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const units = await listPublicUnitDirectory();
  const roots = getTopLevelUnitDirectoryEntries(units);
  const hierarchyRoots = units.filter((unit) => unit.parent === null);

  return (
    <>
      <Breadcrumbs items={[{ label: "Community", href: "/events" }, { label: "Units" }]} />
      <PageHeader
        category="Organization"
        title={hierarchyRoots.length === 1 ? hierarchyRoots[0].name : "Units"}
        count={roots.length}
        description="Explore major public Units by commander, active roster, and organization size."
      />
      {roots.length === 0 ? (
        <PageEmptyState title="No units are available yet." />
      ) : (
        <UnitTable units={units} />
      )}
    </>
  );
}
