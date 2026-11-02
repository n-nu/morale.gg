import assert from "node:assert/strict";
import test from "node:test";

import {
  UnitManagementError,
  validateAuthorityLevel,
  validateDiscordInvite,
  validateExternalGroupLink,
  validateAward,
  validateGrant,
  validateImageReference,
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
    validateGrant({ permission: "MANAGE_AWARDS", scope: "SELF_AND_DESCENDANTS" }),
    { permission: "MANAGE_AWARDS", scope: "SELF_AND_DESCENDANTS" },
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
  assert.deepEqual(
    validateAward({
      category: "PLAYER",
      name: "Cross",
      description: "Service",
      imageRef: "",
      sortOrder: "3",
    }),
    {
      category: "PLAYER",
      name: "Cross",
      description: "Service",
      imageRef: null,
      sortOrder: 3,
    },
  );
  assert.throws(() => validateAward({
    category: "BATTLE",
    name: "Cross",
    description: "",
    imageRef: "",
    sortOrder: "0",
  }), /category/);
  assert.throws(() => validateAward({
    category: "UNIT",
    name: "Cross",
    description: "",
    imageRef: "",
    sortOrder: "x",
  }), /order/);
});

test("rank short codes and images are optional, normalized and validated", () => {
  const input = { name: "Private", description: "", sortOrder: 10 };
  assert.deepEqual(validateRank({ ...input, abbreviation: " PVT ", imageRef: " /ranks/private.png " }), {
    name: "Private",
    abbreviation: "PVT",
    imageRef: "/ranks/private.png",
    description: null,
    sortOrder: 10,
  });
  assert.equal(validateRank(input).abbreviation, null);
  assert.equal(validateRank(input).imageRef, null);
  assert.throws(() => validateRank({ ...input, abbreviation: "x".repeat(21) }), /Rank short code/);
  assert.throws(() => validateRank({ ...input, imageRef: "http://example.test/rank.png" }), /HTTPS/);
  assert.throws(() => validateRank({ ...input, imageRef: "//example.test/rank.png" }), /safe site path/);
});