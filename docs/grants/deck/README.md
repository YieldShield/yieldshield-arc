# Arc Circle grant deck

The native presentation is edited in place:
https://docs.google.com/presentation/d/1eq5wCaF0WdbLTRk8_ZTXjNXcX1A6Z0pzSqBLpis_ReQ/edit

Its application PDF keeps the original file ID:
https://drive.google.com/file/d/1p2Z-BrsxhwNZD4KwvxFsHj5FE8tdvA22/view

## Edit source

`redesign-requests.mjs` emits separate Google Slides batch-update batches for
the title slide, editable diagrams/layouts, and deployed-product screenshot.
It does not authenticate or publish. Run it with a full native presentation
readback and an output directory. These are one-time migrations of the source
objects, not an idempotent rebuild. `build-requests.mjs` retains the preceding
content and founder-photo migration for provenance.

The redesign adds a title slide and retains all eight original page identities:

1. `arc_title_20261020`: a minimal title over architectural cover art.
2. `p1`: the holder's choice, shown as two branches.
3. `p2`: asset and capital flows into the pool, with the 150% reserve ratio.
4. `p3`: the two exits, gain-fee split and maturity behavior.
5. `p4`: current Circle assets and Arc architecture beside proposed bridges.
6. `p5`: an actual deployed markets screenshot and test evidence.
7. `p6`: a pilot funnel with measurable, explicitly future targets.
8. `p7`: large founder portraits, names, roles and concise experience.
9. `p8`: the native four-milestone budget table.

The 960 × 540 point canvas uses Manrope, forest green, warm ivory and coral.
All narrative text, flow connectors, diagram labels and table cells remain
editable. Generated art is confined to the title background. The product image
is a genuine capture; the founder photos are retained without facial edits.

The two portrait objects are each 195 × 195 points. Their native IDs remain
`arc_david_portrait` and `arc_santiago_portrait`, with accessible names.

## Visual provenance

- `assets/markets-live-2026-10-20.png`: captured from
  https://arc.yieldshield.ai/markets in Chrome on 20 October 2026. Displayed
  with its original aspect ratio. This is the disconnected public testnet UI.
- `assets/arc-cover.png`: generated with OpenAI image generation on
  20 October 2026. It is decorative artwork, not a product view, token logo,
  financial model or safety guarantee. The original 1672 × 941 aspect ratio
  is retained with a negligible vertical bleed.

Cover generation prompt:

> Use case: stylized-concept. Asset type: full-bleed 16:9 title-slide background
> for YieldShield Arc, a protocol for funded protection of tokenized assets.
> Refined architectural still life with a sculptural deep forest green arch
> sheltering two simple warm ivory circular discs, on a low muted coral stone
> foundation, in a seamless dark evergreen studio (#12372c). Sculpture entirely
> in the right 48%, quiet left 52% for native editable title. Large, tactile matte
> stone and satin ceramic, restrained premium editorial lighting, soft shadows,
> no glow, no currency markings, no text, logos or watermarks.

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
