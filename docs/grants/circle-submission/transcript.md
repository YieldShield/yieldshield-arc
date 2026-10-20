# YieldShield Arc: demo video transcript (draft)

Circle Developer Grants, Circle 2026 Cohort 2. Recorded on 19 October 2026; roadmap narration and visuals revised on 20 October 2026.

- **Video:** `YieldShield-Arc-Circle-demo-draft.mp4`, 4:56 (295.8 s), 1920×1080, 30 fps. The video file is shared separately and is not stored in the repository.
- **Narration:** synthetic voice from ElevenLabs (voice "Chris", model `eleven_multilingual_v2`). The text below is the exact narration.
- **Code:** [YieldShield/yieldshield-arc](https://github.com/YieldShield/yieldshield-arc) at commit `cad2203`. The contracts and scripts shown are unchanged since `d48ec26`, the source commit of the Arc testnet deployment `arc-testnet-2026-10-19T13-33-11Z-5929f2`.
- **Status:** Arc testnet only. Unaudited. Test tokens have no monetary value. The code was written with substantial AI assistance and reviewed by the founders.
- **Demo:** the on-chain journey shown was run by our own scripted test wallet `0x424cb86EEd3Bf1101C0f2b6f74Db2C291284456d`, not by users. At the time of the 19 October capture, no wallet extension (MetaMask) had signed on Arc; none is shown in this recording.

## Circle products and where they are used

| Product | Status | File | Function or symbol |
|---|---|---|---|
| USDC | Used | [`contracts/src/ShieldPool.sol`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/contracts/src/ShieldPool.sol#L175-L212) | `depositJunior`, `depositJuniorBounded` → `_depositJunior`: backing enters through Arc's 6-decimal USDC ERC-20 interface (`safeTransferFrom`), never `msg.value` |
| USDC | Used | [`contracts/src/ShieldPool.sol`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/contracts/src/ShieldPool.sol#L293-L317) | `protect` → `_protect` and `requiredBacking`: fixed USDC claim, admitted only while USDC backing covers 150% |
| USDC | Used | [`contracts/src/ShieldPool.sol`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/contracts/src/ShieldPool.sol#L387-L436) | `exitBacking`, `partialExitBacking` → `_exitBacking`; `settleExpired`; `claimBacking`: USDC payouts that need no price |
| USDC | Used | [`src/chain.ts`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/src/chain.ts#L26-L137) | `arcTestnet` (native currency USDC, 18 decimals), `GAS_RESERVE` (0.1 USDC), `BACKING` (USDC `0x3600…0000` from `config/deployment.json`) |
| USDC | Used | [`scripts/deploy-arc-testnet.mjs`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/scripts/deploy-arc-testnet.mjs#L180-L213) | one balance, two views (`getBalance`, `balanceOf`); `fees()` at least 2 × `MIN_BASE_FEE` (20 gwei, [`scripts/arc-config.mjs`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/scripts/arc-config.mjs#L21-L24)) |
| EURC | Used | [`contracts/src/ShieldFactory.sol`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/contracts/src/ShieldFactory.sol#L82-L109) | `allowed(asset, oracle_)` and `createPool`: EURC only with its reference adapter or the scenario oracle |
| EURC | Used | [`contracts/src/ShieldOracles.sol`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/contracts/src/ShieldOracles.sol#L39-L101) | `ShieldChronicleOracle.price()` and `_read`: Chronicle EURC/USD ÷ USDC/USD, values older than 3 hours revert |
| EURC | Used | [`config/deployment.json`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/config/deployment.json#L26-L32) | Chronicle feeds and `maxPriceAge` 10800 |
| EURC | Ready, unused | [`contracts/src/ShieldPyth.sol`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/contracts/src/ShieldPyth.sol#L24-L95) | `ShieldPythOracle.price()`: tested Pyth alternative |
| cirBTC | Used | [`contracts/src/ShieldPool.sol`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/contracts/src/ShieldPool.sol#L44-L45) | `assetUnit` (set in the constructor, line 136), used by `_protect` and `previewPartialExit` |
| cirBTC | Used | [`contracts/src/ShieldOracles.sol`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/contracts/src/ShieldOracles.sol#L6-L13) | `ShieldChronicleOracle.price()` without a quote feed (`toUsdcUnits`): Chronicle CIRBTC/USDC |
| cirBTC | Tested | [`contracts/test/ShieldDecimals.t.sol`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/contracts/test/ShieldDecimals.t.sol#L45-L161) | `testCirbtcEightDecimalFloorAndGainFee`, `testCirbtcMinimumClaimInSatoshis`, `testFuzzConservationAcrossDecimals` |
| USDC, EURC, cirBTC | Used | [`src/agent-manifest.mjs`](https://github.com/YieldShield/yieldshield-arc/blob/cad2203f7fed336d159c20c2119660bbff61e4d5/src/agent-manifest.mjs#L93-L419) | `buildAgentManifest()` → `/agent.json` (assets, agent policy, safety checks, unsigned-transaction recipes); `buildLlmsTxt()` → `/llms.txt` |
| CCTP / App Kit Bridge | Planned (milestone 1) | [`CCTP_ROUTE_VALIDATION_2026-10-20.md`](../CCTP_ROUTE_VALIDATION_2026-10-20.md) | USDC: `TokenMessengerV2.depositForBurn`; EURC: approve `TokenManager`, then `CrossChainTokenService.crossChainTransfer`. Arc testnet (26) → Ethereum Sepolia (0) and Base Sepolia (6). All four successful transfers remain acceptance work; no bridge implementation is claimed. |

## 1. Introduction (0:00–0:26)

**[0:00]** This is YieldShield Arc, on Circle's Arc testnet.

**[0:04]** A holder deposits EURC or cirBTC for a fixed USDC claim, priced at entry and reserved at one hundred and fifty percent by capital providers.

**[0:14]** Before we start: this is Arc testnet only, the contracts are unaudited, and test tokens have no monetary value.

**[0:22]** The code was written with substantial AI assistance and reviewed by the founders.

On screen:

- 0:00: Title card: YieldShield Arc, Circle Developer Grants; Arc testnet only, unaudited, test tokens have no monetary value
- 0:03: Live site https://arc.yieldshield.ai, overview page; no wallet connected
- 0:14: Card: Arc testnet only; unaudited; test tokens have no monetary value; written with substantial AI assistance and reviewed by the founders; demo journey is our own scripted test wallet

## 2. Code walkthrough: USDC (0:26–1:19)

**[0:27]** First, USDC: the backing, the claim, and Arc's gas token.

**[0:31]** In ShieldPool.sol, every backing movement uses Arc's six-decimal USDC ERC-20 interface, never msg.value.

**[0:42]** The protect function fixes the claim in USDC and admits it only while providers' USDC covers one hundred and fifty percent.

**[0:49]** exitBacking pays that fixed claim and reads no price, so it keeps working when a feed is stale.

**[0:56]** After maturity, settleExpired credits each owner, and claimBacking pays out.

**[1:01]** Because USDC also pays gas, GAS_RESERVE in chain.ts keeps zero point one USDC unspent.

**[1:09]** The deploy script, deploy-arc-testnet.mjs, reads one balance through two views, and never signs below twice Arc's twenty gwei minimum base fee.

Circle products in this section:

| Product | File | Function or symbol |
|---|---|---|
| USDC | `contracts/src/ShieldPool.sol` | depositJunior / _depositJunior: backing enters via the 6-decimal USDC ERC-20 interface (safeTransferFrom), never msg.value |
| USDC | `contracts/src/ShieldPool.sol` | protect / _protect and requiredBacking: fixed USDC claim, admitted only while USDC backing covers 150% |
| USDC | `contracts/src/ShieldPool.sol` | exitBacking / partialExitBacking (_exitBacking): pays the fixed USDC claim, no price read |
| USDC | `contracts/src/ShieldPool.sol` | settleExpired and claimBacking: segregated USDC credit after maturity, pulled by the owner |
| USDC | `src/chain.ts` | arcTestnet (native currency USDC, 18 decimals), GAS_RESERVE (0.1 USDC) and BACKING (USDC at 0x3600…0000 from config/deployment.json) |
| USDC | `scripts/deploy-arc-testnet.mjs` | getBalance and balanceOf (one balance, two views) and fees() (at least 2 × the 20 gwei minimum base fee; MIN_BASE_FEE in scripts/arc-config.mjs) |

On screen:

- 0:26: Code screenshot [usdc-01-backing-erc20-interface.png](code-screenshots/usdc-01-backing-erc20-interface.png): USDC is the backing, through Arc's 6-decimal ERC-20 interface (`contracts/src/ShieldPool.sol` lines 15–17, 42, 116, 196–212)
- 0:41: Code screenshot [usdc-02-protect-reserves-usdc.png](code-screenshots/usdc-02-protect-reserves-usdc.png): protect: a fixed USDC claim, reserved at 150% (`contracts/src/ShieldPool.sol` lines 142–145, 302–317)
- 0:49: Code screenshot [usdc-03-exit-backing.png](code-screenshots/usdc-03-exit-backing.png): exitBacking: surrender the asset for the fixed USDC claim (`contracts/src/ShieldPool.sol` lines 387–390, 401–412)
- 0:56: Code screenshot [usdc-04-settle-and-claim.png](code-screenshots/usdc-04-settle-and-claim.png): settleExpired and claimBacking: USDC after maturity (`contracts/src/ShieldPool.sol` lines 414–436)
- 1:01: Code screenshot [usdc-05-gas-token-and-address.png](code-screenshots/usdc-05-gas-token-and-address.png): USDC is also Arc's gas token (`src/chain.ts` lines 26–33, 130–137; `config/deployment.json` lines 10–13)
- 1:08: Code screenshot [usdc-06-one-balance-two-views.png](code-screenshots/usdc-06-one-balance-two-views.png): One USDC balance, two views, and Arc's fee floor (`scripts/deploy-arc-testnet.mjs` lines 180–184, 199–210; `scripts/arc-config.mjs` lines 21–24)

## 3. Code walkthrough: EURC (1:19–1:54)

**[1:19]** Second, EURC.

**[1:21]** In ShieldFactory.sol, the allowed function fixes the approved pairs: EURC with its reference adapter or the labelled scenario oracle, and cirBTC with its own.

**[1:33]** In ShieldOracles.sol, ShieldChronicleOracle prices EURC as Chronicle's EURC to USD feed divided by USDC to USD, so the result is in USDC.

**[1:45]** Values older than three hours revert; there is no fallback.

**[1:48]** ShieldPyth.sol holds a tested Pyth alternative, unused in this deployment.

Circle products in this section:

| Product | File | Function or symbol |
|---|---|---|
| EURC | `contracts/src/ShieldFactory.sol` | allowed(asset, oracle_) and createPool: EURC is an approved asset (immutable eurc), only with its reference adapter or the scenario oracle |
| EURC | `contracts/src/ShieldOracles.sol` | ShieldChronicleOracle.price() and _read: EURC/USD ÷ USDC/USD in USDC base units; stale values revert |
| EURC | `config/deployment.json` | oracle "chronicle", the Chronicle EURC/USD and USDC/USD feeds and maxPriceAge 10800 (3 hours) |
| EURC | `contracts/src/ShieldPyth.sol` | ShieldPythOracle.price(): tested Pyth alternative, not used by this deployment |

On screen:

- 1:19: Code screenshot [eurc-01-factory-allowed-pairs.png](code-screenshots/eurc-01-factory-allowed-pairs.png): EURC is one of two approved Circle assets (`contracts/src/ShieldFactory.sol` lines 14–27, 82–86, 106–109)
- 1:32: Code screenshot [eurc-02-chronicle-price.png](code-screenshots/eurc-02-chronicle-price.png): EURC is priced in USDC by Chronicle (`contracts/src/ShieldOracles.sol` lines 39–42, 69–76, 90–101)
- 1:45: Code screenshot [eurc-03-feed-wiring-and-pyth.png](code-screenshots/eurc-03-feed-wiring-and-pyth.png): Deployed with Chronicle (3-hour limit); Pyth ready but unused (`config/deployment.json` lines 14, 26–32; `contracts/src/ShieldPyth.sol` lines 24–28, 89–95)

## 4. Code walkthrough: cirBTC (1:54–2:23)

**[1:55]** Third, cirBTC, with eight decimals.

**[1:59]** ShieldPool stores assetUnit, ten to the token's decimals, so protect prices every claim per whole unit.

**[2:06]** The price comes directly from Chronicle's cirBTC to USDC feed.

**[2:11]** ShieldDecimals.t.sol tests an eight-decimal cirBTC claim and its gain fee, the smallest claim in satoshis, and fuzzes conservation across six, eight and eighteen decimals.

Circle products in this section:

| Product | File | Function or symbol |
|---|---|---|
| cirBTC | `contracts/src/ShieldPool.sol` | assetUnit (constructor: 10 ** decimals, 6 to 18 allowed), used in _protect and previewPartialExit |
| cirBTC | `contracts/src/ShieldOracles.sol` | ShieldChronicleOracle.price() without a quote feed (toUsdcUnits): Chronicle CIRBTC/USDC |
| cirBTC | `contracts/src/ShieldFactory.sol` | allowed(asset, oracle_): cirBTC only with its reference adapter |
| cirBTC | `contracts/test/ShieldDecimals.t.sol` | testCirbtcEightDecimalFloorAndGainFee, testCirbtcMinimumClaimInSatoshis, testFuzzConservationAcrossDecimals |

On screen:

- 1:54: Code screenshot [cirbtc-01-asset-unit.png](code-screenshots/cirbtc-01-asset-unit.png): cirBTC: 8 decimals, the same rules (`contracts/src/ShieldPool.sol` lines 44–45, 117–118, 136, 302–310, 339–341)
- 2:05: Code screenshot [cirbtc-02-chronicle-cirbtc-usdc.png](code-screenshots/cirbtc-02-chronicle-cirbtc-usdc.png): cirBTC is priced directly by Chronicle CIRBTC/USDC (`contracts/src/ShieldOracles.sol` lines 6–13, 90–95; `config/deployment.json` lines 13, 29, 40)
- 2:11: Code screenshot [cirbtc-03-decimals-test.png](code-screenshots/cirbtc-03-decimals-test.png): Tested: an 8-decimal cirBTC claim, gain fee and minimum (`contracts/test/ShieldDecimals.t.sol` lines 45–60, 62–71)
- 2:18: Code screenshot [cirbtc-04-fuzz-conservation.png](code-screenshots/cirbtc-04-fuzz-conservation.png): Fuzzed: conservation across 6, 8 and 18 decimals (`contracts/test/ShieldDecimals.t.sol` lines 120–124, 144–160)

## 5. Code walkthrough: agent manifest (2:23–2:44)

**[2:23]** Last, agents.

**[2:25]** agent-manifest.mjs builds the agent.json file the site serves: network, the three Circle assets, markets, terms, freshness rules, safety checks and unsigned transaction recipes.

**[2:38]** Here is the live file.

**[2:39]** Agents never sign or hold keys; they prepare calldata for the person's own wallet.

Circle products in this section:

| Product | File | Function or symbol |
|---|---|---|
| USDC, EURC, cirBTC | `src/agent-manifest.mjs` | buildAgentManifest(): assets (USDC as backing and gas; EURC and cirBTC as protected assets), agentPolicy, safetyChecks and unsignedTransactions; served as /agent.json and /llms.txt (buildLlmsTxt) |

On screen:

- 2:23: Code screenshot [agent-01-manifest-policy.png](code-screenshots/agent-01-manifest-policy.png): Agents read one manifest, and never sign (`src/agent-manifest.mjs` lines 1–5, 184–202)
- 2:30: Code screenshot [agent-02-manifest-circle-assets.png](code-screenshots/agent-02-manifest-circle-assets.png): The manifest names the three Circle assets and their roles (`src/agent-manifest.mjs` lines 219–240)
- 2:37: Live https://arc.yieldshield.ai/agent.json (page zoomed for legibility)
- 2:41: Live site, /agents: manifest files, agent rules and recipes

## 6. Integration demo: live site (2:44–3:19)

**[2:45]** Here is the live site, arc.yieldshield.ai, reading the Arc testnet deployment our verification script checked on October nineteenth.

**[2:54]** No wallet is connected in this recording.

**[2:57]** The markets page shows each Chronicle price and its age against the three-hour limit.

**[3:02]** Protect and provide show the terms: one hundred and fifty percent collateral, and fees only on realized gains: ten percent to providers, one percent each to the creator and the protocol.

**[3:14]** The status page lists the deployment addresses and live price freshness.

On screen:

- 2:44: Live site https://arc.yieldshield.ai, overview page; no wallet connected
- 2:56: Live site, /markets: Chronicle prices and their age against the 3-hour limit
- 3:02: Live site, /protect: EURC reference market terms
- 3:09: Live site, /provide: USDC also pays gas; keep 0.1 USDC unspent
- 3:14: Live site, /status: deployment addresses and price freshness

## 7. Integration demo: on-chain receipts (3:19–3:56)

**[3:19]** No wallet extension has signed on Arc yet, so here are the real receipts on the Arc testnet explorer.

**[3:25]** Deploying the oracles, the factory and three markets took eight transactions.

**[3:30]** Then our own scripted test wallet, not a user, sent eight more on the EURC market, two of them approvals.

**[3:37]** It provided two USDC and protected two EURC, for a fixed claim of about two point two four USDC.

**[3:44]** It kept one EURC through an asset exit, with no gain and so no fee, and surrendered the other for one point one two USDC.

**[3:51]** Finally, it gave provider notice and redeemed a basket of USDC and EURC.

On screen:

- 3:19: Arc testnet explorer: factory 0x77dd612d711c5c3328c6a0eebcb9719955895e1c, transactions tab
- 3:25: Arc testnet explorer: test signer 0x10D42586A65a98BCa4baFAa1bF5DCB10c820f50a, the 8 deployment transactions
- 3:30: Arc testnet explorer: EURC market 0x583EcBBf94C2B978A9f02d32BF629846e9b0626C, the 6 journey calls from the scripted test wallet 0x424c…456d
- 3:36: Arc testnet explorer: tx 0xc3ea614d…56b9, provide 2 USDC (scripted test wallet)
- 3:40: Arc testnet explorer: tx 0xe19c61c2…b89e, protect 2 EURC, fixed claim 2.244912 USDC (scripted test wallet)
- 3:44: Arc testnet explorer: tx 0x4f0d6f0a…99de, asset exit of 1 EURC, no fee (scripted test wallet)
- 3:48: Arc testnet explorer: tx 0xcacf9c54…363f, backing exit, 1.122456 USDC (scripted test wallet)
- 3:51: Arc testnet explorer: tx 0x5c5874c3…95d8, provider redemption, 1.679298 USDC plus 0.285714 EURC (scripted test wallet)

## 8. Planned work and request (3:56–4:56)

**[3:57]** Next. Milestone one adds App Kit bridging from Arc to Ethereum Sepolia and Base Sepolia. USDC uses Token Messenger version two, through deposit for burn. EURC uses Cross Chain Token Service, approving its Token Manager before cross chain transfer. Acceptance requires four transfers: each token to each destination, with receipts and recovery evidence. Milestone two adds unsigned MCP tools and an ERC eight zero zero four agent identity. Milestone three recruits ten external testers for thirty journeys. These are targets, not traction. Mainnet needs an independent audit and legal review. We request sixteen thousand dollars: eleven thousand for milestones one to three, and five thousand only after both requirements are met. Thank you.

On screen:

- 3:56.8: Planned bridge card: Arc testnet (26) → Ethereum Sepolia (0) and Base Sepolia (6). USDC uses `TokenMessengerV2.depositForBurn`; EURC approves `TokenManager` before `CrossChainTokenService.crossChainTransfer`. Four transfers, destination balances, receipts and recovery tests are the acceptance criteria.
- 4:27.0: Planned roadmap card: unsigned MCP tools, ERC-8004 identity and a pilot targeting 10 external testers / 30 journeys. Request $16,000: $11,000 for milestones 1–3; $5,000 conditional on an independent security audit and legal review. Those reviews require separate funding. Pilot figures are targets, not traction.
- 4:52.8: Closing card with site, repository, factory address, evidence files and disclaimers.

## Notes

- Timestamps in sections 1–7 come from the original ElevenLabs character timings and assembled timeline, accurate to about a quarter of a second. The replacement section 8 is a single timed narration block; it has no fabricated sentence-level alignment. Its audio is 55.614688 seconds with a 0.4-second lead and 3-second silent tail; the final video is rounded to the 30 fps frame grid.
- Explorer and site screenshots in sections 1–7 were captured on 19 October 2026 between 14:17 and 14:20 UTC. Live values (prices, price age and balances) change over time; this is a dated walkthrough rather than a current-state dashboard.
- At the time of the 19 October capture, the Arc testnet explorer showed the contracts without published source code. “Verified” in the recording refers to our own `verify:arc-testnet` script reading back runtime code, wiring, terms and receipts; it does not mean a security audit.
- The corrected bridge distinction is supported by the [Arc App Kit Bridge documentation](https://docs.arc.io/app-kit/bridge), [Circle's expanded-asset flow comparison](https://developers.circle.com/cctp/expanded-assets/concepts/cctp-differences), and the project's dated [route validation](../CCTP_ROUTE_VALIDATION_2026-10-20.md). The [pilot plan](../ARC_PILOT_PLAN.md) records proposed recruitment and success criteria without claiming existing commitments.
