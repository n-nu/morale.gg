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

export function getTopLevelUnitDirectoryEntries<T extends {
  id: string;
  parent: { id: string } | null;
}>(units: T[]) {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const childrenById = new Map<string, T[]>();
  for (const unit of units) {
    const parentId = unit.parent?.id;
    if (!parentId || !unitsById.has(parentId)) continue;
    const children = childrenById.get(parentId) ?? [];
    children.push(unit);
    childrenById.set(parentId, children);
  }

  const roots = units.filter((unit) => !unit.parent || !unitsById.has(unit.parent.id));
  const entries: T[] = [];
  for (const root of roots) {
    let current = root;
    const visited = new Set([root.id]);
    while (true) {
      const children = childrenById.get(current.id) ?? [];
      if (children.length === 0) {
        entries.push(current);
        break;
      }
      if (children.length > 1) {
        entries.push(...children);
        break;
      }

      const child = children[0];
      if (
        visited.has(child.id) ||
        (childrenById.get(child.id)?.length ?? 0) === 0
      ) {
        entries.push(current);
        break;
      }
      current = child;
      visited.add(child.id);
    }
  }
  return entries;
}

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
