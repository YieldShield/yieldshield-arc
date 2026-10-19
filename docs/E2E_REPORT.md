# End-to-end verification

Date: 19 October 2026. This report separates what ran on which network. **No Arc testnet transaction has been sent yet.** The deployer is waiting for testnet USDC ([operations](OPERATIONS.md)).

| Run | Network | Result | Evidence |
|---|---|---|---|
| Real Arc testnet preflight | Arc testnet (chain 5042002), read-only | Refused to broadcast, correctly: the new signer holds 0 USDC, and all three Chronicle feeds were about 22 hours old against the 3-hour limit | [arc-testnet-preflight.json](evidence/arc-testnet-preflight.json) |
| Chronicle adapter on a fork | Local Anvil fork of Arc testnet; adapters deployed on the fork only | Each adapter whitelisted itself through the real SelfKisser and read 1.123482 USDC/EURC and 81,827.183708 USDC/cirBTC from the real feeds (with a 1-day limit). With the production 3-hour limit, both reverted `INVALID_OR_STALE_PRICE` | [chronicle-fork-check.json](evidence/chronicle-fork-check.json) |
| Deploy + verify rehearsal | Local Anvil with chain ID 5042002 and a 20 gwei base fee; stand-ins at the canonical Arc addresses | The real scripts ran preflight, broadcast (8 transactions, 13.28M gas), verification (all checks) and a rerun that sent nothing. The disposable signer held one faucet claim (20 USDC) and kept 5 USDC after seeds | [arc-rehearsal.json](evidence/arc-rehearsal.json) |
| Second-wallet journey (rehearsal) | Same Anvil | `testnet-journey.mjs` from a second disposable wallet completed 8 transactions: approve, provide 2 USDC, approve, protect 2 EURC (2.246964 USDC claim), partial asset exit, backing exit, notice, redemption | [arc-rehearsal.json](evidence/arc-rehearsal.json) (`journeyFromSecondWallet`) |
| Native lifecycle | Local Anvil, chain 31337, with stand-ins | 56 transactions (24 setup) | [local-journey.json](evidence/local-journey.json) |
| Browser lifecycle | Local Anvil, chain 31337 | 6 browser-signed transactions with successful receipts, through the real app and an injected test provider | [browser-receipts.json](evidence/e2e/browser-receipts.json) |

The native lifecycle included:
- EURC protection at 1.10 USDC: 50 EURC opened a 55.000000 USDC claim;
- a +20% move and a partial asset exit charging 0.499998 EURC of gain fees;
- a provider reward claim;
- an ownership transfer, followed by the new owner's backing exit;
- provider notice and redemption;
- a creator/protocol fee claim;
- cirBTC protection (8 decimals). While its feed was stale, the asset exit reverted and the backing exit still paid;
- permissionless maturity settlement and the owner's separate claim.

## Browser checks

**Public routes** (9 tests, no chain):
- every route renders at 390 px without horizontal overflow;
- the undeployed state disables writes;
- missing-wallet feedback is shown;
- account and network changes reset the session;
- the app renders when browser storage is denied;
- a funding detour to Circle's faucet keeps the market, amount and role;
- unknown and mismatched pools are rejected;
- the scenario market is labelled synthetic;
- `/agent.json`, `/llms.txt` and the ABIs are served and match the manifest;
- the status and asset pages name Arc testnet, the USDC decimals and "no monetary value", and never mention the template chain.

**Local chain** (3 tests, `SHIELD_LOCAL_E2E=1`):
1. Provide 50 USDC → protect 10 EURC (11 USDC claim) → partial asset exit after a price rise → claim provider fees → check Activity → disconnect.
2. A stale cirBTC feed blocks review, with a plain-language explanation.
3. An in-flight quote cannot revive after the market selection changes.

The capture script asserts the contract state after the browser run:
- the browser wallet owns position #1, with 5 EURC and a 5.5 USDC claim remaining;
- its provider shares are present;
- its fees were claimed;
- only one protection was sent.

**Not covered.** No real wallet extension (MetaMask, Rabby) approval screen has been exercised. All signed runs used test providers or scripted keys. [Screenshots](evidence/screens/) show the local-chain app with live reads.

## Still to do on Arc testnet

1. Fund the deployer from Circle's faucet, then deploy and verify while the Chronicle feeds are fresh.
2. Fund the journey wallet with USDC and EURC and run `npm run journey:arc-testnet -- --broadcast`.
3. Run at least one real MetaMask transaction on the hosted site.

Until these are done, nothing here is Arc testnet activity. Even afterwards, scripted wallets are not users or traction.

This is functional verification, not a security audit.
