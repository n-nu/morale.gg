import Link from "next/link";

export function UnitLinks({ units }: { units: { id: string; name: string }[] }) {
  return (
    <ul className="units-links">
      {units.map((unit) => (
        <li key={unit.id}>
          <Link
            href={`/units/${encodeURIComponent(unit.id)}`}
          >
            <span>{unit.name}</span><span aria-hidden="true">↗</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
