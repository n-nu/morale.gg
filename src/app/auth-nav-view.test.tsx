import assert from "node:assert/strict";
import test from "node:test";
import type { ReactElement, ReactNode } from "react";

import { AuthNavView, hasAuthenticatedUser } from "./auth-nav-view";

function isElement(node: unknown): node is ReactElement<{ children?: ReactNode }> {
  return typeof node === "object" && node !== null && "props" in node;
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (isElement(node)) return textOf(node.props.children);
  return "";
}

function findByType(node: ReactNode, type: string): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type);
      if (found) return found;
    }
    return null;
  }
  if (!isElement(node)) return null;
  if (node.type === type) return node;
  return findByType(node.props.children, type);
}

const neverCalled = async () => {
  throw new Error("sign-out action must not run during rendering");
};

test("signed-out navigation shows Sign in and not Sign out", () => {
  const tree = AuthNavView({ signedIn: false, signOutAction: neverCalled });

  assert.match(textOf(tree), /Sign in/);
  assert.doesNotMatch(textOf(tree), /Sign out/);
  assert.equal(findByType(tree, "form"), null);
});

test("signed-in navigation shows Sign out and not Sign in", () => {
  const tree = AuthNavView({ signedIn: true, signOutAction: neverCalled });

  assert.match(textOf(tree), /Sign out/);
  assert.doesNotMatch(textOf(tree), /Sign in/);
  assert.equal(findByType(tree, "a"), null);
});

test("signed-out navigation offers demo sign-in only when a dev link is supplied", () => {
  const withoutDev = AuthNavView({ signedIn: false, signOutAction: neverCalled });
  const withDev = AuthNavView({ signedIn: false, signOutAction: neverCalled, devSignInHref: "/dev/sign-in" });
  const signedInWithDev = AuthNavView({ signedIn: true, signOutAction: neverCalled, devSignInHref: "/dev/sign-in" });

  assert.doesNotMatch(textOf(withoutDev), /Demo sign-in/);
  assert.match(textOf(withDev), /Demo sign-in/);
  assert.match(textOf(withDev), /Sign in/);
  assert.doesNotMatch(textOf(signedInWithDev), /Demo sign-in/);
});

test("the sign-out control submits the supplied session-ending action", () => {
  const tree = AuthNavView({ signedIn: true, signOutAction: neverCalled });
  const form = findByType(tree, "form");

  assert.ok(form);
  assert.equal((form.props as { action?: unknown }).action, neverCalled);
});

test("authentication state is derived only from a server-resolved session user", () => {
  assert.equal(hasAuthenticatedUser(null), false);
  assert.equal(hasAuthenticatedUser(undefined), false);
  assert.equal(hasAuthenticatedUser({}), false);
  assert.equal(hasAuthenticatedUser({ user: null }), false);
  assert.equal(hasAuthenticatedUser({ user: { id: "user-1" } }), true);
});
