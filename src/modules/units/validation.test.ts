import assert from "node:assert/strict";
import test from "node:test";

import {
  UnitManagementError,
  validateAuthorityLevel,
  validateDiscordInvite,
  validateExternalGroupLink,
  validateGrant,
  validateImageReference,
  validateMedal,
  validateRank,
  validateUnitProfile,
} from "./validation";

test("validates and normalizes Unit profile values", () => {
  assert.deepEqual(
    validateUnitProfile({
      name: "  Test Unit  ",
      description: "  A unit  ",
      imageRef: "/flags/test.png",
      discordInvite: "https://discord.gg/example",
      groupLink: "https://example.com/group",
    }),
    {
      name: "Test Unit",
      description: "A unit",
      imageRef: "/flags/test.png",
      discordInvite: "https://discord.gg/example",
      groupLink: "https://example.com/group",
    },
  );
});

test("accepts only safe references and HTTPS external links", () => {
  assert.equal(validateImageReference("https://cdn.example/flag.png"), "https://cdn.example/flag.png");
  assert.equal(validateImageReference(""), null);
  assert.throws(() => validateImageReference("//evil.example/image.png"), UnitManagementError);
  assert.throws(() => validateImageReference("/flags/../private.png"), UnitManagementError);
  assert.throws(() => validateImageReference("javascript:alert(1)"), UnitManagementError);
  assert.throws(() => validateDiscordInvite("https://example.com/invite"), UnitManagementError);
  assert.throws(() => validateExternalGroupLink("http://example.com/group"), UnitManagementError);
});

test("validates authority levels and permission scopes", () => {
  assert.equal(validateAuthorityLevel("3"), 3);
  assert.throws(() => validateAuthorityLevel("0"), UnitManagementError);
  assert.deepEqual(
    validateGrant({ permission: "MANAGE_ROSTER", scope: "SELF_AND_CHILDREN" }),
    { permission: "MANAGE_ROSTER", scope: "SELF_AND_CHILDREN" },
  );
  assert.deepEqual(
    validateGrant({ permission: "MANAGE_STRUCTURE", scope: "" }),
    { permission: "MANAGE_STRUCTURE", scope: null },
  );
  assert.throws(
    () => validateGrant({ permission: "MANAGE_STRUCTURE", scope: "SELF" }),
    UnitManagementError,
  );
});

test("validates RootUnit catalog fields and ordering", () => {
  assert.equal(validateRank({ name: "  Lieutenant  ", description: "", sortOrder: "4" }).name, "Lieutenant");
  assert.throws(() => validateRank({ name: "", description: "", sortOrder: "x" }), UnitManagementError);
  assert.equal(validateMedal({ name: "Cross", description: "Service", imageRef: "" }).imageRef, null);
});