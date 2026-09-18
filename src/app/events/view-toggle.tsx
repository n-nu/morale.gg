import Link from "next/link";

export function ViewToggle({ active }: { active: "list" | "calendar" }) {
  const base = "px-4 py-2 text-sm font-semibold";
  return (
    <div className="flex overflow-hidden rounded-lg border border-edge-strong">
      {active === "list" ? (
        <span className={`${base} bg-edge font-bold text-white`}>List</span>
      ) : (
        <Link
          href="/events"
          className={`${base} text-muted transition-colors hover:text-white`}
        >
          List
        </Link>
      )}
      {active === "calendar" ? (
        <span className={`${base} bg-edge font-bold text-white`}>Calendar</span>
      ) : (
        <Link
          href="/events/calendar"
          className={`${base} text-muted transition-colors hover:text-white`}
        >
          Calendar
        </Link>
      )}
    </div>
  );
}
