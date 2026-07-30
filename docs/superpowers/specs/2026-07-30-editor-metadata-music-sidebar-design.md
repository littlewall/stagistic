# Editor Metadata, Music-Out, and Sidebar Design

## Goal

Bring the web editor's browser identity in line with the landing app, make
document titles contextual, prevent music-out endpoints on structural blocks,
and keep both sidebars available only when the viewport is at least 1470 px
wide.

## Browser identity

- Reuse the landing app's adaptive SVG favicon, 16 px and 32 px PNG fallbacks,
  multi-size ICO, and 180 px Apple Touch icon.
- Use the same `#3d2a1d` browser theme color.
- The boot-time title is `Stagistic Editor`.

## Document titles

Use the format `context — Stagistic Editor`:

- scripts home: `Scripts — Stagistic Editor`;
- script editor: `<script title> — Stagistic Editor`;
- export: `Export · <script title> — Stagistic Editor`.

Titles follow live script-title drafts in the editor and restore the previous
title when their owning route unmounts. Route changes commit the title through
a layout effect so the browser never paints the preceding route's title.

## Music-out drag constraint

An explicit or orphan music-out endpoint cannot be dropped onto `act` or
`scene` blocks. Enforce this in the shared drop-domain predicate so invalid
targets receive no preview and no drag command. Preserve the current ordering,
scene, and next-music constraints for all other blocks.

## Responsive sidebars

Use two independent viewport thresholds:

- 1470 px and wider: both sidebars may be open;
- 1200–1469 px: at most one sidebar may be open, using the existing inline
  column layout;
- 1199 px and narrower: at most one sidebar may be open, using the existing
  overlay layout.

Crossing below 1470 px while both sidebars are open closes the left sidebar,
matching the current narrow-layout reconciliation.

## Verification

- Test web head metadata and favicon asset dimensions.
- Test title formatting and route-owned document-title updates.
- Add regression tests for `act` and `scene` music-out targets.
- Test sidebar exclusivity independently from overlay placement.
- Run focused tests, package typechecks/lint, the relevant browser tests, and
  update Graphify.
