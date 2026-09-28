"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { UnitManagementError } from "../validation";
import {
  createRootMedal,
  createRootRank,
  deleteRootMedal,
  deleteRootRank,
  updateRootMedal,
  updateRootRank,
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
  await runUnitAction(rootUnitId, "Rank added.", () => createRootRank({
    rootUnitId,
    name: value(data, "name"),
    description: value(data, "description"),
    sortOrder: value(data, "sortOrder"),
  }));
}

export async function updateRankAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Rank saved.", () => updateRootRank({
    rootUnitId,
    rankId: value(data, "rankId"),
    name: value(data, "name"),
    description: value(data, "description"),
    sortOrder: value(data, "sortOrder"),
  }));
}

export async function deleteRankAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Rank deleted.", () => deleteRootRank(rootUnitId, value(data, "rankId")));
}

export async function createMedalAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Medal added.", () => createRootMedal({
    rootUnitId,
    name: value(data, "name"),
    description: value(data, "description"),
    imageRef: value(data, "imageRef"),
  }));
}

export async function updateMedalAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Medal saved.", () => updateRootMedal({
    rootUnitId,
    medalId: value(data, "medalId"),
    name: value(data, "name"),
    description: value(data, "description"),
    imageRef: value(data, "imageRef"),
  }));
}

export async function deleteMedalAction(data: FormData): Promise<void> {
  const rootUnitId = value(data, "rootUnitId");
  await runUnitAction(rootUnitId, "Medal deleted.", () => deleteRootMedal(rootUnitId, value(data, "medalId")));
}