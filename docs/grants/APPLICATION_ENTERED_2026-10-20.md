# Circle / Arc application — revised draft

20 October 2026. Entered into the saved Circle form and read back after reload; not submitted. Updates clarify deployment checks, specify token-specific CCTP routes and measurable pilot outcomes. All external-user and recruitment figures are targets. Mainnet remains conditional on a separately funded independent audit and legal review.

## Primary contact first name

David

## Primary contact last name

Hawig

## Email address

david@yieldshield.ai

## Company Legal Entity Name

Hawig Ventures UG (haftungsbeschränkt)

## Company Doing-Business-As (DBA) name

YieldShield

## Please provide information for each co-founder.

David Hawig | Founder and Managing Director | https://www.linkedin.com/in/david-hawig-206a44b1/ | https://github.com/Noc2 | Works full-time on YieldShield. Former Director of Ecosystem at Web3 Foundation; founded and exited two startups; writes Solidity, React and AI tooling himself.
Santiago Balaguer | Cofounder and Product Lead | https://www.linkedin.com/in/santiagobalaguer/ | N/A | 15 years of product experience, five in crypto; makes the protection mechanism understandable and usable.

## Project website

https://arc.yieldshield.ai

## Project X handle

@yieldshield_ai

## Project GitHub URL

https://github.com/YieldShield/yieldshield-arc

## Where are you and your founders located?

David Hawig, Founder and Managing Director, Simmern (Hunsrück), Rhineland-Palatinate, Germany
Santiago Balaguer, Cofounder and Product Lead, Berlin, Berlin, Germany

## Project Name

YieldShield Arc

## One-liner

USDC-backed downside protection for EURC and cirBTC on Arc: holders keep their upside, capital providers earn fees on realized gains, and AI agents prepare unsigned transactions from one manifest.

## What problem are you solving, why is it important, and what has kept it from being solved so far?

Holders of EUR or BTC exposure on Arc have no simple way to keep their upside while capping their downside in USDC. Options need market makers and active pricing. Liquidation-based lending sells the asset when it falls. Cover products rely on discretionary claims. The barrier is economic and technical: fixed downside claims must be fully reserved and settled without trusted parties, in one asset. On Arc the claim, the reserve and the gas are the same Circle USDC. Agents that manage stablecoin treasuries also lack machine-readable, verifiable risk terms to check before acting.

## What is your solution to that problem?

A holder deposits EURC or cirBTC and gets a fixed USDC claim, priced at entry by Chronicle and reserved at 150% by capital providers in USDC. Before maturity the holder either keeps the asset, paying 12% of any realized gain (10% to providers), or surrenders it for the fixed USDC claim. After maturity anyone can settle, and owners pull their USDC. Stale prices pause entries and asset exits, but never backing exits. Contracts use only USDC's 6-decimal ERC-20 view; USDC is also gas. A static agent manifest lists markets, terms, freshness rules, safety checks and unsigned transaction recipes. Next: CCTP exits and MCP tools.

## Describe your team's track record of acquiring the type of users/customers that your solution will require.

No external users yet; testnet only. David led Web3 Foundation ecosystem work and exited two startups; Santiago has 15 years in product. We will invite 20 treasury, lending and agent builders through Arc/Circle communities and our network, interview five and recruit 10 testers. Alternatives: Derive, Nexus Mutual, Aave. Our proposed edge is a fully reserved USDC claim, fees on gains and unsigned agent workflows; defensibility must be earned.

## Which other chain(s) are you currently live on in production?

None. YieldShield has no mainnet deployment. It runs testnet prototypes only: Avalanche Fuji, Stellar testnet, and earlier Base, Monad and BNB testnet prototypes. Each is separate work, not billed here.

## Milestone 01 — title

CCTP exits: USDC and EURC from Arc to Ethereum Sepolia and Base Sepolia

## Milestone 01 — details

What: after an exit or claim, bridge USDC or EURC from Arc Testnet (domain 26) to Ethereum Sepolia (0) or Base Sepolia (6) using App Kit Bridge, in a separate user-reviewed transaction. USDC uses TokenMessengerV2.depositForBurn; EURC uses CrossChainTokenService.crossChainTransfer with per-token TokenManager approval. Include token/route checks, fee estimates, attestation tracking, interrupted-session recovery and unsigned agent recipes. Pools remain single-chain; bridging is never automatic.
Acceptance: public code/tests and four completed transfers, each token to each destination. Record source receipt, token/domain IDs, attestation, destination receipt and recipient balance change. Demonstrate recovery without a second burn and refusal of unavailable routes. Recheck support before transfers; any disabled route needs an agreed replacement or scope change.
Effort: 35 hours at $100/hour = $3,500. Target: 3 weeks after acceptance.
Funding: Self-funded; no grants or investment received to date. Pending applications: Avalanche Team1 Mini Grant (submitted 13 October 2026) and Stellar Community Fund #46 (interest form submitted 13 October 2026). Other pending drafts: Flare ($20,000 equivalent FLR) and Circle (this request, $16,000). Each chain deployment is separate work; shared core work is listed as already built and is not billed.

## Milestone 02 — title

Agent integration: Arc in the YieldShield MCP server, never signing

## Milestone 02 — details

What: add Arc testnet to YieldShield's existing agent-core and MCP server. Tools: list pools from the factory, check pool safety (capacity, maturity, provider freeze, oracle freshness against the 3-hour limit) and prepare unsigned transactions for protect, both exits, settlement, provide, redeem, claims and CCTP exits. Agents return calldata for the user's own wallet. Register the risk-check agent's identity in Arc's ERC-8004 IdentityRegistry on testnet, pointing to /agent.json.
Acceptance: tools and tests published; a recorded session where an agent discovers a market, refuses a stale price, prepares an unsigned protection, and a person signs it in MetaMask on Arc testnet; ERC-8004 registration transaction.
Effort: 45 hours = $4,500. Target: 6 weeks after acceptance.

## Milestone 03 — title

Testnet pilot and hardening on Arc

## Milestone 03 — details

What: add reserve/fee/claim invariants for 6- and 8-decimal assets, a threat model, monitoring for reserves/oracle age/maturity, and monthly featured-market replacement. David recruits through Arc/Circle developer communities and existing networks; Santiago leads interviews and usability analysis. Funnel targets: 20 invitations, five discovery interviews, 10 consenting external testers from at least three teams. No users, partners or commitments claimed today.
Acceptance: public tests, threat model, monitoring and an anonymized pilot report with consented transaction links and fixes. Complete 30 journeys: 10 asset exits, 10 USDC backing exits, five maturity settlements/claims and five provider journeys. Target 8/10 testers completing a core flow without live help; record failed attempts, misunderstandings and two follow-on integration expressions of interest as a learning target. Fix/retest critical defects. Testnet activity is never TVL or commercial traction.
Effort: 30 engineering hours = $3,000; recruitment, interviews and ordinary support beyond this allowance are self-funded. Target: 9 weeks after acceptance. Detailed plan: https://github.com/YieldShield/yieldshield-arc/blob/main/docs/grants/ARC_PILOT_PLAN.md

## Milestone 04 — title

Capped Arc mainnet release, conditional on separately funded audit and legal review

## Milestone 04 — details

What: deploy the audited revision to Arc mainnet (chain 5042) with real USDC backing and EURC first. Pricing uses Chainlink EURC/USD and USDC/USD on Arc mainnet; that adapter is already built and tested. Hard caps per market, monitoring, an incident runbook, contracts verified on explorer.arc.io, and deployment evidence.
Precondition: an independent security audit and legal review, both funded outside this grant. If they are not in place, this milestone is a blocker or an agreed scope change, not a completed milestone. No incentives, liquidity mining or token.
Acceptance: audit and legal sign-off referenced; verified mainnet contracts; first capped markets live with monitoring.
Effort: 50 hours = $5,000. Target: after the audit, estimated Q1 2027.
Request: $16,000 in total. $11,000 is for milestones 1-3; $5,000 is for milestone 4 and is paid only if its precondition is met.

## Where can we verify your traction?

Arc testnet since 19 Oct; no external users. Runtime, wiring and receipts checked; unaudited, not explorer source-verified. Our own test-wallet receipts, not traction: https://github.com/YieldShield/yieldshield-arc/blob/main/docs/evidence/arc-testnet-journey.json

## Verification documents (Google Drive folder link)

https://drive.google.com/drive/folders/1odTT33caL8tVZl46jTVvN64MMRRClA_q

## Technical roadmap: grant milestones

App Kit Bridge: USDC via TokenMessengerV2 and EURC via CrossChainTokenService, Arc26 to Ethereum Sepolia0/Base Sepolia6 | CCTP, App Kits, USDC, EURC | 3 weeks after acceptance | 4 transfers (2 tokens x 2 destinations), receipts/balances and recovery without double burn
Arc MCP tools: discovery, safety/freshness checks, unsigned transactions; ERC-8004 identity | USDC, EURC, cirBTC | 6 weeks after acceptance | recorded agent-to-MetaMask protection; stale prices refused
Arc pilot and hardening: invariants, threat model, monitoring | USDC, EURC, cirBTC | 9 weeks after acceptance | 10 external testers, 30 journeys; target 8/10 independent completions; publish failures and fixes
Capped Arc mainnet after separately funded independent audit and legal review | USDC, EURC | after audit/legal sign-off, estimated Q1 2027 | verified mainnet contracts, caps and monitoring

## Audit findings so far

N/A. No internal or third-party audit has been conducted. The code was developed with substantial AI assistance (AI agents are tools, not team members) and is reviewed by the founders. It has 72 Foundry tests (6 fuzz) and a rehearsed deployment; these are not an audit. A capped mainnet release waits for an independent audit.

## Video demo of the product

https://drive.google.com/file/d/1aFfIWxz5a6jiGJfXR2vTM8rvgkWU59pj/view

## Transcript (Google Drive folder link)

https://drive.google.com/drive/folders/1odTT33caL8tVZl46jTVvN64MMRRClA_q

## Code screenshots per Circle product (Google Drive folder link)

https://drive.google.com/drive/folders/1odTT33caL8tVZl46jTVvN64MMRRClA_q

## Investor deck

https://drive.google.com/drive/folders/1odTT33caL8tVZl46jTVvN64MMRRClA_q

## Selections

Germany; incorporated Yes; production No; Arc testnet only. Integrated USDC, EURC, cirBTC. Planned USDC, EURC, cirBTC, CCTP, App Kits. Funded No; audit support Yes; conflict No. Supporting folder view/download access confirmed. No final submission.
