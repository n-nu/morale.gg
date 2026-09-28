import { PageShell } from "@/app/presentation";

export const metadata = { title: "Players | morale.gg" };

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return <PageShell className="pt-1">
    {children}
  </PageShell>;
}
