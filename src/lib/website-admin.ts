import "server-only";

type WebsiteAdminUser = {
  id?: string | null;
};

function parseWebsiteAdminUserIds(value: string | undefined): Set<string> | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }

  const userIds = value.split(",").map((userId) => userId.trim());
  if (userIds.some((userId) => userId === "")) {
    return null;
  }

  return new Set(userIds);
}

export function isWebsiteAdmin(user: WebsiteAdminUser | null | undefined): boolean {
  const userIds = parseWebsiteAdminUserIds(process.env.WEBSITE_ADMIN_USER_IDS);
  return userIds !== null && typeof user?.id === "string" && userIds.has(user.id);
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const { auth } = await import("@/auth");
  const session = await auth();
  const userId = session?.user?.id;
  return typeof userId === "string" && userId !== "" ? userId : null;
}

export async function isCurrentUserWebsiteAdmin(): Promise<boolean> {
  return isWebsiteAdmin({ id: await getAuthenticatedUserId() });
}
