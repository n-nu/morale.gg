import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DEMO_SIGN_IN_IDENTITIES } from "@/lib/demo-identities";
import { isDevSignInEnabled } from "@/lib/dev-sign-in";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/website-admin";

import { devSignInAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Development sign-in · morale.gg",
};

export default async function DevSignInPage({ searchParams }: PageProps<"/dev/sign-in">) {
  if (!isDevSignInEnabled()) {
    notFound();
  }

  const query = await searchParams;
  const missing = query.error === "missing";
  const currentUserId = await getAuthenticatedUserId();
  const seeded = await prisma.user.findMany({
    where: { id: { in: DEMO_SIGN_IN_IDENTITIES.map(({ id }) => id) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(seeded.map(({ id, name }) => [id, name]));
  const available = DEMO_SIGN_IN_IDENTITIES.filter(({ id }) => nameById.has(id));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:px-10">
      <h1 className="text-2xl font-extrabold text-white">Development sign-in</h1>
      <p className="mt-2 text-sm text-muted">
        Local development only. Signs in as a seeded demo identity with its seeded authority. Unavailable
        in production builds and when <code>DEV_SIGN_IN_ENABLED</code> is not <code>&quot;true&quot;</code>.
      </p>
      {currentUserId !== null && (
        <p className="mt-4 text-sm text-muted">
          Currently signed in as <code>{currentUserId}</code>. Choosing an identity replaces this session.
        </p>
      )}
      {(missing || available.length === 0) && (
        <p className="mt-4 rounded-md border border-edge bg-surface px-4 py-3 text-sm text-white">
          Demo identities are not seeded. Run <code>npm run demo:reset</code>, then reload this page.
        </p>
      )}
      <ul className="mt-6 flex flex-col gap-3">
        {available.map(({ id, role }) => (
          <li key={id} className="rounded-[10px] border border-edge bg-surface px-5 py-4">
            <form action={devSignInAction} className="flex flex-wrap items-center justify-between gap-3">
              <input type="hidden" name="userId" value={id} />
              <div className="min-w-0">
                <p className="font-bold text-white">{nameById.get(id) ?? id}</p>
                <p className="text-xs text-muted">{role}</p>
                <p className="font-mono text-[11px] text-faint">{id}</p>
              </div>
              <button
                type="submit"
                className="rounded-md bg-gold px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-gold-ink transition-colors hover:bg-gold-bright"
              >
                Sign in
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
