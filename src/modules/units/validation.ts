import type { Permission, PermissionScope } from "@prisma/client";

export class UnitManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitManagementError";
  }
}

const permissions = new Set<Permission>([
  "MANAGE_UNIT",
  "MANAGE_STRUCTURE",
  "MANAGE_ROSTER",
  "REQUEST_EVENT_PARTICIPATION",
  "MANAGE_EVENTS",
  "SUBMIT_AUDITS",
  "MANAGE_AUTHORIZED_USERS",
]);

const scopes = new Set<PermissionScope>([
  "SELF",
  "SELF_AND_CHILDREN",
  "SELF_AND_DESCENDANTS",
]);

export function requiredText(
  value: unknown,
  label: string,
  maximum = 128,
): string {
  if (typeof value !== "string") {
    throw new UnitManagementError(`${label} is required.`);
  }

  const text = value.trim();
  if (
    text.length === 0 ||
    text.length > maximum ||
    /[\u0000-\u001f\u007f]/u.test(text)
  ) {
    throw new UnitManagementError(
      `${label} must contain 1 to ${maximum} characters without control characters.`,
    );
  }
  return text;
}

export function optionalText(
  value: unknown,
  label: string,
  maximum = 2048,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new UnitManagementError(`${label} must be text.`);
  }

  const text = value.trim();
  if (text === "") return null;
  if (text.length > maximum || /[\u0000-\u001f\u007f]/u.test(text)) {
    throw new UnitManagementError(
      `${label} must be at most ${maximum} characters without control characters.`,
    );
  }
  return text;
}

function httpsUrl(value: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UnitManagementError(`${label} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") {
    throw new UnitManagementError(`${label} must be a valid HTTPS URL.`);
  }
  return url;
}

export function validateImageReference(value: unknown): string | null {
  const reference = optionalText(value, "Image reference");
  if (reference === null) return null;

  if (reference.startsWith("/")) {
    if (reference.startsWith("//") || reference.includes("\\") || reference.split("/").includes("..")) {
      throw new UnitManagementError("Image reference must be a safe site path or HTTPS URL.");
    }
    return reference;
  }

  httpsUrl(reference, "Image reference");
  return reference;
}

export function validateDiscordInvite(value: unknown): string | null {
  const invite = optionalText(value, "Discord invite", 500);
  if (invite === null) return null;
  const url = httpsUrl(invite, "Discord invite");
  const host = url.hostname.toLowerCase();
  if (
    host !== "discord.gg" &&
    host !== "www.discord.gg" &&
    host !== "discord.com" &&
    host !== "www.discord.com"
  ) {
    throw new UnitManagementError("Discord invite must use discord.gg or discord.com.");
  }
  if ((host.endsWith("discord.com")) && !url.pathname.startsWith("/invite/")) {
    throw new UnitManagementError("Discord URL must be an invite link.");
  }
  return invite;
}

export function validateExternalGroupLink(value: unknown): string | null {
  const link = optionalText(value, "External group link");
  if (link === null) return null;
  httpsUrl(link, "External group link");
  return link;
}

export function validateUnitProfile(input: {
  name: unknown;
  description: unknown;
  imageRef: unknown;
  discordInvite: unknown;
  groupLink: unknown;
}) {
  return {
    name: requiredText(input.name, "Unit name", 100),
    description: optionalText(input.description, "Description", 2000),
    imageRef: validateImageReference(input.imageRef),
    discordInvite: validateDiscordInvite(input.discordInvite),
    groupLink: validateExternalGroupLink(input.groupLink),
  };
}

export function validateAuthorityLevel(value: unknown): number {
  const level = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(level) || level < 1 || level > 100000) {
    throw new UnitManagementError("Authority level must be a whole number from 1 to 100000.");
  }
  return level;
}

export function validateGrant(input: { permission: unknown; scope: unknown }): {
  permission: Permission;
  scope: PermissionScope | null;
} {
  if (typeof input.permission !== "string" || !permissions.has(input.permission as Permission)) {
    throw new UnitManagementError("Select a valid permission.");
  }
  const permission = input.permission as Permission;
  if (permission === "MANAGE_STRUCTURE") {
    if (input.scope !== "") {
      throw new UnitManagementError("Structural permission does not use an ordinary scope.");
    }
    return { permission, scope: null };
  }
  if (typeof input.scope !== "string" || !scopes.has(input.scope as PermissionScope)) {
    throw new UnitManagementError("Select a valid permission scope.");
  }
  return { permission, scope: input.scope as PermissionScope };
}

export function validateRank(input: {
  name: unknown;
  description: unknown;
  sortOrder: unknown;
}) {
  const sortOrder = typeof input.sortOrder === "number" ? input.sortOrder : Number(input.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < -100000 || sortOrder > 100000) {
    throw new UnitManagementError("Rank order must be a whole number from -100000 to 100000.");
  }
  return {
    name: requiredText(input.name, "Rank name", 100),
    description: optionalText(input.description, "Description", 2000),
    sortOrder,
  };
}

export function validateMedal(input: {
  name: unknown;
  description: unknown;
  imageRef: unknown;
}) {
  return {
    name: requiredText(input.name, "Medal name", 100),
    description: optionalText(input.description, "Description", 2000),
    imageRef: validateImageReference(input.imageRef),
  };
}