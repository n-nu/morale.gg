"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DEV_SESSION_COOKIE,
  DEV_SESSION_MAX_AGE_MS,
  isDevSignInEnabled,
  isDevSignInIdentity,
} from "@/lib/dev-sign-in";
import { prisma } from "@/lib/prisma";

export async function devSignInAction(formData: FormData): Promise<void> {
  // Server actions are reachable by ID, so the gate must be re-checked here, not only on the page.
  if (!isDevSignInEnabled()) {
    throw new Error("Development sign-in is disabled.");
  }

  const userId = formData.get("userId");
  if (!isDevSignInIdentity(userId)) {
    throw new Error("Unknown demo identity.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    redirect("/dev/sign-in?error=missing");
  }

  const cookieStore = await cookies();
  const previousToken = cookieStore.get(DEV_SESSION_COOKIE)?.value;
  if (previousToken) {
    await prisma.session.deleteMany({ where: { sessionToken: previousToken } });
  }

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + DEV_SESSION_MAX_AGE_MS);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });
  cookieStore.set(DEV_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    expires,
  });

  revalidatePath("/", "layout");
  redirect("/units");
}
