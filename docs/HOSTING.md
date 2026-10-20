# Hosting

**Published:** https://arc.yieldshield.ai (Arc testnet). Created on 19 October 2026 by the main session on David's instruction.

| Item | Value |
|---|---|
| Vercel project | `yieldshield-arc`, in the HawigUG team (`noc2-6281s-projects`) |
| Production domain | `arc.yieldshield.ai` |
| Git source | `YieldShield/yieldshield-arc`, branch `main` |
| Framework preset | Vite |
| Install command | `npm ci --ignore-scripts` |
| Build command | `npm run build` (`tsc --noEmit`, then `vite build`) |
| Output directory | `dist` |
| Environment variables | None needed in Chronicle mode, which the deployed manifest uses. `PYTH_API_KEY` (server-side only; never `VITE_`-prefixed) matters only if the manifest's oracle becomes `pyth`. It is used by `api/pyth-update.js`, which otherwise answers 503 |
| Deployment protection | Kept on for preview deployments |
| Production deployment | `dpl_FSpcVfnMs4B7hy8jC5tnbKFFxGNh`, built by Vercel from `a39b5a0` on `main`, READY and aliased to `arc.yieldshield.ai` on 19 October 2026. Checked: `/`, `/markets`, `/status`, `/agent.json` and `/llms.txt` return 200; security headers present; the entry bundle contains the factory; `.secrets` paths only return the SPA shell |

**`vercel.json`** is the template's file with two changes:

- **SPA rewrite:** paths outside `/assets/` and `/api/` serve `index.html`.
- **Headers on the agent surface:** `/agent.json`, `/llms.txt` and `/abi/*` get `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=300`.

The template's security headers apply everywhere:

- `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

Hashed `/assets/*` are cached immutably.

**`.vercelignore`** excludes:

- environment files;
- `.secrets` (test signers and signed intents);
- `.local`;
- `node_modules`, Foundry output and test reports.

The site is static apart from the read-only Arc RPC endpoint and optional Pyth price proxy. Public identities come from `config/deployment.json`. A production build cannot enable local-chain mode.

## Checks after each release

- The custom domain serves the current bundle.
- `/status` shows "Arc Testnet (Circle)", chain 5042002, `deployed-and-verified`, and the factory `0x77dd…5e1c`.
- `/markets` shows the EURC, cirBTC and scenario markets with Chronicle price ages.
- `/agent.json` reports `writesEnabled: true`, and `/llms.txt` returns text.
- The security headers are present (`curl -sI https://arc.yieldshield.ai/`).
- At 390 px the page has no horizontal overflow (`npm run test:browser` covers this locally).

After each featured-market replacement (next due before 18 November 2026, 13:33 UTC), rebuild so the site and `/agent.json` carry the new addresses. Record each release here: commit, deployment ID and checks.

## 20 October 2026 — browser RPC repair

Production code release `132e84c`, deployment `dpl_8cD6Dxmcp2X2cq8vGyUHvhi64Akw`,
was READY and serving `arc.yieldshield.ai`. Subsequent documentation/media commits
use the same production Git integration; inspect the latest deployment for its SHA.

The browser first reads `/api/arc-rpc`. This fixed-upstream endpoint allows only
read/simulation methods, rejects signing and broadcasting methods and JSON-RPC batches,
limits requests to 64 KiB and responses to 2 MiB, uses five-second upstream deadlines,
and preserves contract reverts. It never forwards client cookies, credentials or a
client-selected URL. It uses the three official Arc endpoints with Blockdaemon first.
Wallet signatures and broadcasts remain with the user's provider. If the same-origin
endpoint is unavailable, the client attempts the official endpoints directly with
bounded timeouts. Responses are not cached.

Chrome checks on the production domain confirmed successful registry and all three
market reads, fresh reference prices, restored entry capacity and readable protection
terms. `/api/arc-rpc` returned chain `0x4cef52` and rejected `eth_sendRawTransaction`
with HTTP 400. See [the release verification report](E2E_REPORT_2026-10-20.md).
