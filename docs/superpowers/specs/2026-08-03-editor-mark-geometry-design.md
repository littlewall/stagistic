# Stagistic Editor Mark Geometry

## Scope

Replace the landing page's Editor mark geometry with the approved preview
without changing its colors, identity, or usage.

## Approved geometry

- Canvas: `135 × 130`, `viewBox="0 0 135 130"`.
- Portal: bounded by `x=15..135` and `y=0..120`.
- Plane: `M45 100H135V120L123 130H0Z`.
- The plane and portal share the right edge at `x=135`.
- The plane diagonal passes through the portal's lower-left corner at
  `(15,120)`.
- The character and full dialogue rows are centered on the portal at `x=75`.
- The short dialogue row remains aligned with the full rows' left edge.
- No geometry extends outside the viewBox.

## Variants

- On light: brown portal, orange plane, paper-white symbol.
- On dark: paper-white portal, orange plane, brown symbol.
- Adaptive favicon SVG: same geometry and light/dark color switching.

## Raster derivatives

- `favicon-16x16.png`: 16 × 16.
- `favicon-32x32.png`: 32 × 32.
- `favicon.ico`: contains 16 × 16 and 32 × 32 entries.
- `apple-touch-icon.png`: 180 × 180, white background, approved mark scaled
  to 160 px wide and centered horizontally and vertically.

## Verification

- Parse all SVGs successfully.
- Assert the canonical SVG dimensions and raster dimensions.
- Render the light and dark marks for visual inspection.
- Run the landing tests, typecheck, build, and `git diff --check`.

