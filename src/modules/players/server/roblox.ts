import "server-only";

import { safeRobloxAvatarUrl } from "../identity";

const USERS_API = "https://users.roblox.com/v1/users";
const HEADSHOTS_API = "https://thumbnails.roblox.com/v1/users/avatar-headshot";
export const ROBLOX_LOOKUP_BATCH_SIZE = 10;

export type RobloxIdentity = {
  playerId: string;
  robloxUsername: string;
  robloxAvatarUrl: string | null;
};

export class RobloxLookupError extends Error {
  constructor(
    message: string,
    readonly kind: "INVALID_ID" | "UNAVAILABLE" | "MALFORMED",
  ) {
    super(message);
    this.name = "RobloxLookupError";
  }
}

export function normalizeRobloxPlayerId(value: unknown): string {
  if (typeof value !== "string") {
    throw new RobloxLookupError("Enter a numeric Roblox User ID.", "INVALID_ID");
  }
  const trimmed = value.trim();
  if (!/^[1-9]\d{0,15}$/u.test(trimmed)) {
    throw new RobloxLookupError("Enter a numeric Roblox User ID.", "INVALID_ID");
  }

  const numericId = Number(trimmed);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    throw new RobloxLookupError("Enter a valid numeric Roblox User ID.", "INVALID_ID");
  }
  return String(numericId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function responseJson(response: Response, endpoint: string): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new RobloxLookupError(`Roblox returned malformed data from ${endpoint}.`, "MALFORMED");
  }
}

async function request(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  endpoint: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) });
  } catch {
    throw new RobloxLookupError(
      `Roblox ${endpoint} lookup is temporarily unavailable.`,
      "UNAVAILABLE",
    );
  }
  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      throw new RobloxLookupError(`Roblox ${endpoint} lookup is temporarily unavailable.`, "UNAVAILABLE");
    }
    throw new RobloxLookupError(`Roblox ${endpoint} lookup failed with HTTP ${response.status}.`, "UNAVAILABLE");
  }
  return responseJson(response, endpoint);
}

function validUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim();
  if (username.length === 0 || username.length > 20 || /[\u0000-\u001f\u007f]/u.test(username)) return null;
  return username;
}

async function lookupUsers(
  ids: string[],
  fetcher: typeof fetch,
): Promise<{ identities: Map<string, string>; invalidIds: Set<string> }> {
  const response = await request(
    fetcher,
    USERS_API,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userIds: ids.map(Number),
        excludeBannedUsers: false,
      }),
    },
    "user",
  );
  if (!isRecord(response) || !Array.isArray(response.data)) {
    throw new RobloxLookupError("Roblox returned malformed user data.", "MALFORMED");
  }

  const requested = new Set(ids);
  const identities = new Map<string, string>();
  for (const value of response.data) {
    if (!isRecord(value)) throw new RobloxLookupError("Roblox returned malformed user data.", "MALFORMED");
    const rawId = typeof value.id === "number" && Number.isSafeInteger(value.id)
      ? String(value.id)
      : typeof value.id === "string" && /^\d+$/u.test(value.id)
        ? value.id
        : "";
    let playerId = "";
    try {
      playerId = normalizeRobloxPlayerId(rawId);
    } catch {
      throw new RobloxLookupError("Roblox returned malformed user data.", "MALFORMED");
    }
    const username = validUsername(value.name);
    if (!requested.has(playerId) || !username || identities.has(playerId)) {
      throw new RobloxLookupError("Roblox returned malformed user data.", "MALFORMED");
    }
    identities.set(playerId, username);
  }

  return {
    identities,
    invalidIds: new Set(ids.filter((id) => !identities.has(id))),
  };
}

async function lookupHeadshots(
  ids: string[],
  fetcher: typeof fetch,
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const query = new URLSearchParams({
    userIds: ids.join(","),
    size: "150x150",
    format: "Png",
    isCircular: "false",
  });
  const response = await request(fetcher, `${HEADSHOTS_API}?${query.toString()}`, { method: "GET" }, "headshot");
  if (!isRecord(response) || !Array.isArray(response.data)) {
    throw new RobloxLookupError("Roblox returned malformed headshot data.", "MALFORMED");
  }

  const requested = new Set(ids);
  const headshots = new Map<string, string>();
  for (const value of response.data) {
    if (!isRecord(value)) throw new RobloxLookupError("Roblox returned malformed headshot data.", "MALFORMED");
    const rawId = typeof value.targetId === "number" && Number.isSafeInteger(value.targetId)
      ? String(value.targetId)
      : typeof value.targetId === "string" && /^\d+$/u.test(value.targetId)
        ? value.targetId
        : "";
    let playerId = "";
    try {
      playerId = normalizeRobloxPlayerId(rawId);
    } catch {
      throw new RobloxLookupError("Roblox returned malformed headshot data.", "MALFORMED");
    }
    if (!requested.has(playerId)) {
      throw new RobloxLookupError("Roblox returned an unexpected headshot.", "MALFORMED");
    }
    const avatarUrl = safeRobloxAvatarUrl(value.imageUrl);
    if (avatarUrl) headshots.set(playerId, avatarUrl);
  }
  return headshots;
}

export async function lookupRobloxIdentities(
  playerIds: string[],
  fetcher: typeof fetch = fetch,
): Promise<{ identities: RobloxIdentity[]; invalidIds: string[] }> {
  const ids = [...new Set(playerIds.map(normalizeRobloxPlayerId))];
  const identities: RobloxIdentity[] = [];
  const invalidIds: string[] = [];

  for (let offset = 0; offset < ids.length; offset += ROBLOX_LOOKUP_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + ROBLOX_LOOKUP_BATCH_SIZE);
    const users = await lookupUsers(batch, fetcher);
    invalidIds.push(...users.invalidIds);

    let headshots = new Map<string, string>();
    try {
      headshots = await lookupHeadshots([...users.identities.keys()], fetcher);
    } catch (error) {
      if (!(error instanceof RobloxLookupError)) throw error;
      console.warn("Roblox headshot enrichment unavailable; username metadata remains usable.", error.message);
    }

    for (const [playerId, robloxUsername] of users.identities) {
      identities.push({
        playerId,
        robloxUsername,
        robloxAvatarUrl: headshots.get(playerId) ?? null,
      });
    }
  }

  return { identities, invalidIds };
}
