import { runDemoReset } from "./demo-reset";

runDemoReset().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
