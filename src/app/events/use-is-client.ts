"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Hydration-safe "are we on the client yet" flag: false during server render
 * and the hydration pass, true afterwards. Used to swap server-rendered UTC
 * times for the visitor's local time without effect-driven re-renders.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
