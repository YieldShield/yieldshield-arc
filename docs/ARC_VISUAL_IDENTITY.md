# Arc website artwork

The homepage uses the original architectural cover artwork approved in the
20 October 2026 Arc deck review. Source:
`docs/grants/deck/assets/arc-cover.png`. Its generation prompt and provenance
are recorded in `docs/grants/deck/README.md`.

The image is decorative. It does not represent token values, reserves, a
guarantee, or a product screenshot. The live headline, explanation and links
remain ordinary accessible HTML.

## Web assets

The original PNG is converted to WebP at quality 84, with no enlargement:

- `public/images/arc-sculpture-960.webp`: 960 pixels wide, 25,606 bytes.
- `public/images/arc-sculpture-1672.webp`: 1672 pixels wide, 71,782 bytes.

The image element declares both intrinsic dimensions and a responsive source
set. It loads with high priority because it is visible at the top of the page.
No image-generation API or image-processing library is shipped to the browser.

## Website composition

Forest green `#12372c`, warm ivory `#f6f5ef`, sage `#b7cbbc`, and coral `#ed765e`
carry the cover's identity into the homepage. The existing application
navigation stays compact. Protect and Provide are the two primary actions;
a quieter link explains the mechanism.

Below 1100 pixels, the copy and image stack so the sculpture cannot obscure
the text or controls. Decorative image edges blend into the green background.
Focus outlines remain visible; button transitions respect reduced motion.

## Validation

The production build passes. All nine existing app/parity browser tests pass,
including direct routes at 390 pixels, wallet state handling and the faucet
return journey. The desktop, 390-pixel phone and 900-pixel tablet layouts were
visually inspected in Chrome. Both homepage role buttons were followed into
the corresponding live-data forms.
