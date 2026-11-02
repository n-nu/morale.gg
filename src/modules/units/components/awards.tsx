import Image from "next/image";

import {
  grantPlayerAwardAction,
  grantUnitAwardAction,
  removePlayerAwardAction,
  removeUnitAwardAction,
} from "../server/actions";

export type AwardView = {
  id: string;
  name: string;
  description: string | null;
  imageRef: string | null;
  sortOrder: number;
};

function AwardImage({ award }: { award: AwardView }) {
  return award.imageRef ? (
    <Image
      src={award.imageRef}
      alt=""
      width={40}
      height={40}
      unoptimized
      className="h-10 w-10 shrink-0 object-contain"
    />
  ) : (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center border border-edge text-sm text-muted"
      role="img"
      aria-label="No award image"
    >
      —
    </span>
  );
}

function AwardDescription({ award, label }: { award: AwardView; label: string }) {
  if (!award.description) return null;
  return (
    <details className="mt-1 text-xs text-muted">
      <summary className="w-fit cursor-pointer underline decoration-edge-strong underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
        {label}
      </summary>
      <p className="mt-1 max-w-prose">{award.description}</p>
    </details>
  );
}

export function UnitAwardsSection({ awards }: { awards: AwardView[] }) {
  return (
    <section className="mt-8 border-t border-edge pt-4" aria-labelledby="unit-awards-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="unit-awards-heading" className="text-xl font-bold text-foreground">Unit Awards</h2>
        <span className="text-xs text-muted">{awards.length} {awards.length === 1 ? "Award" : "Awards"}</span>
      </div>
      {awards.length === 0 ? (
        <p className="py-3 text-sm text-muted">This Unit has no Awards yet.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {awards.map((award) => (
            <li key={award.id} className="flex min-w-0 items-start gap-3 border border-edge bg-surface p-3">
              <AwardImage award={award} />
              <div className="min-w-0">
                <h3 className="break-words text-sm font-semibold text-foreground">{award.name}</h3>
                <AwardDescription award={award} label={`About ${award.name}`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PlayerAwardsSection({
  playerId,
  awards,
  available,
  manageableAwardIds,
  notice,
  error,
}: {
  playerId: string;
  awards: AwardView[];
  available: AwardView[];
  manageableAwardIds: string[];
  notice?: string;
  error?: string;
}) {
  const manageableIds = new Set(manageableAwardIds);
  return (
    <section className="mt-8 border-t border-edge pt-4" aria-labelledby="player-awards-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="player-awards-heading" className="text-xl font-bold text-foreground">Player Awards</h2>
        <span className="text-xs text-muted">{awards.length} {awards.length === 1 ? "Award" : "Awards"}</span>
      </div>
      {notice ? <p className="mt-2 text-sm text-gold" role="status">{notice}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-400" role="alert">{error}</p> : null}
      {awards.length === 0 ? (
        <p className="py-3 text-sm text-muted">No Awards have been granted to this Player.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {awards.map((award) => (
            <li key={award.id} className="flex min-w-0 items-start gap-3 border border-edge bg-surface p-3">
              <AwardImage award={award} />
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-sm font-semibold text-foreground">{award.name}</h3>
                <AwardDescription award={award} label={`About ${award.name}`} />
                {manageableIds.has(award.id) ? (
                  <form action={removePlayerAwardAction} className="mt-2">
                    <input type="hidden" name="playerId" value={playerId} />
                    <input type="hidden" name="awardId" value={award.id} />
                    <button className="units-management-text-button" type="submit">Remove Award</button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 ? (
        <details className="units-disclosure mt-4">
          <summary>Grant a Player Award</summary>
          <div className="units-disclosure-panel">
            <form action={grantPlayerAwardAction} className="units-management-inline-form">
              <input type="hidden" name="playerId" value={playerId} />
              <label className="units-management-label">
                Player Award
                <select className="units-management-input" name="awardId" required defaultValue="">
                  <option value="" disabled>Select an Award</option>
                  {available.map((award) => (
                    <option key={award.id} value={award.id}>{award.name}</option>
                  ))}
                </select>
              </label>
              <button className="units-management-button" type="submit">Grant Award</button>
            </form>
          </div>
        </details>
      ) : manageableAwardIds.length > 0 ? (
        <p className="mt-3 text-sm text-muted">No additional Player Awards are available to grant.</p>
      ) : null}
    </section>
  );
}

export function UnitAwardManagement({
  unitId,
  assigned,
  available,
}: {
  unitId: string;
  assigned: AwardView[];
  available: AwardView[];
}) {
  return (
    <div className="units-management-stack" aria-label="Unit Awards">
      {assigned.length === 0 ? (
        <p className="units-management-empty">No Unit Awards have been granted.</p>
      ) : (
        <ul className="units-catalog-list" aria-label="Current Unit Awards">
          {assigned.map((award) => (
            <li key={award.id} className="flex min-w-0 items-start gap-3 py-3">
              <AwardImage award={award} />
              <div className="min-w-0 flex-1">
                <strong className="break-words text-sm text-foreground">{award.name}</strong>
                <AwardDescription award={award} label={`About ${award.name}`} />
              </div>
              <form action={removeUnitAwardAction}>
                <input type="hidden" name="unitId" value={unitId} />
                <input type="hidden" name="awardId" value={award.id} />
                <button className="units-management-text-button" type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 ? (
        <form action={grantUnitAwardAction} className="units-management-inline-form">
          <input type="hidden" name="unitId" value={unitId} />
          <label className="units-management-label">
            Unit Award
            <select className="units-management-input" name="awardId" required defaultValue="">
              <option value="" disabled>Select an Award</option>
              {available.map((award) => (
                <option key={award.id} value={award.id}>{award.name}</option>
              ))}
            </select>
          </label>
          <button className="units-management-button" type="submit">Grant Award</button>
        </form>
      ) : (
        <p className="units-management-empty">
          {assigned.length === 0 ? "No Unit Award definitions are available yet." : "All Unit Awards are already granted to this Unit."}
        </p>
      )}
    </div>
  );
}
