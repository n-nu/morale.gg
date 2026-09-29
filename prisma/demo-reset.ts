import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type AuditUnitType,
  type BattlefieldSide,
  type EventParticipationStatus,
  type Permission,
  type PermissionScope,
} from "@prisma/client";
import assert from "node:assert/strict";
import { isIP } from "node:net";

const DAY_MS = 24 * 60 * 60 * 1000;
const PLAYER_COUNT = 120;
const MERCENARY_COUNT = 12;
const ROOT_UNIT_SELECT = {
  id: true,
  name: true,
  description: true,
  imageRef: true,
  discordInvite: true,
  groupLink: true,
  parentId: true,
  rootUnitId: true,
  commanderUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;
const DEMO_USER_IDS = {
  managerFrench: "demo-user-manager-french",
  managerCoalition: "demo-user-manager-coalition",
  auditFrench: "demo-user-audit-french",
  auditCoalition: "demo-user-audit-coalition",
  limited: "demo-user-limited",
  eventManager: "demo-user-event-manager",
} as const;

export type SafeDatabaseTarget = {
  environment: string;
  host: string;
  databaseName: string;
};

type SafetyEnvironment = {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  POSTGRES_DB?: string;
  POSTGRES_PORT?: string;
};

export function assertSafeDatabaseTarget(environment: SafetyEnvironment): SafeDatabaseTarget {
  if (environment.NODE_ENV?.trim().toLowerCase() === "production") {
    throw new Error("Demo database reset is disabled when NODE_ENV is production.");
  }

  const connectionString = environment.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required; refusing to use an implicit database target.");
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL is not a valid PostgreSQL URL; refusing reset.");
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use PostgreSQL; refusing reset.");
  }
  if (["host", "hostaddr", "port", "dbname", "database"].some((parameter) => url.searchParams.has(parameter))) {
    throw new Error("DATABASE_URL contains connection overrides that make its target ambiguous; refusing reset.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const ipv4 = isIP(host) === 4 ? host.split(".").map(Number) : [];
  const isLoopback = host === "localhost" || host === "::1" || (ipv4.length === 4 && ipv4[0] === 127);
  if (!isLoopback) {
    throw new Error(`Database host ${host || "(missing)"} is not a verified local development target; refusing reset.`);
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const expectedDatabase = environment.POSTGRES_DB ?? "morale_gg";
  const port = url.port || "5432";
  const expectedPort = environment.POSTGRES_PORT ?? "5432";
  if (databaseName !== expectedDatabase || port !== expectedPort) {
    throw new Error(
      `Database target ${host}:${port}/${databaseName} does not match the configured local Compose database ${expectedPort}/${expectedDatabase}; refusing reset.`,
    );
  }

  return {
    environment: environment.NODE_ENV ?? "development (NODE_ENV unset)",
    host,
    databaseName,
  };
}

export type RootUnitIdentity = { unitId: string; name: string };

export function requireSingleRootUnit(roots: RootUnitIdentity[]): RootUnitIdentity {
  if (roots.length !== 1) {
    const summary = roots.map(({ unitId, name }) => `${unitId} (${name})`).join(", ") || "none";
    throw new Error(`Expected exactly one RootUnit; found ${roots.length}: ${summary}. Refusing reset.`);
  }
  return roots[0];
}

type UnitSeed = { id: string; name: string; parentId: string | null };
type MembershipSeed = { id: string; playerId: string; gamePlayerId: string; unitId: string; startedAt: Date; endedAt: Date | null };
type ParticipationSeed = { unitId: string; status: EventParticipationStatus };
type AuditState = "FINAL" | "DRAFT" | "NONE";
type AtomicSeed = {
  id: string;
  unitId: string;
  name: string;
  side: BattlefieldSide | null;
  unitType: AuditUnitType;
  mandatory: boolean;
  audit: AuditState;
  omittedPlayerIndexes?: number[];
};
type GroupSeed = {
  id: string;
  name: string;
  unitId: string;
  side: BattlefieldSide | null;
  parentId: string | null;
  atomicIds: string[];
  commanderIndex: number;
};
type EventSeed = {
  id: string;
  name: string;
  scheduledOffsetDays: number;
  eventType: string;
  description: string;
  opponent: string;
  map: string;
  defenderFlagRef: string | null;
  attackerFlagRef: string | null;
  participations: ParticipationSeed[];
  atomics: AtomicSeed[];
  groups: GroupSeed[];
};
type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const UNIT = {
  frenchArmy: "demo-unit-french-army",
  frenchCorps: "demo-unit-french-i-corps",
  frenchBrigade: "demo-unit-french-line-brigade",
  frenchLine1: "demo-unit-french-line-1",
  frenchLine2: "demo-unit-french-line-2",
  frenchRifles: "demo-unit-french-rifles",
  frenchGuard: "demo-unit-french-guard",
  frenchOldGuard: "demo-unit-french-old-guard",
  frenchYoungGuard: "demo-unit-french-young-guard",
  frenchCavalry: "demo-unit-french-cavalry",
  frenchHussars: "demo-unit-french-hussars",
  frenchDragoons: "demo-unit-french-dragoons",
  frenchArtillery: "demo-unit-french-artillery",
  frenchBattery: "demo-unit-french-battery",
  coalition: "demo-unit-coalition-command",
  coalitionBattery: "demo-unit-coalition-battery",
  britishDivision: "demo-unit-british-division",
  britishBrigade: "demo-unit-british-line-brigade",
  britishLine1: "demo-unit-british-line-1",
  britishLine2: "demo-unit-british-line-2",
  britishRifles: "demo-unit-british-rifles",
  austrianCorps: "demo-unit-austrian-corps",
  austrianGrenadiers: "demo-unit-austrian-grenadiers",
  austrianLandwehr: "demo-unit-austrian-landwehr",
  alliedCavalry: "demo-unit-allied-cavalry",
  russianArmy: "demo-unit-russian-army",
  russianGuard: "demo-unit-russian-guard-corps",
  russianGrenadiers: "demo-unit-russian-grenadiers",
  russianCorps: "demo-unit-russian-corps",
  russianMusketeers: "demo-unit-russian-musketeers",
  russianJagers: "demo-unit-russian-jagers",
  cossackBrigade: "demo-unit-cossack-brigade",
  cossackRegiment: "demo-unit-cossack-regiment",
  iberian: "demo-unit-iberian-command",
  spanishDivision: "demo-unit-spanish-division",
  spanishLine: "demo-unit-spanish-line",
  spanishVolunteers: "demo-unit-spanish-volunteers",
  portugueseBrigade: "demo-unit-portuguese-brigade",
  cacadores: "demo-unit-cacadores",
  portugueseLancers: "demo-unit-portuguese-lancers",
} as const;

const unitSeeds: UnitSeed[] = [
  { id: UNIT.frenchArmy, name: "French Imperial Army", parentId: null },
  { id: UNIT.frenchCorps, name: "I Corps", parentId: UNIT.frenchArmy },
  { id: UNIT.frenchBrigade, name: "1st Line Brigade", parentId: UNIT.frenchCorps },
  { id: UNIT.frenchLine1, name: "1st Line Regiment", parentId: UNIT.frenchBrigade },
  { id: UNIT.frenchLine2, name: "2nd Line Regiment", parentId: UNIT.frenchBrigade },
  { id: UNIT.frenchRifles, name: "Voltigeur Battalion", parentId: UNIT.frenchCorps },
  { id: UNIT.frenchGuard, name: "Imperial Guard", parentId: UNIT.frenchArmy },
  { id: UNIT.frenchOldGuard, name: "Old Guard Grenadiers", parentId: UNIT.frenchGuard },
  { id: UNIT.frenchYoungGuard, name: "Young Guard Chasseurs", parentId: UNIT.frenchGuard },
  { id: UNIT.frenchCavalry, name: "Guard Cavalry Brigade", parentId: UNIT.frenchArmy },
  { id: UNIT.frenchHussars, name: "7th Hussars", parentId: UNIT.frenchCavalry },
  { id: UNIT.frenchDragoons, name: "3rd Dragoons", parentId: UNIT.frenchCavalry },
  { id: UNIT.frenchArtillery, name: "Artillery Reserve", parentId: UNIT.frenchArmy },
  { id: UNIT.frenchBattery, name: "Horse Battery No. 2", parentId: UNIT.frenchArtillery },
  { id: UNIT.coalition, name: "Allied Coalition Army", parentId: null },
  { id: UNIT.coalitionBattery, name: "Coalition Reserve Battery", parentId: UNIT.coalition },
  { id: UNIT.britishDivision, name: "British Division", parentId: UNIT.coalition },
  { id: UNIT.britishBrigade, name: "1st Line Brigade", parentId: UNIT.britishDivision },
  { id: UNIT.britishLine1, name: "42nd Highland Regiment", parentId: UNIT.britishBrigade },
  { id: UNIT.britishLine2, name: "95th Rifles", parentId: UNIT.britishBrigade },
  { id: UNIT.britishRifles, name: "Light Infantry Battalion", parentId: UNIT.britishDivision },
  { id: UNIT.austrianCorps, name: "Austrian Corps", parentId: UNIT.coalition },
  { id: UNIT.austrianGrenadiers, name: "Grenadier Regiment", parentId: UNIT.austrianCorps },
  { id: UNIT.austrianLandwehr, name: "Landwehr Regiment", parentId: UNIT.austrianCorps },
  { id: UNIT.alliedCavalry, name: "Coalition Cavalry Brigade", parentId: UNIT.coalition },
  { id: UNIT.russianArmy, name: "Russian Imperial Army", parentId: null },
  { id: UNIT.russianGuard, name: "Guard Corps", parentId: UNIT.russianArmy },
  { id: UNIT.russianGrenadiers, name: "Pavlov Grenadiers", parentId: UNIT.russianGuard },
  { id: UNIT.russianCorps, name: "I Infantry Corps", parentId: UNIT.russianArmy },
  { id: UNIT.russianMusketeers, name: "Musketeer Regiment", parentId: UNIT.russianCorps },
  { id: UNIT.russianJagers, name: "Jager Battalion", parentId: UNIT.russianCorps },
  { id: UNIT.cossackBrigade, name: "Cossack Brigade", parentId: UNIT.russianArmy },
  { id: UNIT.cossackRegiment, name: "Don Cossack Regiment", parentId: UNIT.cossackBrigade },
  { id: UNIT.iberian, name: "Iberian Allied Corps", parentId: null },
  { id: UNIT.spanishDivision, name: "Army of the Centre", parentId: UNIT.iberian },
  { id: UNIT.spanishLine, name: "Spanish Line Regiment", parentId: UNIT.spanishDivision },
  { id: UNIT.spanishVolunteers, name: "Provincial Volunteers", parentId: UNIT.spanishDivision },
  { id: UNIT.portugueseBrigade, name: "Portuguese Light Brigade", parentId: UNIT.iberian },
  { id: UNIT.cacadores, name: "Caçadores Battalion", parentId: UNIT.portugueseBrigade },
  { id: UNIT.portugueseLancers, name: "Lancer Squadron", parentId: UNIT.portugueseBrigade },
];

const leafUnitIds: string[] = [
  UNIT.frenchLine1, UNIT.frenchLine2, UNIT.frenchRifles, UNIT.frenchOldGuard,
  UNIT.frenchYoungGuard, UNIT.frenchHussars, UNIT.frenchDragoons, UNIT.frenchBattery,
  UNIT.coalitionBattery, UNIT.britishLine1, UNIT.britishLine2, UNIT.britishRifles, UNIT.austrianGrenadiers,
  UNIT.austrianLandwehr, UNIT.russianGrenadiers, UNIT.russianMusketeers,
  UNIT.russianJagers, UNIT.cossackRegiment, UNIT.spanishLine, UNIT.spanishVolunteers,
  UNIT.cacadores, UNIT.portugueseLancers,
];

const PLAYER_UNIT_OVERRIDES: Record<number, string> = {
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index, UNIT.britishLine1])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 8, UNIT.frenchLine2])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 16, UNIT.frenchLine1])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 24, UNIT.frenchRifles])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 32, UNIT.frenchHussars])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 40, UNIT.britishRifles])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 48, UNIT.austrianGrenadiers])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 56, UNIT.russianMusketeers])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 64, UNIT.russianGrenadiers])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 72, UNIT.spanishLine])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 80, UNIT.cacadores])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 88, UNIT.cossackRegiment])),
  104: UNIT.frenchLine2,
  100: UNIT.portugueseLancers,
  112: UNIT.britishRifles,
};

const atomicId = (suffix: string) => `demo-atomic-${suffix}`;
const groupId = (suffix: string) => `demo-group-${suffix}`;
const a = (
  suffix: string,
  unitId: string,
  name: string,
  side: BattlefieldSide | null,
  unitType: AuditUnitType,
  mandatory: boolean,
  audit: AuditState,
  omittedPlayerIndexes: number[] = [],
): AtomicSeed => ({ id: atomicId(suffix), unitId, name, side, unitType, mandatory, audit, omittedPlayerIndexes });
const g = (
  suffix: string,
  name: string,
  unitId: string,
  side: BattlefieldSide | null,
  parentSuffix: string | null,
  atomicSuffixes: string[],
  commanderIndex: number,
): GroupSeed => ({
  id: groupId(suffix),
  name,
  unitId,
  side,
  parentId: parentSuffix === null ? null : groupId(parentSuffix),
  atomicIds: atomicSuffixes.map(atomicId),
  commanderIndex,
});
const participation = (unitId: string, status: EventParticipationStatus = "APPROVED"): ParticipationSeed => ({ unitId, status });

const eventSeeds: EventSeed[] = [
  {
    id: "demo-event-main-review",
    name: "Austerlitz: The Pratzen Heights",
    scheduledOffsetDays: -2,
    eventType: "grand battle",
    description: "Main visual-review fixture with a layered battlefield, finalized results, and pending placeholders.",
    opponent: "Coalition Army",
    map: "Austerlitz",
    defenderFlagRef: "/maps/borodino.jpg",
    attackerFlagRef: "/maps/barraux.png",
    participations: [
      participation(UNIT.britishLine1), participation(UNIT.britishRifles), participation(UNIT.coalitionBattery), participation(UNIT.frenchBattery),
      participation(UNIT.austrianGrenadiers), participation(UNIT.frenchLine1), participation(UNIT.frenchLine2),
      participation(UNIT.frenchRifles), participation(UNIT.frenchHussars), participation(UNIT.frenchDragoons),
    ],
    atomics: [
      a("main-british-line", UNIT.britishLine1, "42nd Highland Line", "DEFENDER", "REGULAR", true, "FINAL", [1]),
      a("main-british-rifles", UNIT.britishRifles, "Light Company", "DEFENDER", "RIFLES", true, "FINAL"),
      a("main-defender-battery", UNIT.coalitionBattery, "Coalition Battery", "DEFENDER", "ARTILLERY", false, "FINAL"),
      a("main-austrian-grenadiers", UNIT.austrianGrenadiers, "Grenadier Reserve", "DEFENDER", "REGULAR", true, "FINAL"),
      a("main-french-line-1", UNIT.frenchLine1, "1st Line", "ATTACKER", "REGULAR", true, "FINAL"),
      a("main-french-line-2", UNIT.frenchLine2, "2nd Line", "ATTACKER", "REGULAR", true, "DRAFT"),
      a("main-french-rifles", UNIT.frenchRifles, "Voltigeurs", "ATTACKER", "RIFLES", true, "FINAL"),
      a("main-french-hussars", UNIT.frenchHussars, "Hussar Squadron", "ATTACKER", "CAVALRY", true, "FINAL"),
      a("main-french-dragoons", UNIT.frenchDragoons, "Dragoon Reserve", "ATTACKER", "CAVALRY", false, "DRAFT"),
      a("main-french-battery", UNIT.frenchBattery, "Imperial Horse Battery", "ATTACKER", "ARTILLERY", false, "NONE"),
    ],
    groups: [
      g("main-defender-corps", "I Corps", UNIT.britishLine1, "DEFENDER", null, [], 3),
      g("main-defender-brigade", "1st Brigade", UNIT.britishLine1, "DEFENDER", "main-defender-corps", [], 4),
      g("main-defender-infantry", "Infantry Line", UNIT.britishLine1, "DEFENDER", "main-defender-brigade", ["main-british-line", "main-british-rifles"], 5),
      g("main-defender-reserve", "Austrian Reserve", UNIT.austrianGrenadiers, "DEFENDER", "main-defender-corps", ["main-austrian-grenadiers", "main-defender-battery"], 6),
      g("main-attacker-corps", "Imperial Corps", UNIT.frenchLine1, "ATTACKER", null, [], 0),
      g("main-attacker-line", "Line Brigade", UNIT.frenchLine1, "ATTACKER", "main-attacker-corps", ["main-french-line-1", "main-french-line-2"], 7),
      g("main-attacker-light", "Light Infantry", UNIT.frenchRifles, "ATTACKER", "main-attacker-corps", ["main-french-rifles"], 8),
      g("main-attacker-cavalry", "Cavalry Reserve", UNIT.frenchHussars, "ATTACKER", "main-attacker-corps", ["main-french-hussars", "main-french-dragoons"], 9),
      g("main-attacker-artillery", "Grand Battery", UNIT.frenchBattery, "ATTACKER", "main-attacker-corps", ["main-french-battery"], 10),
    ],
  },
  {
    id: "demo-event-waterloo-review",
    name: "Waterloo: The Allied Centre",
    scheduledOffsetDays: -18,
    eventType: "battle",
    description: "Recent past Event with a defender image and a distinct corps-and-reserve structure.",
    opponent: "Imperial Guard",
    map: "Waterloo",
    defenderFlagRef: "/maps/austerlitz.jpg",
    attackerFlagRef: null,
    participations: [
      participation(UNIT.britishLine1), participation(UNIT.britishLine2), participation(UNIT.austrianLandwehr),
      participation(UNIT.frenchOldGuard), participation(UNIT.frenchHussars), participation(UNIT.frenchDragoons),
      participation(UNIT.cossackRegiment), participation(UNIT.frenchLine2),
    ],
    atomics: [
      a("waterloo-british-line", UNIT.britishLine1, "Highland Line", "DEFENDER", "REGULAR", true, "FINAL"),
      a("waterloo-british-rifles", UNIT.britishLine2, "Rifle Company", "DEFENDER", "RIFLES", true, "FINAL"),
      a("waterloo-landwehr", UNIT.austrianLandwehr, "Landwehr Reserve", "DEFENDER", "REGULAR", true, "FINAL"),
      a("waterloo-old-guard", UNIT.frenchOldGuard, "Old Guard Grenadiers", "ATTACKER", "REGULAR", true, "FINAL"),
      a("waterloo-hussars", UNIT.frenchHussars, "Hussar Wing", "ATTACKER", "CAVALRY", true, "FINAL"),
      a("waterloo-dragoons", UNIT.frenchDragoons, "Dragoon Screen", "ATTACKER", "CAVALRY", false, "DRAFT"),
      a("waterloo-cossacks", UNIT.cossackRegiment, "Cossack Patrol", "ATTACKER", "CAVALRY", true, "FINAL"),
      a("waterloo-french-line", UNIT.frenchLine2, "French Line Column", "ATTACKER", "REGULAR", true, "NONE"),
    ],
    groups: [
      g("waterloo-allied-centre", "Allied Centre", UNIT.britishLine1, "DEFENDER", null, [], 0),
      g("waterloo-line-brigade", "Line Brigade", UNIT.britishLine2, "DEFENDER", "waterloo-allied-centre", ["waterloo-british-line", "waterloo-british-rifles"], 11),
      g("waterloo-landwehr-reserve", "Landwehr Reserve", UNIT.austrianLandwehr, "DEFENDER", "waterloo-allied-centre", ["waterloo-landwehr"], 12),
      g("waterloo-imperial-attack", "Imperial Attack", UNIT.frenchOldGuard, "ATTACKER", null, ["waterloo-old-guard"], 13),
      g("waterloo-cavalry-wing", "Cavalry Wing", UNIT.frenchHussars, "ATTACKER", "waterloo-imperial-attack", ["waterloo-hussars", "waterloo-dragoons", "waterloo-cossacks"], 14),
      g("waterloo-line-column", "Line Column", UNIT.frenchLine2, "ATTACKER", "waterloo-imperial-attack", ["waterloo-french-line"], 15),
    ],
  },
  {
    id: "demo-event-borodino-review",
    name: "Borodino: The Great Redoubt",
    scheduledOffsetDays: -28,
    eventType: "battle",
    description: "Historical fixture without custom side images; both sides use the existing fallback presentation.",
    opponent: "French Imperial Army",
    map: "Borodino",
    defenderFlagRef: null,
    attackerFlagRef: null,
    participations: [
      participation(UNIT.russianGrenadiers), participation(UNIT.russianMusketeers), participation(UNIT.russianJagers),
      participation(UNIT.cossackRegiment), participation(UNIT.frenchLine1), participation(UNIT.frenchRifles),
      participation(UNIT.frenchBattery), participation(UNIT.spanishVolunteers),
    ],
    atomics: [
      a("borodino-grenadiers", UNIT.russianGrenadiers, "Guard Grenadiers", "DEFENDER", "REGULAR", true, "FINAL"),
      a("borodino-musketeers", UNIT.russianMusketeers, "Musketeer Line", "DEFENDER", "REGULAR", true, "FINAL"),
      a("borodino-jagers", UNIT.russianJagers, "Jager Screen", "DEFENDER", "RIFLES", true, "DRAFT"),
      a("borodino-cossacks", UNIT.cossackRegiment, "Cossack Reserve", "DEFENDER", "CAVALRY", false, "FINAL"),
      a("borodino-french-line", UNIT.frenchLine1, "French Line", "ATTACKER", "REGULAR", true, "FINAL"),
      a("borodino-voltigeurs", UNIT.frenchRifles, "Voltigeur Skirmishers", "ATTACKER", "RIFLES", true, "FINAL"),
      a("borodino-battery", UNIT.frenchBattery, "French Grand Battery", "ATTACKER", "ARTILLERY", true, "FINAL"),
      a("borodino-spanish-volunteers", UNIT.spanishVolunteers, "Attached Volunteers", "ATTACKER", "REGULAR", false, "NONE"),
    ],
    groups: [
      g("borodino-redoubt", "Great Redoubt", UNIT.russianGrenadiers, "DEFENDER", null, [], 16),
      g("borodino-left-flank", "Left Flank", UNIT.russianMusketeers, "DEFENDER", "borodino-redoubt", ["borodino-musketeers"], 17),
      g("borodino-guard-reserve", "Guard Reserve", UNIT.russianGrenadiers, "DEFENDER", "borodino-redoubt", ["borodino-grenadiers", "borodino-jagers"], 18),
      g("borodino-cavalry-screen", "Cavalry Screen", UNIT.cossackRegiment, "DEFENDER", null, ["borodino-cossacks"], 19),
      g("borodino-imperial-battery", "Imperial Battery", UNIT.frenchBattery, "ATTACKER", null, ["borodino-battery"], 20),
      g("borodino-advance", "Forward Division", UNIT.frenchLine1, "ATTACKER", null, ["borodino-french-line", "borodino-voltigeurs", "borodino-spanish-volunteers"], 21),
    ],
  },
  {
    id: "demo-event-iberian-campaign",
    name: "Iberian Campaign: The Mountain Pass",
    scheduledOffsetDays: -48,
    eventType: "campaign",
    description: "Older finalized Event with a mixed light-infantry and line structure.",
    opponent: "French Column",
    map: "Barraux",
    defenderFlagRef: "/maps/barraux.png",
    attackerFlagRef: "/maps/austerlitz.jpg",
    participations: [
      participation(UNIT.spanishLine), participation(UNIT.spanishVolunteers), participation(UNIT.cacadores),
      participation(UNIT.portugueseLancers), participation(UNIT.frenchRifles), participation(UNIT.frenchBattery),
      participation(UNIT.russianJagers, "REQUESTED"),
    ],
    atomics: [
      a("iberian-spanish-line", UNIT.spanishLine, "Spanish Line Company", "DEFENDER", "REGULAR", true, "FINAL"),
      a("iberian-volunteers", UNIT.spanishVolunteers, "Volunteer Skirmishers", "DEFENDER", "RIFLES", true, "FINAL"),
      a("iberian-cacadores", UNIT.cacadores, "Caçadores Light Company", "DEFENDER", "RIFLES", true, "DRAFT"),
      a("iberian-lancers", UNIT.portugueseLancers, "Lancer Screen", "DEFENDER", "CAVALRY", false, "NONE"),
      a("iberian-voltigeurs", UNIT.frenchRifles, "Voltigeur Column", "ATTACKER", "RIFLES", true, "FINAL"),
      a("iberian-battery", UNIT.frenchBattery, "Field Battery", "ATTACKER", "ARTILLERY", true, "FINAL"),
    ],
    groups: [
      g("iberian-coalition-defense", "Iberian Defense", UNIT.spanishLine, "DEFENDER", null, ["iberian-spanish-line"], 22),
      g("iberian-light-brigade", "Light Brigade", UNIT.cacadores, "DEFENDER", "iberian-coalition-defense", ["iberian-volunteers", "iberian-cacadores", "iberian-lancers"], 23),
      g("iberian-french-column", "French Column", UNIT.frenchRifles, "ATTACKER", null, ["iberian-voltigeurs", "iberian-battery"], 24),
    ],
  },
  {
    id: "demo-event-wagram",
    name: "Wagram: Danube Crossing",
    scheduledOffsetDays: -72,
    eventType: "battle",
    description: "Older battle with an artillery-free line and cavalry reserve.",
    opponent: "French Imperial Army",
    map: "Austerlitz",
    defenderFlagRef: null,
    attackerFlagRef: "/maps/borodino.jpg",
    participations: [
      participation(UNIT.austrianGrenadiers), participation(UNIT.austrianLandwehr), participation(UNIT.frenchLine1),
      participation(UNIT.frenchHussars), participation(UNIT.russianMusketeers), participation(UNIT.portugueseLancers, "DENIED"),
    ],
    atomics: [
      a("wagram-grenadiers", UNIT.austrianGrenadiers, "Grenadier Line", "DEFENDER", "REGULAR", true, "FINAL"),
      a("wagram-landwehr", UNIT.austrianLandwehr, "Landwehr Reserve", "DEFENDER", "RIFLES", true, "FINAL"),
      a("wagram-musketeers", UNIT.russianMusketeers, "Musketeer Detachment", "DEFENDER", "REGULAR", false, "NONE"),
      a("wagram-french-line", UNIT.frenchLine1, "Imperial Line", "ATTACKER", "REGULAR", true, "FINAL"),
      a("wagram-hussars", UNIT.frenchHussars, "Hussar Flank", "ATTACKER", "CAVALRY", true, "DRAFT"),
    ],
    groups: [
      g("wagram-danube-defense", "Danube Defense", UNIT.austrianGrenadiers, "DEFENDER", null, ["wagram-grenadiers"], 25),
      g("wagram-reserve", "Second Line", UNIT.austrianLandwehr, "DEFENDER", "wagram-danube-defense", ["wagram-landwehr", "wagram-musketeers"], 26),
      g("wagram-imperial-push", "Imperial Push", UNIT.frenchLine1, "ATTACKER", null, ["wagram-french-line", "wagram-hussars"], 27),
    ],
  },
  {
    id: "demo-event-training-recent",
    name: "Recent Staff Training Engagement",
    scheduledOffsetDays: -9,
    eventType: "training",
    description: "Recent Statistics-window fixture with a pending result correction and mixed audit states.",
    opponent: "Coalition Cadre",
    map: "Barraux",
    defenderFlagRef: null,
    attackerFlagRef: null,
    participations: [
      participation(UNIT.britishLine1), participation(UNIT.britishRifles), participation(UNIT.frenchLine2),
      participation(UNIT.russianJagers), participation(UNIT.frenchHussars),
    ],
    atomics: [
      a("training-british-line", UNIT.britishLine1, "Line Formation", "DEFENDER", "REGULAR", true, "FINAL"),
      a("training-british-rifles", UNIT.britishRifles, "Light Company", "DEFENDER", "RIFLES", true, "FINAL", [112]),
      a("training-french-line", UNIT.frenchLine2, "Line Advance", "ATTACKER", "REGULAR", true, "FINAL"),
      a("training-jagers", UNIT.russianJagers, "Jager Screen", "ATTACKER", "RIFLES", true, "DRAFT"),
      a("training-hussars", UNIT.frenchHussars, "Cavalry Reserve", "ATTACKER", "CAVALRY", false, "NONE"),
    ],
    groups: [
      g("training-defender-line", "Defender Line", UNIT.britishLine1, "DEFENDER", null, ["training-british-line", "training-british-rifles"], 28),
      g("training-french-advance", "French Advance", UNIT.frenchLine2, "ATTACKER", null, ["training-french-line", "training-jagers", "training-hussars"], 29),
    ],
  },
  {
    id: "demo-event-organizer-review",
    name: "Staff Exercise: Unsorted Organizer Review",
    scheduledOffsetDays: 4,
    eventType: "training",
    description: "Low-risk organizer fixture with assigned sides, nested groups, and manager-only Unsorted nodes.",
    opponent: "Training Staff",
    map: "Barraux",
    defenderFlagRef: "/maps/austerlitz.jpg",
    attackerFlagRef: null,
    participations: [
      participation(UNIT.britishLine1), participation(UNIT.britishLine2), participation(UNIT.russianJagers),
      participation(UNIT.frenchHussars), participation(UNIT.portugueseLancers), participation(UNIT.frenchYoungGuard),
    ],
    atomics: [
      a("organizer-defender-line", UNIT.britishLine1, "Defender Line", "DEFENDER", "REGULAR", true, "NONE"),
      a("organizer-defender-rifles", UNIT.britishLine2, "Rifle Detachment", "DEFENDER", "RIFLES", true, "NONE"),
      a("organizer-attacker-jagers", UNIT.russianJagers, "Jager Skirmishers", "ATTACKER", "RIFLES", true, "NONE"),
      a("organizer-unsorted-lancers", UNIT.portugueseLancers, "Unassigned Lancers", null, "CAVALRY", false, "NONE"),
      a("organizer-unsorted-guard", UNIT.frenchYoungGuard, "Unassigned Guard", null, "REGULAR", true, "NONE"),
      a("organizer-unsorted-hussars", UNIT.frenchHussars, "Unassigned Hussars", null, "CAVALRY", false, "NONE"),
    ],
    groups: [
      g("organizer-defender-corps", "Defender Corps", UNIT.britishLine1, "DEFENDER", null, [], 30),
      g("organizer-defender-brigade", "Line Brigade", UNIT.britishLine2, "DEFENDER", "organizer-defender-corps", ["organizer-defender-line", "organizer-defender-rifles"], 31),
      g("organizer-attacker-screen", "Attacker Screen", UNIT.russianJagers, "ATTACKER", null, ["organizer-attacker-jagers"], 32),
      g("organizer-unsorted-reserve", "Unsorted Reserve", UNIT.frenchYoungGuard, null, null, [], 33),
      g("organizer-unsorted-cavalry", "Unsorted Cavalry", UNIT.portugueseLancers, null, null, [], 34),
    ],
  },
  {
    id: "demo-event-autumn-muster",
    name: "Autumn Coalition Muster",
    scheduledOffsetDays: -4,
    eventType: "muster",
    description: "Recent event with a denied participation request and no battlefield configuration.",
    opponent: "Independent Companies",
    map: "Borodino",
    defenderFlagRef: null,
    attackerFlagRef: null,
    participations: [participation(UNIT.spanishLine), participation(UNIT.austrianGrenadiers), participation(UNIT.cacadores), participation(UNIT.russianJagers, "DENIED")],
    atomics: [],
    groups: [],
  },
  {
    id: "demo-event-winter-maneuvers",
    name: "Winter Coalition Maneuvers",
    scheduledOffsetDays: 16,
    eventType: "campaign",
    description: "Future Event with accepted and requested participation and no Battle Structure yet.",
    opponent: "Imperial Army",
    map: "Winter Countryside",
    defenderFlagRef: null,
    attackerFlagRef: null,
    participations: [
      participation(UNIT.britishLine1), participation(UNIT.frenchLine1), participation(UNIT.russianMusketeers),
      participation(UNIT.spanishVolunteers, "REQUESTED"),
    ],
    atomics: [],
    groups: [],
  },
  {
    id: "demo-event-spring-review",
    name: "Spring Corps Review",
    scheduledOffsetDays: 34,
    eventType: "review",
    description: "Future planning fixture with outstanding participation requests.",
    opponent: "Allied Staff",
    map: "Austerlitz",
    defenderFlagRef: null,
    attackerFlagRef: null,
    participations: [participation(UNIT.austrianLandwehr), participation(UNIT.frenchOldGuard, "REQUESTED"), participation(UNIT.portugueseLancers)],
    atomics: [],
    groups: [],
  },
];

const unitCommander = (unitId: string): string => {
  if (unitId.startsWith("demo-unit-french")) return DEMO_USER_IDS.managerFrench;
  if (unitId.startsWith("demo-unit-coalition") || unitId.startsWith("demo-unit-british") || unitId.startsWith("demo-unit-austrian") || unitId.startsWith("demo-unit-allied")) {
    return DEMO_USER_IDS.managerCoalition;
  }
  if (unitId.startsWith("demo-unit-russian") || unitId.startsWith("demo-unit-cossack")) return DEMO_USER_IDS.managerFrench;
  return DEMO_USER_IDS.managerCoalition;
};

function daysFromNow(offset: number): Date {
  return new Date(Date.now() + offset * DAY_MS);
}

function playerId(index: number): string {
  return `demo-player-${String(index + 1).padStart(3, "0")}`;
}

export function demoPlayerIdentity(index: number): { id: string; playerId: string } {
  return {
    id: index === 0 ? "player-row-uuid-123" : `player-row-demo-${String(index + 1).padStart(3, "0")}`,
    playerId: playerId(index),
  };
}

export function demoMercenaryIdentity(index: number): { id: string; playerId: string } {
  const suffix = String(index + 1).padStart(3, "0");
  return { id: `player-row-merc-${suffix}`, playerId: `demo-player-merc-${suffix}` };
}

function groupPermissionGrants(membershipId: string, createdByUserId: string, permissions: Array<{ permission: Permission; scope: PermissionScope | null }>, prefix: string) {
  return permissions.map(({ permission, scope }) => ({
    id: `${prefix}-${permission.toLowerCase()}`,
    authorizedUserMembershipId: membershipId,
    permission,
    scope,
    createdByUserId,
  }));
}

async function deleteGrantHistory(tx: TxClient): Promise<void> {
  const remaining = await tx.permissionGrant.findMany({ select: { id: true, delegatedFromGrantId: true } });
  const byId = new Map(remaining.map((grant) => [grant.id, grant]));
  while (byId.size > 0) {
    const parents = new Set([...byId.values()].map((grant) => grant.delegatedFromGrantId).filter((id): id is string => id !== null));
    const leaves = [...byId.keys()].filter((id) => !parents.has(id));
    if (leaves.length === 0) throw new Error("PermissionGrant delegation history contains a cycle; refusing to guess a deletion order.");
    await tx.permissionGrant.deleteMany({ where: { id: { in: leaves } } });
    for (const id of leaves) byId.delete(id);
  }
}

async function deleteEventResultHistory(tx: TxClient): Promise<void> {
  const remaining = await tx.eventResult.findMany({ select: { id: true, supersedesId: true } });
  const byId = new Map(remaining.map((result) => [result.id, result]));
  while (byId.size > 0) {
    const parents = new Set([...byId.values()].map((result) => result.supersedesId).filter((id): id is string => id !== null));
    const leaves = [...byId.keys()].filter((id) => !parents.has(id));
    if (leaves.length === 0) throw new Error("Event result history contains a cycle; refusing to guess a deletion order.");
    await tx.eventResult.deleteMany({ where: { id: { in: leaves } } });
    for (const id of leaves) byId.delete(id);
  }
}

async function deleteCommandGroups(tx: TxClient): Promise<void> {
  await tx.eventCommandGroupAtomicUnit.deleteMany();
  const remaining = await tx.eventCommandGroup.findMany({ select: { id: true, parentGroupId: true } });
  const byId = new Map(remaining.map((group) => [group.id, group]));
  while (byId.size > 0) {
    const parents = new Set([...byId.values()].map((group) => group.parentGroupId).filter((id): id is string => id !== null));
    const leaves = [...byId.keys()].filter((id) => !parents.has(id));
    if (leaves.length === 0) throw new Error("Event command hierarchy contains a cycle; refusing to guess a deletion order.");
    await tx.eventCommandGroup.deleteMany({ where: { id: { in: leaves } } });
    for (const id of leaves) byId.delete(id);
  }
}

async function deleteUnitsBelowRoot(tx: TxClient, rootUnitId: string): Promise<void> {
  const remaining = await tx.unit.findMany({
    where: { id: { not: rootUnitId } },
    select: { id: true, parentId: true },
  });
  const byId = new Map(remaining.map((unit) => [unit.id, unit]));
  while (byId.size > 0) {
    const parents = new Set([...byId.values()].map((unit) => unit.parentId).filter((id): id is string => id !== null));
    const leaves = [...byId.keys()].filter((id) => !parents.has(id));
    if (leaves.length === 0) throw new Error("Unit hierarchy contains a cycle; refusing to guess a deletion order.");
    await tx.unit.deleteMany({ where: { id: { in: leaves } } });
    for (const id of leaves) byId.delete(id);
  }
}

async function clearResettableData(tx: TxClient, rootUnitId: string, rootCommanderUserId: string): Promise<void> {
  const rootMembership = await tx.authorizedUserMembership.findFirst({
    where: { unitId: rootUnitId, userId: rootCommanderUserId, authorityLevel: 0, endedAt: null },
    select: { id: true },
  });

  await tx.$executeRaw`ALTER TABLE "Audit" DISABLE TRIGGER "audit_final_immutability"`;
  await tx.$executeRaw`ALTER TABLE "AuditPlayerResult" DISABLE TRIGGER "audit_player_result_final_immutability"`;
  await tx.$executeRaw`ALTER TABLE "AuditRoleAssignment" DISABLE TRIGGER "audit_role_assignment_final_immutability"`;
  try {
    await tx.auditPlayerResult.deleteMany();
    await tx.auditRoleAssignment.deleteMany();
    await tx.audit.deleteMany();
  } finally {
    await tx.$executeRaw`ALTER TABLE "AuditRoleAssignment" ENABLE TRIGGER "audit_role_assignment_final_immutability"`;
    await tx.$executeRaw`ALTER TABLE "AuditPlayerResult" ENABLE TRIGGER "audit_player_result_final_immutability"`;
    await tx.$executeRaw`ALTER TABLE "Audit" ENABLE TRIGGER "audit_final_immutability"`;
  }

  await deleteCommandGroups(tx);
  await deleteEventResultHistory(tx);
  await tx.eventAuthorizedUser.deleteMany();
  await tx.atomicEventUnit.deleteMany();
  await tx.eventParticipation.deleteMany();
  await tx.event.deleteMany();
  await tx.unitMembership.deleteMany();
  await deleteGrantHistory(tx);
  if (rootMembership) {
    await tx.authorizedUserMembership.update({
      where: { id: rootMembership.id },
      data: { authorityLevel: 0, endedAt: null, createdByUserId: rootCommanderUserId },
    });
    await tx.authorizedUserMembership.deleteMany({ where: { id: { not: rootMembership.id } } });
  } else {
    await tx.authorizedUserMembership.deleteMany();
    await tx.authorizedUserMembership.create({
      data: {
        id: "demo-root-owner-membership",
        unitId: rootUnitId,
        userId: rootCommanderUserId,
        authorityLevel: 0,
        createdByUserId: rootCommanderUserId,
      },
    });
  }
  await tx.rankDefinition.deleteMany();
  await tx.medalDefinition.deleteMany();
  await tx.player.deleteMany();
  await deleteUnitsBelowRoot(tx, rootUnitId);
  await tx.verificationToken.deleteMany();
  await tx.user.deleteMany({ where: { id: { not: rootCommanderUserId } } });
}

function expectedCommanderGrants(): Array<{ permission: Permission; scope: PermissionScope | null }> {
  return [
    { permission: "MANAGE_UNIT", scope: "SELF_AND_DESCENDANTS" },
    { permission: "MANAGE_STRUCTURE", scope: null },
    { permission: "MANAGE_ROSTER", scope: "SELF_AND_DESCENDANTS" },
    { permission: "REQUEST_EVENT_PARTICIPATION", scope: "SELF_AND_DESCENDANTS" },
    { permission: "MANAGE_EVENTS", scope: "SELF_AND_DESCENDANTS" },
    { permission: "SUBMIT_AUDITS", scope: "SELF_AND_DESCENDANTS" },
    { permission: "MANAGE_AUTHORIZED_USERS", scope: "SELF_AND_DESCENDANTS" },
  ];
}

async function seedDemoUsers(tx: TxClient): Promise<void> {
  const users = [
    { id: DEMO_USER_IDS.managerFrench, name: "French Branch Manager", email: "manager-french@demo.invalid" },
    { id: DEMO_USER_IDS.managerCoalition, name: "Coalition Branch Manager", email: "manager-coalition@demo.invalid" },
    { id: DEMO_USER_IDS.auditFrench, name: "French Audit Submitter", email: "audit-french@demo.invalid" },
    { id: DEMO_USER_IDS.auditCoalition, name: "Coalition Audit Submitter", email: "audit-coalition@demo.invalid" },
    { id: DEMO_USER_IDS.limited, name: "Limited Roster Manager", email: "limited-roster@demo.invalid" },
    { id: DEMO_USER_IDS.eventManager, name: "Event-only Manager", email: "event-manager@demo.invalid" },
  ];
  await tx.user.createMany({ data: users });
}

async function seedAuthorization(tx: TxClient, rootUnitId: string, rootCommanderUserId: string): Promise<void> {
  const commanderMemberships = unitSeeds.map((unit) => ({
    id: `demo-auth-commander-${unit.id}`,
    unitId: unit.id,
    userId: unitCommander(unit.id),
    authorityLevel: 0,
    createdByUserId: rootCommanderUserId,
  }));
  const additionalMemberships = [
    { id: "demo-auth-audit-french", unitId: UNIT.frenchArmy, userId: DEMO_USER_IDS.auditFrench, authorityLevel: 2, createdByUserId: rootCommanderUserId },
    { id: "demo-auth-audit-coalition", unitId: UNIT.coalition, userId: DEMO_USER_IDS.auditCoalition, authorityLevel: 2, createdByUserId: rootCommanderUserId },
    { id: "demo-auth-limited", unitId: UNIT.spanishLine, userId: DEMO_USER_IDS.limited, authorityLevel: 2, createdByUserId: rootCommanderUserId },
  ];
  await tx.authorizedUserMembership.createMany({ data: [...commanderMemberships, ...additionalMemberships] });

  const rootMembership = await tx.authorizedUserMembership.findFirstOrThrow({
    where: { unitId: rootUnitId, userId: rootCommanderUserId, authorityLevel: 0, endedAt: null },
    select: { id: true },
  });
  const grants = [
    ...groupPermissionGrants(rootMembership.id, rootCommanderUserId, expectedCommanderGrants(), "demo-grant-root"),
    ...groupPermissionGrants(`demo-auth-commander-${UNIT.frenchArmy}`, rootCommanderUserId, expectedCommanderGrants(), "demo-grant-french"),
    ...groupPermissionGrants(`demo-auth-commander-${UNIT.coalition}`, rootCommanderUserId, expectedCommanderGrants(), "demo-grant-coalition"),
    ...groupPermissionGrants("demo-auth-audit-french", rootCommanderUserId, [
      { permission: "SUBMIT_AUDITS", scope: "SELF_AND_DESCENDANTS" },
    ], "demo-grant-audit-french"),
    ...groupPermissionGrants("demo-auth-audit-coalition", rootCommanderUserId, [
      { permission: "SUBMIT_AUDITS", scope: "SELF_AND_DESCENDANTS" },
    ], "demo-grant-audit-coalition"),
    ...groupPermissionGrants(`demo-auth-limited`, rootCommanderUserId, [
      { permission: "MANAGE_ROSTER", scope: "SELF" },
    ], "demo-grant-limited"),
  ];
  await tx.permissionGrant.createMany({ data: grants });
}

async function seedUnits(tx: TxClient, rootUnitId: string): Promise<void> {
  for (const unit of unitSeeds) {
    await tx.unit.create({
      data: {
        id: unit.id,
        name: unit.name,
        parentId: unit.parentId ?? rootUnitId,
        rootUnitId,
        commanderUserId: unitCommander(unit.id),
      },
    });
  }
}

async function seedCatalogs(tx: TxClient, rootUnitId: string): Promise<void> {
  const ranks = ["Recruit", "Private", "Corporal", "Sergeant", "Lieutenant", "Captain", "Major", "Colonel"];
  await tx.rankDefinition.createMany({
    data: ranks.map((name, sortOrder) => ({
      id: `demo-rank-${String(sortOrder + 1).padStart(2, "0")}`,
      rootUnitId,
      name,
      description: null,
      sortOrder,
    })),
  });
  await tx.medalDefinition.createMany({
    data: [
      { id: "demo-medal-campaign", rootUnitId, name: "Campaign Service Medal", description: "Service in a major campaign.", imageRef: "/maps/austerlitz.jpg" },
      { id: "demo-medal-merit", rootUnitId, name: "Distinguished Merit", description: "Recognition for exceptional service.", imageRef: "/maps/borodino.jpg" },
      { id: "demo-medal-long-service", rootUnitId, name: "Long Service Cross", description: "Recognition for sustained service.", imageRef: null },
    ],
  });
}

function primaryUnitForPlayer(index: number): string {
  return PLAYER_UNIT_OVERRIDES[index] ?? leafUnitIds[index % leafUnitIds.length];
}

async function seedPlayers(tx: TxClient): Promise<MembershipSeed[]> {
  const playerRows = Array.from({ length: PLAYER_COUNT }, (_, index) => ({
    ...demoPlayerIdentity(index),
    name: null,
  }));
  const mercenaries = Array.from({ length: MERCENARY_COUNT }, (_, index) => ({
    ...demoMercenaryIdentity(index),
    name: null,
  }));
  await tx.player.createMany({ data: [...playerRows, ...mercenaries] });

  const memberships: MembershipSeed[] = [];
  for (let index = 0; index < PLAYER_COUNT; index += 1) {
    const { id: player, playerId: gamePlayerId } = demoPlayerIdentity(index);
    const unitId = primaryUnitForPlayer(index);
    if (index < 6) {
      memberships.push({
        id: `demo-membership-prior-${index + 1}`,
        playerId: player,
        gamePlayerId,
        unitId,
        startedAt: daysFromNow(-120),
        endedAt: daysFromNow(-22),
      });
    }
    memberships.push({
      id: `demo-membership-period-${index + 1}`,
      playerId: player,
      gamePlayerId,
      unitId,
      startedAt: daysFromNow(index < 6 ? -8 : index >= 104 && index < 112 ? -6 : -180),
      endedAt: index >= 112 ? daysFromNow(-5) : null,
    });
    if (index >= 12 && index < 22) {
      memberships.push({
        id: `demo-membership-moved-${index + 1}`,
        playerId: player,
        gamePlayerId,
        unitId: leafUnitIds[(leafUnitIds.indexOf(unitId) + 1) % leafUnitIds.length],
        startedAt: daysFromNow(-300),
        endedAt: daysFromNow(-220),
      });
    }
  }
  await tx.unitMembership.createMany({
    data: memberships.map(({ id, playerId, unitId, startedAt, endedAt }) => ({ id, playerId, unitId, startedAt, endedAt })),
  });
  return memberships;
}

function activePlayersForUnit(memberships: MembershipSeed[], unitId: string, eventDate: Date): MembershipSeed[] {
  return memberships
    .filter((membership) => membership.unitId === unitId
      && membership.startedAt <= eventDate
      && (membership.endedAt === null || membership.endedAt > eventDate))
    .sort((left, right) => left.gamePlayerId.localeCompare(right.gamePlayerId));
}

async function seedEvents(tx: TxClient, rootCommanderUserId: string): Promise<Map<string, string>> {
  const participationIds = new Map<string, string>();
  for (const event of eventSeeds) {
    const scheduledAt = daysFromNow(event.scheduledOffsetDays);
    await tx.event.create({
      data: {
        id: event.id,
        name: event.name,
        scheduledAt,
        eventType: event.eventType,
        description: event.description,
        opponent: event.opponent,
        map: event.map,
        defenderFlagRef: event.defenderFlagRef,
        attackerFlagRef: event.attackerFlagRef,
        ownerUserId: rootCommanderUserId,
      },
    });
    for (const item of event.participations) {
      const id = `demo-participation-${event.id}-${item.unitId}`;
      participationIds.set(`${event.id}:${item.unitId}`, id);
      await tx.eventParticipation.create({ data: { id, eventId: event.id, unitId: item.unitId, status: item.status } });
    }
  }
  return participationIds;
}

async function seedBattleStructures(
  tx: TxClient,
  memberships: MembershipSeed[],
  participationIds: Map<string, string>,
  rootCommanderUserId: string,
): Promise<void> {
  let auditIndex = 0;
  for (const event of eventSeeds) {
    const approvedUnits = new Set(event.participations.filter(({ status }) => status === "APPROVED").map(({ unitId }) => unitId));
    for (const atomic of event.atomics) {
      if (!approvedUnits.has(atomic.unitId)) throw new Error(`Atomic ${atomic.id} claims non-approved participation.`);
      const eventParticipationId = participationIds.get(`${event.id}:${atomic.unitId}`);
      if (!eventParticipationId) throw new Error(`Missing EventParticipation for ${atomic.id}.`);
      await tx.atomicEventUnit.create({
        data: {
          id: atomic.id,
          eventParticipationId,
          name: atomic.name,
          side: atomic.side,
          auditUnitType: atomic.unitType,
          isMandatory: atomic.mandatory,
        },
      });
    }
    for (const group of event.groups) {
      if (!approvedUnits.has(group.unitId)) throw new Error(`Command group ${group.id} claims non-approved participation.`);
      const eventParticipationId = participationIds.get(`${event.id}:${group.unitId}`);
      if (!eventParticipationId) throw new Error(`Missing EventParticipation for ${group.id}.`);
      await tx.eventCommandGroup.create({
        data: {
          id: group.id,
          eventId: event.id,
          eventParticipationId,
          name: group.name,
          side: group.side,
          parentGroupId: group.parentId,
          commanderPlayerId: demoPlayerIdentity(group.commanderIndex).id,
        },
      });
    }
    for (const group of event.groups) {
      for (const id of group.atomicIds) {
        await tx.eventCommandGroupAtomicUnit.create({ data: { groupId: group.id, atomicEventUnitId: id } });
      }
    }

    for (const atomic of event.atomics) {
      if (atomic.audit === "NONE") continue;
      const scheduledAt = daysFromNow(event.scheduledOffsetDays);
      const results = activePlayersForUnit(memberships, atomic.unitId, scheduledAt)
        .filter(({ gamePlayerId }) => !atomic.omittedPlayerIndexes?.includes(Number(gamePlayerId.slice("demo-player-".length)) - 1))
        .slice(0, 4)
        .map(({ playerId }) => playerId);
      if (results.length === 0 || auditIndex % 3 === 1) {
        results.push(demoMercenaryIdentity(auditIndex % MERCENARY_COUNT).id);
      }
      const auditId = `demo-audit-${atomic.id.slice("demo-atomic-".length)}`;
      await tx.audit.create({
        data: {
          id: auditId,
          atomicEventUnitId: atomic.id,
          createdByUserId: atomic.unitId.startsWith("demo-unit-french")
            ? DEMO_USER_IDS.auditFrench
            : atomic.unitId.startsWith("demo-unit-british") || atomic.unitId.startsWith("demo-unit-austrian")
              ? DEMO_USER_IDS.auditCoalition
              : rootCommanderUserId,
          lifecycle: "DRAFT",
          unitType: atomic.unitType,
          tickets: 80 + (auditIndex * 7) % 91,
          flagCaptures: auditIndex % 5,
          flagLosses: (auditIndex + 2) % 4,
          stars: 1 + (auditIndex % 5),
          submittedAt: null,
        },
      });
      await tx.auditPlayerResult.createMany({
        data: results.map((id, resultIndex) => ({
          id: `${auditId}-player-${resultIndex + 1}`,
          auditId,
          playerId: id,
          kills: resultIndex === 0 ? 18 + (auditIndex % 7) : resultIndex === 1 ? 7 : resultIndex === 2 ? 2 : resultIndex === 3 ? 4 : 5 + (auditIndex % 5),
          deaths: resultIndex === 0 ? 0 : resultIndex === 1 ? 4 : resultIndex === 2 ? 9 : resultIndex === 3 ? 2 : 1 + (auditIndex % 4),
          assists: resultIndex === 0 ? 6 : resultIndex === 1 ? 3 : resultIndex === 2 ? 1 : resultIndex === 3 ? 16 : (auditIndex + resultIndex) % 11,
        })),
      });
      const commanderPlayerId = results[0];
      const roles: Array<{ id: string; auditId: string; playerId: string; role: "COMMANDER" | "FLAG_BEARER" }> = [{
        id: `${auditId}-commander`,
        auditId,
        playerId: commanderPlayerId,
        role: "COMMANDER",
      }];
      if (atomic.unitType === "REGULAR") {
        roles.push({
          id: `${auditId}-flag-bearer`,
          auditId,
          playerId: results[1] ?? commanderPlayerId,
          role: "FLAG_BEARER",
        });
      }
      await tx.auditRoleAssignment.createMany({ data: roles });
      if (atomic.audit === "FINAL") {
        await tx.audit.update({
          where: { id: auditId },
          data: { lifecycle: "FINAL", submittedAt: new Date(scheduledAt.getTime() + 5 * 60 * 1000) },
        });
      }
      auditIndex += 1;
    }
  }
}

async function seedEventAuthorizations(tx: TxClient, rootCommanderUserId: string): Promise<void> {
  const authorizations = [
    ["demo-event-main-review", DEMO_USER_IDS.managerFrench],
    ["demo-event-main-review", DEMO_USER_IDS.managerCoalition],
    ["demo-event-waterloo-review", DEMO_USER_IDS.managerFrench],
    ["demo-event-borodino-review", DEMO_USER_IDS.managerCoalition],
    ["demo-event-training-recent", DEMO_USER_IDS.managerFrench],
    ["demo-event-training-recent", DEMO_USER_IDS.managerCoalition],
    ["demo-event-organizer-review", DEMO_USER_IDS.eventManager],
    ["demo-event-organizer-review", DEMO_USER_IDS.managerFrench],
  ];
  await tx.eventAuthorizedUser.createMany({
    data: authorizations.map(([eventId, userId], index) => ({
      id: `demo-event-authorized-${index + 1}`,
      eventId,
      userId,
      addedByUserId: rootCommanderUserId,
    })),
  });
}

async function seedEventResults(tx: TxClient, rootCommanderUserId: string): Promise<void> {
  const mainOlderId = "demo-event-result-main-older";
  await tx.eventResult.create({
    data: {
      id: mainOlderId,
      eventId: "demo-event-main-review",
      value: "ATTACKER_WIN",
      status: "SUPERSEDED",
      proposedByUserId: rootCommanderUserId,
      createdAt: daysFromNow(-1),
    },
  });
  await tx.eventResult.create({
    data: {
      id: "demo-event-result-main-effective",
      eventId: "demo-event-main-review",
      value: "DEFENDER_WIN",
      status: "EFFECTIVE",
      proposedByUserId: DEMO_USER_IDS.managerFrench,
      reviewedByUserId: DEMO_USER_IDS.managerCoalition,
      reviewedAt: daysFromNow(-1),
      supersedesId: mainOlderId,
    },
  });
  await tx.eventResult.createMany({
    data: [
      { id: "demo-event-result-waterloo", eventId: "demo-event-waterloo-review", value: "ATTACKER_WIN", status: "EFFECTIVE", proposedByUserId: rootCommanderUserId },
      { id: "demo-event-result-borodino", eventId: "demo-event-borodino-review", value: "DRAW", status: "EFFECTIVE", proposedByUserId: rootCommanderUserId },
      { id: "demo-event-result-iberian", eventId: "demo-event-iberian-campaign", value: "DEFENDER_WIN", status: "EFFECTIVE", proposedByUserId: rootCommanderUserId },
      { id: "demo-event-result-training-effective", eventId: "demo-event-training-recent", value: "DRAW", status: "EFFECTIVE", proposedByUserId: rootCommanderUserId },
      { id: "demo-event-result-training-pending", eventId: "demo-event-training-recent", value: "ATTACKER_WIN", status: "PENDING", proposedByUserId: DEMO_USER_IDS.managerFrench, supersedesId: "demo-event-result-training-effective" },
    ],
  });
}

async function seedDemoWorld(tx: TxClient, rootUnitId: string, rootCommanderUserId: string): Promise<MembershipSeed[]> {
  await seedDemoUsers(tx);
  await seedUnits(tx, rootUnitId);
  await seedAuthorization(tx, rootUnitId, rootCommanderUserId);
  await seedCatalogs(tx, rootUnitId);
  const memberships = await seedPlayers(tx);
  const participationIds = await seedEvents(tx, rootCommanderUserId);
  await seedBattleStructures(tx, memberships, participationIds, rootCommanderUserId);
  await seedEventAuthorizations(tx, rootCommanderUserId);
  await seedEventResults(tx, rootCommanderUserId);
  return memberships;
}

function assertRootUnchanged(before: { identity: string; designation: string }, after: { identity: string | null; designation: string | null }) {
  assert.equal(after.identity, before.identity, "The designated RootUnit Unit record changed during reset.");
  assert.equal(after.designation, before.designation, "The RootUnit designation record changed during reset.");
}

async function verifySeededData(tx: TxClient, rootUnitId: string): Promise<void> {
  const rootUnits = await tx.rootUnit.count();
  const units = await tx.unit.findMany({ select: { id: true, parentId: true, rootUnitId: true } });
  const playerRows = await tx.player.findMany({ select: { id: true, playerId: true } });
  const players = playerRows.length;
  const users = await tx.user.findMany({ select: { id: true } });
  const membershipLinks = await tx.unitMembership.findMany({
    select: { playerId: true, player: { select: { id: true, playerId: true } } },
  });
  const memberships = membershipLinks.length;
  const auditPlayerLinks = await tx.auditPlayerResult.findMany({
    select: { playerId: true, player: { select: { id: true, playerId: true } } },
  });
  const auditRoleLinks = await tx.auditRoleAssignment.findMany({
    select: { playerId: true, player: { select: { id: true, playerId: true } } },
  });
  const events = await tx.event.count();
  const participations = await tx.eventParticipation.findMany({ select: { id: true, status: true } });
  const atomics = await tx.atomicEventUnit.findMany({
    include: {
      eventParticipation: { select: { status: true, eventId: true, unitId: true } },
      commandGroupMembership: { include: { group: { select: { id: true, eventId: true, side: true } } } },
      audit: {
        select: {
          id: true,
          atomicEventUnitId: true,
          lifecycle: true,
          unitType: true,
          roles: { select: { role: true } },
          playerResults: { select: { deaths: true } },
        },
      },
    },
  });
  const groups = await tx.eventCommandGroup.findMany({
    include: { eventParticipation: { select: { status: true, eventId: true, unitId: true } } },
  });
  const audits = await tx.audit.groupBy({ by: ["lifecycle"], _count: { _all: true } });
  const results = await tx.eventResult.groupBy({ by: ["status"], _count: { _all: true } });
  const grants = await tx.permissionGrant.count();
  const authorizedMemberships = await tx.authorizedUserMembership.count();
  const eventAuthorizations = await tx.eventAuthorizedUser.count();

  const root = await tx.rootUnit.findUniqueOrThrow({ where: { unitId: rootUnitId }, include: { designatedUnit: { select: { commanderUserId: true } } } });
  assert.equal(rootUnits, 1);
  assert.ok(units.some((unit) => unit.id === rootUnitId));
  assert.ok(units.filter((unit) => unit.id !== rootUnitId).every((unit) => unit.rootUnitId === rootUnitId));
  assert.ok(units.filter((unit) => unit.id !== rootUnitId).every((unit) => unit.parentId !== null));
  const parentById = new Map(units.map((unit) => [unit.id, unit.parentId]));
  for (const unit of units.filter((candidate) => candidate.id !== rootUnitId)) {
    const visited = new Set<string>();
    let parentId = unit.parentId;
    while (parentId && parentId !== rootUnitId) {
      assert.ok(!visited.has(parentId), `Unit ${unit.id} has a hierarchy cycle.`);
      visited.add(parentId);
      parentId = parentById.get(parentId) ?? null;
    }
    assert.equal(parentId, rootUnitId, `Unit ${unit.id} does not descend from the preserved RootUnit.`);
  }
  assert.ok(units.length >= 26 && units.length <= 41, `Unexpected Unit count ${units.length}.`);
  assert.ok(players >= 100 && players <= 150, `Unexpected Player count ${players}.`);
  assert.equal(new Set(playerRows.map(({ playerId }) => playerId)).size, players, "Seed contains duplicate public PlayerIDs.");
  assert.ok(playerRows.every(({ id, playerId }) => id !== playerId), "Seeded Players must not equate internal and public IDs.");
  const identityFixture = playerRows.find(({ playerId: gamePlayerId }) => gamePlayerId === playerId(0));
  assert.deepEqual(identityFixture, { id: "player-row-uuid-123", playerId: "demo-player-001" });
  const internalPlayerIds = new Set(playerRows.map(({ id }) => id));
  for (const membership of membershipLinks) {
    assert.equal(membership.playerId, membership.player.id, "UnitMembership must reference Player.id.");
    assert.ok(internalPlayerIds.has(membership.playerId));
  }
  for (const result of auditPlayerLinks) {
    assert.equal(result.playerId, result.player.id, "AuditPlayerResult must reference Player.id.");
    assert.ok(internalPlayerIds.has(result.playerId));
  }
  for (const role of auditRoleLinks) {
    assert.equal(role.playerId, role.player.id, "AuditRoleAssignment must reference Player.id.");
    assert.ok(internalPlayerIds.has(role.playerId));
  }
  assert.ok(membershipLinks.some(({ playerId }) => playerId === identityFixture.id));
  assert.ok(auditPlayerLinks.some(({ playerId }) => playerId === identityFixture.id));
  assert.ok(auditRoleLinks.some(({ playerId }) => playerId === identityFixture.id));
  assert.ok(users.filter((user) => user.id !== root.designatedUnit.commanderUserId).length >= 6);
  assert.equal(events, 10);
  assert.ok(memberships >= 120);
  assert.ok(participations.some(({ status }) => status === "APPROVED"));
  assert.ok(participations.some(({ status }) => status === "REQUESTED"));
  assert.ok(participations.some(({ status }) => status === "DENIED"));
  assert.ok(atomics.length >= 40);
  assert.ok(groups.length >= 15);
  assert.ok(grants >= 20 && authorizedMemberships >= 30 && eventAuthorizations >= 6);
  assert.deepEqual(new Set(units.map((unit) => unit.id)), new Set([rootUnitId, ...unitSeeds.map((unit) => unit.id)]));
  assert.deepEqual(new Set(users.map((user) => user.id)), new Set([root.designatedUnit.commanderUserId, ...Object.values(DEMO_USER_IDS)]));

  for (const atomic of atomics) {
    assert.equal(atomic.eventParticipation.status, "APPROVED", `${atomic.id} must claim approved participation.`);
    if (atomic.commandGroupMembership) {
      assert.equal(atomic.commandGroupMembership.group.eventId, atomic.eventParticipation.eventId);
      assert.equal(atomic.commandGroupMembership.group.side, atomic.side);
    }
    if (atomic.audit?.lifecycle === "FINAL") {
      assert.equal(atomic.audit.atomicEventUnitId, atomic.id, `${atomic.id} Audit changed battlefield identity.`);
      assert.equal(atomic.audit.roles.filter(({ role }) => role === "COMMANDER").length, 1, `${atomic.id} needs one Commander.`);
      assert.ok(atomic.audit.playerResults.some(({ deaths }) => deaths === 0), "Seed is missing zero-death Player results.");
      if (atomic.audit.unitType === "REGULAR") {
        assert.equal(atomic.audit.roles.filter(({ role }) => role === "FLAG_BEARER").length, 1, `${atomic.id} Regular Audit needs one Flag Bearer.`);
      }
    }
  }
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  for (const group of groups) {
    const claim = group.eventParticipation;
    assert.ok(claim, `${group.id} must claim an EventParticipation.`);
    assert.equal(claim.status, "APPROVED", `${group.id} must claim approved participation.`);
    assert.equal(claim.eventId, group.eventId);
    assert.ok(unitSeeds.some((unit) => unit.id === claim.unitId));
    if (group.side === null) assert.equal(group.parentGroupId, null, `${group.id} Unsorted group cannot have a side parent.`);
    if (group.parentGroupId) assert.equal(groupsById.get(group.parentGroupId)?.side, group.side, `${group.id} crosses battlefield sides.`);
  }
  const finalized = audits.find(({ lifecycle }) => lifecycle === "FINAL")?._count._all ?? 0;
  const drafts = audits.find(({ lifecycle }) => lifecycle === "DRAFT")?._count._all ?? 0;
  assert.ok(finalized >= 20 && finalized <= 35, `Expected 20-35 finalized Audits, found ${finalized}.`);
  assert.ok(drafts >= 1, "Expected pending/draft Audit cases.");
  assert.ok(results.some(({ status }) => status === "SUPERSEDED"));
  assert.ok(results.some(({ status }) => status === "PENDING"));
}

async function smokeReaders(ids: { rootUnitId: string; rootCommanderUserId: string }): Promise<void> {
  process.env.UNITS_DEMO_MODE = "false";
  const [unitQueries, eventQueries, eventResults, commandGroups, atomicUnits, statistics, attendance] = await Promise.all([
    import("../src/modules/units/server/queries"),
    import("../src/modules/events/server/queries"),
    import("../src/modules/events/server/results"),
    import("../src/modules/audits/server/command-groups"),
    import("../src/modules/audits/server/atomic-units"),
    import("../src/modules/statistics"),
    import("../src/modules/statistics/attendance"),
  ]);

  const units = await unitQueries.listUnits();
  assert.ok(units.some((unit) => unit.id === ids.rootUnitId), "Public Units hierarchy did not return the preserved root.");
  assert.ok((await unitQueries.getUnit(UNIT.frenchArmy))?.children.length, "Nested Unit reader returned no children.");

  const mainEvent = await eventQueries.getEventById("demo-event-main-review");
  assert.ok(mainEvent, "Public Event detail reader could not load the review Event.");
  assert.ok((await eventQueries.listApprovedEventUnits(mainEvent.id)).length >= 5);
  assert.equal((await eventResults.getEventResultState(mainEvent.id)).effective?.value, "DEFENDER_WIN");
  const mainPublicStructure = await commandGroups.getPublicEventCommandStructure(mainEvent.id);
  assert.ok(mainPublicStructure?.groups.length);
  assert.ok(mainPublicStructure.groups.every((group) => group.side !== null));

  const organizerPublicStructure = await commandGroups.getPublicEventCommandStructure("demo-event-organizer-review");
  const organizerManagerStructure = await commandGroups.getManagerEventCommandStructure(DEMO_USER_IDS.eventManager, "demo-event-organizer-review");
  assert.ok(organizerPublicStructure && organizerManagerStructure);
  assert.ok(organizerManagerStructure.groups.some((group) => group.side === null), "Manager Battle reader omitted Unsorted groups.");
  assert.ok(organizerManagerStructure.ungroupedAtomicUnits.some((unit) => unit.side === null), "Manager Battle reader omitted Unsorted atomics.");
  assert.ok(organizerPublicStructure.groups.every((group) => group.side !== null));
  assert.ok(organizerPublicStructure.ungroupedAtomicUnits.every((unit) => unit.side !== null), "Public Battle reader exposed Unsorted atomics.");
  const assertAssigned = (nodes: typeof organizerPublicStructure.groups): void => {
    for (const node of nodes) {
      assert.notEqual(node.side, null, "Public Battle reader exposed an Unsorted group.");
      assert.ok(node.atomicUnits.every((unit) => unit.side !== null), "Public Battle reader exposed an Unsorted atomic unit.");
      assertAssigned(node.children);
    }
  };
  assertAssigned(organizerPublicStructure.groups);

  const eligibleAudits = await atomicUnits.listAuthorizedAtomicEventUnits(DEMO_USER_IDS.auditFrench);
  const unrelatedAudits = await atomicUnits.listAuthorizedAtomicEventUnits(DEMO_USER_IDS.limited);
  assert.ok(eligibleAudits.length > 0, "/audits discovery returned no atomic units for an eligible Unit user.");
  assert.ok(eligibleAudits.every((unit) => unit.eventParticipation.unitId.startsWith("demo-unit-french")));
  assert.equal(unrelatedAudits.length, 0, "/audits discovery exposed units to an unrelated user.");

  const ranker14 = await statistics.getRankerStatistics("14d");
  const ranker30 = await statistics.getRankerStatistics("30d");
  const rankerAll = await statistics.getRankerStatistics("all-time");
  const commanders = await statistics.getCommanderStatistics("all-time");
  const generals = await statistics.getGeneralStatistics("all-time");
  const directUnit = await statistics.getDirectUnitPerformance(UNIT.britishLine1, "30d");
  const organizationalUnit = await statistics.getOrganizationalUnitPerformance(UNIT.frenchArmy, "all-time");
  assert.ok(ranker14.players.length > 0 && ranker30.players.length >= ranker14.players.length && rankerAll.players.length >= ranker30.players.length);
  assert.ok(commanders.players.length > 0, "Commander Statistics reader found no observations.");
  assert.ok(generals.players.length > 0, "General Statistics reader found no qualifying command groups.");
  assert.ok(directUnit.unitTypes.length > 0 && organizationalUnit.unitTypes.length > 0);

  const present = await attendance.getAttendanceStateForEvent({ gamePlayerId: playerId(0), unitId: UNIT.britishLine1, eventId: "demo-event-main-review" });
  const absent = await attendance.getAttendanceStateForEvent({ gamePlayerId: playerId(1), unitId: UNIT.britishLine1, eventId: "demo-event-main-review" });
  const pending = await attendance.getAttendanceStateForEvent({ gamePlayerId: playerId(8), unitId: UNIT.frenchLine2, eventId: "demo-event-main-review" });
  const joinedAfter = await attendance.getAttendanceStateForEvent({ gamePlayerId: playerId(104), unitId: UNIT.frenchLine2, eventId: "demo-event-waterloo-review" });
  const leftBefore = await attendance.getAttendanceStateForEvent({ gamePlayerId: playerId(112), unitId: UNIT.britishRifles, eventId: "demo-event-main-review" });
  const leftAfter = await attendance.getAttendanceStateForEvent({ gamePlayerId: playerId(112), unitId: UNIT.britishRifles, eventId: "demo-event-training-recent" });
  const rejoinedGap = await attendance.getAttendanceStateForEvent({ gamePlayerId: playerId(0), unitId: UNIT.britishLine1, eventId: "demo-event-training-recent" });
  const optionalOnly = await attendance.getAttendanceStateForEvent({ gamePlayerId: playerId(100), unitId: UNIT.portugueseLancers, eventId: "demo-event-organizer-review" });
  assert.equal(present.state, "PRESENT");
  assert.equal(absent.state, "ABSENT");
  assert.equal(pending.state, "PENDING");
  assert.equal(joinedAfter.state, "NO_OBLIGATION");
  assert.equal(leftBefore.state, "NO_OBLIGATION");
  assert.equal(leftAfter.state, "ABSENT");
  assert.equal(rejoinedGap.state, "NO_OBLIGATION");
  assert.equal(optionalOnly.state, "NO_OBLIGATION");

  console.log("Reader smoke: Units, Event detail, public/manager Battle, eligible/unrelated /audits, Ranker (14d/30d/all-time), Commander, General, Unit, and attendance passed.");
}

async function printSummary(prisma: PrismaClient, rootUnitId: string, rootName: string, rootCommanderUserId: string): Promise<void> {
  const rootUnits = await prisma.rootUnit.count();
  const units = await prisma.unit.count();
  const players = await prisma.player.count();
  const users = await prisma.user.count();
  const unitMemberships = await prisma.unitMembership.count();
  const events = await prisma.event.count();
  const participationGroups = await prisma.eventParticipation.groupBy({ by: ["status"], _count: { _all: true } });
  const atomics = await prisma.atomicEventUnit.count();
  const unsortedAtomics = await prisma.atomicEventUnit.count({ where: { side: null } });
  const groups = await prisma.eventCommandGroup.count();
  const unsortedGroups = await prisma.eventCommandGroup.count({ where: { side: null } });
  const audits = await prisma.audit.groupBy({ by: ["lifecycle"], _count: { _all: true } });
  const results = await prisma.eventResult.groupBy({ by: ["status"], _count: { _all: true } });
  const permissionGrants = await prisma.permissionGrant.count();
  const authorizedMemberships = await prisma.authorizedUserMembership.count();
  const eventAuthorizedUsers = await prisma.eventAuthorizedUser.count();
  const ranks = await prisma.rankDefinition.count();
  const medals = await prisma.medalDefinition.count();
  const countFor = <T extends { _count: { _all: number } }>(rows: T[], field: string, key: string): number =>
    (rows as Array<T & Record<string, string | number | null>>).find((row) => row[field] === key)?._count._all ?? 0;
  console.log(`RootUnits ${rootUnits}; Units ${units}; Players ${players}; Users ${users}; UnitMemberships ${unitMemberships}; Events ${events}.`);
  console.log(`EventParticipations APPROVED ${countFor(participationGroups, "status", "APPROVED")}, REQUESTED ${countFor(participationGroups, "status", "REQUESTED")}, DENIED ${countFor(participationGroups, "status", "DENIED")}.`);
  console.log(`AtomicEventUnits ${atomics} (Unsorted ${unsortedAtomics}); EventCommandGroups ${groups} (Unsorted ${unsortedGroups}).`);
  console.log(`Audits FINAL ${countFor(audits, "lifecycle", "FINAL")}, DRAFT ${countFor(audits, "lifecycle", "DRAFT")}; EventResults EFFECTIVE ${countFor(results, "status", "EFFECTIVE")}, SUPERSEDED ${countFor(results, "status", "SUPERSEDED")}, PENDING ${countFor(results, "status", "PENDING")}, REJECTED ${countFor(results, "status", "REJECTED")}.`);
  console.log(`PermissionGrants ${permissionGrants}; AuthorizedUserMemberships ${authorizedMemberships}; EventAuthorizedUsers ${eventAuthorizedUsers}; Ranks ${ranks}; Medals ${medals}.`);
  console.log(`Preserved RootUnit: ${rootUnitId} (${rootName}); Commander User: ${rootCommanderUserId}.`);
  console.log("Demo identities (Google-only auth; no seeded credentials):");
  console.log(`- Root Commander / Event owner: ${rootCommanderUserId}`);
  console.log(`- French branch manager: ${DEMO_USER_IDS.managerFrench}; Audit submitter: ${DEMO_USER_IDS.auditFrench}`);
  console.log(`- Coalition branch manager: ${DEMO_USER_IDS.managerCoalition}; Audit submitter: ${DEMO_USER_IDS.auditCoalition}`);
  console.log(`- Limited roster manager: ${DEMO_USER_IDS.limited}; Event-only manager: ${DEMO_USER_IDS.eventManager}`);
  console.log("Main visual-review Event: demo-event-main-review (/events/demo-event-main-review).");
  console.log("Organizer-review Event: demo-event-organizer-review (/events/demo-event-organizer-review).");
}

export async function runDemoReset(): Promise<void> {
  const target = assertSafeDatabaseTarget(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  try {
    const rootRows = await prisma.rootUnit.findMany({
      include: { designatedUnit: { select: ROOT_UNIT_SELECT } },
    });
    const rootIdentity = requireSingleRootUnit(rootRows.map(({ unitId, designatedUnit }) => ({ unitId, name: designatedUnit.name })));
    const rootUnitBefore = await prisma.unit.findUnique({ where: { id: rootIdentity.unitId }, select: ROOT_UNIT_SELECT });
    const rootRecordBefore = await prisma.rootUnit.findUnique({ where: { unitId: rootIdentity.unitId } });
    if (!rootUnitBefore || !rootRecordBefore) throw new Error("The canonical RootUnit or designated Unit is missing; refusing reset.");
    const commander = await prisma.user.findUnique({ where: { id: rootUnitBefore.commanderUserId }, select: { id: true, name: true, accounts: { select: { provider: true } } } });
    if (!commander) throw new Error("The RootUnit Commander User is missing; refusing reset.");

    console.log(`Environment: ${target.environment}`);
    console.log(`Database: ${target.host}/${target.databaseName}`);
    console.log(`Preserving RootUnit: ${rootIdentity.unitId} (${rootIdentity.name})`);
    console.log(`Preserving required Commander User: ${commander.id} (${commander.name ?? "unnamed"}); linked Auth.js Accounts ${commander.accounts.length}.`);
    console.warn("DESTRUCTIVE DEVELOPMENT RESET: all other application/domain data will be deleted and the demo world reseeded.");

    await prisma.$transaction(async (tx) => {
      const currentRootRows = await tx.rootUnit.findMany({
        include: { designatedUnit: { select: ROOT_UNIT_SELECT } },
      });
      const currentRootIdentity = requireSingleRootUnit(currentRootRows.map(({ unitId, designatedUnit }) => ({ unitId, name: designatedUnit.name })));
      assert.equal(currentRootIdentity.unitId, rootIdentity.unitId, "RootUnit changed while reset was starting.");
      const currentUnit = await tx.unit.findUnique({ where: { id: rootIdentity.unitId }, select: ROOT_UNIT_SELECT });
      const currentDesignation = await tx.rootUnit.findUnique({ where: { unitId: rootIdentity.unitId } });
      assert.deepEqual(currentUnit, rootUnitBefore, "RootUnit Unit fields changed while reset was starting.");
      assert.deepEqual(currentDesignation, rootRecordBefore, "RootUnit designation changed while reset was starting.");

      await clearResettableData(tx, rootIdentity.unitId, commander.id);
      await seedDemoWorld(tx, rootIdentity.unitId, commander.id);
      await verifySeededData(tx, rootIdentity.unitId);

      const rootUnitAfter = await tx.unit.findUnique({ where: { id: rootIdentity.unitId }, select: ROOT_UNIT_SELECT });
      const rootRecordAfter = await tx.rootUnit.findUnique({ where: { unitId: rootIdentity.unitId } });
      assertRootUnchanged({
        identity: JSON.stringify(rootUnitBefore),
        designation: JSON.stringify(rootRecordBefore),
      }, {
        identity: rootUnitAfter ? JSON.stringify(rootUnitAfter) : null,
        designation: rootRecordAfter ? JSON.stringify(rootRecordAfter) : null,
      });
    }, { maxWait: 15_000, timeout: 120_000 });

    await smokeReaders({ rootUnitId: rootIdentity.unitId, rootCommanderUserId: commander.id });
    await printSummary(prisma, rootIdentity.unitId, rootIdentity.name, commander.id);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/prisma/demo-reset.ts")) {
  runDemoReset().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
