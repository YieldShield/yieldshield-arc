# Arc testnet pilot plan

Prepared 20 October 2026 for the Circle grant draft. These are proposed targets. YieldShield has no external Arc users, pilot commitments or partners to report yet. Project-controlled wallets and automated journeys are engineering evidence only.

## First users and the question to answer

Recruit **10 external consenting testers** from at least three independent teams, aiming for:

- **Four treasury or payments builders** with EURC balances or EUR/USD exposure: can they understand the fixed USDC claim and choose an exit?
- **Three lending or asset-management builders** evaluating cirBTC collateral: can they distinguish protection-holder benefits from provider downside and locked capital?
- **Three agent developers**: can they discover terms, reject stale or unavailable data, and prepare a transaction that a person can review?

Participants can take both holder and provider roles. They use their own wallets and faucet tokens only. No incentives, capital deposits, investment intent or commercial partnership is implied.

The pilot tests whether the mechanism is useful and understandable before spending on mainnet launch. Interview findings may show that the proposed segment is wrong; the report must include that outcome rather than count participation as demand.

## Recruitment and ownership

David owns recruitment and technical support; Santiago owns the test script, interviews and usability analysis.

| Period after grant acceptance | Planned action | Evidence |
| --- | --- | --- |
| Weeks 1–3 | Identify 20 relevant builders through the Arc community and developer events, Circle developer channels, the founders' existing professional network, and publicly listed Arc projects. Seek permission before posting in community spaces. | Private recruitment log: segment, contact channel, response and next step |
| Weeks 3–6 | Conduct five short discovery interviews; invite suitable testers to a 30-minute onboarding session; target 10 consents and two written expressions of interest in a follow-on integration discussion. | Consents and interview notes; statements remain private unless the participant approves attribution |
| Weeks 7–9 | Run asynchronous tasks and two group office hours; collect wallet receipts, completion times, errors and interviews; fix critical findings and retest. | Public anonymized pilot report and issue/commit links |

No outreach has been sent as part of this plan. Named community channels are recruitment sources, not endorsements or existing relationships. An expression of interest is not revenue, a customer contract or a committed integration.

The 20 invitations, five interviews and two expressions of interest are funnel targets. The grant's completion target remains 10 external testers and 30 completed journeys; a shortfall is reported with an explanation and next step rather than presented as success.

## Test protocol and measurable outcomes

Before onboarding, publish a brief risk explanation: testnet only; unaudited; provider losses are possible; maturity changes available exits; reference prices may be stale; the synthetic scenario market is not a market price. Each participant confirms their understanding of the fixed claim, fee and maturity behavior.

Across the cohort, target **30 complete journeys**:

| Journey | Target count | Completion evidence |
| --- | --- | --- |
| Open protection, then retrieve the asset | 10 | Approval/deposit and asset-exit receipts; asset balance and fee checked |
| Open protection, then take the USDC backing exit | 10 | Entry and backing-exit receipts; fixed claim and USDC balance checked |
| Settle a matured position and collect the owner's claim | 5 | Settlement and claim receipts; ownership and resulting balance checked |
| Provide backing, request withdrawal and collect provider proceeds | 5 | Funding, notice/redemption and claim receipts; reserve constraints explained |

Use both EURC and cirBTC reference markets when feeds are valid. Use clearly labelled short-maturity test markets for maturity tasks. Synthetic scenarios are reported separately; no stale price is overridden to make a task pass.

Additional measures:

- At least **8 of 10 testers** complete one assigned core journey without live founder intervention after the same written onboarding.
- Each participant can correctly describe their USDC claim, the gain fee and when asset retrieval ends before signing. Record misunderstandings and UI fixes.
- Record attempt counts, completions, median completion time, rejection/cancellation reasons, stale-price refusals and RPC failures. Do not hide failed attempts from the denominator.
- Every critical defect found is fixed and retested before the pilot is called complete. Report remaining noncritical issues.
- Interview at least five testers after use: relevance to their actual workflow, alternatives used today, and willingness to discuss integration. Report negative feedback and the number of genuine follow-on expressions of interest.

Receipts can be published only with participant consent. Store contact details and consent privately; public evidence uses participant codes and approved transaction links. Testnet activity is not TVL, revenue or commercial traction.

## Budget and acceptance

Milestone 3 remains **30 grant-funded hours / $3,000**, targeting week 9: six hours of additional invariant coverage, six hours for threat-model work, six for monitoring, eight for pilot analysis and fixes, and four for replacement-market operations and reporting. Founder recruitment, interviews and ordinary support beyond this engineering allowance are self-funded. If defects need more work, report the delay and replan rather than reducing the safety acceptance.

Publish the new invariant tests, threat model, monitoring page and pilot report with approved transaction evidence, measured results and linked fixes. Ten external testers and 30 successful journeys remain acceptance targets; the two follow-on interest statements are a learning target, not a fabricated prerequisite.

## Concise application text

No external users or commitments yet; testnet only. David led ecosystem work at Web3 Foundation and exited two startups; Santiago has 15 years in product. We will invite 20 Arc treasury, lending and agent builders through developer communities and our existing network, interview five, and recruit 10 consenting testers. The pilot targets 30 journeys, 8/10 completing a core flow without live help, and two follow-on integration expressions of interest. These are targets, not traction. Alternatives include Derive, Nexus Mutual and Aave; our proposed edge is a fixed, fully reserved USDC claim with gain-based fees and unsigned agent workflows.

This plan responds to [Circle's grant criteria](https://www.circle.com/grant), which consider real usage, pilots, partnerships or a credible route to them. It does not claim Circle has approved these targets or the application.
