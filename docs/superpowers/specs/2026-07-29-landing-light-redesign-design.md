# Landing Light Redesign — Design

**Date:** 2026-07-29  
**Status:** Approved

## Goal

Move the Stagistic landing page into a predominantly light, editorial register
while keeping the script editor as its visual centre. Only the navigation and
footer remain dark. Their text contrast must improve over the current design.

The redesign keeps the existing section order and copy. It changes the visual
hierarchy of the hero, adds image-ready feature rows, and carries one restrained
organic shape language through both areas.

## Design direction

The selected direction is **Organic background**:

- the page uses Brand Paper and related warm light surfaces;
- dark Umber is reserved for the sticky navigation and footer;
- a shifted neutral backing plate sits behind the hero editor preview;
- each feature row uses a quieter variation of that plate behind its image;
- Copper remains an action colour, not decoration;
- Lavender remains a focus and utility colour.

The backing shapes use CSS pseudo-elements with asymmetric border radii and
small rotations. They preserve the aspect and overall silhouette of the
rectangular element in front instead of becoming independent oval blobs. Their
fill is a low-opacity neutral overlay rather than an opaque colour. It therefore
darkens whatever section background sits below it by the same relative amount.
The backing shape is itself the visual shadow, so it has no CSS `box-shadow`.
Hero and feature previews use the same transparent fill and border tokens. The
blobs remain quieter than the preview above them and use no gradients or
continuous animation.

## Page structure

Keep the current landing page sections and order:

1. sticky navigation;
2. hero;
3. theatre-specific positioning;
4. features;
5. FAQ;
6. free/forever call to action;
7. footer.

The redesign does not add a feature grid, carousel, metrics, or new navigation
layer. Existing copy and link destinations remain unchanged.

## Colour and contrast

The hero and free/forever call to action no longer use the dark stage surface.
All content sections use Brand Paper or closely related warm, light surfaces,
separated by restrained borders and spacing rather than alternating high-
contrast bands.

A one-pixel divider separates the theatre statement from Features and Features
from FAQ. Both dividers are limited to the 72rem content container instead of
spanning the viewport.

The sticky navigation and footer use Brand Umber. Their primary text uses Brand
Paper. Muted navigation, metadata, and footer text use an approximately 80%
Paper mix and maintain at least 4.5:1 contrast against Umber. Hover and focus
states increase contrast without shifting the layout.

Navigation links use the primary Paper text colour at rest. Hover adds an
underline rather than relying on a colour change for visibility.

The free/forever card becomes a lightly raised paper surface without a border
and is vertically centred against the section copy. The principal browser links
remain Copper brand CTAs.

## Hero

Desktop keeps the current two-column composition in a hero whose minimum height
is 90% of the viewport: copy and CTA on the left, editor preview on the right.
The preview becomes a deliberate, non-interactive editor mock:

- a compact editor bar;
- a script structure/sidebar area;
- a readable script page using Courier Prime;
- a restrained border, radius, and canvas shadow.

The structure should be suitable for replacement by an interactive preview
later without changing the surrounding hero layout.

A warm-neutral backing plate sits behind the preview. It follows the preview's
rectangular proportions, is slightly rotated, and extends beyond more than one
edge of the editor shell. Its mildly irregular corners break uniformity without
turning it into a separate oval shape. The preview remains the foreground
object.

On narrow viewports the hero becomes one column, the preview moves below the
copy, perspective transforms are removed, and the blob scales down without
causing horizontal overflow.

## Feature rows

Each of the six existing features remains one horizontal row. On desktop:

- text is on the left;
- media is always on the right;
- the media stage is a low landscape rectangle with a 16:9 aspect ratio;
- text and media are vertically centred;
- rows use whitespace without separator borders or alternating backgrounds;
- the whole features section uses the same light surface as its adjacent
  content sections.

Every media stage includes a smaller, quieter backing plate behind the image.
It follows the image frame's rectangular proportions. Several controlled
offset, corner, and rotation variants avoid mechanical repetition, but the image
position remains consistent. The plate is never an image mask.

On narrow viewports each row stacks in reading order: text first, media second.

## Feature media contract

The feature data gains explicit media metadata:

- image source;
- alternative text;
- fit mode;
- object position or crop focus;
- shape variant; omitting it selects the default shape.

The media frame supports two fit modes:

- `cover` crops a temporary or deliberately full-bleed image;
- `contain` preserves the full bounds of future square or landscape assets.

The frame uses an opaque warm surface and a subtle full border. Transparent
assets therefore retain a deliberate backdrop, while screenshots with their own
edges or non-transparent backgrounds remain visually separated from the page.
No edge fade, transparency mask, or gradient is applied.

Until final feature images are supplied, all rows use
`/editor-preview.png` in `cover` mode with feature-specific object positions.
Replacing those placeholders later must require data changes only, not layout
or CSS changes.

## Footer

The footer becomes the second and final dark section. It keeps the existing
landing links and adds the same brand line used by the editor:

`© Stagistic • Made with 💛 in Prague`

The line replaces the current left-side tagline so the footer stays compact.
Links and secondary text use the improved high-contrast muted colour; hover and
keyboard focus states remain clearly visible.

## Motion and accessibility

Keep the current short entrance and reveal transitions. Organic shapes remain
static. `prefers-reduced-motion` continues to remove transforms and unnecessary
motion.

The redesign preserves semantic navigation, headings, links, FAQ `details`
controls, image alternative text, and visible `:focus-visible` rings. The
sticky navigation must not obscure anchored sections. No information is
communicated by colour alone.

## Implementation boundaries

The change stays within the existing Astro landing page:

- `apps/landing/src/pages/index.astro`;
- `apps/landing/src/pages/index.module.css`;
- landing colour tokens in `apps/landing/src/styles/global.css` only where
  shared token changes are necessary.

No new runtime dependency, image library, JavaScript interaction, or stored
data is required. The existing intersection observer remains sufficient for
section reveals.

## Verification

Verify:

- landing Astro typecheck and production build;
- canonical repository lint for touched Astro and CSS;
- desktop composition with the editor preview and every feature image on the
  right;
- mobile stacking, no horizontal overflow, and readable hero preview;
- square, landscape, transparent, and opaque media fixtures through the media
  contract;
- navigation and footer text contrast, focus-visible states, and reduced
  motion;
- all existing links and FAQ interactions.

After implementation, run `graphify update .`. Do not commit automatically;
prepare the changes and suggested commit message for user review.
