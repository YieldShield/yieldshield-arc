/** Serves the app against the disposable local chain prepared by `node scripts/local-journey.mjs --browser-ready`. */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { LOCAL_RPC } from "./arc-config.mjs";
const manifest = JSON.parse(readFileSync(".local/deployment.json"));
if (manifest.chainId !== 31337 || manifest.rpcUrl !== LOCAL_RPC)
  throw new Error("Local-only configuration required");
const child = spawn(
  "npm",
  ["run", "dev", "--", "--port", "5204", "--strictPort"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_LOCAL_DEMO: "true",
      VITE_LOCAL_WALLET: process.argv.includes("--wallet") ? "true" : "false",
      VITE_LOCAL_MANIFEST: JSON.stringify(manifest),
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
