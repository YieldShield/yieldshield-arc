# Arc demo video revision — 20 October 2026

The current 4:31 cut starts with the deployed app and replaces the earlier
code-heavy 4:56 video. It devotes about 2:47 to the public UI and actual explorer
receipts, 1:10 to the required USDC/EURC/cirBTC code walkthrough, and 34 seconds to
planned milestones. The narration and complete visual sequence are in the
[script](narration-script.md) and [transcript](transcript.md).

## Capture and narration

Fourteen real browser states were captured from `arc.yieldshield.ai` and the Arc
testnet explorer on 20 October. The sequence demonstrates market comparison,
terms, selecting EURC and cirBTC, entering protection and provision amounts,
faucet guidance, preserving the amount on return, Portfolio, Agents and
successful reads from all three deployed markets. Images are cropped and framed
for readability; page text, balances and state are not fabricated.

This is an edited screenshot sequence, not continuous screen recording. The
wallet remains disconnected; no quote confirmation, wallet signature or new
transaction is shown. Public receipts are evidence of the project's scripted
test wallet. They are not external adoption. The closing card states this
explicitly. The six code excerpts retain their cited `cad2203` source, verified
unchanged in the current repository's four displayed source/test files.

Narration was generated with the existing Chris voice through the signed-in
ElevenLabs browser, then transcribed with its Scribe browser interface to check
the speech and align visual cues. The final text preserves the intended token
and code-symbol spellings. No subscription, voice clone or account-permission
change was made.

The roadmap distinguishes USDC's `TokenMessengerV2.depositForBurn` from EURC's
TokenManager approval and `CrossChainTokenService.crossChainTransfer`. Four
transfers remain planned: both assets from Arc to Ethereum Sepolia and Base
Sepolia. The 10-tester/30-journey pilot is a target; $5,000 of the $16,000 request
is conditional on a separately funded independent audit and legal review.

## Media checks

- Duration: **270.666667 seconds (4:31)**, below the five-minute limit.
- Video: H.264, 1920 × 1080, 30 fps. Audio: AAC, 48 kHz.
- Size: **11,853,770 bytes**.
- SHA-256: `a978fb19ca9c212d5944d911cd26459fa3eff561a7cc18d3a748e5c1a504f7b3`.
- The complete final video decoded without errors.
- Representative frames throughout all ten sections were visually inspected;
  the final status and closing frames were rechecked after correcting their
  caption/layout and replacing older signing language.
- Narration is 267.258750 seconds plus a 0.4-second lead and three-second silent
  tail, rounded to the 30 fps frame grid. Word-aligned cues keep displayed pages
  consistent with the spoken walkthrough.
- The [manifest](video-manifest.json) records timing and capture checksums.

## Replaced review attachments

Existing files were replaced in place. Metadata readback confirmed file IDs,
parent folder, sizes, modification times, owner and existing link-reader access.

- [Video](https://drive.google.com/file/d/1aFfIWxz5a6jiGJfXR2vTM8rvgkWU59pj/view):
  modified **07:38:25 UTC**, 11,853,770 bytes.
- [Transcript](https://drive.google.com/file/d/1tdUpJnxMRgDl5Da1pnIls1CtKOI0IUsy/view):
  modified **07:38:31 UTC**, 13,548 bytes.

On opening the replaced video, Drive reported that processing for playback was
still underway. Local playback media and full decoding were checked; this note
does not claim a completed Drive transcode. The local review copy is
`output/circle-arc-submission/ui-first/YieldShield-Arc-UI-demo.mp4` in the parent
workspace. The application retained these same attachment links and was submitted on
20 October 2026 after anonymous download checks; see the
[submission receipt](../CIRCLE_FINAL_REVIEW_2026-10-20.md).
