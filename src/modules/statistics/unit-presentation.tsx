import {
  StatisticsEmptyState,
  StatisticsRatio,
  StatMetric,
  TypeSummaryCard,
  UnitTypeLabel,
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
    <div className="space-y-4">
      {typeOrder.map((unitType) => {
        const typeStats = performance.unitTypes.find((entry) => entry.unitType === unitType);
        if (!typeStats) {
          return (
            <StatisticsEmptyState
              key={unitType}
              title={`${UnitTypeLabel[unitType]}: no observations`}
              description={`There are no ${UnitTypeLabel[unitType]} observations in this window.`}
            />
          );
        }

        return (
          <TypeSummaryCard key={unitType} unitType={unitType}>
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
    <div className="space-y-10">
      <section aria-labelledby="direct-performance-heading">
        <h2 id="direct-performance-heading" className="text-2xl font-semibold text-white">Direct Performance</h2>
        <p className="mt-2 text-sm text-muted">Observations attributed directly to this Unit only.</p>
        {direct.unitTypes.length === 0 ? (
          <div className="mt-4"><StatisticsEmptyState title="No direct observations" description="This Unit has no directly attributed observations in the selected window." /></div>
        ) : <div className="mt-4"><PerformanceTypeResults performance={direct} average={false} /></div>}
      </section>

      <section aria-labelledby="organizational-performance-heading">
        <h2 id="organizational-performance-heading" className="text-2xl font-semibold text-white">Organizational Performance</h2>
        <p className="mt-2 text-sm text-muted">This Unit and its descendants, using the Statistics reader result.</p>
        {organizational.unitTypes.length === 0 ? (
          <div className="mt-4"><StatisticsEmptyState title="No organizational observations" description="This Unit and its descendants have no observations in the selected window." /></div>
        ) : <div className="mt-4"><PerformanceTypeResults performance={organizational} average={false} /></div>}
      </section>

      <section aria-labelledby="average-performance-heading">
        <h2 id="average-performance-heading" className="text-2xl font-semibold text-white">Average Unit Performance</h2>
        <p className="mt-2 text-sm text-muted">Equal-Unit-weight additive averages for qualifying Units. KDR is not averaged here.</p>
        {average.unitTypes.length === 0 ? (
          <div className="mt-4"><StatisticsEmptyState title="No qualifying Unit observations" description="No Unit contributed observations to the average in the selected window." /></div>
        ) : <div className="mt-4"><PerformanceTypeResults performance={average} average /></div>}
      </section>
    </div>
  );
}