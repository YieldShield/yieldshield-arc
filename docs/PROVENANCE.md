# Provenance

YieldShield Arc is derived from the MIT `yieldshield-avalanche` template ("YieldShield Alpine", Avalanche Fuji) at commit `dfb39a8d4a097f94efe3eb21e3bbc1a6b96f0dc0`, which has the same owner. The first commit of this repository imports that template's tracked files unchanged, using `git archive`. **No keys or deployment registries were copied.** None of the template's `.secrets/`, `.env*`, `.vercel/` or `.local/` directories, `node_modules`, build output or test results were imported. Its Fuji deployment registry and evidence were replaced in later commits.

## What changed for Arc

**Kept from the template:**
- the pool's economic rules;
- the factory's slot limits;
- the signed-intent deploy and verify machinery;
- the review and race guards in the app.

**Arc-specific work in this repository:**
- USDC backing through the ERC-20 interface of Arc's native gas token;
- no native-asset path;
- support for protected assets with 6 to 18 decimals;
- Circle EURC and cirBTC markets;
- the Pyth pull-oracle adapter (vendored minimal interface) and the two-step update flow in the scripts, app and agent manifest;
- the Chronicle adapter with SelfKisser whitelisting and a USDC/USD quote;
- the Chainlink adapter's quote feed, for the mainnet path;
- Arc fee floors, the rehearsal and the fork check;
- the agent manifest;
- all documentation and evidence.

The demo dollar, wrapper, demo vaults, backing vault and exchange were removed. [FEATURE_PARITY.md](FEATURE_PARITY.md) lists every difference.

The split-risk idea comes from YieldShield's existing product design. This is an independent implementation for Arc, and it does not claim that the idea is new.

## Deployment checks and source verification

The manifest state `deployed-and-verified` is a machine-readable deployment gate. It means
`npm run verify:arc-testnet` checked deployed runtime bytecode against the local Solidity
artifacts (masking immutable slots), asset identities, contract wiring, oracle
configuration, market terms and transaction receipts. The latest check is recorded
in `config/deployment.json`.

This is **not** an independent security audit or explorer-published source verification.
As of 20 October 2026, the contract source is available in this public repository but
has not been published as verified source on the Arc explorer. Application copy and
the agent manifest must distinguish these claims.

## License

The code is MIT-licensed, copyright Hawig Ventures UG (haftungsbeschränkt), which develops YieldShield. React, React Router, Vite, viem, Playwright and OpenZeppelin remain subject to their upstream licenses.

## AI assistance

The contracts, app, scripts and documents were developed with substantial AI assistance (Claude). AI agents are development tools, not team members. The founders review the work and validate claims, and will arrange independent review before any real-asset launch.
