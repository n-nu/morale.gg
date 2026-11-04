import "server-only";

import { isUnitsDemoMode, listDemoUnits } from "./demo";

export type PublicUnitPresentation = {
  unitId: string;
  name: string;
  imageRef: string | null;
};

export async function getPublicUnitPresentationBatch(
  unitIds: readonly string[],
): Promise<PublicUnitPresentation[]> {
  const selectedIds = [...new Set(unitIds.map((unitId) => unitId.trim()).filter(Boolean))];
  if (selectedIds.length === 0) return [];

  if (isUnitsDemoMode()) {
    const unitsById = new Map(listDemoUnits().map((unit) => [unit.id, unit]));
    return selectedIds.flatMap((unitId) => {
      const unit = unitsById.get(unitId);
      return unit
        ? [{ unitId: unit.id, name: unit.name, imageRef: unit.imageRef }]
        : [];
    });
  }

  const { prisma } = await import("@/lib/prisma");
  const units = await prisma.unit.findMany({
    where: { id: { in: selectedIds } },
    select: { id: true, name: true, imageRef: true },
  });
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));

  return selectedIds.flatMap((unitId) => {
    const unit = unitsById.get(unitId);
    return unit
      ? [{ unitId: unit.id, name: unit.name, imageRef: unit.imageRef }]
      : [];
  });
}
