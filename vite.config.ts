import { existsSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { buildAgentManifest, buildLlmsTxt } from "./src/agent-manifest.mjs";

const ABIS = [
  "ShieldPool",
  "ShieldFactory",
  "ShieldChronicleOracle",
  "IERC20Metadata",
];

/**
 * Serves and emits the static agent surface: /agent.json, /llms.txt and /abi/*.json, generated from the
 * deployment manifest the site is built with. Production builds always read config/deployment.json; only the
 * development server in explicit local mode describes the disposable local chain instead.
 */
function agentManifest(): Plugin {
  const files = (local: boolean): Record<string, string> => {
    const deployment =
      local && process.env.VITE_LOCAL_MANIFEST
        ? JSON.parse(process.env.VITE_LOCAL_MANIFEST)
        : JSON.parse(readFileSync("config/deployment.json", "utf8"));
    const manifest = buildAgentManifest(deployment);
    return {
      "agent.json": JSON.stringify(manifest, null, 2) + "\n",
      "llms.txt": buildLlmsTxt(manifest),
      ...Object.fromEntries(
        ABIS.map((name) => [
          `abi/${name}.json`,
          readFileSync(`config/abi/${name}.json`, "utf8"),
        ]),
      ),
    };
  };
  return {
    name: "yieldshield-agent-manifest",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0].replace(/^\//, "");
        const served = files(process.env.VITE_LOCAL_DEMO === "true");
        if (!(path in served)) return next();
        res.setHeader(
          "Content-Type",
          path.endsWith(".txt")
            ? "text/plain; charset=utf-8"
            : "application/json; charset=utf-8",
        );
        res.end(served[path]);
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(files(false)))
        this.emitFile({ type: "asset", fileName, source });
    },
  };
}

/** Development twin of api/pyth-update.js: same handler, key from PYTH_API_KEY or the ignored .secrets/pyth-api-key. */
function pythProxy(): Plugin {
  return {
    name: "yieldshield-pyth-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.pathname !== "/api/pyth-update") return next();
        const { pythUpdate } = await import("./api/pyth-update.js");
        const key =
          process.env.PYTH_API_KEY ??
          (existsSync(".secrets/pyth-api-key")
            ? readFileSync(".secrets/pyth-api-key", "utf8").trim()
            : undefined);
        const { status, body } = await pythUpdate(
          url.searchParams.get("ids"),
          key,
        );
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(body));
      });
    },
  };
}

function arcRpcProxy(): Plugin {
  return {
    name: "yieldshield-arc-rpc",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if ((req.url ?? "").split("?")[0] !== "/api/arc-rpc") return next();
        const { default: handler } = await import("./api/arc-rpc.js");
        await handler(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), agentManifest(), pythProxy(), arcRpcProxy()],
  build: {
    rolldownOptions: {
      output: {
        // Vendor libraries change rarely; separate chunks stay cached across app releases.
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|cookie|set-cookie-parser)[\\/]/,
            },
            {
              name: "viem",
              test: /node_modules[\\/](viem|ox|abitype|@noble|@scure|@adraffy)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
