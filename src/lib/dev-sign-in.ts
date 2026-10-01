import "server-only";

import { DEMO_SIGN_IN_IDENTITIES } from "@/lib/demo-identities";

// Auth.js database-session cookie name for non-HTTPS origins (local `next dev`).
export const DEV_SESSION_COOKIE = "authjs.session-token";
export const DEV_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type DevSignInEnvironment = {
  NODE_ENV?: string;
  DEV_SIGN_IN_ENABLED?: string;
};

export function isDevSignInEnabled(environment: DevSignInEnvironment = process.env): boolean {
  return environment.NODE_ENV === "development" && environment.DEV_SIGN_IN_ENABLED === "true";
}

export function isDevSignInIdentity(userId: unknown): userId is string {
  return typeof userId === "string" && DEMO_SIGN_IN_IDENTITIES.some(({ id }) => id === userId);
}
