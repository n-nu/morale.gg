import assert from "node:assert/strict";
import test from "node:test";

import { isWebsiteAdmin } from "./website-admin";

function withAdminConfiguration(value: string | undefined, check: () => void): void {
  const previousValue = process.env.WEBSITE_ADMIN_USER_IDS;

  if (value === undefined) {
    delete process.env.WEBSITE_ADMIN_USER_IDS;
  } else {
    process.env.WEBSITE_ADMIN_USER_IDS = value;
  }

  try {
    check();
  } finally {
    if (previousValue === undefined) {
      delete process.env.WEBSITE_ADMIN_USER_IDS;
    } else {
      process.env.WEBSITE_ADMIN_USER_IDS = previousValue;
    }
  }
}

test("allows a configured authenticated User ID", () => {
  withAdminConfiguration("admin-1, admin-2", () => {
    assert.equal(isWebsiteAdmin({ id: "admin-2" }), true);
  });
});

test("denies an authenticated User ID that is not configured", () => {
  withAdminConfiguration("admin-1", () => {
    assert.equal(isWebsiteAdmin({ id: "user-2" }), false);
  });
});

test("denies missing authentication or User ID", () => {
  withAdminConfiguration("admin-1", () => {
    assert.equal(isWebsiteAdmin(null), false);
    assert.equal(isWebsiteAdmin(undefined), false);
    assert.equal(isWebsiteAdmin({}), false);
    assert.equal(isWebsiteAdmin({ id: "" }), false);
  });
});

test("denies missing or whitespace-only configuration", () => {
  withAdminConfiguration(undefined, () => {
    assert.equal(isWebsiteAdmin({ id: "admin-1" }), false);
  });
  withAdminConfiguration("   ", () => {
    assert.equal(isWebsiteAdmin({ id: "admin-1" }), false);
  });
});

test("denies malformed configuration entries", () => {
  withAdminConfiguration("admin-1,,admin-2", () => {
    assert.equal(isWebsiteAdmin({ id: "admin-1" }), false);
  });
  withAdminConfiguration("admin-1,   ,admin-2", () => {
    assert.equal(isWebsiteAdmin({ id: "admin-1" }), false);
  });
});

test("duplicate configuration entries do not change authorization semantics", () => {
  withAdminConfiguration("admin-1,admin-1", () => {
    assert.equal(isWebsiteAdmin({ id: "admin-1" }), true);
    assert.equal(isWebsiteAdmin({ id: "user-2" }), false);
  });
});

test("does not authorize from a client-provided identity value", () => {
  withAdminConfiguration("admin-1", () => {
    const clientProvidedUserId = "admin-1";
    const serverResolvedUser = { id: "user-2" };

    assert.equal(isWebsiteAdmin(serverResolvedUser), false);
    assert.notEqual(serverResolvedUser.id, clientProvidedUserId);
  });
});
