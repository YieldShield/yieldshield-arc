# End-to-end verification

Date: 19 October 2026, updated in the afternoon after the switch from Chronicle to Pyth. This report separates what ran on which network.

**No Arc testnet transaction has been sent yet.** Both test wallets are funded. The deployment is waiting for access to Pyth's Hermes price updates, which have needed an API key since 26 August 2026 ([operations](OPERATIONS.md)).

| Run | Network | Result | Evidence |
|---|---|---|---|
| Real Arc testnet preflight, Pyth (afternoon) | Arc testnet (chain 5042002), read-only | Refused to broadcast, correctly. The deployer holds 20 USDC (enough: the plan needs about 15.96), but no Pyth API key is configured, so no update could be fetched or simulated | [arc-testnet-preflight.json](evidence/arc-testnet-preflight.json) |
| Real Arc testnet preflight, Chronicle (morning) | Arc testnet, read-only | Refused to broadcast: the signer was unfunded, and all three Chronicle feeds were about 22 hours old | same file |
| Chronicle adapter on a fork | Local Anvil fork of Arc testnet; adapters deployed on the fork only | Each adapter whitelisted itself through the real SelfKisser and read 1.123482 USDC/EURC and 81,827.183708 USDC/cirBTC (with a 1-day limit). With the 3-hour limit, both reverted `INVALID_OR_STALE_PRICE` | [chronicle-fork-check.json](evidence/chronicle-fork-check.json) |
| Deploy + verify rehearsal (Pyth) | Local Anvil with chain ID 5042002 and a 20 gwei base fee; stand-ins at the canonical Arc addresses, with MockPyth at the real Pyth address | The real scripts ran: preflight (including the update simulation), broadcast, verification and a rerun that sent nothing. The broadcast was 10 transactions, including 2 Pyth updates: 13.34M gas used, 17.52M signed with the 30% margin. The disposable signer held 20 USDC and kept 5 USDC after seeds | [arc-rehearsal.json](evidence/arc-rehearsal.json) |
| Second-wallet journey (rehearsal) | Same Anvil | `testnet-journey.mjs` from a second disposable wallet completed 11 transactions: approve, **update**, provide 2 USDC, approve, **update**, protect 2 EURC (2.330620 USDC claim at 1.16531), **update**, partial asset exit, backing exit, notice, redemption | [arc-rehearsal.json](evidence/arc-rehearsal.json) (`journeyFromSecondWallet`) |
| Native lifecycle | Local Anvil, chain 31337, with stand-ins and MockPyth | 52 transactions (24 setup), with an update before each price-reading step | [local-journey.json](evidence/local-journey.json) |
| Browser lifecycle | Local Anvil, chain 31337 | 9 browser-signed transactions with successful receipts, through the real app and an injected test provider. They include 2 Pyth updates, each immediately followed by its protection or asset exit | [browser-receipts.json](evidence/e2e/browser-receipts.json) |

The native lifecycle included:
- EURC protection at 1.10 USDC: 50 EURC opened a 55.000000 USDC claim;
- a +20% move and a partial asset exit charging 0.499998 EURC of gain fees;
- a provider reward claim;
- an ownership transfer, followed by the new owner's backing exit;
- provider notice and redemption;
- a creator/protocol fee claim;
- cirBTC protection (8 decimals). Once the price was older than 120 s with no update, the asset exit reverted `INVALID_OR_STALE_PRICE` while the backing exit still paid;
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
- `/agent.json`, `/llms.txt` (with the push-first Pyth section) and the ABIs are served and match the manifest;
- the price proxy answers without leaking anything (503 without a key);
- the status and asset pages name Arc testnet, the USDC decimals and "no monetary value", and never mention the template chain.

**Local chain** (3 tests, `SHIELD_LOCAL_E2E=1`):
1. Provide 50 USDC, then Pyth update and protect 10 EURC (11 USDC claim). Then a price rise, Pyth update and partial asset exit, then claim provider fees. Check Activity, which shows two "Update Pyth price" entries, and disconnect. The review screen says "2 · Pyth price update, then the action" and explains the two signatures.
2. Rejecting the Pyth update signature sends no protection: the position count is unchanged.
3. An in-flight quote cannot revive after the market selection changes.

The capture script asserts the contract state after the browser run:
- the browser wallet owns position #1, with 5 EURC and a 5.5 USDC claim remaining;
- its provider shares are present;
- its fees were claimed;
- exactly one protection and two Pyth updates were sent;
- the first update came immediately before the protection.

**Not covered.** No real wallet extension (MetaMask, Rabby) approval screen has been exercised. All signed runs used test providers or scripted keys. No real Hermes update has been fetched or verified on Arc testnet yet. [Screenshots](evidence/screens/) show the local-chain app with the Pyth publish time and age.

## Still to do on Arc testnet

1. Obtain a Pyth API key and put it in `.secrets/pyth-api-key`.
2. Run `npm run deploy:arc-testnet`. Its on-chain simulation shows whether Arc testnet's (non-upgraded) Pyth contract accepts today's updates. If it does, run `-- --broadcast`, then `npm run verify:arc-testnet`.
3. Run `npm run journey:arc-testnet -- --broadcast` from the funded journey wallet.
4. Run at least one real MetaMask transaction on the hosted site, once `PYTH_API_KEY` is set there.

Until these are done, nothing here is Arc testnet activity. Even afterwards, scripted wallets are not users or traction.

This is functional verification, not a security audit.
