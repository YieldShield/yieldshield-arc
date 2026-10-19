# Feature parity with the template

Reference: `yieldshield-avalanche` (YieldShield Alpine) at `dfb39a8`. Comparison date: 19 October 2026.

## Unchanged

**Pool economics.** These are identical:
- the fixed entry claim, the 150% default reserve (configurable 125–300%) and the ceil-rounded admission;
- the 10% / 1% / 1% fees on realized gains only, charged per exited slice;
- the 60-second exit delay and the 120-second provider notice;
- the provider freeze while exposure is open;
- partial asset and backing exits that keep the remaining basis;
- position transfer;
- permissionless maturity settlement into a segregated pull claim, and separate fee claims;
- the reward-index solvency fix;
- 100 open positions, the 0.01 minimum claim, and deadlines and slippage bounds on every reviewed action.

**Factory.** Approved pairs only. Atomic creation with a seed credited to the creator. 32 lifetime slots, 10 reserved for the protocol account, at most 2 per community wallet.

**Deployment.** Signed, bound, resumable intents; artifact provenance; runtime-code verification with immutables masked; receipt-based seed checks; replacement rounds.

**App.** Review guards against wallet, market or amount changes; consumed reviews; latest-read publishing; chain-time deadlines; direct routes; mobile layout; the Activity journal; status and asset pages.

## Changed because of Arc

| Template (Fuji) | Arc | Reason |
|---|---|---|
| Native AVAX could be protected (`protect()` payable, `exitAvax`) | No native path. `protect(amount, minFloor, deadline)` and `exitAsset` are ERC-20 only; nothing is payable | Arc's native asset is USDC, the backing itself, and Arc advises against mixing `msg.value` with USDC accounting |
| `awAVAX` wrapper | Removed | Arc's docs say no wrapper should be deployed for USDC |
| Protected assets had 18 decimals; prices per 1e18 | 6–18 decimals; prices per `10^decimals` (`assetUnit`); the cap is 100,000 whole units | Circle's assets on Arc are EURC (6) and cirBTC (8) |
| Backing: project-issued `aDEMO` faucet token or `bvaDEMO` vault receipts | Arc testnet USDC (ERC-20 interface, 6 decimals) only | Real Circle USDC is Arc's settlement asset |
| 500-unit creation seed | 5 USDC | Testnet USDC is rationed to 20 per address every 2 hours |
| Chainlink AVAX/USD adapter | Pyth pull adapter (EURC/USD ÷ USDC/USD; BTC/USD ÷ USDC/USD), 120 s limit and 1% confidence cap. Each price-reading action is preceded by an `updatePriceFeeds` transaction. The Chronicle adapter (3-hour limit, SelfKisser whitelisting) and the Chainlink adapter (with an optional quote feed, for the mainnet path) are kept as tested options | Chainlink Data Feeds are on Arc mainnet, not testnet. Chronicle's testnet push feeds went stale for about 28 hours on 18–19 October, so David approved Pyth |
| Scenario cycle 25 / 35 / 15 aDEMO per AVAX | 1.10 / 1.20 / 1.00 USDC per EURC | Same deterministic purpose, with EURC units |
| Fees chosen by the node | Signed `maxFeePerGas` of at least 40 gwei | Arc drops transactions below its 20 gwei minimum base fee |
| Seed transfers decoded from any log | Matched on the USDC contract as emitter | Arc also emits an 18-decimal system `Transfer` for USDC moves |
| Chain guard 43113 / 31337 | 5042002 / 31337 | Arc testnet only |

## Removed

- **Funded exchange and Trade page.** Testers get USDC, EURC and cirBTC from Circle's faucet; the app does not make markets.
- **Demo ERC-4626 vaults and the vault-receipt market.** The real tokenized-fund asset on Arc (USYC) requires an entitlement. It is listed as research, not simulated.
- **Fuji-specific deployment and evidence records.**

## Added

- Market cards and the status page show the Pyth publish time and age against its limit. Stale prices are explained in plain language.
- A two-signature flow (Pyth update, then the action) with a fee preview, and a same-origin `/api/pyth-update` proxy that keeps the Hermes API key server-side.
- The interface keeps 0.1 USDC unspent for gas.
- `/agent.json`, `/llms.txt`, `/abi/*.json` and the `/agents` page: a machine-readable description with safety checks and recipes for unsigned transactions.
- The rehearsal on a chain-5042002 Anvil, the fork check against the real Chronicle feeds, and the second-wallet testnet journey script.
- Tests for 6-, 8- and 18-decimal assets, oracle edge cases, Arc-style blocklisting and native-value rejection.
