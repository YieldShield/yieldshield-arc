# Hosting

**Status on 19 October 2026: prepared only. No Vercel project, domain or public deployment has been created.**

## Plan

| Item | Value |
|---|---|
| Vercel project | `yieldshield-arc`, in the existing YieldShield team |
| Production domain | `arc.yieldshield.ai` |
| Git source | `YieldShield/yieldshield-arc`, branch `main`. The repository is private for now; Vercel's GitHub integration can build from it |
| Framework preset | Vite |
| Install command | `npm ci --ignore-scripts` |
| Build command | `npm run build`, which runs `tsc --noEmit` and then `vite build` |
| Output directory | `dist` |
| Environment variables | **`PYTH_API_KEY`**: server-side only (Production, plus Preview if previews should transact), used by `api/pyth-update.js`. Never prefix it with `VITE_`, which would bundle it into browser code. Public identities live in `config/deployment.json`, and the production build cannot enable local-chain mode |
| Serverless function | `api/pyth-update.js` (Node runtime): a same-origin proxy to Pyth Hermes for this deployment's three feed IDs only. Without `PYTH_API_KEY` it answers 503, and the app explains that price updates are not configured |
| Deployment protection | Keep it on for preview deployments, as on the other YieldShield chain sites |

`vercel.json` is the template's file with two changes:

- **SPA rewrite:** every path outside `/assets/` and `/api/` serves `index.html`. `/api/` was added so the price proxy is reachable. Static files, including `/agent.json`, `/llms.txt`, `/abi/*.json` and the icons, are served first.
- **Security headers on every path:**
  - `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- **Assets:** `/assets/*` gets `Cache-Control: public, max-age=31536000, immutable`.
- **Added for the agent surface:** `/agent.json`, `/llms.txt` and `/abi/*` get `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=300`, so agents and other sites can fetch them.

`.vercelignore` excludes the following from uploads:
- environment files;
- `.secrets` (test signers and signed intents);
- `.local` (local manifests and rehearsal signers);
- `node_modules`, Foundry output, test results and Playwright reports.

## Steps for David (not done by automation)

1. In the YieldShield Vercel team, create the project `yieldshield-arc` from `YieldShield/yieldshield-arc` with the settings above. Add `PYTH_API_KEY` as a sensitive, server-side environment variable.
2. Add the domain `arc.yieldshield.ai` and set the DNS record Vercel asks for.
3. Deploy `main`, then check:
   - the custom domain serves the current bundle;
   - `/status` shows "Arc Testnet (Circle)", chain 5042002 and the manifest state;
   - `/agent.json` returns JSON with `"schema": "yieldshield-arc/agent-manifest/v1"`, and `/llms.txt` returns text;
   - `/api/pyth-update?ids=<the three feed IDs, comma-separated>` returns `binary` and `parsed`, not 503. A request for any other ID returns 400;
   - the security headers are present (`curl -sI https://arc.yieldshield.ai/`);
   - at 390 px the page has no horizontal overflow (`npm run test:browser` covers this locally).
4. While the manifest says `awaiting-pyth-api-key` (or any other pre-deployment state), the site shows the pending state and keeps writes disabled. That is safe to publish. After `npm run verify:arc-testnet` marks the deployment verified, rebuild so the site and `/agent.json` carry the deployed addresses.

Each later release should be recorded here: commit, Vercel deployment ID, the checks run and their results.
