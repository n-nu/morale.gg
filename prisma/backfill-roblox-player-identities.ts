import { prisma } from "../src/lib/prisma";
import { backfillRobloxIdentityBatch } from "../src/modules/players/server/identity";
import { ROBLOX_LOOKUP_BATCH_SIZE } from "../src/modules/players/server/roblox";
import { normalizeRobloxPlayerId, RobloxLookupError } from "../src/modules/players/server/roblox";

type Options = {
  after: string | null;
  dryRun: boolean;
  limit: number;
};

function parseOptions(args: string[]): Options {
  let after: string | null = null;
  let dryRun = false;
  let limit = 100;

  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
        throw new Error("--limit must be an integer from 1 through 1000.");
      }
    } else if (arg.startsWith("--after=")) {
      after = arg.slice("--after=".length).trim();
      if (!after || after.length > 128) throw new Error("--after must be a non-empty Player ID of at most 128 characters.");
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { after, dryRun, limit };
}

function isRobloxUserId(playerId: string): boolean {
  try {
    normalizeRobloxPlayerId(playerId);
    return true;
  } catch (error) {
    if (error instanceof RobloxLookupError && error.kind === "INVALID_ID") return false;
    throw error;
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const candidates = await prisma.player.findMany({
    where: {
      ...(options.after ? { playerId: { gt: options.after } } : {}),
      OR: [{ robloxSyncedAt: null }, { robloxUsername: null }],
    },
    select: { playerId: true },
    orderBy: { playerId: "asc" },
    take: options.limit,
  });
  const eligibleIds = candidates
    .map(({ playerId }) => playerId)
    .filter(isRobloxUserId);
  const skippedIds = candidates
    .map(({ playerId }) => playerId)
    .filter((playerId) => !isRobloxUserId(playerId));
  const lastScannedId = candidates[candidates.length - 1]?.playerId ?? null;

  if (options.dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      selected: candidates.length,
      eligible: eligibleIds.length,
      skippedNonRobloxIds: skippedIds.length,
      lastScannedId,
    }, null, 2));
    return;
  }

  let updated = 0;
  const invalidIds: string[] = [];
  for (let offset = 0; offset < eligibleIds.length; offset += ROBLOX_LOOKUP_BATCH_SIZE) {
    const batch = eligibleIds.slice(offset, offset + ROBLOX_LOOKUP_BATCH_SIZE);
    const result = await backfillRobloxIdentityBatch(batch);
    updated += result.updated;
    invalidIds.push(...result.invalidIds);
  }

  console.log(JSON.stringify({
    dryRun: false,
    selected: candidates.length,
    eligible: eligibleIds.length,
    skippedNonRobloxIds: skippedIds.length,
    updated,
    invalidIds,
    lastScannedId,
  }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error("Roblox Player identity backfill failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
