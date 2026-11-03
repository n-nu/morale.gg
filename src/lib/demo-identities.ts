export const DEMO_ROOT_UNIT_ID = "root-morale-gg";
export const DEMO_ROOT_COMMANDER_USER_ID = "demo-user-root-commander";

export const DEMO_USER_IDS = {
  managerFrench: "demo-user-manager-french",
  managerCoalition: "demo-user-manager-coalition",
  auditFrench: "demo-user-audit-french",
  auditCoalition: "demo-user-audit-coalition",
  limited: "demo-user-limited",
  eventManager: "demo-user-event-manager",
} as const;

export type DemoSignInIdentity = { id: string; role: string };

export const DEMO_SIGN_IN_IDENTITIES: readonly DemoSignInIdentity[] = [
  { id: DEMO_ROOT_COMMANDER_USER_ID, role: "Root Commander: full Unit, roster, Event, and Audit authority; owns every demo Event." },
  { id: DEMO_USER_IDS.managerFrench, role: "Prussian branch Commander: manages the Prussian community subtree." },
  { id: DEMO_USER_IDS.managerCoalition, role: "British Army Commander: manages that affiliate's Unit subtree." },
  { id: DEMO_USER_IDS.auditFrench, role: "Prussian Audit submitter: SUBMIT_AUDITS for Prussian Units only." },
  { id: DEMO_USER_IDS.auditCoalition, role: "British Army Audit submitter: SUBMIT_AUDITS for British Army Units only." },
  { id: DEMO_USER_IDS.limited, role: "Limited roster manager: MANAGE_ROSTER on the Aragón formation only." },
  { id: DEMO_USER_IDS.eventManager, role: "Event-only manager: authorized on the organizer-review Event, no Unit authority." },
];
