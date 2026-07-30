# Landing Editor Branding and Favicons

## Goal

Make the current landing page unambiguously about Stagistic Editor while
preserving Stagistic as the umbrella brand and Stagistic Syntax as an
independent format.

## Brand language

- Use **Stagistic Editor** whenever copy describes the editor product.
- Use **Stagistic** alone for the umbrella brand, including the homepage footer.
- Keep **Stagistic Syntax** as the independent format name.
- Preserve the existing page structure, visual system, and content hierarchy.

## Homepage header

Replace the current `Stagistic` plus `Editor` pill with one editor lockup:

- the editor symbol;
- one uninterrupted `Stagistic Editor` text run;
- the same font, size, weight, and color for both words;
- no badge or other emphasis on `Editor`.

The existing dark header uses the on-dark symbol:

- portal: `#fffaf6`;
- plane: `#e2a05f`;
- inner editor symbol: `#3d2a1d`.

Keep both supplied symbol variants as reusable SVG assets:

- on light: brown portal, orange plane, white symbol;
- on dark: white portal, orange plane, brown symbol.

Use the revised geometry supplied on July 30:

- the portal ends at `y = 96`;
- the plane crosses the portal at `(20, 96)`;
- the plane continues from `(48, 76)` to the right edge, then to
  `(123.8, 111)` and `(-1, 111)`.

The SVG is decorative beside the visible wordmark and must not create a
duplicate accessible name.

## Homepage copy

Update the page title, metadata, hero, theatre section, feature alternative
text, free section, and FAQ answers wherever `Stagistic` currently refers to
the editor product. Do not change generic footer branding to
`Stagistic Editor`.

## Homepage calls to action

Keep `Open editor in browser` as the primary hero action. Add an outline
`Explore features` action beside it that links to `#features`. Match the
primary button's dimensions, radius, interaction movement, and focus treatment;
use the existing page text and border colors rather than introducing another
accent.

## Get started copy

Keep the heading:

> Stagistic Editor is free. Forever.

Use this primary text:

> Stagistic Editor is free to use in your browser, with no account or paywall.
> Every current and future Editor feature will remain free.

Use this secondary text:

> Stagistic will grow into a family of tools for theatre and production. Some
> future tools may be paid, but Stagistic Editor will always be free and open
> source.

## Syntax header

The `/syntax` header contains only a left-aligned `Back to site` link.
Remove the logo, product name, `Features` link, and all right-side header
content. Keep the page title and prose about **Stagistic Syntax** unchanged.

## Favicons and browser theme

The landing app receives:

- an adaptive `favicon.svg` that switches between the supplied on-light and
  on-dark palettes through `prefers-color-scheme`;
- fallback 16×16 and 32×32 PNG favicons;
- a multi-size `favicon.ico`;
- a 180×180 Apple Touch icon;
- a browser `theme-color` of `#3d2a1d`.

The Apple Touch icon uses the brand-white `#fffaf6` background and the on-light
editor symbol. Render the symbol 160 px wide in the 180×180 canvas, clear SVG
page offsets before compositing, and center it precisely on both axes. No web
app manifest, PWA metadata, or PWA icon sizes are added.

Reference the favicon and theme metadata from both the homepage and `/syntax`.

## Verification

- Build the landing app.
- Extend landing tests to verify the homepage editor lockup, umbrella-brand
  footer, product-specific copy, hero feature CTA, free-product promise,
  simplified syntax header, unchanged Stagistic Syntax naming, favicon links,
  and theme color.
- Check generated raster dimensions and confirm the SVG remains valid.
- Run the landing package tests and lint the changed source files.
- Update the project graph after implementation.
