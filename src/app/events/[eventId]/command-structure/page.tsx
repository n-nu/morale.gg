import { redirect } from "next/navigation";

export default async function LegacyCommandStructurePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/manage#battle-structure`);
}
