import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // repo already has AGENT_WORKFLOW.md governance; don't let Next.js generate its own
  agentRules: false,
};

export default nextConfig;
