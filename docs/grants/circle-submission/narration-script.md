# YieldShield Arc: narration script (draft)

For the Circle Developer Grants demo video. 8 segments in a 4:56 video (295.8 seconds). Sections 1–7 retain the 19 October recording; section 8 was corrected on 20 October 2026.

- **Voice:** ElevenLabs "Chris" (voice_id `iP95p4xoKVk53GoZ742B`), model `eleven_multilingual_v2`, stability 0.5, similarity 0.75, style 0, speaker boost on, speed 1.1. Sections 1–7 used seed 4242 and neighbouring segments' text as context. Section 8 was generated in the signed-in ElevenLabs Chrome interface; no explicit seed or character alignment was supplied.
- **Rules followed:** testnet only, unaudited, no monetary value, AI assistance and founder review, and the scripted test wallet are all stated. The narration promises no outcome or return, uses none of the wording the brief rules out, and does not claim a wallet-extension signature.
- **Cues:** sections 1–7 use the original character alignment, with visuals about 0.25 s before their cue phrases. Section 8 uses two explanatory cards and a closing card; its narration is transcribed as one timed block, without invented sentence-level alignment.

## 1. Introduction

65 words, 25.7 s spoken.

> This is YieldShield Arc, on Circle's Arc testnet. A holder deposits EURC or cirBTC for a fixed USDC claim, priced at entry and reserved at one hundred and fifty percent by capital providers. Before we start: this is Arc testnet only, the contracts are unaudited, and test tokens have no monetary value. The code was written with substantial AI assistance and reviewed by the founders.

Visual cues:

- segment start → `title`
- "A holder deposits" → `site-home`
- "Before we start" → `disclaimers`

## 2. Code walkthrough: USDC

107 words, 51.5 s spoken.

> First, USDC: the backing, the claim, and Arc's gas token. In ShieldPool.sol, every backing movement uses Arc's six-decimal USDC ERC-20 interface, never msg.value. The protect function fixes the claim in USDC and admits it only while providers' USDC covers one hundred and fifty percent. exitBacking pays that fixed claim and reads no price, so it keeps working when a feed is stale. After maturity, settleExpired credits each owner, and claimBacking pays out. Because USDC also pays gas, GAS_RESERVE in chain.ts keeps zero point one USDC unspent. The deploy script, deploy-arc-testnet.mjs, reads one balance through two views, and never signs below twice Arc's twenty gwei minimum base fee.

Visual cues:

- segment start → `usdc-01-backing-erc20-interface`
- "The protect function" → `usdc-02-protect-reserves-usdc`
- "exitBacking pays" → `usdc-03-exit-backing`
- "After maturity" → `usdc-04-settle-and-claim`
- "Because USDC also pays gas" → `usdc-05-gas-token-and-address`
- "The deploy script" → `usdc-06-one-balance-two-views`

## 3. Code walkthrough: EURC

68 words, 34.5 s spoken.

> Second, EURC. In ShieldFactory.sol, the allowed function fixes the approved pairs: EURC with its reference adapter or the labelled scenario oracle, and cirBTC with its own. In ShieldOracles.sol, ShieldChronicleOracle prices EURC as Chronicle's EURC to USD feed divided by USDC to USD, so the result is in USDC. Values older than three hours revert; there is no fallback. ShieldPyth.sol holds a tested Pyth alternative, unused in this deployment.

Visual cues:

- segment start → `eurc-01-factory-allowed-pairs`
- "In ShieldOracles.sol" → `eurc-02-chronicle-price`
- "Values older than three hours" → `eurc-03-feed-wiring-and-pyth`

## 4. Code walkthrough: cirBTC

55 words, 27.9 s spoken.

> Third, cirBTC, with eight decimals. ShieldPool stores assetUnit, ten to the token's decimals, so protect prices every claim per whole unit. The price comes directly from Chronicle's cirBTC to USDC feed. ShieldDecimals.t.sol tests an eight-decimal cirBTC claim and its gain fee, the smallest claim in satoshis, and fuzzes conservation across six, eight and eighteen decimals.

Visual cues:

- segment start → `cirbtc-01-asset-unit`
- "The price comes directly" → `cirbtc-02-chronicle-cirbtc-usdc`
- "ShieldDecimals.t.sol tests" → `cirbtc-03-decimals-test`
- "and fuzzes conservation" → `cirbtc-04-fuzz-conservation`

## 5. Code walkthrough: agent manifest

44 words, 20.2 s spoken.

> Last, agents. agent-manifest.mjs builds the agent.json file the site serves: network, the three Circle assets, markets, terms, freshness rules, safety checks and unsigned transaction recipes. Here is the live file. Agents never sign or hold keys; they prepare calldata for the person's own wallet.

Visual cues:

- segment start → `agent-01-manifest-policy`
- "the three Circle assets" → `agent-02-manifest-circle-assets`
- "Here is the live file" → `site-agent-json`
- "they prepare calldata" → `site-agents`

## 6. Integration demo: live site

81 words, 33.7 s spoken.

> Here is the live site, arc.yieldshield.ai, reading the Arc testnet deployment our verification script checked on October nineteenth. No wallet is connected in this recording. The markets page shows each Chronicle price and its age against the three-hour limit. Protect and provide show the terms: one hundred and fifty percent collateral, and fees only on realized gains: ten percent to providers, one percent each to the creator and the protocol. The status page lists the deployment addresses and live price freshness.

Visual cues:

- segment start → `site-home`
- "The markets page" → `site-markets`
- "Protect and provide" → `site-protect`
- "ten percent to providers" → `site-provide`
- "The status page" → `site-status`

## 7. Integration demo: on-chain receipts

107 words, 36.3 s spoken.

> No wallet extension has signed on Arc yet, so here are the real receipts on the Arc testnet explorer. Deploying the oracles, the factory and three markets took eight transactions. Then our own scripted test wallet, not a user, sent eight more on the EURC market, two of them approvals. It provided two USDC and protected two EURC, for a fixed claim of about two point two four USDC. It kept one EURC through an asset exit, with no gain and so no fee, and surrendered the other for one point one two USDC. Finally, it gave provider notice and redeemed a basket of USDC and EURC.

Visual cues:

- segment start → `x-factory`
- "Deploying the oracles" → `x-deployer`
- "Then our own scripted" → `x-pool-txs`
- "It provided two USDC" → `x-provide`
- "for a fixed claim of about" → `x-protect`
- "It kept one EURC" → `x-partial-exit`
- "and surrendered the other" → `x-backing-exit`
- "Finally" → `x-redeem`

## 8. Planned work and request

113 words; 55.614688 s source audio. Generated on 20 October 2026 with the same Chris voice and settings.

> Next. Milestone one adds App Kit bridging from Arc to Ethereum Sepolia and Base Sepolia. USDC uses Token Messenger version two, through deposit for burn. EURC uses Cross Chain Token Service, approving its Token Manager before cross chain transfer. Acceptance requires four transfers: each token to each destination, with receipts and recovery evidence. Milestone two adds unsigned MCP tools and an ERC eight zero zero four agent identity. Milestone three recruits ten external testers for thirty journeys. These are targets, not traction. Mainnet needs an independent audit and legal review. We request sixteen thousand dollars: eleven thousand for milestones one to three, and five thousand only after both requirements are met. Thank you.

Visual sequence (all bridge and agent integration work is planned):

- 3:56.8 → `card-bridge-corrected.png`: Arc testnet domain 26 to Ethereum Sepolia 0 and Base Sepolia 6; USDC uses `TokenMessengerV2.depositForBurn`; EURC approves `TokenManager` before `CrossChainTokenService.crossChainTransfer`; acceptance requires all four token/destination combinations with receipts, destination balances and recovery tests.
- 4:27.0 → `card-roadmap-corrected.png`: unsigned MCP tools and ERC-8004 identity; 10 external testers and 30 journeys are targets; $11,000 for milestones 1–3 and $5,000 conditional on an independent audit and legal review.
- 4:52.8 → `card-closing.png`: existing site, repository and evidence links; the closing card stays on screen for the silent tail.

The first 236.8 seconds are retained from the original recording. The replacement uses a 0.4-second lead, the 55.614688-second audio and a 3-second tail, rounded to the 30 fps frame grid (295.833333 seconds total).
