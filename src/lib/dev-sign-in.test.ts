import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_ROOT_COMMANDER_USER_ID, DEMO_USER_IDS } from "./demo-identities";
import { isDevSignInEnabled, isDevSignInIdentity } from "./dev-sign-in";

test("dev sign-in requires both development mode and the explicit opt-in flag", () => {
  assert.equal(isDevSignInEnabled({ NODE_ENV: "development", DEV_SIGN_IN_ENABLED: "true" }), true);
  assert.equal(isDevSignInEnabled({ NODE_ENV: "production", DEV_SIGN_IN_ENABLED: "true" }), false);
  assert.equal(isDevSignInEnabled({ NODE_ENV: "test", DEV_SIGN_IN_ENABLED: "true" }), false);
  assert.equal(isDevSignInEnabled({ DEV_SIGN_IN_ENABLED: "true" }), false);
  assert.equal(isDevSignInEnabled({ NODE_ENV: "development" }), false);
  assert.equal(isDevSignInEnabled({ NODE_ENV: "development", DEV_SIGN_IN_ENABLED: "1" }), false);
  assert.equal(isDevSignInEnabled({ NODE_ENV: "development", DEV_SIGN_IN_ENABLED: "TRUE" }), false);
});

test("dev sign-in accepts only the fixed seeded demo identities", () => {
  assert.equal(isDevSignInIdentity(DEMO_ROOT_COMMANDER_USER_ID), true);
  for (const id of Object.values(DEMO_USER_IDS)) assert.equal(isDevSignInIdentity(id), true);

  assert.equal(isDevSignInIdentity("demo-user-unknown"), false);
  assert.equal(isDevSignInIdentity("cm0realgoogleuser000000000"), false);
  assert.equal(isDevSignInIdentity(""), false);
  assert.equal(isDevSignInIdentity(null), false);
  assert.equal(isDevSignInIdentity(undefined), false);
  assert.equal(isDevSignInIdentity(["demo-user-limited"]), false);
});
