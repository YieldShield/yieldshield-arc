# Circle Developer Grants — YieldShield Arc

**Status: draft, not submitted (19 October 2026).**
- **Form:** the "Circle 2026 Cohort 2" Questbook form was read field by field. Nothing was entered, uploaded or submitted, and no terms were accepted.
- **Repository:** `YieldShield/yieldshield-arc` is built and private.
- **Deployment:** the Arc testnet deployment is waiting for faucet USDC and for fresh Chronicle feeds.
- **Next step:** David reviews, records the video, funds the test wallets and submits.

Program page: https://www.circle.com/grant. Application portal: https://circle.questbook.app/ (open the "Circle 2026 Cohort 2" card, then "Submit Proposal").

## What changed

This compares the [17 October application plan](../../../docs/grants/APPLICATION_PLAN_2026-10-17.md), which listed this program as "Rolling", with what was verified on 19 October.

- **The program runs in cohorts, not strictly rolling.**
  - Cohort 2 is **open**: $135k available, 878 proposals, 14 accepted.
  - Cohort 1 is closed: 19 accepted, $190k paid out.
  - Program totals: 897 proposals, 33 accepted, $285k paid out, or about $8.6k per accepted team.
  - Competition is heavy, and amounts are small. The request below is sized for that.
- **The form has no amount field.** Funding is designed "at acceptance and milestone design", so the request and its rationale go into the milestone details.
- **Confirmed unchanged:**
  - milestone-based USDC with no published cap, plus co-marketing and mentorship;
  - the 14 May 2026 relaunch;
  - Arc must be "core to your flow of value, liquidity, or settlement";
  - priority use cases include agentic economic activity and lending/borrowing;
  - finalists pass "applicable screenings";
  - traction is favored. The form says independently verifiable traction weighs more, testnet figures must be labelled, and having no public listing "is not penalized".
- **New requirements.** All of these go in one Google Drive folder:
  - a video of at most 5 minutes, with a code walkthrough showing where each Circle product is used and an integration demo;
  - a transcript naming each product and its place in the code;
  - code screenshots for each product;
  - an investor deck.

  Every field is mandatory, with "N/A" allowed.
- **Arc mainnet** has been live since 16 September 2026, and the program emphasizes moving from testnet to mainnet. Chainlink Data Feeds exist on Arc mainnet only. On Arc testnet, Chronicle is the live push oracle.
- **The plan's open oracle question is resolved.**
  - EURC is priced as Chronicle EURC/USD ÷ USDC/USD.
  - cirBTC is priced by Chronicle CIRBTC/USDC.
  - Values older than 3 hours are rejected.
  - Testnet outages were measured and documented.
- **The Arc Builders Fund is a different program.** It is Circle Ventures' venture fund, not this grant program.

## Check before submitting

- [ ] **Deploy first, if at all possible.**
  - Fund deployer `0x10D42586A65a98BCa4baFAa1bF5DCB10c820f50a` with one 20 USDC claim at https://faucet.circle.com (network: Arc Testnet).
  - When the Chronicle feeds are fresh, run `npm run deploy:arc-testnet -- --broadcast`, then `npm run verify:arc-testnet`.
  - Fund the journey wallet `0x424cb86EEd3Bf1101C0f2b6f74Db2C291284456d` with 20 USDC and 20 EURC, and run `npm run journey:arc-testnet -- --broadcast`.
  - Then change "Are you live on Arc?" to "Yes, but only live on Arc testnet", and add the factory explorer link to the traction field.
- [ ] Do one real MetaMask transaction on the hosted site. Every recorded run so far used test providers or scripted keys.
- [ ] **Hosting.** Create the Vercel project and `arc.yieldshield.ai` ([hosting](../HOSTING.md)). Until then, the Project website field points to a page that does not exist; use https://yieldshield.ai instead.
- [ ] **Repository visibility.** The repository is private.
  - **Option 1:** make it public (Avalanche and Stellar are public) and keep the GitHub field.
  - **Option 2:** write "N/A" in the GitHub field and share access on request.

  The video must show the code either way.
- [ ] **Commitments.** The "Arc must be central" wording must not contradict other applications. In particular, the Flare 1-year commitment and Arbitrum exclusivity are still open in the [application plan](../../../docs/grants/APPLICATION_PLAN_2026-10-17.md).
- [ ] **Funding register.** Still true: self-funded, and no grants or investment received. Update the pending list from the [funding register](../../../docs/grants/FUNDING_REGISTER.md) before pasting.
- [ ] **Personal details.** Confirm Santiago's city and his GitHub URL (or "N/A"). Confirm that David's location may be given as Dortmund, the city on his public GitHub profile.
- [ ] **Dates.** The roadmap dates assume acceptance around 30 November 2026. Shift them to the actual acceptance date.
- [ ] **Audit answer.** "Seeking audit support" is answered Yes. Change it if you prefer not to signal that.
- [ ] **Drive folder.** Record the video, then prepare the transcript, screenshots and deck (see David-only actions). Give view and download access.
- [ ] **Terms.** Read Questbook's and Circle's terms before submitting. Submitting accepts them.

## Form fields

Character limits are shown where the form enforces them. Every answer below fits its limit; counts were checked with a script.

### Applicant details

**Primary contact first name**

```
David
```

**Primary contact last name**

```
Hawig
```

**Email address**

```
david@yieldshield.ai
```

**Company Legal Entity Name**

```
Hawig Ventures UG (haftungsbeschränkt)
```

**Company Doing-Business-As (DBA) name**

```
YieldShield
```

**Please provide information for each co-founder.** One line each: Founder name | Title | LinkedIn URL | GitHub URL | Bio.

```
David Hawig | Founder and Managing Director | https://www.linkedin.com/in/david-hawig-206a44b1/ | https://github.com/Noc2 | Works full-time on YieldShield. Former Director of Ecosystem at Web3 Foundation; founded and exited two startups; writes Solidity, React and AI tooling himself.
Santiago Balaguer | Cofounder and Product Lead | https://www.linkedin.com/in/santiagobalaguer/ | N/A | 15 years of product experience, five in crypto; makes the protection mechanism understandable and usable.
```

**Project website**

```
https://arc.yieldshield.ai
```

**Project X handle**

```
@yieldshield_ai
```

**Project GitHub URL** (optional)

```
https://github.com/YieldShield/yieldshield-arc
```

**Where are you and your founders located?**

```
David Hawig, Founder and Managing Director, Dortmund, North Rhine-Westphalia, Germany
Santiago Balaguer, Cofounder and Product Lead, [city], Germany
```

**Where is your business located?**: Germany

**Is your business incorporated?**: Yes

### Project abstract

**Project Name** (limit 80)

```
YieldShield Arc
```

**One-liner** (limit 200)

```
USDC-backed downside protection for EURC and cirBTC on Arc: holders keep their upside, capital providers earn fees on realized gains, and AI agents prepare unsigned transactions from one manifest.
```

**What problem are you solving, why is it important, and what has kept it from being solved so far?** (limit 750)

```
Holders of EUR or BTC exposure on Arc have no simple way to keep their upside while capping their downside in USDC. Options need market makers and active pricing. Liquidation-based lending sells the asset when it falls. Cover products rely on discretionary claims. The barrier is economic and technical: fixed downside claims must be fully reserved and settled without trusted parties, in one asset. On Arc the claim, the reserve and the gas are the same Circle USDC. Agents that manage stablecoin treasuries also lack machine-readable, verifiable risk terms to check before acting.
```

**What is your solution to that problem?** (limit 750)

```
A holder deposits EURC or cirBTC and gets a fixed USDC claim, priced at entry by Chronicle and reserved at 150% by capital providers in USDC. Before maturity the holder either keeps the asset, paying 12% of any realized gain (10% to providers), or surrenders it for the fixed USDC claim. After maturity anyone can settle, and owners pull their USDC. Stale prices pause entries and asset exits, but never backing exits. Contracts use only USDC's 6-decimal ERC-20 view; USDC is also gas. A static agent manifest lists markets, terms, freshness rules, safety checks and unsigned transaction recipes. Next: CCTP exits and MCP tools.
```

**Describe your team's track record of acquiring the type of users/customers that your solution will require.** (limit 500)

```
No users yet: everything is testnet. David built ecosystems and partnerships as Director of Ecosystem at Web3 Foundation and founded and exited two startups; Santiago has 15 years in product. Plan: integrators first (Arc lending, treasury and agent builders), then a 10-tester pilot. Alternatives: options and puts, cover protocols, and liquidations in lending. Our edge: a fully reserved fixed USDC claim, fees only on realized gains, on-chain settlement and agent tooling.
```

### Product alignment track

**Is your project currently live in production?**: No

**Are you live on Arc?**: No. Change this to "Yes, but only live on Arc testnet" once the deployment is verified.

**Which other chain(s) are you currently live on in production?**

```
None. YieldShield has no mainnet deployment. It runs testnet prototypes only: Avalanche Fuji, Stellar testnet, and earlier Base, Monad and BNB testnet prototypes. Each is separate work, not billed here.
```

**Which Circle products are currently integrated?** Check: **USDC**, **EURC**, **cirBTC**.

**Which Circle products do you plan to integrate?** Check: **USDC**, **EURC**, **cirBTC**, **CCTP**, **App Kits**.

### Milestones and timelines

The form takes one entry per milestone: a title (limit 1024) and details (limit 2048).

**Milestone 01 — title**

```
CCTP exits: USDC claims and EURC asset exits can leave Arc through CCTP V2
```

**Milestone 01 — details**

```
What: after a backing exit, matured claim or provider redemption, a user can move the USDC from Arc (CCTP domain 26) to another CCTP domain, and EURC from an asset exit, in a separate reviewed transaction. Built with Circle's App Kit Bridge on TokenMessengerV2 and MessageTransmitterV2, with fee estimate, attestation tracking and recovery. The agent manifest gains unsigned depositForBurn recipes. Pool contracts stay single-chain; nothing is bridged automatically.
Acceptance: source and tests in the public repo; at least 3 Arc testnet CCTP transfers to 2 destination domains with burn, attestation and mint receipts; recovery documented.
Effort: 35 hours at a blended $100/hour = $3,500. Target: 3 weeks after acceptance.
Funding: Self-funded; no grants or investment received to date. Pending applications: Avalanche Team1 Mini Grant (submitted 13 October 2026) and Stellar Community Fund #46 (interest form submitted 13 October 2026). Each chain deployment is separate work; shared core work is listed as already built and is not billed.
```

**Milestone 02 — title**

```
Agent integration: Arc in the YieldShield MCP server, never signing
```

**Milestone 02 — details**

```
What: add Arc testnet to YieldShield's existing agent-core and MCP server. Tools: list pools from the factory, check pool safety (capacity, maturity, provider freeze, oracle freshness against the 3-hour limit) and prepare unsigned transactions for protect, both exits, settlement, provide, redeem, claims and CCTP exits. Agents return calldata for the user's own wallet. Register the risk-check agent's identity in Arc's ERC-8004 IdentityRegistry on testnet, pointing to /agent.json.
Acceptance: tools and tests published; a recorded session where an agent discovers a market, refuses a stale price, prepares an unsigned protection, and a person signs it in MetaMask on Arc testnet; ERC-8004 registration transaction.
Effort: 45 hours = $4,500. Target: 6 weeks after acceptance.
```

**Milestone 03 — title**

```
Testnet pilot and hardening on Arc
```

**Milestone 03 — details**

```
What: invariant tests for reserve, fee and claim conservation across 6- and 8-decimal assets; a published threat model; a public monitoring page for reserve ratios, oracle age and maturities; monthly featured-market replacement; an independent pilot with 10 consenting testers using their own wallets and faucet tokens, completing 30 journeys across both exits, settlement and provider claims. The pilot numbers are targets, not current traction; test activity is never reported as TVL.
Acceptance: test suite and threat model in the repo; monitoring page live; pilot report with transaction links and the fixes it caused.
Effort: 30 hours = $3,000. Target: 9 weeks after acceptance.
```

**Milestone 04 — title**

```
Capped Arc mainnet release, conditional on separately funded audit and legal review
```

**Milestone 04 — details**

```
What: deploy the audited revision to Arc mainnet (chain 5042) with real USDC backing and EURC first. Pricing uses Chainlink EURC/USD and USDC/USD on Arc mainnet; that adapter is already built and tested. Hard caps per market, monitoring, an incident runbook, contracts verified on explorer.arc.io, and deployment evidence.
Precondition: an independent security audit and legal review, both funded outside this grant. If they are not in place, this milestone is a blocker or an agreed scope change, not a completed milestone. No incentives, liquidity mining or token.
Acceptance: audit and legal sign-off referenced; verified mainnet contracts; first capped markets live with monitoring.
Effort: 50 hours = $5,000. Target: after the audit, estimated Q1 2027.
Request: $16,000 in total. $11,000 is for milestones 1-3; $5,000 is for milestone 4 and is paid only if its precondition is met.
```

### Project traction and roadmap

**Where can we verify your traction?** (limit 300)

```
No traction claimed; testnet only. Code and evidence: https://github.com/YieldShield/yieldshield-arc (local, rehearsal and fork runs, all labelled). Arc testnet deployer: https://explorer.testnet.arc.io/address/0x10D42586A65a98BCa4baFAa1bF5DCB10c820f50a
```

**Verification documents (Google Drive folder link)**

```
N/A
```

**Are you funded?**: No

**Technical roadmap: grant milestones** (limit 1250). One line each: what will exist | Circle product | target date | success metric.

```
USDC claims and EURC exits leave Arc through CCTP V2, via App Kit Bridge | CCTP, App Kits, USDC, EURC | 2026-12-21 | 3+ Arc testnet transfers to 2 domains with burn, attestation and mint receipts
YieldShield MCP tools for Arc: discovery, safety and freshness checks, unsigned transactions; ERC-8004 agent identity | USDC, EURC, cirBTC | 2027-01-18 | recorded agent session ending in a MetaMask-signed Arc testnet protection; stale prices refused
Arc testnet pilot and hardening: invariants, threat model, monitoring | USDC, EURC, cirBTC | 2027-02-08 | 10 external testers, 30 completed journeys, monitoring page live
Capped Arc mainnet release after a separately funded audit and legal review | USDC, EURC | Q1 2027, after the audit | verified mainnet contracts with caps and monitoring
```

**Are you seeking funding or support for a smart contract audit or security review?**: Yes

**Audit findings so far** (limit 500)

```
N/A. No internal or third-party audit has been conducted. The repository has 60 Foundry tests (5 fuzz) and a rehearsed deployment; these are not an audit. A capped mainnet release waits for an independent audit.
```

### Deck and demo

**Video demo of the product** (YouTube, Loom or Google Drive link): David records it. See the script outline below.

```
[unlisted video link]
```

**Transcript (Google Drive folder link)**

```
[Google Drive folder link]
```

**Code screenshots per Circle product (Google Drive folder link)**

```
[Google Drive folder link]
```

**Investor deck**

```
[Google Drive folder link, or N/A]
```

**Conflict of interest**: No (confirm before selecting)

**Confirmation checkbox** "I confirm that I have provided view and download access to the files shared above": tick only after the folder is shared.

## Development plan

**Arc is the center, not a deployment target:**
- The backing is USDC on Arc. Every holder claim is a fixed USDC amount on Arc, and USDC also pays for every transaction.
- Both protected assets are Circle-issued on Arc: EURC for FX exposure and cirBTC for BTC exposure.
- Exits leave Arc through CCTP, with Arc as CCTP domain 26.
- The agent surface describes Arc markets for the agentic-economy use case, and the agent's identity is registered in Arc's ERC-8004 registry.
- For the lending use case, the same primitive is composable risk management: a protected EURC position is a fixed USDC claim that other Arc applications can reason about. No integration or partnership is claimed.

**Rate.** A blended $100/hour. Milestones are paid on delivery and acceptance.

### Already built, not billed

**This repository** (`yieldshield-arc`):
- **Contracts:**
  - immutable pool and factory;
  - USDC backing through Arc's ERC-20 interface;
  - support for protected assets with 6 to 18 decimals;
  - the Chronicle adapter with SelfKisser whitelisting and a USDC/USD quote, and the Chainlink adapter for mainnet;
  - the scenario oracle;
  - 60 Foundry tests, 5 of them fuzz tests.
- **App and agent files:** the static app; `/agent.json`, `/llms.txt` and the ABIs.
- **Scripts:** deploy, verify, rehearsal, fork check and the second-wallet journey.
- **Evidence:** 56 local transactions, 6 browser-signed local transactions, the full rehearsal on a chain-5042002 Anvil, and the fork check against the real Chronicle feeds.

**Shared and earlier work, also not billed:**
- the split-risk core inherited from the Avalanche template;
- YieldShield's existing MCP server and agent-core, which milestone 2 extends;
- the Avalanche, Stellar, Base, Monad and BNB prototypes.

### Milestones and acceptance evidence

| Milestone | Work | Acceptance evidence | Effort and budget |
|---|---|---|---|
| 1. CCTP exits | App Kit Bridge / CCTP V2 exits for USDC claims and EURC asset exits from Arc (domain 26). Fee estimate, attestation tracking and recovery. Unsigned `depositForBurn` recipes for agents | At least 3 Arc testnet transfers to 2 destination domains, with burn, attestation and mint receipts. Tests and recovery doc | 35 h, $3,500 |
| 2. Agent integration | Arc in YieldShield's agent-core and MCP server: discovery, safety checks, oracle freshness and unsigned transactions (including CCTP). ERC-8004 identity on Arc testnet | Published tools and tests. Recorded session from agent discovery to a MetaMask-signed testnet protection, including a refused stale price. Registration transaction | 45 h, $4,500 |
| 3. Pilot and hardening | Invariant tests, threat model, monitoring page, monthly market replacement, a pilot with 10 external testers and 30 journeys | Test suite, threat model, live monitoring and a pilot report with transaction links and fixes. Targets, not traction | 30 h, $3,000 |
| 4. Capped Arc mainnet | Audited revision on Arc mainnet with Chainlink pricing, caps, monitoring, runbook and verified contracts | Audit and legal sign-off referenced, verified contracts and capped markets live. **Precondition:** a separately funded audit and legal review. Otherwise this is a blocker or an agreed scope change, not a completed milestone | 50 h, $5,000 |

### Proposed request: $16,000

- **Core: $11,000** for milestones 1–3.
- **Conditional: $5,000** for milestone 4, paid only if its precondition is met.

**Rationale.**
- **Sized to the program.** Payouts so far average about $8.6k per accepted team ($285k over 33 teams), and Cohort 2 has $135k for 14+ teams. The core ask stays close to that, and the mainnet tranche is gated separately.
- **Every hour is new, Arc-specific work.** That means CCTP, Arc MCP tools, the Arc pilot and the Arc mainnet release. Everything already built is listed above and not billed.
- **Audit funding is not included.** We would welcome Circle's help with introductions or security-review support, which is why the audit question is answered Yes.
- **Nothing is billed twice.** No deliverable is billed to another program. If overlapping funding appears, it will be disclosed and the scope repriced before acceptance.

## Video script outline (5 minutes)

1. **0:00–0:30, intro.** What YieldShield Arc is, in one sentence. Then say: testnet only, unaudited, test tokens with no monetary value.
2. **0:30–2:30, code walkthrough.** Show where each Circle product is used:
   - **USDC:**
     - `contracts/src/ShieldPool.sol`: backing as the 6-decimal ERC-20 interface, never `msg.value`; `protect`, `exitBacking`, `settleExpired` and `claimBacking`;
     - `src/chain.ts`: the USDC address `0x3600…0000` and `GAS_RESERVE`;
     - `scripts/deploy-arc-testnet.mjs`: one balance with two views, and the 20 gwei fee floor.
   - **EURC:**
     - `contracts/src/ShieldFactory.sol`, `allowed()`;
     - `contracts/src/ShieldOracles.sol`: `ShieldChronicleOracle`, EURC/USD ÷ USDC/USD.
   - **cirBTC:** `assetUnit` in `ShieldPool.sol` (8 decimals), and `contracts/test/ShieldDecimals.t.sol`.
   - **Agent surface:** `src/agent-manifest.mjs`, then `/agent.json` in the browser.
3. **2:30–4:15, integration demo.** Use the Arc testnet deployment if verified by then; otherwise the local chain, clearly labelled:
   - provide USDC;
   - protect EURC;
   - a price move;
   - a partial asset exit with fees;
   - a backing exit;
   - the status page showing price age against its limit.
4. **4:15–5:00, planned work.**
   - **CCTP exits:** TokenMessengerV2 on domain 26, through App Kit Bridge.
   - **MCP tools**, and the ERC-8004 identity.
   - **The capped mainnet release**, conditional on an audit.

## David-only actions

1. Claim 20 USDC from https://faucet.circle.com (Arc Testnet) for the deployer `0x10D42586A65a98BCa4baFAa1bF5DCB10c820f50a`. The faucet has reCAPTCHA.
2. Claim 20 USDC and 20 EURC for the journey wallet `0x424cb86EEd3Bf1101C0f2b6f74Db2C291284456d`.
3. Once the Chronicle feeds are fresh, run the deploy, verify and journey commands, then commit the manifest and evidence ([operations](../OPERATIONS.md)).
4. Create the Vercel project `yieldshield-arc` and the domain `arc.yieldshield.ai` ([hosting](../HOSTING.md)), and do one real MetaMask transaction.
5. Decide on repository visibility, and confirm Santiago's city and GitHub.
6. Record the video, then put the transcript, code screenshots and a deck (or N/A) in one Drive folder with view and download access.
7. Resolve the commitment questions across applications, update the [funding register](../../../docs/grants/FUNDING_REGISTER.md), then read the terms and submit on Questbook.
8. Questbook sign-in, any screenings and accepting a grant agreement are owner-only.
