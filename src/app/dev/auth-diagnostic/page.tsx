import { notFound } from "next/navigation";

import { getAuthenticatedUserId, isWebsiteAdmin } from "@/lib/website-admin";

export default async function AuthDiagnosticPage() {
  // Fail closed outside local development; never reachable in production.
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const userId = await getAuthenticatedUserId();
  const isAdmin = isWebsiteAdmin({ id: userId });

  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col gap-2 px-6 py-16 font-mono text-sm">
      <h1 className="text-base font-semibold">Authentication Diagnostic</h1>
      <p>Environment: {process.env.NODE_ENV}</p>
      <p>Authenticated: {userId !== null ? "YES" : "NO"}</p>
      {userId !== null && <p>User ID: {userId}</p>}
      <p>Website administrator: {isAdmin ? "YES" : "NO"}</p>
    </div>
  );
}
