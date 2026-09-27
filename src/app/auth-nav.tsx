import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

import { AuthNavView, hasAuthenticatedUser } from "./auth-nav-view";

export async function signOutAction(): Promise<void> {
  "use server";
  await signOut({ redirect: false });
  // The root layout renders the session-dependent control, so drop its cached copy.
  revalidatePath("/", "layout");
  redirect("/");
}

export async function AuthNav() {
  const session = await auth();
  return (
    <AuthNavView
      signedIn={hasAuthenticatedUser(session)}
      signOutAction={signOutAction}
    />
  );
}
