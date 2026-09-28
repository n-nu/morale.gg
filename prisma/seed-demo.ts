import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type AuditUnitType } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/morale_gg",
  }),
});

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const ROOT_UNIT_ID = "root-morale-gg";
const DEMO_PREFIX = "demo-";
const DAY_MS = 24 * 60 * 60 * 1000;

const ROOT_COMMANDER_ID = "demo-user-root";
const DEMO_USER_IDS = {
  austria: "demo-user-austria",
  france: "demo-user-france",
  prussia: "demo-user-prussia",
  russia: "demo-user-russia",
  spain: "demo-user-spain",
  portugal: "demo-user-portugal",
  community: "demo-user-community",
};

const unitSpecs = [
  { id: "demo-unit-austria", name: "Austria", parentId: ROOT_UNIT_ID, commanderUserId: DEMO_USER_IDS.austria },
  { id: "demo-unit-austria-corps", name: "Imperial Army Corps", parentId: "demo-unit-austria", commanderUserId: DEMO_USER_IDS.austria },
  { id: "demo-unit-austria-infantry", name: "1st Infantry Brigade", parentId: "demo-unit-austria-corps", commanderUserId: DEMO_USER_IDS.austria },
  { id: "demo-unit-austria-grenzers", name: "Grenzer Regiment", parentId: "demo-unit-austria-infantry", commanderUserId: DEMO_USER_IDS.austria },
  { id: "demo-unit-austria-line", name: "Line Infantry Regiment", parentId: "demo-unit-austria-infantry", commanderUserId: DEMO_USER_IDS.austria },
  { id: "demo-unit-austria-company", name: "Grenadier Company", parentId: "demo-unit-austria-line", commanderUserId: DEMO_USER_IDS.austria },
  { id: "demo-unit-austria-cavalry", name: "Cavalry Brigade", parentId: "demo-unit-austria-corps", commanderUserId: DEMO_USER_IDS.austria },
  { id: "demo-unit-austria-uhlans", name: "Uhlan Regiment", parentId: "demo-unit-austria-cavalry", commanderUserId: DEMO_USER_IDS.austria },
  { id: "demo-unit-austria-dragoons", name: "Dragoon Regiment", parentId: "demo-unit-austria-cavalry", commanderUserId: DEMO_USER_IDS.austria },
  { id: "demo-unit-austria-battery", name: "Field Battery", parentId: "demo-unit-austria-corps", commanderUserId: DEMO_USER_IDS.austria },

  { id: "demo-unit-france", name: "France", parentId: ROOT_UNIT_ID, commanderUserId: DEMO_USER_IDS.france },
  { id: "demo-unit-france-corps", name: "I Corps", parentId: "demo-unit-france", commanderUserId: DEMO_USER_IDS.france },
  { id: "demo-unit-france-division", name: "1st Infantry Division", parentId: "demo-unit-france-corps", commanderUserId: DEMO_USER_IDS.france },
  { id: "demo-unit-france-line", name: "12e Régiment d'Infanterie", parentId: "demo-unit-france-division", commanderUserId: DEMO_USER_IDS.france },
  { id: "demo-unit-france-voltigeurs", name: "Voltigeur Company", parentId: "demo-unit-france-line", commanderUserId: DEMO_USER_IDS.france },
  { id: "demo-unit-france-guard", name: "Imperial Guard", parentId: "demo-unit-france", commanderUserId: DEMO_USER_IDS.france },
  { id: "demo-unit-france-old-guard", name: "Old Guard", parentId: "demo-unit-france-guard", commanderUserId: DEMO_USER_IDS.france },
  { id: "demo-unit-france-cavalry", name: "Guard Cavalry", parentId: "demo-unit-france-guard", commanderUserId: DEMO_USER_IDS.france },
  { id: "demo-unit-france-cuirassiers", name: "1st Cuirassiers", parentId: "demo-unit-france-cavalry", commanderUserId: DEMO_USER_IDS.france },
  { id: "demo-unit-france-artillery", name: "Horse Artillery", parentId: "demo-unit-france-corps", commanderUserId: DEMO_USER_IDS.france },

  { id: "demo-unit-prussia", name: "Prussia", parentId: ROOT_UNIT_ID, commanderUserId: DEMO_USER_IDS.prussia },
  { id: "demo-unit-prussia-corps", name: "I Army Corps", parentId: "demo-unit-prussia", commanderUserId: DEMO_USER_IDS.prussia },
  { id: "demo-unit-prussia-infantry", name: "Infantry Brigade", parentId: "demo-unit-prussia-corps", commanderUserId: DEMO_USER_IDS.prussia },
  { id: "demo-unit-prussia-jager", name: "Jäger Battalion", parentId: "demo-unit-prussia-corps", commanderUserId: DEMO_USER_IDS.prussia },
  { id: "demo-unit-prussia-cavalry", name: "Cavalry Brigade", parentId: "demo-unit-prussia-corps", commanderUserId: DEMO_USER_IDS.prussia },
  { id: "demo-unit-prussia-hussars", name: "Hussar Regiment", parentId: "demo-unit-prussia-cavalry", commanderUserId: DEMO_USER_IDS.prussia },
  { id: "demo-unit-prussia-landwehr", name: "Landwehr Regiment", parentId: "demo-unit-prussia-infantry", commanderUserId: DEMO_USER_IDS.prussia },
  { id: "demo-unit-prussia-guns", name: "Field Company", parentId: "demo-unit-prussia-corps", commanderUserId: DEMO_USER_IDS.prussia },

  { id: "demo-unit-russia", name: "Russia", parentId: ROOT_UNIT_ID, commanderUserId: DEMO_USER_IDS.russia },
  { id: "demo-unit-russia-guard", name: "Imperial Guard", parentId: "demo-unit-russia", commanderUserId: DEMO_USER_IDS.russia },
  { id: "demo-unit-russia-grenadiers", name: "Guard Grenadiers", parentId: "demo-unit-russia-guard", commanderUserId: DEMO_USER_IDS.russia },
  { id: "demo-unit-russia-company", name: "1st Company", parentId: "demo-unit-russia-grenadiers", commanderUserId: DEMO_USER_IDS.russia },
  { id: "demo-unit-russia-corps", name: "1st Infantry Corps", parentId: "demo-unit-russia", commanderUserId: DEMO_USER_IDS.russia },
  { id: "demo-unit-russia-line", name: "Musketeer Regiment", parentId: "demo-unit-russia-corps", commanderUserId: DEMO_USER_IDS.russia },
  { id: "demo-unit-russia-jagers", name: "Jäger Regiment", parentId: "demo-unit-russia-corps", commanderUserId: DEMO_USER_IDS.russia },
  { id: "demo-unit-russia-cavalry", name: "Cavalry Reserve", parentId: "demo-unit-russia", commanderUserId: DEMO_USER_IDS.russia },
  { id: "demo-unit-russia-cossacks", name: "Cossack Regiment", parentId: "demo-unit-russia-cavalry", commanderUserId: DEMO_USER_IDS.russia },

  { id: "demo-unit-spain", name: "Spain", parentId: ROOT_UNIT_ID, commanderUserId: DEMO_USER_IDS.spain },
  { id: "demo-unit-spain-army", name: "Army of the Centre", parentId: "demo-unit-spain", commanderUserId: DEMO_USER_IDS.spain },
  { id: "demo-unit-spain-infantry", name: "1st Infantry Regiment", parentId: "demo-unit-spain-army", commanderUserId: DEMO_USER_IDS.spain },
  { id: "demo-unit-spain-volunteers", name: "Volunteer Battalion", parentId: "demo-unit-spain-army", commanderUserId: DEMO_USER_IDS.spain },
  { id: "demo-unit-spain-light", name: "Light Company", parentId: "demo-unit-spain-infantry", commanderUserId: DEMO_USER_IDS.spain },
  { id: "demo-unit-spain-cavalry", name: "Mounted Lancers", parentId: "demo-unit-spain-army", commanderUserId: DEMO_USER_IDS.spain },

  { id: "demo-unit-portugal", name: "Portugal", parentId: ROOT_UNIT_ID, commanderUserId: DEMO_USER_IDS.portugal },
  { id: "demo-unit-portugal-brigade", name: "1st Brigade", parentId: "demo-unit-portugal", commanderUserId: DEMO_USER_IDS.portugal },
  { id: "demo-unit-portugal-cacadores", name: "Caçadores Battalion", parentId: "demo-unit-portugal-brigade", commanderUserId: DEMO_USER_IDS.portugal },
  { id: "demo-unit-portugal-company", name: "Light Company", parentId: "demo-unit-portugal-cacadores", commanderUserId: DEMO_USER_IDS.portugal },
  { id: "demo-unit-portugal-riders", name: "Lancer Squadron", parentId: "demo-unit-portugal-brigade", commanderUserId: DEMO_USER_IDS.portugal },
  { id: "demo-unit-portugal-garrison", name: "Fortress Garrison", parentId: "demo-unit-portugal", commanderUserId: DEMO_USER_IDS.portugal },

  { id: "demo-unit-mercenary-broker", name: "Independent Mercenary Company", parentId: ROOT_UNIT_ID, commanderUserId: DEMO_USER_IDS.community },
  { id: "demo-unit-mercenary-patrol", name: "Mercenary Patrol", parentId: "demo-unit-mercenary-broker", commanderUserId: DEMO_USER_IDS.community },
  { id: "demo-unit-empty-1", name: "Reserve Depot", parentId: "demo-unit-prussia", commanderUserId: DEMO_USER_IDS.prussia },
  { id: "demo-unit-empty-2", name: "Outpost Company", parentId: "demo-unit-austria", commanderUserId: DEMO_USER_IDS.austria },
];

const playerNames = [
  "Adler","BonaparteEnjoyer","BlackPowder","Grenadier","OldGuard","Hussar","Volkov","Sharpe","RedCoat42","Bayonet","Lancer","Frederick","IberianFox","Musketeer","Sabre","PatrioticDrummer","Rook","Vanguard","Marston","DukeGuns","Blücher","ArdentRifle","CrownMariner","EmberLine","Wellington","CossackRider","Revolutionary","Templar","Bastion","Rooke","Talion","Briarfield","Crownstone","Milo","Federick","Hawke","Carbine","Rifleman","Gendarme","Aurelia","Ravenwood","AustrianLine","Sovereign","Kite","Sapper","Vigil","NimbleDrake","Bulwark","Astra","Cresthaven","Leclerc","NapoleonFan","Perigord","Boscov","Lyonnais","Cairn","Harrow","SaxonRook","Brandenburg","DukesGuard","DawnBatter","Flintlock","Cicero","DapperHussar","Krasnov","Korovin","Aylin","Pikeheart","Marechal","Ariadne","Rover","Wolfram","Tarragon","Oakenshade","Merrick","Coteau","Bordeaux","Barrow","Granite","SableRook","Northwind","Raimund","Etoile","Marceau","Lafayette","Arcade","FinlandFox","ArdentMare","Kestrel","Rumor","Byzantine","BavarianFox","Hawthorn","Lancer47","Bellweather","Cannonade","DrummerRook","Harden","Vesper","Milan","Crownfield","Valois","Garnet","Fleming","SableCoat","Redoubt","Mentor","Commandant","DawnDrum","Harrowgate","Lynx","Fife","Warden","Brigand","Banneret","VanHalen","Devereux","Glaive","EmeraldCarbine","Aurore","LancerMajor","Pavlov","Chasseur","Meridian","ProudCrest","Braidwood","Rivet","Rosenberg","Dreadnought","Kirkland","Draughtsman","Gunsmith","Theodor","Bolek","Corvine","Stahl","Eisenberg","Danais","Oberon","BlackDrum","Garrick","Fyodor","Mendicant","Czarina","Houndtail","Frostline","Hollowoak","Karron","Prowler"];

const unitCurrentTargets: Array<{ unitId: string; count: number }> = [
  { unitId: "demo-unit-austria-grenzers", count: 12 },
  { unitId: "demo-unit-austria-line", count: 17 },
  { unitId: "demo-unit-austria-uhlans", count: 9 },
  { unitId: "demo-unit-austria-dragoons", count: 10 },
  { unitId: "demo-unit-austria-battery", count: 8 },
  { unitId: "demo-unit-france-line", count: 19 },
  { unitId: "demo-unit-france-old-guard", count: 11 },
  { unitId: "demo-unit-france-cuirassiers", count: 10 },
  { unitId: "demo-unit-france-artillery", count: 7 },
  { unitId: "demo-unit-prussia-infantry", count: 14 },
  { unitId: "demo-unit-prussia-jager", count: 8 },
  { unitId: "demo-unit-prussia-hussars", count: 9 },
  { unitId: "demo-unit-russia-grenadiers", count: 12 },
  { unitId: "demo-unit-russia-line", count: 16 },
  { unitId: "demo-unit-russia-jagers", count: 10 },
  { unitId: "demo-unit-russia-cossacks", count: 8 },
  { unitId: "demo-unit-spain-infantry", count: 10 },
  { unitId: "demo-unit-spain-volunteers", count: 7 },
  { unitId: "demo-unit-spain-cavalry", count: 6 },
  { unitId: "demo-unit-portugal-cacadores", count: 8 },
  { unitId: "demo-unit-portugal-riders", count: 7 },
  { unitId: "demo-unit-portugal-company", count: 5 },
  { unitId: "demo-unit-france-voltigeurs", count: 6 },
  { unitId: "demo-unit-mercenary-patrol", count: 5 },
  { unitId: "demo-unit-austria-company", count: 4 },
  { unitId: "demo-unit-prussia-landwehr", count: 5 },
];

const mercenaryPlayerIds = [
  "demo-player-merc-001", "demo-player-merc-002", "demo-player-merc-003", "demo-player-merc-004",
  "demo-player-merc-005", "demo-player-merc-006", "demo-player-merc-007", "demo-player-merc-008",
  "demo-player-merc-009", "demo-player-merc-010", "demo-player-merc-011", "demo-player-merc-012",
];

const mercenaryNames = [
  "BrigandRook","WagonBaker","GunnerMick","CopperMerc","RavenCrown","BriarMason","SilverHawk","DanePike",
  "KettleDrummer","RavenField","MiraSands","RedHearth",
];

const eventPlans = [
  { id: "demo-event-001", name: "Battle of Austerlitz", scheduledAt: daysFromNow(-85), type: "battle", participants: ["demo-unit-austria-line", "demo-unit-france-old-guard", "demo-unit-prussia-infantry"] },
  { id: "demo-event-002", name: "Rhine Campaign", scheduledAt: daysFromNow(-68), type: "campaign", participants: ["demo-unit-france-line", "demo-unit-spain-infantry", "demo-unit-portugal-cacadores"] },
  { id: "demo-event-003", name: "Siege of Zaragoza", scheduledAt: daysFromNow(-59), type: "siege", participants: ["demo-unit-spain-volunteers", "demo-unit-portugal-brigade", "demo-unit-france-artillery"] },
  { id: "demo-event-004", name: "Crossing of the Danube", scheduledAt: daysFromNow(-41), type: "battle", participants: ["demo-unit-austria-dragoons", "demo-unit-russia-cossacks", "demo-unit-prussia-hussars"] },
  { id: "demo-event-005", name: "Battle of Jena", scheduledAt: daysFromNow(-31), type: "battle", participants: ["demo-unit-prussia-infantry", "demo-unit-france-line", "demo-unit-france-cuirassiers"] },
  { id: "demo-event-006", name: "Winter Coalition Event", scheduledAt: daysFromNow(-18), type: "training", participants: ["demo-unit-austria-grenzers", "demo-unit-russia-line", "demo-unit-prussia-jager", "demo-unit-portugal-riders"] },
  { id: "demo-event-007", name: "Iberian Campaign", scheduledAt: daysFromNow(-12), type: "campaign", participants: ["demo-unit-spain-cavalry", "demo-unit-portugal-cacadores", "demo-unit-france-line", "demo-unit-austria-battery"] },
  { id: "demo-event-008", name: "Guard Training Engagement", scheduledAt: daysFromNow(-7), type: "training", participants: ["demo-unit-france-old-guard", "demo-unit-russia-grenadiers", "demo-unit-austria-uhlans"] },
  { id: "demo-event-009", name: "Prussian Field Exercise", scheduledAt: daysFromNow(-3), type: "training", participants: ["demo-unit-prussia-landwehr", "demo-unit-prussia-jager", "demo-unit-france-artillery"] },
  { id: "demo-event-010", name: "Coalition Saturday Linebattle", scheduledAt: daysFromNow(2), type: "battle", participants: ["demo-unit-austria-line", "demo-unit-prussia-infantry", "demo-unit-russia-line", "demo-unit-spain-infantry"], status: "REQUESTED" as const },
  { id: "demo-event-011", name: "Napoleonic Muster", scheduledAt: daysFromNow(6), type: "training", participants: ["demo-unit-france-line", "demo-unit-france-old-guard", "demo-unit-austria-company"], status: "APPROVED" as const },
  { id: "demo-event-012", name: "Rhine Crossing Drill", scheduledAt: daysFromNow(14), type: "drill", participants: ["demo-unit-france-cavalry", "demo-unit-prussia-cavalry", "demo-unit-russia-cossacks"], status: "REQUESTED" as const },
  { id: "demo-event-013", name: "Austrian Corps Review", scheduledAt: daysFromNow(21), type: "review", participants: ["demo-unit-austria-corps", "demo-unit-austria-battery"], status: "APPROVED" as const },
  { id: "demo-event-014", name: "Danube Reconnaissance", scheduledAt: daysFromNow(31), type: "recon", participants: ["demo-unit-russia-cavalry", "demo-unit-austria-uhlans", "demo-unit-portugal-riders"], status: "REQUESTED" as const },
];

function daysFromNow(dayOffset: number): Date {
  return new Date(Date.now() + dayOffset * DAY_MS);
}

async function ensureUser(tx: TxClient, userId: string, name: string): Promise<void> {
  await tx.user.upsert({
    where: { id: userId },
    update: { name, email: `${userId}@demo.local` },
    create: { id: userId, name, email: `${userId}@demo.local` },
  });
}

async function ensureMembership(tx: TxClient, userId: string, unitId: string): Promise<void> {
  const existing = await tx.authorizedUserMembership.findFirst({
    where: { userId, unitId, endedAt: null },
    select: { id: true },
  });

  if (existing) {
    await tx.authorizedUserMembership.update({
      where: { id: existing.id },
      data: { authorityLevel: 0 },
    });
    return;
  }

  // Only one active level-zero membership may exist per unit; do not displace
  // a pre-existing, non-demo commander (e.g. the shared application root).
  const activeCommander = await tx.authorizedUserMembership.findFirst({
    where: { unitId, authorityLevel: 0, endedAt: null },
    select: { id: true },
  });
  if (activeCommander) {
    return;
  }

  await tx.authorizedUserMembership.create({
    data: {
      userId,
      unitId,
      authorityLevel: 0,
      createdByUserId: userId,
    },
  });
}

async function ensureRootUnit(tx: TxClient): Promise<void> {
  await tx.rootUnit.upsert({
    where: { unitId: ROOT_UNIT_ID },
    update: {},
    create: { unitId: ROOT_UNIT_ID },
  });

  // Do not overwrite a pre-existing shared root Unit's identity or commander.
  await tx.unit.upsert({
    where: { id: ROOT_UNIT_ID },
    update: {},
    create: {
      id: ROOT_UNIT_ID,
      name: process.env.ROOT_UNIT_NAME ?? "morale.gg Root Unit",
      commanderUserId: ROOT_COMMANDER_ID,
      rootUnitId: ROOT_UNIT_ID,
      parentId: null,
    },
  });

  await ensureMembership(tx, ROOT_COMMANDER_ID, ROOT_UNIT_ID);
}

async function seedUnits(tx: TxClient): Promise<Map<string, string[]>> {
  const rosterMap = new Map<string, string[]>();

  for (const unit of unitSpecs) {
    await tx.unit.upsert({
      where: { id: unit.id },
      update: {
        name: unit.name,
        parentId: unit.parentId,
        rootUnitId: ROOT_UNIT_ID,
        commanderUserId: unit.commanderUserId,
      },
      create: {
        id: unit.id,
        name: unit.name,
        parentId: unit.parentId,
        rootUnitId: ROOT_UNIT_ID,
        commanderUserId: unit.commanderUserId,
      },
    });

    await ensureMembership(tx, unit.commanderUserId, unit.id);
    rosterMap.set(unit.id, []);
  }

  return rosterMap;
}

async function seedPlayers(tx: TxClient): Promise<{ players: Array<{ id: string; playerId: string; name: string }>; rosterMap: Map<string, string[]> }> {
  const players: Array<{ id: string; playerId: string; name: string }> = [];
  const rosterMap = await seedUnits(tx);

  for (let index = 0; index < playerNames.length; index += 1) {
    const name = playerNames[index];
    const playerId = `demo-player-${String(index + 1).padStart(3, "0")}`;
    const created = await tx.player.upsert({
      where: { playerId },
      update: { name },
      create: { id: playerId, playerId, name },
    });
    players.push({ id: created.id, playerId: created.playerId, name: created.name ?? name });
  }

  const mercenaryRecords = mercenaryNames.map((name, index) => {
    const playerId = mercenaryPlayerIds[index];
    return { id: playerId, playerId, name };
  });

  for (const record of mercenaryRecords) {
    await tx.player.upsert({
      where: { playerId: record.playerId },
      update: { name: record.name },
      create: { id: record.id, playerId: record.playerId, name: record.name },
    });
  }

  const rosterIndex = new Map<string, number>();
  let cursor = 0;
  for (const target of unitCurrentTargets) {
    const maxIndex = Math.min(players.length, cursor + target.count);
    const selected = players.slice(cursor, maxIndex);
    for (const player of selected) {
      rosterMap.get(target.unitId)?.push(player.id);
      rosterIndex.set(player.id, cursor);
    }
    cursor = maxIndex;
  }


  for (const [unitId, memberIds] of rosterMap.entries()) {
    if (memberIds.length === 0) continue;
    for (const memberId of memberIds) {
      const id = `demo-membership-${unitId}-${memberId}`;
      await tx.unitMembership.upsert({
        where: { id },
        update: { playerId: memberId, unitId, startedAt: daysFromNow(-240) },
        create: {
          id,
          playerId: memberId,
          unitId,
          startedAt: daysFromNow(-240),
        },
      });
    }
  }

  const formerMemberships = [
    { playerId: players[9].id, unitId: "demo-unit-france-line", endedAt: daysFromNow(-120), nextUnitId: "demo-unit-france-cuirassiers" },
    { playerId: players[18].id, unitId: "demo-unit-austria-line", endedAt: daysFromNow(-160), nextUnitId: "demo-unit-austria-grenzers" },
    { playerId: players[31].id, unitId: "demo-unit-prussia-jager", endedAt: daysFromNow(-145), nextUnitId: "demo-unit-prussia-landwehr" },
    { playerId: players[42].id, unitId: "demo-unit-russia-line", endedAt: daysFromNow(-210), nextUnitId: "demo-unit-russia-jagers" },
    { playerId: players[55].id, unitId: "demo-unit-spain-volunteers", endedAt: daysFromNow(-90), nextUnitId: "demo-unit-spain-infantry" },
    { playerId: players[61].id, unitId: "demo-unit-portugal-company", endedAt: daysFromNow(-80), nextUnitId: "demo-unit-portugal-cacadores" },
    { playerId: players[73].id, unitId: "demo-unit-france-line", endedAt: daysFromNow(-70), nextUnitId: "demo-unit-france-voltigeurs" },
    { playerId: players[87].id, unitId: "demo-unit-austria-uhlans", endedAt: daysFromNow(-110), nextUnitId: "demo-unit-austria-dragoons" },
    { playerId: players[95].id, unitId: "demo-unit-prussia-infantry", endedAt: daysFromNow(-130), nextUnitId: "demo-unit-prussia-hussars" },
    { playerId: players[103].id, unitId: "demo-unit-russia-cossacks", endedAt: daysFromNow(-100), nextUnitId: "demo-unit-russia-line" },
    { playerId: players[112].id, unitId: "demo-unit-spain-cavalry", endedAt: daysFromNow(-140), nextUnitId: "demo-unit-spain-infantry" },
    { playerId: players[118].id, unitId: "demo-unit-portugal-riders", endedAt: daysFromNow(-150), nextUnitId: "demo-unit-portugal-brigade" },
    { playerId: players[124].id, unitId: "demo-unit-france-old-guard", endedAt: daysFromNow(-175), nextUnitId: "demo-unit-france-line" },
  ];

  for (const item of formerMemberships) {
    const historyId = `demo-history-${item.playerId}-${item.unitId}`;
    await tx.unitMembership.upsert({
      where: { id: historyId },
      update: { playerId: item.playerId, unitId: item.unitId, startedAt: daysFromNow(-260), endedAt: item.endedAt },
      create: {
        id: historyId,
        playerId: item.playerId,
        unitId: item.unitId,
        startedAt: daysFromNow(-260),
        endedAt: item.endedAt,
      },
    });

    const nextId = `demo-history-${item.playerId}-${item.nextUnitId}`;
    await tx.unitMembership.upsert({
      where: { id: nextId },
      update: { playerId: item.playerId, unitId: item.nextUnitId, startedAt: new Date(item.endedAt.getTime() + 14 * DAY_MS) },
      create: {
        id: nextId,
        playerId: item.playerId,
        unitId: item.nextUnitId,
        startedAt: new Date(item.endedAt.getTime() + 14 * DAY_MS),
      },
    });
  }

  return { players: [...players, ...mercenaryRecords], rosterMap };
}

async function seedEventsAndAudits(tx: TxClient, allPlayers: Array<{ id: string; playerId: string; name: string }>, rosterMap: Map<string, string[]>): Promise<void> {
  const historicalEventIds = new Set<string>();
  const eventParticipationRecords: Array<{ participationId: string; unitId: string; eventId: string }> = [];
  const atomicUnitIds: string[] = [];
  const atomicUnitMap = new Map<string, { eventId: string; unitId: string }>();
  const auditRecords: Array<{ auditId: string; atomicUnitId: string; unitType: AuditUnitType; createdByUserId: string; lifecycle: "DRAFT" | "FINAL"; submittedAt?: Date }> = [];
  const commandGroupPlan: Array<{eventId:string; rootGroupId:string; rootUnitId:string; rootCommanderId:string; childGroups:Array<{id:string; name:string; representedUnitId:string; commanderPlayerId:string; atomicIds:string[]}> }> = [];

  for (const event of eventPlans) {
    await tx.event.upsert({
      where: { id: event.id },
      update: { name: event.name, scheduledAt: event.scheduledAt, eventType: event.type, description: "Development demo event" },
      create: { id: event.id, name: event.name, scheduledAt: event.scheduledAt, eventType: event.type, description: "Development demo event", ownerUserId: DEMO_USER_IDS.community },
    });

    if (event.scheduledAt.getTime() < Date.now()) {
      historicalEventIds.add(event.id);
    }

    for (const unitId of event.participants) {
      const participationId = `demo-participation-${event.id}-${unitId}`;
      await tx.eventParticipation.upsert({
        where: { id: participationId },
        update: { status: event.status ?? "APPROVED" },
        create: {
          id: participationId,
          eventId: event.id,
          unitId,
          status: event.status ?? "APPROVED",
        },
      });
      eventParticipationRecords.push({ participationId, unitId, eventId: event.id });

      const baseAtomicCount = event.scheduledAt.getTime() < Date.now() ? (unitId.includes("france") ? 2 : 1) : 1;
      const mandatoryCount = baseAtomicCount === 2 ? 2 : 1;
      for (let atomicIndex = 0; atomicIndex < baseAtomicCount; atomicIndex += 1) {
        const atomicId = `demo-atomic-${event.id}-${unitId}-${atomicIndex}`;
        atomicUnitIds.push(atomicId);
        atomicUnitMap.set(atomicId, { eventId: event.id, unitId });
        await tx.atomicEventUnit.upsert({
          where: { id: atomicId },
          update: { isMandatory: atomicIndex < mandatoryCount, eventParticipationId: participationId },
          create: {
            id: atomicId,
            eventParticipationId: participationId,
            isMandatory: atomicIndex < mandatoryCount,
          },
        });
      }
    }
  }

  const commandEventIds = ["demo-event-001", "demo-event-005", "demo-event-007", "demo-event-008"];
  for (const eventId of commandEventIds) {
    const event = eventPlans.find((candidate) => candidate.id === eventId);
    if (!event) continue;
    const rootCommander = allPlayers[Math.max(0, event.participants.length * 2 % allPlayers.length)];
    const rootGroupId = `demo-group-${eventId}-root`;
    const rootUnitId = event.participants[0];
    const rootParticipationId = `demo-participation-${eventId}-${rootUnitId}`;
    const rootAtomicIds = atomicUnitIds.filter((id) => id.includes(eventId) && id.includes(rootUnitId));
    await tx.eventCommandGroup.upsert({
      where: { id: rootGroupId },
      update: { name: `${event.name} Command`, eventParticipationId: rootParticipationId, side: "DEFENDER", commanderPlayerId: rootCommander.id },
      create: { id: rootGroupId, eventId, eventParticipationId: rootParticipationId, name: `${event.name} Command`, side: "DEFENDER", commanderPlayerId: rootCommander.id },
    });

    const childGroupIds: Array<{ id: string; name: string; representedUnitId: string; commanderPlayerId: string; atomicIds: string[] }> = [];
    for (let index = 0; index < Math.min(2, event.participants.length); index += 1) {
      const representedUnitId = event.participants[index];
      const commander = allPlayers[(index + 2) % allPlayers.length];
      const childGroupId = `demo-group-${eventId}-child-${index}`;
      const childAtomicIds = atomicUnitIds.filter((id) => id.includes(eventId) && id.includes(representedUnitId));
      childGroupIds.push({ id: childGroupId, name: `${event.name} ${index + 1}`, representedUnitId, commanderPlayerId: commander.id, atomicIds: childAtomicIds });
      await tx.eventCommandGroup.upsert({
        where: { id: childGroupId },
        update: { parentGroupId: rootGroupId, eventParticipationId: `demo-participation-${eventId}-${representedUnitId}`, side: "DEFENDER", commanderPlayerId: commander.id },
        create: { id: childGroupId, eventId, eventParticipationId: `demo-participation-${eventId}-${representedUnitId}`, name: `${event.name} ${index + 1}`, side: "DEFENDER", commanderPlayerId: commander.id, parentGroupId: rootGroupId },
      });
      for (const atomicId of childAtomicIds) {
        await tx.eventCommandGroupAtomicUnit.upsert({
          where: { atomicEventUnitId: atomicId },
          update: { groupId: childGroupId },
          create: { groupId: childGroupId, atomicEventUnitId: atomicId },
        }).catch(() => undefined);
      }
    }

    commandGroupPlan.push({ eventId, rootGroupId, rootUnitId, rootCommanderId: rootCommander.id, childGroups: childGroupIds });
  }

  const playerRosterLookup = new Map<string, string[]>();
  for (const [unitId, members] of rosterMap.entries()) {
    playerRosterLookup.set(unitId, members);
  }

  const auditQueue: Array<{ atomicUnitId: string; unitType: AuditUnitType; unitId: string; eventId: string; createdByUserId: string; lifecycle: "DRAFT" | "FINAL"; submittedAt?: Date; results: Array<{ playerId: string; kills: number; deaths: number; assists: number }> }> = [];

  let auditIndex = 0;
  for (const atomicId of atomicUnitIds) {
    const info = atomicUnitMap.get(atomicId);
    if (!info || info.eventId === "demo-event-010" || info.eventId === "demo-event-011" || info.eventId === "demo-event-012" || info.eventId === "demo-event-013" || info.eventId === "demo-event-014") {
      continue;
    }

    const unitRoster = playerRosterLookup.get(info.unitId) ?? [];
    const unitType: AuditUnitType = info.unitId.includes("cavalry") || info.unitId.includes("cossacks") || info.unitId.includes("uhlans") || info.unitId.includes("dragoons")
      ? "CAVALRY"
      : info.unitId.includes("artillery") || info.unitId.includes("battery") || info.unitId.includes("guns")
        ? "ARTILLERY"
        : info.unitId.includes("jager") || info.unitId.includes("grenzer") || info.unitId.includes("volunteers") || info.unitId.includes("company")
          ? "RIFLES"
          : "REGULAR";

    const playerIds = [...unitRoster, ...mercenaryPlayerIds].slice(0, Math.min(18, unitRoster.length + mercenaryPlayerIds.length));
    const results = playerIds.map((playerId, resultIndex) => ({
      playerId,
      kills: resultIndex % 6 === 0 ? 18 + (auditIndex % 3) * 4 : 2 + ((auditIndex + resultIndex) % 9),
      deaths: resultIndex % 5 === 0 ? 0 : 1 + ((auditIndex + resultIndex * 2) % 5),
      assists: ((auditIndex * 3 + resultIndex * 2) % 9),
    }));

    const shouldFinalize = auditIndex % 3 !== 0 || info.eventId === "demo-event-001" || info.eventId === "demo-event-005";
    const lifecycle = shouldFinalize ? "FINAL" : "DRAFT";
    const createdByUserId = DEMO_USER_IDS[info.unitId.includes("france") ? "france" : info.unitId.includes("austria") ? "austria" : info.unitId.includes("prussia") ? "prussia" : info.unitId.includes("russia") ? "russia" : info.unitId.includes("spain") ? "spain" : "portugal"] ?? DEMO_USER_IDS.community;

    auditQueue.push({
      atomicUnitId: atomicId,
      unitType,
      unitId: info.unitId,
      eventId: info.eventId,
      createdByUserId,
      lifecycle,
      submittedAt: lifecycle === "FINAL" ? daysFromNow(-Math.max(3, 90 - auditIndex * 3)) : undefined,
      results,
    });

    auditIndex += 1;
  }

  const craftedAuditCount = Math.min(24, auditQueue.length);
  for (let index = 0; index < craftedAuditCount; index += 1) {
    const audit = auditQueue[index];
    const auditId = `demo-audit-${String(index + 1).padStart(3, "0")}`;

    // Finalized Audits (and their results/roles) are immutable at the database
    // level: they can never be updated or deleted once lifecycle = FINAL. To
    // stay idempotent, only DRAFT/new audits are written to; an existing FINAL
    // audit is left untouched entirely.
    const existingAudit = await tx.audit.findUnique({ where: { id: auditId }, select: { lifecycle: true } });
    if (existingAudit?.lifecycle === "FINAL") {
      continue;
    }

    await tx.audit.upsert({
      where: { id: auditId },
      update: {
        atomicEventUnitId: audit.atomicUnitId,
        createdByUserId: audit.createdByUserId,
        lifecycle: "DRAFT",
        unitType: audit.unitType,
        tickets: 12 + (index % 7) * 2,
        flagCaptures: (index % 4) + 1,
        flagLosses: (index % 3),
        stars: 1 + (index % 4),
        submittedAt: null,
      },
      create: {
        id: auditId,
        atomicEventUnitId: audit.atomicUnitId,
        createdByUserId: audit.createdByUserId,
        lifecycle: "DRAFT",
        unitType: audit.unitType,
        tickets: 12 + (index % 7) * 2,
        flagCaptures: (index % 4) + 1,
        flagLosses: (index % 3),
        stars: 1 + (index % 4),
        submittedAt: null,
      },
    });

    const playerResults = audit.results.slice(0, Math.min(audit.results.length, 18));
    for (const result of playerResults) {
      await tx.auditPlayerResult.upsert({
        where: { auditId_playerId: { auditId, playerId: result.playerId } },
        update: {
          kills: result.kills,
          deaths: result.deaths,
          assists: result.assists,
        },
        create: {
          id: `demo-audit-result-${auditId}-${result.playerId}`,
          auditId,
          playerId: result.playerId,
          kills: result.kills,
          deaths: result.deaths,
          assists: result.assists,
        },
      });
    }

    if (index % 4 === 0 || index % 5 === 0) {
      const commanderPlayerId = playerResults[0]?.playerId ?? mercenaryPlayerIds[0];
      await tx.auditRoleAssignment.upsert({
        where: { auditId_playerId_role: { auditId, playerId: commanderPlayerId, role: "COMMANDER" } },
        update: {},
        create: { id: `demo-role-${auditId}-commander`, auditId, playerId: commanderPlayerId, role: "COMMANDER" },
      });
    }

    if (index % 3 === 0) {
      const flagBearerPlayerId = playerResults[Math.min(1, playerResults.length - 1)]?.playerId ?? mercenaryPlayerIds[1];
      await tx.auditRoleAssignment.upsert({
        where: { auditId_playerId_role: { auditId, playerId: flagBearerPlayerId, role: "FLAG_BEARER" } },
        update: {},
        create: { id: `demo-role-${auditId}-flag`, auditId, playerId: flagBearerPlayerId, role: "FLAG_BEARER" },
      });
    }

    // Finalize last, after all children exist, since finalizing blocks further
    // child inserts/updates.
    if (audit.lifecycle === "FINAL") {
      await tx.audit.update({
        where: { id: auditId },
        data: { lifecycle: "FINAL", submittedAt: audit.submittedAt ?? null },
      });
    }
  }


  const unresolvedExample = [
    "demo-event-006",
    "demo-event-009",
  ];

  for (const eventId of unresolvedExample) {
    const event = eventPlans.find((candidate) => candidate.id === eventId);
    if (!event) continue;
    const participation = event.participants[0];
    const atomicId = `demo-atomic-${eventId}-${participation}-pending`;
    await tx.atomicEventUnit.upsert({
      where: { id: atomicId },
      update: { eventParticipationId: `demo-participation-${eventId}-${participation}` },
      create: { id: atomicId, eventParticipationId: `demo-participation-${eventId}-${participation}`, isMandatory: true },
    });
    await tx.audit.upsert({
      where: { id: `demo-audit-pending-${eventId}` },
      update: { lifecycle: "DRAFT", createdByUserId: DEMO_USER_IDS.community },
      create: { id: `demo-audit-pending-${eventId}`, atomicEventUnitId: atomicId, createdByUserId: DEMO_USER_IDS.community, lifecycle: "DRAFT", unitType: "REGULAR" },
    });
  }
}

async function dropDemoData(tx: TxClient): Promise<void> {
  const demoPlayerIds = await tx.player.findMany({
    where: { playerId: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  const demoUnitIds = await tx.unit.findMany({
    where: { id: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  const demoEventIds = await tx.event.findMany({
    where: { id: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });

  const playerIds = demoPlayerIds.map(({ id }) => id);
  const unitIds = demoUnitIds.map(({ id }) => id);
  const eventIds = demoEventIds.map(({ id }) => id);

  const demoParticipations = eventIds.length > 0
    ? await tx.eventParticipation.findMany({ where: { eventId: { in: eventIds } }, select: { id: true, eventId: true, unitId: true } })
    : [];
  const demoParticipationIds = demoParticipations.map(({ id }) => id);

  const demoAtomicUnits = demoParticipationIds.length > 0
    ? await tx.atomicEventUnit.findMany({ where: { eventParticipationId: { in: demoParticipationIds } }, select: { id: true, eventParticipationId: true } })
    : [];

  // Audit rows can never be deleted (database-enforced audit-trail
  // immutability), so anything an existing Audit still references
  // (atomic unit -> participation -> event/unit) must be preserved too,
  // or the FK-restricted delete below would fail.
  const auditedAtomicIds = demoAtomicUnits.length > 0
    ? new Set(
        (
          await tx.audit.findMany({
            where: { atomicEventUnitId: { in: demoAtomicUnits.map(({ id }) => id) } },
            select: { atomicEventUnitId: true },
          })
        ).map(({ atomicEventUnitId }) => atomicEventUnitId),
      )
    : new Set<string>();

  const deletableAtomicUnits = demoAtomicUnits.filter(({ id }) => !auditedAtomicIds.has(id));
  const deletableAtomicIds = deletableAtomicUnits.map(({ id }) => id);
  const retainedParticipationIds = new Set(
    demoAtomicUnits.filter(({ id }) => auditedAtomicIds.has(id)).map(({ eventParticipationId }) => eventParticipationId),
  );
  const deletableParticipations = demoParticipations.filter(({ id }) => !retainedParticipationIds.has(id));
  const deletableParticipationIds = deletableParticipations.map(({ id }) => id);
  const retainedEventIds = new Set(demoParticipations.filter(({ id }) => retainedParticipationIds.has(id)).map(({ eventId }) => eventId));
  const deletableEventIds = eventIds.filter((id) => !retainedEventIds.has(id));
  const directlyRetainedUnitIds = new Set(demoParticipations.filter(({ id }) => retainedParticipationIds.has(id)).map(({ unitId }) => unitId));

  // A Unit's ancestors must also be retained: Unit.parentId is FK-restricted,
  // so a kept descendant blocks deleting any of its parents.
  const allDemoUnits = unitIds.length > 0
    ? await tx.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true, parentId: true } })
    : [];
  const parentById = new Map(allDemoUnits.map((unit) => [unit.id, unit.parentId]));
  const retainedUnitIds = new Set(directlyRetainedUnitIds);
  for (const unitId of directlyRetainedUnitIds) {
    let ancestorId = parentById.get(unitId) ?? null;
    while (ancestorId && parentById.has(ancestorId) && !retainedUnitIds.has(ancestorId)) {
      retainedUnitIds.add(ancestorId);
      ancestorId = parentById.get(ancestorId) ?? null;
    }
  }
  const deletableUnitIds = unitIds.filter((id) => !retainedUnitIds.has(id));

  // Command groups for a retained (audited) Event are left in place too, so
  // their commander Players and the Event's owner must also be retained.
  const retainedCommandGroups = retainedEventIds.size > 0
    ? await tx.eventCommandGroup.findMany({ where: { eventId: { in: [...retainedEventIds] } }, select: { commanderPlayerId: true } })
    : [];
  const retainedGroupCommanderIds = new Set(retainedCommandGroups.map(({ commanderPlayerId }) => commanderPlayerId));

  await tx.eventCommandGroupAtomicUnit.deleteMany({ where: { atomicEventUnitId: { in: deletableAtomicIds } } });
  await tx.eventCommandGroup.deleteMany({ where: { eventId: { in: deletableEventIds } } });
  await tx.atomicEventUnit.deleteMany({ where: { id: { in: deletableAtomicIds } } });
  await tx.eventParticipation.deleteMany({ where: { id: { in: deletableParticipationIds } } });
  await tx.event.deleteMany({ where: { id: { in: deletableEventIds } } });

  // A Player who holds results/roles on a FINAL Audit can never be deleted
  // either, since those child rows are immutable while their Audit is FINAL.
  const finalAuditPlayerIds = new Set(retainedGroupCommanderIds);
  for (const { playerId } of await tx.auditPlayerResult.findMany({
    where: { playerId: { in: playerIds }, audit: { lifecycle: "FINAL" } },
    select: { playerId: true },
  })) {
    finalAuditPlayerIds.add(playerId);
  }
  for (const { playerId } of await tx.auditRoleAssignment.findMany({
    where: { playerId: { in: playerIds }, audit: { lifecycle: "FINAL" } },
    select: { playerId: true },
  })) {
    finalAuditPlayerIds.add(playerId);
  }
  const deletablePlayerIds = playerIds.filter((id) => !finalAuditPlayerIds.has(id));

  await tx.auditRoleAssignment.deleteMany({ where: { playerId: { in: deletablePlayerIds } } });
  await tx.auditPlayerResult.deleteMany({ where: { playerId: { in: deletablePlayerIds } } });
  await tx.unitMembership.deleteMany({ where: { OR: [{ playerId: { in: playerIds } }, { unitId: { in: deletableUnitIds } } ] } });
  await tx.authorizedUserMembership.deleteMany({ where: { unitId: { in: deletableUnitIds } } });
  await tx.player.deleteMany({ where: { id: { in: deletablePlayerIds } } });

  // Unit.parentId is self-referencing and FK-restricted, so descendants must
  // be deleted before their ancestors within the deletable set.
  const remainingUnits = deletableUnitIds.length > 0
    ? await tx.unit.findMany({ where: { id: { in: deletableUnitIds } }, select: { id: true, parentId: true } })
    : [];
  const unitById = new Map(remainingUnits.map((unit) => [unit.id, unit]));
  while (unitById.size > 0) {
    const parentIds = new Set([...unitById.values()].map((unit) => unit.parentId).filter((id): id is string => !!id));
    const leafIds = [...unitById.keys()].filter((id) => !parentIds.has(id));
    if (leafIds.length === 0) break;
    await tx.unit.deleteMany({ where: { id: { in: leafIds } } });
    for (const id of leafIds) {
      unitById.delete(id);
    }
  }

  // Any User who created an Audit (permanent) or still commands a retained
  // Unit can never be deleted either.
  const retainedUnitCommanders = deletableUnitIds.length < unitIds.length
    ? await tx.unit.findMany({ where: { id: { in: unitIds.filter((id) => !deletableUnitIds.includes(id)) } }, select: { commanderUserId: true } })
    : [];
  const retainedUserIds = new Set(retainedUnitCommanders.map(({ commanderUserId }) => commanderUserId));
  for (const { createdByUserId } of await tx.audit.findMany({
    where: { createdByUserId: { startsWith: DEMO_PREFIX } },
    select: { createdByUserId: true },
  })) {
    retainedUserIds.add(createdByUserId);
  }

  const demoUsers = await tx.user.findMany({ where: { id: { startsWith: DEMO_PREFIX } }, select: { id: true } });
  const deletableUserIds = demoUsers.map(({ id }) => id).filter((id) => !retainedUserIds.has(id));
  if (deletableUserIds.length > 0) {
    await tx.user.deleteMany({ where: { id: { in: deletableUserIds } } });
  }
}


async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seeding is disabled in production.");
  }

  const reset = process.argv.includes("--reset");

  if (reset) {
    await prisma.$transaction(async (tx) => {
      await dropDemoData(tx);
    });
    console.log("Removed demo-owned records only.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await ensureUser(tx, ROOT_COMMANDER_ID, "Demo Root Commander");
    for (const [key, userId] of Object.entries(DEMO_USER_IDS)) {
      if (key === "community" || key === "austria" || key === "france" || key === "prussia" || key === "russia" || key === "spain" || key === "portugal") {
        await ensureUser(tx, userId, `${userId.replace("demo-user-", "").replace(/^[a-z]/, (value) => value.toUpperCase())} Commander`);
      }
    }

    await ensureRootUnit(tx);
    const rosterMap = await seedUnits(tx);
    const result = await seedPlayers(tx);
    await seedEventsAndAudits(tx, result.players, result.rosterMap);

    console.log(`Seeded demo community: ${unitSpecs.length} units, ${(result.players ?? []).length} players, ${eventPlans.length} events.`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
