![YieldShield Arc — EURC and cirBTC exposure. A fixed USDC claim.](.github/assets/banner.png)

# YieldShield Arc

USDC-backed split-risk markets on Circle's Arc testnet. A holder deposits Circle EURC or cirBTC in exchange for a fixed USDC entry claim, which separately funded capital providers reserve at 150%. Providers earn a share of realized gains, and every reserve, exit and fee is enforced on chain. AI agents can read the markets through a static manifest and prepare unsigned transactions for a person's own wallet.

**Site:** https://arc.yieldshield.ai (Arc testnet; see [hosting](docs/HOSTING.md)). **License:** [MIT](LICENSE).

> Arc testnet only and unaudited. Testnet USDC, EURC and cirBTC come from Circle's faucet and have no monetary value. Do not use this code with real funds.

## Status — 19 October 2026

**Deployed on Arc testnet**, with Chronicle reference prices. Runtime bytecode,
configuration and receipts have been checked by the project's verification script;
this is not an audit or explorer source verification.

- **Deployment:** `arc-testnet-2026-10-19T13-33-11Z-5929f2`, 8 transactions from source commit `d48ec26`, signed by the dedicated test signer `0x10D4…f50a`.
- **Verification:** `npm run verify:arc-testnet` passed at 13:33 UTC. It read back:
  - the runtime code of the 3 oracles, the factory and the 3 pools;
  - the USDC, EURC and cirBTC identities;
  - the Chronicle feed wiring and whitelisting;
  - the terms, the creation seeds and every receipt.

  Prices at verification: 1.122456 USDC per EURC, and 82,442.06 USDC per cirBTC.
- **Journey:** a separate wallet then completed an 8-transaction journey on the EURC market ([evidence](docs/evidence/arc-testnet-journey.json)): approve, provide 2 USDC, approve, protect 2 EURC (2.244912 USDC claim), partial asset exit, backing exit, provider notice and provider redemption.
- **Replacement:** the featured markets accept protection until **18 November 2026, 13:33 UTC**, and must be replaced before then ([operations](docs/OPERATIONS.md#featured-markets-and-replacement)).

| Contract | Address |
|---|---|
| Factory | [`0x77dd…5e1c`](https://explorer.testnet.arc.io/address/0x77dd612d711c5c3328c6a0eebcb9719955895e1c) |
| EURC reference market | [`0x583E…626C`](https://explorer.testnet.arc.io/address/0x583EcBBf94C2B978A9f02d32BF629846e9b0626C) |
| cirBTC reference market | [`0x0B62…4837`](https://explorer.testnet.arc.io/address/0x0B62Acf3cF6BAa9501e01cBeE0aB1D3E74654837) |
| EURC scenario market (synthetic price) | [`0xA182…EC5e`](https://explorer.testnet.arc.io/address/0xA18279CfC93F71d808Cb8864D52427B51666EC5e) |
| EURC price adapter (Chronicle) | [`0xbe38…1b0a`](https://explorer.testnet.arc.io/address/0xbe38abae66175ce0a86f529b5d564f43186b1b0a) |
| cirBTC price adapter (Chronicle) | [`0x7a46…49b6`](https://explorer.testnet.arc.io/address/0x7a460202e1f8b94f44ca92dfbc2421e2ae3749b6) |
| Scenario oracle | [`0x23ad…871a`](https://explorer.testnet.arc.io/address/0x23adba2644297979fcb943d1d54fb1f4deeb871a) |
| Deployer (test signer) | [`0x10D4…f50a`](https://explorer.testnet.arc.io/address/0x10D42586A65a98BCa4baFAa1bF5DCB10c820f50a) |

Every address, transaction hash and the source commit are recorded in [config/deployment.json](config/deployment.json).

**Oracle.** Chronicle's Arc testnet feeds were down for about 28 hours: from 18 October 09:08 UTC until 13:20–13:25 UTC on 19 October. The markets fail closed during such outages:

- **Revert while stale:** new protection, asset exits and market creation.
- **Keep working:** backing exits and settlement.

A Pyth pull-oracle path is fully implemented and tested as an alternative (`"oracle": "pyth"`), but it is unused and blocked for two reasons:

- Pyth's Hermes service has required an API key since 26 August 2026.
- Arc testnet's Pyth contract was left out of Pyth's August upgrade, and its last successful update was on 22 September.

**Tests (20 October 2026):** 72 Solidity tests (6 fuzz), 31 JavaScript tests and 12 browser tests pass. See the [latest verification report](docs/E2E_REPORT_2026-10-20.md). Further evidence:

- a full rehearsal on an Anvil with chain ID 5042002 ([evidence](docs/evidence/arc-rehearsal.json));
- a local journey ([evidence](docs/evidence/local-journey.json));
- browser-signed local transactions ([evidence](docs/evidence/e2e/browser-receipts.json));
- a fork check of the Chronicle adapter ([evidence](docs/evidence/chronicle-fork-check.json)).

**What this is not.** The Arc testnet transactions come from the deployer and one scripted test wallet. They are not users or traction. No users, revenue, TVL, audit, partnership or mainnet readiness is claimed. No real wallet extension (MetaMask) has signed yet.

| Token | Role | Decimals | Address (Arc testnet) |
|---|---|---:|---|
| USDC | Provider backing, holder claims and gas | 6 (ERC-20 view; 18 native) | `0x3600000000000000000000000000000000000000` |
| EURC | Protected asset (EUR exposure against USDC) | 6 | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| cirBTC | Protected asset (BTC exposure against USDC) | 8 | `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` |

| Market | Price source | Notes |
|---|---|---|
| EURC reference | Chronicle EURC/USD ÷ USDC/USD (push feeds) | Values older than 3 hours are rejected |
| cirBTC reference | Chronicle CIRBTC/USDC (push feed) | Values older than 3 hours are rejected |
| EURC scenario lab | Synthetic 1.10 → 1.20 → 1.00 USDC cycle, changing every 120 s | Labelled synthetic everywhere; never a fallback |

## How it works

- **Protect.** Deposit EURC or cirBTC. The entry claim is `amount × price ÷ 10^decimals` USDC, fixed at entry. It is admitted only while providers' USDC covers 150% of all open claims.
- **Exit.** After a 60-second delay, choose either exit, for all or part of the position:
  - keep the asset, paying 12% of any realized gain: 10% to providers, 1% to the market creator and 1% to the protocol;
  - surrender the asset for its fixed USDC claim.
- **Mature.** Each epoch lasts at most 30 days. After maturity, anyone can settle the remaining positions: each owner gets a segregated USDC credit to claim, and providers take the asset.
- **Provide.** Deposit USDC for provider shares. Deposits and redemptions are frozen while any protection is open, which prevents providers from redeeming at a NAV that hides an unrealized shortfall. Redemption needs a 120-second notice and returns a basket of USDC and surrendered assets. Gain fees are claimed separately.
- **Prices.** The deployed adapters read Chronicle push feeds. If the manifest is switched to the Pyth alternative, every price-reading action is preceded by a Pyth price update in its own transaction, in the app, the scripts and the agent recipes.
- **Stale prices fail closed.**
  - **Revert while stale:** new protection, asset exits and market creation.
  - **Keep working:** backing exits and settlement, which need no price.

**Arc specifics.** USDC is Arc's gas token. Its native balance (18 decimals) and its ERC-20 interface (6 decimals) are one balance. The contracts use only the ERC-20 interface and their own counters; nothing is payable. The interface keeps 0.1 USDC unspent for fees. USDC payouts are either the caller's own exit or a pull claim, so a blocklisted address cannot block anyone else's settlement. See [research and scope](docs/RESEARCH_AND_SCOPE.md).

## For agents

`/agent.json`, `/llms.txt` and `/abi/*.json` are generated at build time from `config/deployment.json`. They describe:

- the network, assets, markets and terms;
- oracle freshness rules;
- the safety checks to run before any transaction;
- recipes for unsigned transactions (protect, both exits, settlement, provide, redeem, claim).

Agents never sign or hold keys, and in Chronicle mode they never send native value. In Pyth mode, the manifest adds a price-update step, and the site's `/api/pyth-update` proxy keeps the Hermes key server-side. Proposed grant work would expose these as YieldShield MCP tools; no grant has been awarded. See the [submitted Circle application](docs/grants/APPLICATION_ENTERED_2026-10-20.md).

## Run and verify

Requirements: Node.js 22+ and [Foundry](https://getfoundry.sh).

```sh
npm ci --ignore-scripts
npm run dev                  # http://127.0.0.1:5201, reading config/deployment.json
npm run build                # static output in dist/, including agent.json and llms.txt
npm test                     # JavaScript unit tests
npm run test:contracts       # Solidity tests, including fuzz cases
npm run test:browser         # public routes, mobile, wallet, agent files
npm run rehearse:arc-testnet # full deploy + verify + journey on a chain-5042002 Anvil (port 8567)
npm run check:chronicle-fork # the (optional) Chronicle adapter against the real Arc testnet feeds, on a local fork
```

Local transactions only:

```sh
anvil --host 127.0.0.1 --port 8567 --silent
node scripts/local-journey.mjs --browser-ready
node scripts/local-web.mjs   # local-chain preview at 127.0.0.1:5204
SHIELD_LOCAL_E2E=1 npm run test:browser -- tests/browser/local-lifecycle.spec.ts
```

Deploying (`npm run deploy:arc-testnet`, a read-only preflight until `--broadcast`), verification (`npm run verify:arc-testnet`) and the second-wallet journey (`npm run journey:arc-testnet`) are described in [operations](docs/OPERATIONS.md). They need dedicated test wallets (and, in Pyth mode, a Pyth API key) in the ignored `.secrets/` directory. Never use a key that holds real funds.

Further reading:

- [operations](docs/OPERATIONS.md)
- [security](docs/SECURITY.md)
- [end-to-end evidence](docs/E2E_REPORT.md)
- [feature parity](docs/FEATURE_PARITY.md)
- [hosting](docs/HOSTING.md)
- [provenance](docs/PROVENANCE.md)

## Contributing and security

Issues and pull requests are welcome. Before proposing changes, run `npm test`, `npm run test:contracts` and `npm run build`. Report suspected vulnerabilities privately, as described in [SECURITY](docs/SECURITY.md), not in public issues.

## License

[MIT](LICENSE), copyright Hawig Ventures UG (haftungsbeschränkt), which develops YieldShield. Derived from the MIT `yieldshield-avalanche` template by the same owner ([provenance](docs/PROVENANCE.md)). OpenZeppelin, React, React Router, viem and Vite keep their upstream licenses.
