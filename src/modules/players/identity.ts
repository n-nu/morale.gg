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
  if (username) return `@${username}`;
  const mercenary = /^demo-player-merc-(\d+)$/u.exec(identity.playerId);
  if (mercenary) return `Demo Mercenary ${mercenary[1]}`;
  const synthetic = /^demo-player-(\d+)$/u.exec(identity.playerId);
  if (synthetic) return `Demo Player ${synthetic[1]}`;
  const roster = /^demo-player-roster-(.+)-(\d+)$/u.exec(identity.playerId);
  if (roster) return `Demo Player ${roster[1]} ${roster[2]}`;
  return /^\d+$/u.test(identity.playerId)
    ? `Roblox ID ${identity.playerId}`
    : `Demo Player ${identity.playerId}`;
}

export function playerIdDescription(playerId: string): string {
  return /^\d+$/u.test(playerId)
    ? `Roblox ID: ${playerId}`
    : `Synthetic demo ID: ${playerId}`;
}

export function robloxProfileUrl(playerId: string): string | null {
  if (!/^[1-9]\d*$/u.test(playerId) || !Number.isSafeInteger(Number(playerId))) return null;
  return `https://www.roblox.com/users/${encodeURIComponent(playerId)}/profile`;
}
