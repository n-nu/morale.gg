import type { Metadata } from "next";
import { isUnitsDemoMode } from "@/modules/units/server/demo";
import Link from "next/link";
import "./units.css";

export const metadata: Metadata = {
  title: "Units | morale.gg",
  description: "Browse units and their parent and child relationships.",
};

export default function UnitsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="units-shell">
      <div className="units-wrap">
        <div className="units-topline">
          <Link href="/units">Community / Units</Link>
          {isUnitsDemoMode() && (
            <span className="units-demo">Demo preview · Sample units</span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
