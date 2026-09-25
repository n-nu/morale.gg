import { getAuthenticatedUserId } from "@/lib/website-admin";
import { canManageRoster } from "@/modules/units/server/authorization";
import { Roster } from "../components/roster";
import { getCurrentRoster } from "./queries";

export async function RosterSection({ unitId }: { unitId: string }) {
  const [entries, userId] = await Promise.all([getCurrentRoster(unitId), getAuthenticatedUserId()]);
  const canManage = userId !== null && await canManageRoster(userId, unitId);
  return <Roster unitId={unitId} entries={entries} canManage={canManage} />;
}
