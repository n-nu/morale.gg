import "server-only";

import { prisma } from "@/lib/prisma";
import { getCanonicalEventTimes } from "@/modules/events/server/statistics-source";
import { getMembershipPeriodAtEventTime } from "@/modules/players/server/statistics-source";
import { getEffectiveFinalizedAuditObservations } from "@/modules/audits/server/statistics-source";

import { DEFAULT_STATISTICS_WINDOW, getStatisticsWindowRange, isEventTimeInStatisticsWindow, type StatisticsWindow } from "./windows";

export type AttendanceState = "PRESENT" | "PENDING" | "ABSENT" | "NO_OBLIGATION";

export type AttendanceStateResult = {
  gamePlayerId: string;
  unitId: string;
  eventId: string;
  state: AttendanceState;
  obligationExists: boolean;
  hasMandatoryAtomicUnit: boolean;
};

export type AttendanceSummary = {
  window: StatisticsWindow;
  gamePlayerId: string;
  unitId: string;
  obligations: number;
  present: number;
  absent: number;
  pending: number;
  resolvedObligations: number;
  percentage: number | null;
  noResolvedData: boolean;
};

async function getMandatoryAtomicEventUnits(eventId: string, unitId: string, db = prisma) {
  return db.atomicEventUnit.findMany({
    where: {
      isMandatory: true,
      eventParticipation: {
        eventId,
        unitId,
      },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
}

export async function getAttendanceStateForEvent({
  gamePlayerId,
  unitId,
  eventId,
  db = prisma,
}: {
  gamePlayerId: string;
  unitId: string;
  eventId: string;
  db?: typeof prisma;
}): Promise<AttendanceStateResult> {
  const mandatory = await getMandatoryAtomicEventUnits(eventId, unitId, db);
  if (mandatory.length === 0) {
    return { gamePlayerId, unitId, eventId, state: "NO_OBLIGATION", obligationExists: false, hasMandatoryAtomicUnit: false };
  }

  const eventTime = (await getCanonicalEventTimes([eventId]))[0]?.occurredAt;
  if (eventTime === undefined) {
    return { gamePlayerId, unitId, eventId, state: "NO_OBLIGATION", obligationExists: false, hasMandatoryAtomicUnit: true };
  }

  if (!(await getMembershipPeriodAtEventTime(gamePlayerId, unitId, eventTime, db))) {
    return { gamePlayerId, unitId, eventId, state: "NO_OBLIGATION", obligationExists: false, hasMandatoryAtomicUnit: true };
  }

  const source = await getEffectiveFinalizedAuditObservations([eventId]);
  const mandatoryIds = new Set(mandatory.map(({ id }) => id));
  const effectiveAuditMap = new Map(
    source.observations.filter((observation) => mandatoryIds.has(observation.atomicEventUnitId)).map((observation) => [observation.atomicEventUnitId, observation]),
  );

  const present = source.observations.some(
    (observation) =>
      mandatoryIds.has(observation.atomicEventUnitId) &&
      observation.representedUnitId === unitId &&
      observation.playerResults.some((result) => result.gamePlayerId === gamePlayerId),
  );

  if (present) {
    return { gamePlayerId, unitId, eventId, state: "PRESENT", obligationExists: true, hasMandatoryAtomicUnit: true };
  }

  const unresolvedMandatory = mandatory.some(({ id }) => !effectiveAuditMap.has(id));
  if (unresolvedMandatory) {
    return { gamePlayerId, unitId, eventId, state: "PENDING", obligationExists: true, hasMandatoryAtomicUnit: true };
  }

  return { gamePlayerId, unitId, eventId, state: "ABSENT", obligationExists: true, hasMandatoryAtomicUnit: true };
}

export async function getAttendanceSummaryForPlayerUnit({
  gamePlayerId,
  unitId,
  window = DEFAULT_STATISTICS_WINDOW,
  now = new Date(),
  db = prisma,
}: {
  gamePlayerId: string;
  unitId: string;
  window?: StatisticsWindow;
  now?: Date;
  db?: typeof prisma;
}): Promise<AttendanceSummary> {
  const range = getStatisticsWindowRange(window, now);
  const canonicalEvents = await getCanonicalEventTimes();
  const selectedEvents = canonicalEvents.filter(({ occurredAt }) => isEventTimeInStatisticsWindow(occurredAt, range));

  let obligations = 0;
  let present = 0;
  let absent = 0;
  let pending = 0;

  for (const { eventId } of selectedEvents) {
    const stateResult = await getAttendanceStateForEvent({ gamePlayerId, unitId, eventId, db });
    if (!stateResult.obligationExists) continue;
    obligations += 1;
    if (stateResult.state === "PRESENT") present += 1;
    if (stateResult.state === "ABSENT") absent += 1;
    if (stateResult.state === "PENDING") pending += 1;
  }

  const resolvedObligations = present + absent;
  const noResolvedData = resolvedObligations === 0 && obligations > 0;
  const percentage = resolvedObligations > 0 ? (present / resolvedObligations) * 100 : null;

  return {
    window,
    gamePlayerId,
    unitId,
    obligations,
    present,
    absent,
    pending,
    resolvedObligations,
    percentage,
    noResolvedData,
  };
}
