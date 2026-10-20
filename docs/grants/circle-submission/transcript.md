# YieldShield Arc: demo video transcript for founder review

Circle Developer Grants, Circle 2026 Cohort 2. Revised 20 October 2026.

[Watch the video](https://drive.google.com/file/d/1aFfIWxz5a6jiGJfXR2vTM8rvgkWU59pj/view). The application remains unsubmitted.

- **Duration:** 4:31 (270.666667 seconds), below the five-minute limit; H.264, 1920×1080, 30 fps, AAC audio.
- **Format:** an edited sequence of real browser screenshots from the deployed app and Arc explorer, with narration. This is not continuous screen recording. UI screenshots were captured on 20 October 2026; displayed prices, balances and freshness are dated observations.
- **Scope:** 2:47 of deployed UI and public receipts, 1:10 of essential USDC/EURC/cirBTC implementation, and 34 seconds of planned grant milestones. The grant requires both an integration demonstration and a codebase walkthrough.
- **Wallet:** disconnected throughout the UI capture. No wallet signature, quote confirmation or newly executed transaction is shown. The explorer receipts are project-run scripted tests, not external adoption.
- **Status:** Arc testnet only; unaudited; test tokens have no monetary value. Code was written with substantial AI assistance and founder review.
- **Voice:** synthetic narration generated in the signed-in ElevenLabs browser using Chris, model `eleven_multilingual_v2`, speed 1.1, stability 0.5, similarity 0.75, style 0 and speaker boost. No subscription, voice clone or account-permission change was needed.
- **Code provenance:** the six code excerpts are from commit [`cad2203`](https://github.com/YieldShield/yieldshield-arc/tree/cad2203f7fed336d159c20c2119660bbff61e4d5). The four source/test files shown were compared with the current repository on 20 October and remain unchanged. The UI is the refreshed live deployment captured on 20 October; it is not an archived 19 October interface.

## Exact narration and visible sequence

Timestamps are rounded to the nearest second from the aligned narration. The opening frame begins at 0:00. The wording below preserves token and code names where automatic transcription rendered phonetic spellings.

### 0:00 — Start with the deployed app

This is YieldShield Arc, running at arc dot yieldshield dot ai. These are real browser captures from October twentieth. The app protects EURC or cirBTC against a fixed USDC claim, funded by capital providers. All tokens are testnet only and have no monetary value. On Markets, the reference markets show Chronicle prices, freshness and available claims. The scenario lab is clearly labelled synthetic. Let us open the EURC market and inspect its terms.

On screen:

- 0:00: 01 home.
- 0:19: 02 markets.
- 0:29: 03 eurc details.

### 0:32 — Choose an asset and amount

The market details show one hundred and fifty percent collateral, fees only on realized gains, the exit delay and maturity. On Protect, I enter one EURC. The form keeps the asset, backing, price source and fees together. Switching to cirBTC updates the market and denomination. This browser is not connected to a wallet. Reviewing and submitting a transaction requires the person's wallet; no signature is being shown here.

On screen:

- 0:32: 03 eurc details.
- 0:40: 04 protect empty.
- 0:40: 05 protect one eurc.
- 0:47: 06 protect cirbtc.

### 0:59 — Provide the backing

Now the other side: Provide. I choose the EURC reference market and enter two USDC. The page explains that USDC also pays Arc's network fees, so a small gas reserve must remain. Providers carry the downside. Deposits and withdrawals pause while protection is open, and redemption can include surrendered assets. The fee split is visible before a wallet is connected.

On screen:

- 0:59: 07 provide two usdc.

### 1:24 — Get test assets and manage positions

Get test USDC opens guidance for Circle's public faucet. It explains which token does what, and the user makes their own faucet request. Returning preserves the selected market and two USDC amount. Portfolio is where holders and providers manage positions, balances and activity. Here it honestly asks for a connection instead of displaying invented balances or a completed transaction.

On screen:

- 1:24: 08 faucet.
- 1:34: 09 return preserved.
- 1:38: 10 positions.

### 1:50 — Inspect integrations and live reads

Agents have a dedicated page with a public manifest, contract interfaces and unsigned transaction recipes. The rules prohibit signing or holding keys and require simulation from the user's address. Network status exposes deployment addresses, the chain and live oracle freshness. After Refresh network reads, all three markets report successful reads. These deployment checks are distinct from an audit. The current contracts are unaudited and were built with substantial AI assistance and founder review.

On screen:

- 1:50: 11 agents.
- 2:03: 12 status.
- 2:09: 13 status markets.

### 2:24 — Inspect real on-chain evidence

The linked Arc explorer contains the market's actual transactions. Our scripted test wallet has exercised providing, protection, both holder exit choices and provider redemption. These receipts are project-run tests, not external adoption or a recording of wallet-extension signing. The application links the reproducible evidence.

On screen:

- 2:24: 14 explorer transactions.

### 2:47 — Codebase walkthrough: USDC

Here is the essential implementation. In ShieldPool dot sol, protect fixes the USDC claim at entry and reserves one hundred and fifty percent backing. Backing enters through Arc's six-decimal USDC token interface. The backing exit pays the recorded claim without reading an oracle, so that exit still works when prices are stale.

On screen:

- 2:47: usdc 02 protect reserves usdc.
- 3:04: usdc 03 exit backing.

### 3:11 — Codebase walkthrough: EURC

EURC uses ShieldChronicleOracle. It divides the EURC dollar feed by the USDC dollar feed to price the asset in backing units. Zero, future-dated or stale values revert; a reference market never falls back to the synthetic scenario. The factory restricts which asset and oracle pairs can create markets.

On screen:

- 3:11: eurc 02 chronicle price.
- 3:29: eurc 01 factory allowed pairs.

### 3:33 — Codebase walkthrough: cirBTC

For cirBTC, assetUnit preserves its eight-decimal denomination. Its adapter reads Chronicle's cirBTC to USDC feed directly. The decimal tests cover the smallest claim in satoshis and fuzz conservation across six, eight and eighteen decimals. These are the contracts behind the real market selection shown earlier, with USDC as backing and gas.

On screen:

- 3:33: cirbtc 01 asset unit.
- 3:43: cirbtc 04 fuzz conservation.

### 3:57 — Grant milestones

The grant adds App Kit routes from Arc to Ethereum Sepolia and Base Sepolia. USDC uses deposit for burn; EURC uses Cross Chain Token Service. Acceptance requires all four transfers with recovery evidence. Next are unsigned MCP tools, an agent identity and a pilot targeting ten testers and thirty journeys. We request sixteen thousand dollars, with five thousand conditional on an independent audit and legal review. Thank you.

On screen:

- 3:57: card bridge corrected.
- 4:14: card roadmap corrected.
- 4:27: card closing.

## Evidence and limits

- The public app was navigated through Markets, EURC details, Protect (1 EURC), cirBTC selection (0.00001 cirBTC), Provide (2 USDC), faucet guidance, return with amount preserved, Portfolio, Agents and Network status. All three market reads succeeded after refresh. These are genuine page states; no balances or wallet confirmations were added to the captures.
- The explorer section shows the EURC market's transaction list, including project-run test calls. The reproducible journeys and receipts are recorded in [`docs/evidence/arc-testnet-journey.json`](../../evidence/arc-testnet-journey.json) and [`docs/E2E_REPORT.md`](../../E2E_REPORT.md). Screenshots do not themselves prove a new user completed an end-to-end wallet journey.
- Deployment readbacks check runtime code, wiring, terms and receipts. They are distinct from an independent audit or explorer source verification.
- Bridging, unsigned MCP tools, ERC-8004 identity and the external pilot remain planned. The bridge acceptance matrix is USDC and EURC from Arc testnet (26) to Ethereum Sepolia (0) and Base Sepolia (6), four transfers total. USDC uses `TokenMessengerV2.depositForBurn`; EURC requires TokenManager approval then `CrossChainTokenService.crossChainTransfer`.
- The route distinction is supported by [Arc App Kit Bridge](https://docs.arc.io/app-kit/bridge), [Circle's expanded-asset flow comparison](https://developers.circle.com/cctp/expanded-assets/concepts/cctp-differences), and the dated [route validation](../CCTP_ROUTE_VALIDATION_2026-10-20.md). Ten testers and thirty journeys are future targets described in the [pilot plan](../ARC_PILOT_PLAN.md).
- The request is $16,000: $11,000 for milestones 1–3, plus $5,000 conditional on the separately funded independent audit and legal review required before a capped mainnet release.

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
