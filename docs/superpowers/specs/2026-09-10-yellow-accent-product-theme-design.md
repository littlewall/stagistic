# Yellow-accent product theme — design

**Date:** 2026-09-10
**Status:** approved
**Scope:** product UI in apps/web; landing page is a separate second phase

## 1. Problem

The product currently derives its light and dark themes from the Stagistic paper,
umber, aubergine, copper, and lavender palette. The replacement palette changes both
the neutral character and the accent semantics:

- Snow White becomes the paper reference.
- Steel Wool becomes the neutral foundation.
- Wet Weather becomes the secondary neutral.
- Muted Lime becomes the selection and utility accent.
- Primrose Yellow becomes the action, music, progress, and attention accent.

This is not a direct five-token substitution. The exact swatches do not provide enough
contrast or tonal steps for text, surfaces, borders, hover, focus, selection, disabled
states, and both themes. The product therefore needs a semantic theme derived from the
five fixed anchors with relative OKLCH lightness and chroma adjustments.

The redesign must keep the editor a writing instrument. It may refine visual hierarchy,
radii, shadows, and state treatment, but must not change information architecture,
control placement, keyboard behavior, document behavior, or stored data.

## 2. Goals

- Apply one coherent palette to the complete product UI rendered by apps/web, including
  home, editor, export, settings, dialogs, and shared controls.
- Support light, dark, and automatic theme modes with the same semantic color roles.
- Keep the script canvas visually dominant and the script itself a continuous document.
- Use Primrose Yellow sparingly for action, music, progress, attention, and the scene
  start marker.
- Use Muted Lime for selection, focus, active data items, and drop targets.
- Replace card-like active sidebar rows with fill-only selection.
- Make ordinary controls slightly more precise by reducing indiscriminate pill radii.
- Meet WCAG AA contrast requirements and preserve visible keyboard focus.

## 3. Non-goals

- No landing-page CSS, assets, screenshots, favicons, Open Graph imagery, or
  apps/landing/brand-spec.md changes in this phase.
- No layout, spacing, control-size, breakpoint, navigation, or editor-document changes.
- No change to character-assigned colors or their dynamic color derivation.
- No change to the meaning of success and danger colors.
- No blanket removal of existing color-mix() expressions unrelated to the new theme.
- No database or script-document schema changes.

## 4. Palette anchors

The following sRGB-derived OKLCH values are the immutable theme anchors:

| Palette color | HEX | OKLCH | Role |
| --- | --- | --- | --- |
| Snow White | #f0eee8 | oklch(.9490 .0083 91.48) | Light-theme paper |
| Steel Wool | #5b6267 | oklch(.4918 .0118 238.71) | Neutral foundation |
| Muted Lime | #cbc074 | oklch(.8000 .0978 101.11) | Selection and utility |
| Primrose Yellow | #f4ca52 | oklch(.8540 .1432 89.53) | Action, music, progress, attention |
| Wet Weather | #878585 | oklch(.6184 .0024 17.22) | Secondary neutral |

Derived colors use relative oklch(from ...) syntax. New theme derivations do not use
color-mix(). Lightness and chroma may be calibrated during implementation to meet the
contrast requirements in section 11, but hue remains inherited from its approved anchor.

## 5. Semantic token architecture

Rename the current hue-specific foundations to semantic foundations:

    --base-neutral: var(--palette-steel-wool);
    --base-selection: var(--palette-muted-lime);
    --base-action: var(--palette-primrose-yellow);

The old --base-blue and --base-amber names do not survive as permanent aliases. Their
consumers are semantic tokens, so the migration remains concentrated in the token layer.

The initial approved relationships are:

    --color-surface-paper: var(--palette-snow-white);
    --color-text: oklch(from var(--base-neutral) .28 calc(c * 1.25) h);
    --color-text-muted: oklch(from var(--palette-wet-weather) .46 c h);

    --state-selected: oklch(from var(--base-selection) .91 calc(c * .35) h);
    --state-selected-edge: oklch(from var(--base-selection) .59 calc(c * .95) h);
    --color-focus-ring: oklch(from var(--base-selection) .55 calc(c * 1.1) h);

    --color-accent: var(--base-action);
    --color-on-accent: oklch(from var(--base-neutral) .27 calc(c * 1.2) h);

These values establish the role and direction. Contrast verification, not visual
guesswork, decides any final lightness or chroma correction.

## 6. Theme surfaces

### Light

- The canvas paper is exact Snow White.
- Shell, header, toolbar, sidebars, status bar, raised controls, and borders form a cool
  Steel Wool-derived ladder around the warmer paper.
- Surrounding surfaces remain darker than the paper so the document stays the brightest
  and most important plane.
- Wet Weather exact or derived tones are reserved for secondary icons, disabled states,
  and low-priority structure. Small muted text uses a darker derived value because exact
  Wet Weather on Snow White does not meet normal-text contrast.
- Resting shell and panel layers remain flat. Only the canvas and floating layers receive
  shadows.

### Dark

- Shell, panels, and the dark paper use progressively lighter Steel Wool-derived surfaces.
- Snow White becomes the text reference rather than a light canvas.
- Selected surfaces use dark Muted Lime derivations; their content remains neutral ink.
- Primrose Yellow retains enough chroma to read as an accent but is never body text.
- Layer boundaries remain tonal first and hairline second; dark mode does not add resting
  card shadows.

## 7. Interaction states

Each state keeps one visual mechanic:

| State | Treatment |
| --- | --- |
| Hover | Neutral Steel Wool-derived fill |
| Selected or active data item | Muted Lime-derived fill |
| Keyboard focus | Muted Lime-derived outline, visible only for focus-visible |
| Current application location | Neutral ink or bar where the component needs it |
| Drop target | Muted Lime-derived dashed outline |
| Drag source | Restrained Primrose Yellow-derived highlight |
| Primary action | Primrose Yellow fill with dark Steel Wool-derived text |
| Warning | Primrose Yellow semantic status treatment |
| Success or danger | Existing independent green or red semantic families |

Yellow does not substitute for selection or focus. Lime is not ordinary text. Hover
remains neutral so it cannot be confused with a persisted selection.

## 8. Component treatment

### Sidebars

- Active rows use only a Muted Lime-derived fill.
- Active rows have no border, inset box-shadow, or other persistent outline.
- Active labels may use medium weight, not bold.
- Keyboard focus retains a temporary focus outline for accessibility.
- Resting rows are flat; borders are not used to turn every row into a card.

### Toolbar and shared controls

- Formatting toggles use Muted Lime selection.
- Primrose Yellow is reserved for a true primary action, not ordinary toggles.
- Ordinary buttons move from an unconditional pill shape to --radius-md.
- Full-radius shapes remain valid for tags, status chips, avatars, switch handles, and
  other components whose identity is genuinely pill- or circle-shaped.
- Menus, fields, and popovers use --radius-sm or --radius-md, a thin edge, and no
  decorative gradient.

### Script canvas

- The script remains one uninterrupted paper surface. Script blocks receive no individual
  backgrounds, borders, cards, or separating decoration.
- Existing typography, indentation, whitespace, and casing continue to communicate block
  meaning.
- Character tag colors remain an independent data-driven system.
- The ribbon sticker at the beginning of every scene becomes Primrose Yellow. Its current
  --color-scene-marker mapping moves from --base-amber to --base-action.

### Music

- Primrose Yellow identifies music pills, ranges, progress, and music-specific attention.
- Large or long-lived yellow areas reduce lightness or chroma through relative OKLCH so
  they do not overpower script text.
- Selection and keyboard manipulation of a music item use Muted Lime; yellow continues to
  describe the item's domain rather than its interaction state.

### Dialogs and floating UI

- Dialogs and popovers use neutral Steel Wool-derived surfaces.
- Primary confirmation is yellow with dark on-accent text.
- Destructive actions remain red.
- Shadows are reserved for floating layers.

## 9. Product and landing boundary

apps/web imports packages/ui/styles/base.css, which imports the shared product tokens.
Changing those tokens intentionally updates every product route, not only the editor.
Component-specific corrections remain close to their owning package.

apps/landing has an independent palette and token system in
apps/landing/src/styles/global.css. It also owns old-palette brand marks, favicons,
screenshots, and social imagery. Landing rebranding is therefore a separate second phase,
performed after the product UI is stable so its marketing imagery can be regenerated from
the finished editor.

## 10. Expected implementation areas

- packages/ui/styles/tokens.css: exact palette anchors, semantic foundations, surface
  ladders, interaction states, and dark-mode overrides.
- Shared UI component styles: button radius and primary treatment, focus and selected
  states, menus, panels, dialogs, and floating surfaces where token substitution alone is
  insufficient.
- Editor panel styles: fill-only active sidebar rows.
- packages/editor/src/editor/Editor.module.css: scene-marker semantic mapping and any
  editor-scoped surface corrections.
- Editor music and drag-and-drop styles: separate domain accent from interaction state.
- App-route editor styles: remove active-row borders or inset shadows that bypass shared
  sidebar styles.

The implementation must preserve unrelated user changes in the existing dirty worktree.

## 11. Verification

Automated checks must cover both light and dark themes:

- normal text against its paper or panel surface meets WCAG AA at 4.5:1 minimum;
- large text and non-text UI boundaries meet their applicable AA threshold;
- focus indicators reach at least 3:1 against adjacent surfaces;
- primary yellow controls have sufficient contrast against their dark on-accent content;
- muted text does not use exact Wet Weather where it would fail normal-text contrast;
- selected sidebar rows compute to no border and no inset shadow;
- selected toolbar controls use the Lime family;
- the scene-start marker resolves to the Yellow family;
- success and danger remain distinguishable from the brand accents.

Representative browser coverage includes:

- home and export routes, because they consume shared product tokens;
- the editor in both themes with each sidebar open and both open;
- toolbar selections, menus, dialogs, popovers, inputs, and disabled states;
- scene markers, music pills and ranges, drag source and drop target states;
- narrow viewport behavior without changing existing layout assertions.

Canonical repository checks are pnpm lint, relevant package browser tests, and npx tsc -b.
Known pre-existing browser-test failures are reported rather than hidden by snapshot,
assertion, or viewport changes.

## 12. Acceptance criteria

- The five exact palette anchors are the only new brand-palette sources in product CSS.
- Light and dark product themes share the approved semantic mapping.
- The script is visually continuous and remains the dominant surface.
- Scene-start stickers are yellow.
- Sidebar active rows are Lime-filled and borderless at rest.
- Primary action, selection, focus, music, warning, success, and danger remain visually
  distinct.
- Ordinary controls are less pill-like without changing their size or behavior.
- All required contrast and canonical repository checks pass, except clearly documented
  pre-existing failures.
- No apps/landing file or stored schema changes in this phase.
