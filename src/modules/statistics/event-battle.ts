import "server-only";

import type { AuditUnitType } from "@prisma/client";

import {
  getPublicEventCommandStructure,
  type CommandTreeAtomicUnit,
  type PublicEventCommandGroup,
} from "@/modules/audits/server/command-groups";
import { getEffectiveFinalizedAuditObservations } from "@/modules/audits/server/statistics-source";
import type { EffectiveFinalizedAuditObservation } from "@/modules/audits/server/statistics-source";

import { deriveRatio, type RatioMetric } from "./ratios";

export type EventBattlePlayerResult = {
  position: number;
  playerId: string;
  displayName: string;
  role: "COMMANDER" | "FLAG_BEARER" | null;
  kills: number;
  deaths: number;
  assists: number;
  kdr: RatioMetric;
};

export type EventBattleUnitStatistics = {
  kills: number;
  deaths: number;
  assists: number;
  kdr: RatioMetric;
  tickets: number | null;
  flagCaptures: number | null;
  flagLosses: number | null;
  stars: number | null;
};

export type EventBattleAtomicUnit = CommandTreeAtomicUnit & {
  representedUnitId: string;
  representedUnitName: string;
  auditUnitType: AuditUnitType | null;
  resultState: "FINALIZED" | "PENDING";
  commander: string | null;
  summary: EventBattleUnitStatistics | null;
  players: EventBattlePlayerResult[];
};

export type EventBattleGroup = Omit<PublicEventCommandGroup, "atomicUnits" | "children"> & {
  atomicUnits: EventBattleAtomicUnit[];
  children: EventBattleGroup[];
};

export type EventBattleStatistics = {
  eventId: string;
  groups: EventBattleGroup[];
  ungroupedAtomicUnits: EventBattleAtomicUnit[];
};

function publicPlayerName(publicName: string | null, gamePlayerId: string): string {
  return publicName?.trim() || gamePlayerId;
}

function buildAtomicUnit(
  unit: CommandTreeAtomicUnit,
  observation: EffectiveFinalizedAuditObservation | undefined,
): EventBattleAtomicUnit {
  if (observation === undefined) {
    return {
      ...unit,
      representedUnitId: unit.persistentUnitId ?? "",
      representedUnitName: unit.persistentUnitName,
      auditUnitType: unit.auditUnitType,
      resultState: "PENDING",
      commander: null,
      summary: null,
      players: [],
    };
  }

  const roles = new Map(observation.roles.map(({ gamePlayerId, role }) => [gamePlayerId, role]));
  const totals = observation.playerResults.reduce(
    (result, player) => ({
      kills: result.kills + player.kills,
      deaths: result.deaths + player.deaths,
      assists: result.assists + player.assists,
    }),
    { kills: 0, deaths: 0, assists: 0 },
  );

  return {
    ...unit,
    representedUnitId: observation.representedUnitId,
    representedUnitName: observation.representedUnitName,
    auditUnitType: observation.unitType,
    resultState: "FINALIZED",
    commander: observation.commanderGamePlayerId
      ? publicPlayerName(observation.playerResults.find(({ gamePlayerId }) => gamePlayerId === observation.commanderGamePlayerId)?.publicName ?? null, observation.commanderGamePlayerId)
      : null,
    summary: {
      ...totals,
      kdr: deriveRatio(totals.kills, totals.deaths, "K"),
      tickets: observation.unitResults.tickets,
      flagCaptures: observation.unitResults.flagCaptures,
      flagLosses: observation.unitResults.flagLosses,
      stars: observation.unitResults.stars,
    },
    players: observation.playerResults.map((player, index) => ({
      position: index + 1,
      playerId: player.gamePlayerId,
      displayName: publicPlayerName(player.publicName, player.gamePlayerId),
      role: roles.get(player.gamePlayerId) ?? null,
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      kdr: deriveRatio(player.kills, player.deaths, "K"),
    })),
  };
}

export async function getEventBattleStatistics(eventId: string): Promise<EventBattleStatistics | null> {
  const normalizedEventId = eventId.trim();
  if (normalizedEventId === "") return null;

  const [structure, source] = await Promise.all([
    getPublicEventCommandStructure(normalizedEventId),
    getEffectiveFinalizedAuditObservations([normalizedEventId]),
  ]);
  if (structure === null) return null;

  const observations = new Map(source.observations.map((observation) => [observation.atomicEventUnitId, observation]));
  const mapGroup = (group: PublicEventCommandGroup): EventBattleGroup => ({
    ...group,
    atomicUnits: group.atomicUnits.map((unit) => buildAtomicUnit(unit, observations.get(unit.id))),
    children: group.children.map(mapGroup),
  });

  return {
    eventId: normalizedEventId,
    groups: structure.groups.map(mapGroup),
    ungroupedAtomicUnits: structure.ungroupedAtomicUnits.map((unit) => buildAtomicUnit(unit, observations.get(unit.id))),
  };
}