export type PlayerIdentityPresentation = {
  playerId: string;
  robloxUsername: string | null;
  robloxAvatarUrl: string | null;
};

export function safeRobloxAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const trustedHost = hostname === "rbxcdn.com" || hostname.endsWith(".rbxcdn.com");
    if (
      url.protocol !== "https:" ||
      !trustedHost ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== ""
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function playerIdentityLabel(identity: PlayerIdentityPresentation): string {
  const username = identity.robloxUsername?.trim();
  return username ? `@${username}` : `Roblox ID ${identity.playerId}`;
}

export function robloxProfileUrl(playerId: string): string | null {
  if (!/^[1-9]\d*$/u.test(playerId) || !Number.isSafeInteger(Number(playerId))) return null;
  return `https://www.roblox.com/users/${encodeURIComponent(playerId)}/profile`;
}
