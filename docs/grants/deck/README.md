# Arc Circle grant deck

The native presentation is edited in place:
https://docs.google.com/presentation/d/1eq5wCaF0WdbLTRk8_ZTXjNXcX1A6Z0pzSqBLpis_ReQ/edit

Its application PDF keeps the original file ID:
https://drive.google.com/file/d/1p2Z-BrsxhwNZD4KwvxFsHj5FE8tdvA22/view

## Edit source

`build-requests.mjs` emits Google Slides batch-update requests. It does not
authenticate or publish. The `team` phase edits the founder layout; the `story`
phase refines the narrative and recreates the milestone table as native cells.
These are one-time migrations of the source slide objects, not an idempotent
rebuild of an empty presentation.

The eight source slides keep their identity and order:

1. Cover: existing `p1`, headline and grant split.
2. Problem: existing `p2`, holder and provider perspectives.
3. Mechanism: existing `p3`, entry, two exits and maturity.
4. Circle integration: existing `p4`, assets and planned routes.
5. Evidence: existing `p5`, deployment checks and honest limits.
6. Pilot: existing `p6`, recruitment, journeys and measurements.
7. Team: existing `p7`, replace text-only layout with the founder portraits.
8. Milestones: existing `p8`, replace the raster table with native table cells.

The original 16:9 canvas, Arial typography and green/coral identity remain.
All narrative text and the milestone table are native editable objects.
Portraits retain their square proportions with no facial edits.

The two portrait objects use the local files below, each at 135 × 135 points.
David sits at (45, 171) points and Santiago at (502.5, 171) points on slide `p7`.
The native object IDs are `arc_david_portrait` and `arc_santiago_portrait`.
Insert them through the Google Drive connector's local-image sidecar before
applying the `story` phase, which adds their accessible names.

## Content checks

The revised copy agrees with `../ARC_PILOT_PLAN.md` and
`../CCTP_ROUTE_VALIDATION_2026-10-20.md`:

- The pilot's invitations, interviews, users, journeys and follow-on interest
  are future targets, not existing traction.
- Planned CCTP routes cover USDC and EURC from Arc Testnet to Ethereum Sepolia
  and Base Sepolia. USDC and EURC use different CCTP contract interfaces,
  explained in the slide notes.
- The grant request stays $16,000 for 160 hours. The $5,000 mainnet milestone
  remains conditional on an independent audit and legal review funded
  separately. Existing work is not billed.
- Deployment checks mean comparison with the build and on-chain readback,
  not explorer source verification or an audit.
- The evidence comes from project-controlled scripted wallets. No browser
  wallet signing or external users are claimed.

## Photo provenance

The portraits come from the existing Drive presentation
`YieldShield_V0.13_Robinhood.pptx`, slide 13, titled **Team/Partnerships**.
Source: https://docs.google.com/presentation/d/1s74o5XRnIDTBbQAaa99iY1M_tRgiG3Ow/edit

- `assets/david.png`: original `ppt/media/image26.png`, relationship `rId3`,
  above the David Hawig label.
- `assets/santiago.png`: original `ppt/media/image18.png`, relationship `rId4`,
  above the Santiago Balaguer label.

The images were previously extracted for the Flare submission. The source
metadata and named team text were checked again through Drive on 20 October
2026. Their names are grounded in that source layout, not face recognition.
