import "server-only";

export function isUnitsDemoMode() {
  return process.env.UNITS_DEMO_MODE === "true";
}

// Fictional preview organizations, not historical orders of battle.
// These records are never written to the database. Existing IDs stay stable.
export const demoUnits: { id: string; name: string; parentId: string | null }[] = [
  { id: "demo-root", name: "United Kingdom", parentId: null },
  { id: "demo-brigade", name: "1st Brigade", parentId: "demo-root" },
  { id: "demo-regiment-a", name: "Regiment A", parentId: "demo-brigade" },
  { id: "demo-regiment-b", name: "Regiment B", parentId: "demo-brigade" },
  { id: "demo-company", name: "Light Company", parentId: "demo-regiment-a" },
  { id: "demo-france", name: "France", parentId: null },
  { id: "demo-french-brigade", name: "Imperial Guard", parentId: "demo-france" },
  { id: "demo-french-regiment", name: "1st Grenadiers", parentId: "demo-french-brigade" },
  { id: "demo-prussia", name: "Prussia", parentId: null },
  { id: "demo-prussian-brigade", name: "1st Army Corps", parentId: "demo-prussia" },
  { id: "demo-prussian-regiment", name: "1st Infantry Regiment", parentId: "demo-prussian-brigade" },

  // United Kingdom: infantry, cavalry, artillery, and company-level branches.
  { id: "demo-uk-grenadiers", name: "Grenadier Company", parentId: "demo-regiment-a" },
  { id: "demo-uk-first-platoon", name: "1st Platoon", parentId: "demo-company" },
  { id: "demo-uk-second-platoon", name: "2nd Platoon", parentId: "demo-company" },
  { id: "demo-uk-line-company", name: "Centre Company", parentId: "demo-regiment-b" },
  { id: "demo-uk-second-brigade", name: "2nd Brigade", parentId: "demo-root" },
  { id: "demo-uk-highlanders", name: "Highland Regiment", parentId: "demo-uk-second-brigade" },
  { id: "demo-uk-rifles", name: "Rifle Regiment", parentId: "demo-uk-second-brigade" },
  { id: "demo-uk-cavalry", name: "Cavalry Brigade", parentId: "demo-root" },
  { id: "demo-uk-dragoons", name: "Royal Dragoons", parentId: "demo-uk-cavalry" },
  { id: "demo-uk-hussars", name: "Light Hussars", parentId: "demo-uk-cavalry" },
  { id: "demo-uk-artillery", name: "Royal Artillery", parentId: "demo-root" },
  { id: "demo-uk-battery", name: "1st Foot Battery", parentId: "demo-uk-artillery" },

  // France.
  { id: "demo-fr-chasseurs", name: "Guard Chasseurs", parentId: "demo-french-brigade" },
  { id: "demo-fr-guard-company", name: "1st Company", parentId: "demo-french-regiment" },
  { id: "demo-fr-corps", name: "I Corps", parentId: "demo-france" },
  { id: "demo-fr-division", name: "1st Infantry Division", parentId: "demo-fr-corps" },
  { id: "demo-fr-line", name: "8th Line Regiment", parentId: "demo-fr-division" },
  { id: "demo-fr-voltigeurs", name: "Voltigeur Company", parentId: "demo-fr-line" },
  { id: "demo-fr-second-line", name: "21st Line Regiment", parentId: "demo-fr-division" },
  { id: "demo-fr-cavalry", name: "Reserve Cavalry", parentId: "demo-france" },
  { id: "demo-fr-cuirassiers", name: "1st Cuirassiers", parentId: "demo-fr-cavalry" },
  { id: "demo-fr-lancers", name: "2nd Lancers", parentId: "demo-fr-cavalry" },

  // Prussia.
  { id: "demo-pr-fusiliers", name: "Fusilier Battalion", parentId: "demo-prussian-regiment" },
  { id: "demo-pr-musketeers", name: "Musketeer Battalion", parentId: "demo-prussian-regiment" },
  { id: "demo-pr-landwehr", name: "Landwehr Regiment", parentId: "demo-prussian-brigade" },
  { id: "demo-pr-second-corps", name: "2nd Army Corps", parentId: "demo-prussia" },
  { id: "demo-pr-guards", name: "Guard Infantry", parentId: "demo-pr-second-corps" },
  { id: "demo-pr-jagers", name: "Jäger Battalion", parentId: "demo-pr-second-corps" },
  { id: "demo-pr-hussars", name: "Hussar Regiment", parentId: "demo-pr-second-corps" },

  // Austria.
  { id: "demo-austria", name: "Austria", parentId: null },
  { id: "demo-at-corps", name: "Imperial Army Corps", parentId: "demo-austria" },
  { id: "demo-at-infantry", name: "1st Infantry Brigade", parentId: "demo-at-corps" },
  { id: "demo-at-line", name: "Line Infantry Regiment", parentId: "demo-at-infantry" },
  { id: "demo-at-company", name: "Grenadier Company", parentId: "demo-at-line" },
  { id: "demo-at-grenzers", name: "Grenzer Regiment", parentId: "demo-at-infantry" },
  { id: "demo-at-cavalry", name: "Cavalry Brigade", parentId: "demo-at-corps" },
  { id: "demo-at-uhlans", name: "Uhlan Regiment", parentId: "demo-at-cavalry" },
  { id: "demo-at-dragoons", name: "Dragoon Regiment", parentId: "demo-at-cavalry" },

  // Russia.
  { id: "demo-russia", name: "Russia", parentId: null },
  { id: "demo-ru-guards", name: "Imperial Guard", parentId: "demo-russia" },
  { id: "demo-ru-grenadiers", name: "Guard Grenadiers", parentId: "demo-ru-guards" },
  { id: "demo-ru-company", name: "1st Company", parentId: "demo-ru-grenadiers" },
  { id: "demo-ru-corps", name: "1st Infantry Corps", parentId: "demo-russia" },
  { id: "demo-ru-line", name: "Musketeer Regiment", parentId: "demo-ru-corps" },
  { id: "demo-ru-jagers", name: "Jäger Regiment", parentId: "demo-ru-corps" },
  { id: "demo-ru-cavalry", name: "Cavalry Reserve", parentId: "demo-russia" },
  { id: "demo-ru-cossacks", name: "Cossack Regiment", parentId: "demo-ru-cavalry" },

  // Smaller organizations exercise both shallow and deep branches.
  { id: "demo-sweden", name: "Sweden", parentId: null },
  { id: "demo-se-brigade", name: "Royal Brigade", parentId: "demo-sweden" },
  { id: "demo-se-guards", name: "Life Guards", parentId: "demo-se-brigade" },
  { id: "demo-se-artillery", name: "Field Artillery", parentId: "demo-se-brigade" },
  { id: "demo-spain", name: "Spain", parentId: null },
  { id: "demo-es-army", name: "Army of the Centre", parentId: "demo-spain" },
  { id: "demo-es-infantry", name: "1st Infantry Regiment", parentId: "demo-es-army" },
  { id: "demo-es-volunteers", name: "Volunteer Battalion", parentId: "demo-es-army" },
  { id: "demo-portugal", name: "Portugal", parentId: null },
  { id: "demo-pt-brigade", name: "1st Brigade", parentId: "demo-portugal" },
  { id: "demo-pt-cacadores", name: "Caçadores Battalion", parentId: "demo-pt-brigade" },
  { id: "demo-pt-company", name: "Light Company", parentId: "demo-pt-cacadores" },
];

const demoUnitsById = new Map(demoUnits.map((unit) => [unit.id, unit]));

export function listDemoUnits() {
  return [...demoUnits]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((unit) => {
      const parent = unit.parentId ? demoUnitsById.get(unit.parentId) : undefined;
      return {
        id: unit.id,
        name: unit.name,
        parent: parent ? { id: parent.id, name: parent.name } : null,
      };
    });
}

export function getDemoUnit(id: string) {
  const units = listDemoUnits();
  const unit = units.find((candidate) => candidate.id === id);
  if (!unit) return null;
  const children = units
    .filter((candidate) => candidate.parent?.id === id)
    .map(({ id, name }) => ({ id, name }));
  return { ...unit, children };
}
