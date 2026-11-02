"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { UnitManagementError } from "../validation";
import {
  createRootAward,
  deleteRootAward,
  grantPlayerAward,
  grantUnitAward,
  removePlayerAward,
  removeUnitAward,
  updateRootAward,
} from "./awards";
import {
  createRootRank as createRank,
  deleteRootRank as deleteRank,
  updateRootRank as updateRank,
} from "./catalogs";
import {
  addAuthorizedUser,
  createChildUnit,
  deleteUnit,
  endAuthorizedUserMembership,
  grantPermission,
  moveUnit,
  revokePermissionGrant,
  updateAuthorizedUserLevel,
  updateUnitImage,
  updateUnitProfile,
} from "./workflows";

function managementPath(unitId: string) {
  return `/units/${encodeURIComponent(unitId)}/manage`;
}

type AwardActionResult = {
  rootUnitId: string;
  unitId?: string;
  playerId?: string;
};

async function runUnitAction(
  unitId: string,
  notice: string,
  operation: () => Promise<unknown>,
  successDestination?: string,
): Promise<never> {
  let errorMessage: string | null = null;
  try {
    await operation();
  } catch (error) {
    if (error instanceof UnitManagementError) {
      errorMessage = error.message;
    } else {
      console.error("Unit management action failed", error);
      errorMessage = "Unable to save this change. Please try again.";
    }
  }

  if (errorMessage !== null) {
    redirect(`${managementPath(unitId)}?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/units");
  revalidatePath(`/units/${encodeURIComponent(unitId)}`);
  revalidatePath(managementPath(unitId));
  if (successDestination) redirect(successDestination);
  redirect(`${managementPath(unitId)}?notice=${encodeURIComponent(notice)}`);
}

async function runAwardAction(
  targetPath: string,
  notice: string,
  operation: () => Promise<AwardActionResult>,
): Promise<never> {
  let outcome: AwardActionResult;
  try {
    outcome = await operation();
  } catch (error) {
    const errorMessage = error instanceof UnitManagementError
      ? error.message
      : "Unable to save this Award change. Please try again.";
    if (!(error instanceof UnitManagementError)) {
      console.error("Award management action failed", error);
    }
    redirect(`${targetPath}?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/units");
  revalidatePath("/players");
  revalidatePath(`/units/${encodeURIComponent(outcome.rootUnitId)}`);
  revalidatePath(managementPath(outcome.rootUnitId));
  if (outcome.unitId) {
    revalidatePath(`/units/${encodeURIComponent(outcome.unitId)}`);
    revalidatePath(managementPath(outcome.unitId));
  }
  if (outcome.playerId) {
    revalidatePath(`/players/${encodeURIComponent(outcome.playerId)}`);
  }
  redirect(`${targetPath}?notice=${encodeURIComponent(notice)}`);
}

function value(data: FormData, name: string): string {
  const input = data.get(name);
  return typeof input === "string" ? input : "";
}

export async function updateUnitProfileAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Unit profile saved.", () => updateUnitProfile({
    unitId,
    name: value(data, "name"),
    description: value(data, "description"),
    imageRef: data.has("imageRef") ? value(data, "imageRef") : undefined,
    discordInvite: value(data, "discordInvite"),
    groupLink: value(data, "groupLink"),
  }));
}

export async function updateUnitImageAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Unit image saved.", () => updateUnitImage({
    unitId,
    imageRef: value(data, "imageRef"),
  }));
}

export async function removeUnitImageAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Unit image removed.", () => updateUnitImage({ unitId, imageRef: "" }));
}

export async function addAuthorizedUserAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Authorized User added.", () => addAuthorizedUser({
    unitId,
    email: value(data, "email"),
    authorityLevel: value(data, "authorityLevel"),
  }));
}

export async function updateAuthorizedUserLevelAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Authority level updated.", () => updateAuthorizedUserLevel({
    unitId,
    membershipId: value(data, "membershipId"),
    authorityLevel: value(data, "authorityLevel"),
  }));
}

export async function endAuthorizedUserMembershipAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Access ended. Membership and grant history are preserved.", () => endAuthorizedUserMembership({
    unitId,
    membershipId: value(data, "membershipId"),
  }));
}

export async function grantPermissionAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Permission granted.", () => grantPermission({
    unitId,
    membershipId: value(data, "membershipId"),
    permission: value(data, "permission"),
    scope: value(data, "scope"),
  }));
}

export async function revokePermissionGrantAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Permission revoked. Delegation history is preserved.", () => revokePermissionGrant({
    unitId,
    membershipId: value(data, "membershipId"),
    grantId: value(data, "grantId"),
  }));
}

export async function createChildUnitAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Child Unit created with its initial Commander.", () => createChildUnit({
    parentUnitId: unitId,
    name: value(data, "name"),
    commanderEmail: value(data, "commanderEmail"),
  }));
}

export async function moveUnitAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "Unit moved.", () => moveUnit({
    unitId,
    destinationParentId: value(data, "destinationParentId"),
  }));
}

export async function deleteUnitAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runUnitAction(unitId, "", () => deleteUnit({ unitId }), "/units");
}

export async function createRankAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Rank added.", () => createRank({
    rootUnitId,
    name: value(data, "name"),
    abbreviation: value(data, "abbreviation"),
    imageRef: value(data, "imageRef"),
    description: value(data, "description"),
    sortOrder: value(data, "sortOrder"),
  }));
}

export async function updateRankAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Rank saved.", () => updateRank({
    rootUnitId,
    rankId: value(data, "rankId"),
    name: value(data, "name"),
    abbreviation: data.get("abbreviation") ?? undefined,
    imageRef: data.get("imageRef") ?? undefined,
    description: value(data, "description"),
    sortOrder: value(data, "sortOrder"),
  }));
}

export async function deleteRankAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Rank deleted.", () => deleteRank(rootUnitId, value(data, "rankId")));
}

export async function createAwardAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Award added.", () => createRootAward({
    rootUnitId,
    category: value(data, "category"),
    name: value(data, "name"),
    description: value(data, "description"),
    imageRef: value(data, "imageRef"),
    sortOrder: value(data, "sortOrder"),
  }));
}

export async function updateAwardAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Award saved.", () => updateRootAward({
    rootUnitId,
    awardId: value(data, "awardId"),
    category: value(data, "category"),
    name: value(data, "name"),
    description: value(data, "description"),
    imageRef: value(data, "imageRef"),
    sortOrder: value(data, "sortOrder"),
  }));
}

export async function deleteAwardAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Award deleted.", () => deleteRootAward(rootUnitId, value(data, "awardId")));
}

export async function grantUnitAwardAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runAwardAction(managementPath(unitId), "Unit Award granted.", () => grantUnitAward({
    unitId,
    awardId: value(data, "awardId"),
  }));
}

export async function removeUnitAwardAction(data: FormData): Promise<void> {
  const unitId = value(data, "unitId");
  await runAwardAction(managementPath(unitId), "Unit Award removed.", () => removeUnitAward({
    unitId,
    awardId: value(data, "awardId"),
  }));
}

export async function grantPlayerAwardAction(data: FormData): Promise<void> {
  const playerId = value(data, "playerId");
  await runAwardAction(`/players/${encodeURIComponent(playerId)}`, "Player Award granted.", () => grantPlayerAward({
    playerId,
    awardId: value(data, "awardId"),
  }));
}

export async function removePlayerAwardAction(data: FormData): Promise<void> {
  const playerId = value(data, "playerId");
  await runAwardAction(`/players/${encodeURIComponent(playerId)}`, "Player Award removed.", () => removePlayerAward({
    playerId,
    awardId: value(data, "awardId"),
  }));
}