import Link from "next/link";

import { Breadcrumbs, PageHeader } from "@/app/presentation";
import { getAuthenticatedUserId } from "@/lib/website-admin";
import {
  listAuthorizedAtomicEventUnits,
} from "@/modules/audits/server/atomic-units";
import {
  createAuditDraftAction,
  deleteAtomicEventUnitAction,
  submitAuditAction,
} from "@/modules/audits/server/actions";
import { getAuditForAtomicUnit } from "@/modules/audits/server/reads";
import { AuditEditor } from "./audit-editor";

export const dynamic = "force-dynamic";

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ participation?: string }>;
}) {
  const params = await searchParams;
  const viewerUserId = await getAuthenticatedUserId();
  const discoveredAtomicUnits = viewerUserId === null ? [] : await listAuthorizedAtomicEventUnits(viewerUserId);
  const contexts = [...new Map(discoveredAtomicUnits.map((atomicUnit) => [atomicUnit.eventParticipation.id, atomicUnit.eventParticipation])).values()];

  const requestedParticipationId =
    typeof params.participation === "string" ? params.participation : "";
  const selectedParticipationId = contexts.some(
    (context) => context.id === requestedParticipationId,
  )
    ? requestedParticipationId
    : contexts[0]?.id ?? null;
  const selectedContext = contexts.find(
    (context) => context.id === selectedParticipationId,
  );
  const atomicUnits = selectedContext
    ? discoveredAtomicUnits.filter((atomicUnit) => atomicUnit.eventParticipation.id === selectedContext.id)
    : [];
  const auditViews = await Promise.all(
    atomicUnits.map(async (atomicUnit) => [
      atomicUnit.id,
      await getAuditForAtomicUnit(atomicUnit.id, viewerUserId),
    ] as const),
  );
  const auditsByAtomicUnit = new Map(auditViews);

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10">
      <Breadcrumbs items={[{ label: "Community", href: "/events" }, { label: "Audits" }]} />
      <PageHeader category="Records and administration" title="Audits" description="Finalized event records and authorized submissions." />

      {viewerUserId === null ? (
        <p className="mt-8 border-y border-edge py-5 text-sm text-muted">Sign in to discover Atomic Event-units claimed through your authorized Units.</p>
      ) : contexts.length === 0 ? (
          <p className="mt-8 border-y border-edge py-5 text-sm text-muted">
            No Atomic Event-units are available for your Unit Audit authority.
          </p>
      ) : (
        <section className="mt-8 space-y-6" aria-labelledby="participations-heading">
          <h2 id="participations-heading" className="text-xl font-semibold">
            Approved participations
          </h2>
          <ul className="divide-y divide-edge border-y border-edge">
            {contexts.map((context) => (
              <li key={context.id} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <Link className="font-semibold underline" href={`/events/${context.eventId}`}>
                      {context.event.name}
                    </Link>
                    <p className="text-sm text-muted">{context.unit.name}</p>
                  </div>
                  <Link
                    className="text-xs font-semibold text-gold underline"
                    href={`/audits?participation=${context.id}`}
                  >
                    {context.id === selectedParticipationId ? "Selected" : "Open atomic units"}
                  </Link>
                </div>
                {context.id === selectedParticipationId ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <h3 className="font-semibold">Atomic Event-units</h3>
                      {atomicUnits.length === 0 ? (
                        <p className="mt-2 text-sm text-muted">No atomic units created yet.</p>
                      ) : (
                        <ul className="mt-2 divide-y divide-edge border-y border-edge">
                          {atomicUnits.map((atomicUnit) => (
                            <li key={atomicUnit.id} className="space-y-4 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span>
                                  {atomicUnit.isMandatory ? "Mandatory" : "Optional"}
                                  <span className="ml-2 text-xs text-muted">{atomicUnit.id}</span>
                                </span>
                                {auditsByAtomicUnit.get(atomicUnit.id) === null ? (
                                  <div className="flex flex-wrap items-center gap-3">
                                    <form action={createAuditDraftAction}>
                                      <input type="hidden" name="atomicEventUnitId" value={atomicUnit.id} />
                                      <button className="rounded bg-gold px-3 py-2 text-sm font-bold text-gold-ink" type="submit">
                                        Start Audit
                                      </button>
                                    </form>
                                    <form action={deleteAtomicEventUnitAction}>
                                      <input type="hidden" name="atomicEventUnitId" value={atomicUnit.id} />
                                      <button className="text-sm font-semibold text-red-300 underline" type="submit">
                                        Delete unused unit
                                      </button>
                                    </form>
                                  </div>
                                ) : null}
                              </div>
                              {(() => {
                                const audit = auditsByAtomicUnit.get(atomicUnit.id);
                                if (audit === null || audit === undefined) return null;
                                if (audit.lifecycle === "DRAFT") {
                                  return (
                                    <div className="rounded border border-gold/40 bg-surface px-4 py-4">
                                      <p className="font-semibold text-gold-bright">Draft Audit</p>
                                      <p className="mt-1 text-sm text-muted">Only the creator can edit this draft. Submission finalizes it permanently.</p>
                                      <AuditEditor auditId={audit.id} submitAction={submitAuditAction} />
                                    </div>
                                  );
                                }
                                return (
                                  <div className="rounded border border-green-bright/40 bg-surface px-4 py-4">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                      <p className="font-semibold text-green-bright">Final Audit: {audit.unitType}</p>
                                      <span className="text-sm text-muted">Tickets {audit.tickets} / Stars {audit.stars}</span>
                                    </div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
                                      <span>Flag captures: {audit.flagCaptures}</span>
                                      <span>Flag losses: {audit.flagLosses}</span>
                                      <span>Players: {audit.results.length}</span>
                                    </div>
                                    <div className="mt-4 overflow-x-auto rounded border border-edge">
                                      <table className="w-full text-left text-sm">
                                        <thead className="bg-surface-2 text-xs uppercase text-muted"><tr><th className="px-3 py-2">Player</th><th className="px-3 py-2">K</th><th className="px-3 py-2">D</th><th className="px-3 py-2">A</th></tr></thead>
                                        <tbody>{audit.results.map((result) => <tr key={result.playerId} className="border-t border-edge"><td className="px-3 py-2 font-mono">{result.gamePlayerId}</td><td className="px-3 py-2">{result.kills}</td><td className="px-3 py-2">{result.deaths}</td><td className="px-3 py-2">{result.assists}</td></tr>)}</tbody>
                                      </table>
                                    </div>
                                    <p className="mt-3 text-sm text-muted">{audit.roles.map((role) => `${role.role === "FLAG_BEARER" ? "Flag Bearer" : "Commander"}: ${role.gamePlayerId}`).join(" · ")}</p>
                                  </div>
                                );
                              })()}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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
