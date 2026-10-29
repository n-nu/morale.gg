import assert from "node:assert/strict";
import test from "node:test";
import { createRequire, Module } from "node:module";

import { prisma } from "@/lib/prisma";

test("direct demo action rejects disabled environments and arbitrary identities before database access", async (t) => {
  // Next's navigation entry imports client React outside its bundler. Rejected
  // actions must never redirect; replace only that framework boundary here.
  const require = createRequire(import.meta.url);
  const navigationPath = require.resolve("next/navigation");
  const previousNavigation = require.cache[navigationPath];
  const navigation = new Module(navigationPath);
  navigation.exports = { redirect: () => { throw new Error("Unexpected redirect"); } };
  require.cache[navigationPath] = navigation;
  t.after(() => {
    if (previousNavigation) require.cache[navigationPath] = previousNavigation;
    else delete require.cache[navigationPath];
  });
  const { devSignInAction } = await import("./actions");
  const originalEnvironment = process.env.NODE_ENV;
  const originalFlag = process.env.DEV_SIGN_IN_ENABLED;
  let reads = 0;
  const originalLookup = prisma.user.findUnique;
  Object.defineProperty(prisma.user, "findUnique", { configurable: true, value: async () => {
    reads += 1;
    throw new Error("Unexpected database access");
  } });
  const form = new FormData();
  form.set("userId", "demo-user-root-commander");

  try {
    for (const mode of ["production", "test", "development"]) {
      for (const flag of [undefined, "false", "TRUE", "1", "true"]) {
        if (mode === "development" && flag === "true") continue;
        Object.assign(process.env, { NODE_ENV: mode });
        if (flag === undefined) delete process.env.DEV_SIGN_IN_ENABLED;
        else process.env.DEV_SIGN_IN_ENABLED = flag;
        await assert.rejects(devSignInAction(form), /Development sign-in is disabled/);
      }
    }
    Object.assign(process.env, { NODE_ENV: "development", DEV_SIGN_IN_ENABLED: "true" });
    for (const identity of ["real-account", "demo-user-unknown", "", " demo-user-root-commander"]) {
      form.set("userId", identity);
      await assert.rejects(devSignInAction(form), /Unknown demo identity/);
    }
    form.delete("userId");
    await assert.rejects(devSignInAction(form), /Unknown demo identity/);
    assert.equal(reads, 0);
  } finally {
    Object.defineProperty(prisma.user, "findUnique", { configurable: true, value: originalLookup });
    if (originalEnvironment === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: originalEnvironment });
    if (originalFlag === undefined) delete process.env.DEV_SIGN_IN_ENABLED;
    else process.env.DEV_SIGN_IN_ENABLED = originalFlag;
  }
});
