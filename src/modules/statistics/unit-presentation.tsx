import {
  StatisticsEmptyState,
  StatisticsRatio,
  StatMetric,
  TypeSummaryCard,
} from "./presentation";
import type {
  AverageUnitPerformance,
  DirectUnitPerformance,
  OrganizationalUnitPerformance,
  UnitPerformanceByType,
} from "./unit";

const typeOrder = ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"] as const;

function formatMetric(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.0+$/, "");
}

function PerformanceTypeResults({
  performance,
  average,
}: {
  performance: DirectUnitPerformance | OrganizationalUnitPerformance | AverageUnitPerformance;
  average: boolean;
}) {
  return (
    <div className="space-y-1">
      {typeOrder.map((unitType) => {
        const typeStats = performance.unitTypes.find((entry) => entry.unitType === unitType);
        if (!typeStats) return null;

        return (
          <TypeSummaryCard
            key={unitType}
            unitType={unitType}
            defaultOpen={performance.unitTypes[0]?.unitType === unitType}
          >
            {average ? (
              <AverageMetrics typeStats={typeStats as AverageUnitPerformance["unitTypes"][number]} />
            ) : (
              <PerformanceMetrics typeStats={typeStats as UnitPerformanceByType} />
            )}
          </TypeSummaryCard>
        );
      })}
    </div>
  );
}

function PerformanceMetrics({ typeStats }: { typeStats: UnitPerformanceByType }) {
  return (
    <>
      <StatMetric label="Audits" value={typeStats.auditCount} />
      <StatMetric label="Kills" value={formatMetric(typeStats.totals.kills)} />
      <StatMetric label="Deaths" value={formatMetric(typeStats.totals.deaths)} />
      <StatMetric label="Assists" value={formatMetric(typeStats.totals.assists)} />
      <StatMetric label="KDR" value={<StatisticsRatio ratio={typeStats.killDeathRatio} />} />
      <StatMetric label="Tickets" value={formatMetric(typeStats.totals.tickets)} />
      <StatMetric label="Flag captures" value={formatMetric(typeStats.totals.flagCaptures)} />
      <StatMetric label="Flag losses" value={formatMetric(typeStats.totals.flagLosses)} />
      <StatMetric label="Stars" value={formatMetric(typeStats.totals.stars)} />
    </>
  );
}

function AverageMetrics({
  typeStats,
}: {
  typeStats: AverageUnitPerformance["unitTypes"][number];
}) {
  return (
    <>
      <StatMetric label="Qualifying units" value={typeStats.qualifyingUnits} />
      <StatMetric label="Average kills" value={formatMetric(typeStats.averagePerQualifyingUnit.kills)} />
      <StatMetric label="Average deaths" value={formatMetric(typeStats.averagePerQualifyingUnit.deaths)} />
      <StatMetric label="Average assists" value={formatMetric(typeStats.averagePerQualifyingUnit.assists)} />
      <StatMetric label="Average tickets" value={formatMetric(typeStats.averagePerQualifyingUnit.tickets)} />
      <StatMetric label="Average flag captures" value={formatMetric(typeStats.averagePerQualifyingUnit.flagCaptures)} />
      <StatMetric label="Average flag losses" value={formatMetric(typeStats.averagePerQualifyingUnit.flagLosses)} />
      <StatMetric label="Average stars" value={formatMetric(typeStats.averagePerQualifyingUnit.stars)} />
    </>
  );
}

export function UnitStatisticsSections({
  direct,
  organizational,
  average,
}: {
  direct: DirectUnitPerformance;
  organizational: OrganizationalUnitPerformance;
  average: AverageUnitPerformance;
}) {
  return (
    <div className="space-y-7">
      <section aria-labelledby="direct-performance-heading">
        <h2 id="direct-performance-heading" className="text-lg font-extrabold text-white">Direct Performance</h2>
        {direct.unitTypes.length === 0 ? (
          <StatisticsEmptyState title="No direct observations" description="No directly attributed observations in this window." />
        ) : (
          <details className="mt-2 border-y border-edge">
            <summary className="cursor-pointer list-none py-2 text-sm font-semibold text-gold outline-none hover:text-gold-bright focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
              {direct.unitTypes.length} Unit types
            </summary>
            <div className="pb-3"><PerformanceTypeResults performance={direct} average={false} /></div>
          </details>
        )}
      </section>

      <section aria-labelledby="organizational-performance-heading">
        <h2 id="organizational-performance-heading" className="text-lg font-extrabold text-white">Organizational Performance</h2>
        {organizational.unitTypes.length === 0 ? (
          <StatisticsEmptyState title="No organizational observations" description="This Unit and its descendants have no observations in this window." />
        ) : (
          <details className="mt-2 border-y border-edge">
            <summary className="cursor-pointer list-none py-2 text-sm font-semibold text-gold outline-none hover:text-gold-bright focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
              {organizational.unitTypes.length} Unit types
            </summary>
            <div className="pb-3"><PerformanceTypeResults performance={organizational} average={false} /></div>
          </details>
        )}
      </section>

      <section aria-labelledby="average-performance-heading">
        <h2 id="average-performance-heading" className="text-lg font-extrabold text-white">Average Unit Performance</h2>
        {average.unitTypes.length === 0 ? (
          <StatisticsEmptyState title="No qualifying Unit observations" description="No Unit contributed to the average in this window." />
        ) : (
          <details className="mt-2 border-y border-edge">
            <summary className="cursor-pointer list-none py-2 text-sm font-semibold text-gold outline-none hover:text-gold-bright focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
              {average.qualifyingUnitCount} qualifying Units · {average.unitTypes.length} Unit types
            </summary>
            <div className="pb-3"><PerformanceTypeResults performance={average} average /></div>
          </details>
        )}
      </section>
    </div>
  );
}
