export type UnitDirectoryRow = {
  id: string;
  name: string;
  description: string | null;
  imageRef: string | null;
  discordInvite: string | null;
  groupLink: string | null;
  parent: { id: string; name: string } | null;
  commander: { name: string | null; image: string | null } | null;
  memberCount: number | null;
  descendantCount: number;
};

export function getUnitDescendantCounts(
  units: Array<{ id: string; parent: { id: string } | null }>,
) {
  const parentById = new Map(units.map((unit) => [unit.id, unit.parent?.id ?? null]));
  const counts = new Map(units.map((unit) => [unit.id, 0]));

  for (const unit of units) {
    let parentId = unit.parent?.id ?? null;
    const visited = new Set([unit.id]);
    while (parentId && counts.has(parentId) && !visited.has(parentId)) {
      counts.set(parentId, counts.get(parentId)! + 1);
      visited.add(parentId);
      parentId = parentById.get(parentId) ?? null;
    }
  }

  return counts;
}
