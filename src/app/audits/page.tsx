import Link from "next/link";

import { listEvents } from "@/modules/events/server/queries";
import {
  getApprovedParticipationContext,
} from "@/modules/events/server/audits";
import { listEventParticipationsForEvent } from "@/modules/events/server/event-participation";
import {
  listAtomicEventUnits,
} from "@/modules/audits/server/atomic-units";
import {
  createAtomicEventUnitAction,
  deleteAtomicEventUnitAction,
} from "@/modules/audits/server/actions";

export const dynamic = "force-dynamic";

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ participation?: string }>;
}) {
  const params = await searchParams;
  const events = await listEvents();
  const contexts = (
    await Promise.all(
      events.flatMap(async (event) => {
        const participations = await listEventParticipationsForEvent(event.id);
        return Promise.all(
          participations
            .filter((participation) => participation.status === "APPROVED")
            .map((participation) => getApprovedParticipationContext(participation.id)),
        );
      }),
    )
  ).flatMap((eventContexts) => eventContexts.filter((context) => context !== null));

  const requestedParticipationId =
    typeof params.participation === "string" ? params.participation : "";
  const selectedParticipationId = contexts.some(
    (context) => context.participationId === requestedParticipationId,
  )
    ? requestedParticipationId
    : contexts[0]?.participationId ?? null;
  const selectedContext = contexts.find(
    (context) => context.participationId === selectedParticipationId,
  );
  const atomicUnits = selectedContext
    ? await listAtomicEventUnits(selectedContext.participationId)
    : [];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold">Audits</h1>
      <p className="my-3 text-muted">
        Create the atomic Event-units that will hold future Audit results.
      </p>

      {contexts.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-edge p-5">
          No approved Event participations are available.
        </p>
      ) : (
        <section className="mt-8 space-y-6" aria-labelledby="participations-heading">
          <h2 id="participations-heading" className="text-xl font-semibold">
            Approved participations
          </h2>
          <ul className="divide-y divide-edge rounded border border-edge">
            {contexts.map((context) => (
              <li key={context.participationId} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <Link className="font-semibold underline" href={`/events/${context.eventId}`}>
                      {context.event.name}
                    </Link>
                    <p className="text-sm text-muted">{context.unit.name}</p>
                  </div>
                  <Link
                    className="text-xs font-semibold text-gold underline"
                    href={`/audits?participation=${context.participationId}`}
                  >
                    {context.participationId === selectedParticipationId ? "Selected" : "Manage units"}
                  </Link>
                </div>
                {context.participationId === selectedParticipationId ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <h3 className="font-semibold">Atomic Event-units</h3>
                      {atomicUnits.length === 0 ? (
                        <p className="mt-2 text-sm text-muted">No atomic units created yet.</p>
                      ) : (
                        <ul className="mt-2 divide-y divide-edge rounded border border-edge">
                          {atomicUnits.map((atomicUnit) => (
                            <li key={atomicUnit.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                              <span>
                                {atomicUnit.isMandatory ? "Mandatory" : "Optional"}
                                <span className="ml-2 text-xs text-muted">{atomicUnit.id}</span>
                              </span>
                              <form action={deleteAtomicEventUnitAction}>
                                <input type="hidden" name="atomicEventUnitId" value={atomicUnit.id} />
                                <button className="text-sm font-semibold text-red-300 underline" type="submit">
                                  Delete unused unit
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <form action={createAtomicEventUnitAction} className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="participationId" value={context.participationId} />
                      <label className="flex flex-col gap-1 text-sm">
                        Status
                        <select name="isMandatory" defaultValue="true" className="rounded border border-edge bg-background p-2">
                          <option value="true">Mandatory</option>
                          <option value="false">Optional</option>
                        </select>
                      </label>
                      <button className="rounded bg-gold px-4 py-2 font-semibold text-gold-ink" type="submit">
                        Create atomic unit
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
