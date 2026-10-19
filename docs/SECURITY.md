# Security and economic boundaries

## Reporting a vulnerability

Please report suspected vulnerabilities privately, not in a public issue. Email david@yieldshield.ai. Once this repository is public, **Report a vulnerability** on its Security tab (GitHub private vulnerability reporting) will also be enabled.

Include:

- the affected contract and function, or the page;
- the steps to reproduce;
- the expected impact.

Never send private keys or seed phrases. This is unaudited testnet software that holds no assets of monetary value, and there is no bug bounty.

## Scope

- **Network.** Pools and the factory accept only Arc testnet (chain 5042002) or the local chain 31337. The tests confirm that Arc mainnet (5042) and other chains are rejected.
- **Assets.** The only assets are Circle's testnet USDC, EURC and cirBTC, which have no monetary value.
- **Mutability.** Nothing is upgradeable, and no admin can move funds.

## Arc-specific rules

- **Backing goes through the ERC-20 interface only.** On Arc, USDC is the native gas token. Its native balance (18 decimals) and its ERC-20 interface at `0x3600…0000` (6 decimals) are one balance.
  - The contracts move USDC only through the ERC-20 interface and keep internal counters.
  - They never read `msg.value` or `address(this).balance`, and no function is payable.
  - Native USDC force-sent to a pool, which is only possible through `SELFDESTRUCT`, is ignored by the accounting.
- **No native-asset path and no wrapper.** Arc's documentation advises against WETH-style wrappers for USDC. The template's native-asset protection and `awAVAX` wrapper were removed.
- **Blocklisting.** On Arc, USDC transfers to or from a blocklisted address revert. Every USDC or asset payout is one of two kinds:
  - the caller's own exit;
  - a pull claim (`claimBacking`, `claimRewards(recipient)`, `claimFees(recipient)`).

  Maturity settlement credits a claim and pushes nothing. A blocklisted holder or fee recipient therefore cannot block another user's exit, settlement or redemption. Tests cover both cases.
- **Timestamps.** Arc block timestamps are non-decreasing rather than strictly increasing. Delays and maturity use `block.timestamp` comparisons that remain correct when timestamps repeat.

## Accounting properties

These are unchanged from the template unless noted.

- **Decimals.** Protected assets may have 6 to 18 decimals; this repository uses EURC (6) and cirBTC (8). Backing must have 6 decimals.
- **Price and claim units.** The oracle reports USDC base units per one whole asset unit (`assetUnit = 10^decimals`). The entry claim is `amount × price ÷ assetUnit`. *Changed from the template's fixed 1e18.*
- **Collateral.** Admission uses a ceil-rounded collateral requirement: 150% by default, configurable from 125% to 300%. A partial exit releases only the proportional entry claim, and rounding leaves the residual claim attached to the remaining asset.
- **Provider freeze.** Provider entry and redemption are frozen while any protected exposure remains.
- **Limits.**
  - Epochs last 1–30 days.
  - At most 100 positions can be open per market.
  - The minimum claim is 0.01 USDC, so dust cannot occupy every slot.
  - The largest protection is 100,000 whole units.
- **Separate liabilities.** Each is accounted on its own:
  - protected principal;
  - surrendered inventory;
  - indexed provider fees;
  - creator and protocol fees;
  - unclaimed USDC credit.
- **Fees.** Fees apply only to positive realized gains on the exited slice.
- **Bounds.** Slippage bounds and deadlines apply to entries, exits, provider deposits and redemptions, and factory creation.

## Oracles

**`ShieldPythOracle`** is the reference adapter on Arc testnet since 19 October 2026. It reads `getPriceNoOlderThan(id, 120 s)` from Pyth `0x2880…C17B43` and returns feed ÷ USDC/USD in USDC base units:

- EURC uses Crypto.EURC/USD.
- cirBTC uses Crypto.BTC/USD.

It rejects:

- never-published or stale values. Any Pyth revert becomes `INVALID_OR_STALE_PRICE`.
- non-positive prices, and exponents outside −18…0 (`INVALID_PRICE`);
- zero confidence, or a confidence interval wider than 100 bps of the price (`CONFIDENCE`);
- a result that rounds to zero.

Pyth semantics also apply: a publish time up to `maxAge` ahead of block time (clock skew) is accepted. `age()` reports the age of the older stored publish time for monitoring.

**Pull-oracle risks**

- **Update timing.** Each price-reading action needs a separate `updatePriceFeeds{value: fee}` transaction first, then the action within 120 s. If the second transaction is delayed (a slow wallet confirmation, congestion), the action reverts on the stale price or on its own slippage bound. Nothing is lost except gas, and the user reviews again.
- **Who supplies the price.** Anyone can push any validly signed Pyth price, including an older one that is still within 120 s. The pool uses the price at the time of the action and bounds the outcome with the user's own reviewed minimum (0.5% tolerance). Users and agents should quote from fresh Hermes data, not from the stored on-chain price.
- **Service dependency.** Update data comes from Pyth's Hermes, which has required an API key since 26 August 2026. Without it, no reference action is possible. The site's `/api/pyth-update` proxy keeps the key server-side and forwards only this deployment's three feed IDs.
- **Contract generation.** Arc testnet's Pyth contract was not part of Pyth's upgrade, and its last successful update was on 22 September 2026. The deploy preflight simulates an update on chain before anything is sent.
- **cirBTC is priced as BTC.** Pyth has no cirBTC feed. A cirBTC depeg from BTC would not appear in the price, so providers would bear that basis risk. A cirBTC-specific feed, or a reserves check, is needed before any real-value use.
- **USDC/USD.** The USDC/USD division moves the USDC claim with a USDC depeg, rather than assuming one dollar.

**`ShieldChronicleOracle`** (a tested option; it was the testnet reference until its feeds went stale) reads Chronicle `tryReadWithAge()` and rejects:

- unavailable or zero values;
- future-dated values;
- values older than `maxAge`. Arc testnet uses 10,800 s; the constructor allows at most one day.

The EURC price is EURC/USD ÷ USDC/USD, so a USDC depeg moves the USDC claim rather than being assumed away. The adapter normalizes 18-decimal feeds to 6 decimals and reverts on a zero result. On testnet it whitelists itself through Chronicle's SelfKisser in its constructor; without that whitelist every read reverts. `age()` exposes the age of the older feed value for monitoring.

**`ShieldChainlinkOracle`** is the planned Arc mainnet path, using Chainlink EURC/USD and USDC/USD (8 decimals, 24-hour heartbeat). It rejects:

- non-positive answers;
- incomplete rounds;
- future-dated or stale rounds.

Its `maxAge` is at most 25 hours. It is tested but not deployed on testnet.

**Stale prices fail closed.**

- **These revert:** new protection, asset exits, market creation, and provider deposits into a pool holding surrendered assets.
- **These keep working:** backing exits, matured settlement and claims.

No reference market ever falls back to the scenario oracle. The scenario oracle is a public deterministic cycle, labelled synthetic in the app and in `/agent.json`.

**Known Chronicle reliability on testnet** (19 September – 19 October 2026). This is why the reference oracle moved to Pyth:

- median update interval: 52 minutes;
- one outage of about 34 hours on 7–8 October;
- a further outage from 18 October 09:08 UTC, still ongoing at 13:10 UTC on 19 October (about 28 hours).

## Agent surface

`/agent.json`, `/llms.txt` and `/abi/*.json` are static files generated from the public deployment manifest. They contain no secrets and prepare nothing on their own. They tell agents to:

- never sign;
- emit only unsigned transactions: zero value for every YieldShield call, and exactly the Pyth fee on a Pyth update;
- push the Pyth update immediately before a price-reading action;
- run the listed safety checks;
- simulate calls from the user's address.

## Remaining limitations

**Product scope.** The prototype does not offer any of the following:

- continuous provider liquidity;
- automatic rollover;
- CCTP exits (planned);
- leverage;
- a token;
- an external yield strategy or a fixed return.

**Economic risk.** Providers can lose capital, and surrendered assets carry directional risk. A holder's protection is limited to the fixed USDC claim and depends on contract correctness and on the reserved backing.

**Rounding.** Very small reward-index rounding dust can remain in the reward inventory.

**External dependencies.** The following are outside the contracts' control:

- browser and RPC reliability;
- user signing;
- Arc testnet availability;
- Pyth Hermes availability (and its API key), and whether Arc testnet's Pyth contract keeps accepting updates;
- Chronicle feed liveness, for the Chronicle option.

**What tests do not replace.** Tests and rehearsals do not substitute for an independent audit, an assessment of real-world liquidity and oracles, legal review or production governance.
