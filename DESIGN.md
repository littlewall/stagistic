---
name: Stagistic
description: Cloud editor for theatre and musical scripts
colors:
  # Neutrals — light mode
  script-paper: "oklch(0.97 0.004 51)"
  working-surface: "oklch(0.985 0.004 51)"
  surface-raised: "oklch(0.952 0.004 51)"
  surface-tint: "oklch(0.908 0.014 51)"
  manuscript: "oklch(0.155 0.014 51)"
  marginalia: "oklch(0.465 0.014 51)"
  folded-edge: "oklch(0.875 0.014 51)"
  folded-edge-strong: "oklch(0.79 0.014 51)"
  # Accent / brand
  working-amber: "oklch(0.762 0.098 53.1)"
  note-blue: "oklch(0.58 0.1 239)"
  # Status
  cleared-green: "oklch(0.48 0.097 165.2)"
  cut-red: "oklch(0.54 0.127 14.8)"
  warning-amber: "oklch(0.56 0.101 56.1)"
  # Dark mode surfaces
  dark-stage: "oklch(0.135 0.006 51)"
  backstage-flat: "oklch(0.17 0.006 51)"
  illuminated-script: "oklch(0.92 0.014 51)"
typography:
  display:
    fontFamily: "'IBM Plex Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'IBM Plex Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'IBM Plex Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.2
  body:
    fontFamily: "'IBM Plex Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Courier Prime', 'Courier New', ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.08em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "2px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  3xl: "24px"
  5xl: "32px"
  6xl: "40px"
  7xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.manuscript}"
    textColor: "{colors.script-paper}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  button-primary-hover:
    backgroundColor: "oklch(0.22 0.014 51)"
    textColor: "{colors.script-paper}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  button-secondary:
    backgroundColor: "{colors.working-surface}"
    textColor: "{colors.manuscript}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.manuscript}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.marginalia}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.manuscript}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.cut-red}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  card:
    backgroundColor: "{colors.working-surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-highlight:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.working-surface}"
    textColor: "{colors.manuscript}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
  tag:
    backgroundColor: "{colors.surface-tint}"
    textColor: "{colors.marginalia}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Stagistic

## 1. Overview

**Creative North Star: "The Dark Stage"**

The theatre before the house lights come up. Attention belongs to the work on the page, not to the tool holding it. Stagistic's design system exists in the wings: disciplined, unobtrusive, and exactly where it needs to be when the playwright needs it. The interface never interrupts a line of dialogue or a blocking note to announce itself.

The palette begins from a warm near-neutral — manuscript ink, script paper, stage lamp amber — and operates in restraint. The density is app-appropriate: compact, information-rich, never cluttered. In dark mode the whole system reads as the dark stage: near-black warm surfaces, warm near-white text, the amber accent rising like a working light. In light mode, the same warmth reads as a freshly turned page. Both modes share identical structure; only the lightness levels shift.

This system explicitly rejects three things. Heavy SaaS dashboard patterns (Jira, Asana) — dense sidebars, data-table-as-default, enterprise navigation — belong to project management tools, not to a playwright's instrument. Gamified or visually loud writing apps pull attention from the script; nothing here earns its place through decoration. Loud marketing aesthetics — feature-grid carousels, hero-metric numbers, purple gradients — are forbidden on both the app and landing surfaces.

**Key Characteristics:**
- Warm neutrals rooted in a single amber-tinted base; no arbitrary cool gray injection
- Two complementary typefaces: IBM Plex Sans Variable for the interface, Courier Prime for scripted labels and the script canvas
- Flat surfaces at rest; structural shadows only on floating elements (popovers, modals)
- Full light/dark theme parity — same tokens, same structure, only lightness levels change
- A size-scale system (`--size-scale`) that lets users shift the entire UI density without layout reflow
- OKLCH throughout, relative-color-syntax for derived tokens — the system never drifts out of hue cohesion

## 2. Colors: The Manuscript Palette

A warm single-hue neutral system anchored at hue 51° — the warmth of ink, paper, and stage lamp. One accent color (amber) and one utility color (blue). Everything else is neutral.

### Primary

- **Working Amber** (`oklch(0.762 0.098 53.1)`): The brand accent. Used exclusively for progress indicators, the animated loading bar, and the active selection highlight. Its rarity is the point — when it appears, it carries meaning.

### Secondary

- **Note Blue** (`oklch(0.58 0.1 239)`): Utility only. Link text, focus rings, and interactive state indicators. Never decorative.

### Neutral

- **Script Paper** (`oklch(0.97 0.004 51)`): Application background in light mode. Warm off-white, not cream — the chroma is low enough (0.004) that it reads as a true working surface, not a tinted aesthetic choice.
- **Working Surface** (`oklch(0.985 0.004 51)`): The primary panel surface — cards, editor canvas background, modal background. Slightly lighter than the page to create lift without shadow.
- **Surface Raised** (`oklch(0.952 0.004 51)`): Hover states, selected rows, and highlighted cards. The visual step above Script Paper.
- **Surface Tint** (`oklch(0.908 0.014 51)`): Tag backgrounds, selection highlights, and accent fills. Higher chroma than the neutrals; this is where the amber hue becomes perceptible.
- **Manuscript** (`oklch(0.155 0.014 51)`): Primary text. Warm near-black. All body copy, headings, and labels default to this.
- **Marginalia** (`oklch(0.465 0.014 51)`): Secondary text, placeholders, muted labels, timestamps. Same hue as Manuscript, lower lightness commitment.
- **Folded Edge** (`oklch(0.875 0.014 51)`): Default border. Dividers, card outlines, input strokes. Warm and quiet.
- **Folded Edge Strong** (`oklch(0.79 0.014 51)`): Stronger borders for emphasis or structural separation.
- **Dark Stage** (`oklch(0.135 0.006 51)`): Application background in dark mode.
- **Backstage Flat** (`oklch(0.17 0.006 51)`): Primary surface in dark mode.
- **Illuminated Script** (`oklch(0.92 0.014 51)`): Primary text in dark mode.

### Status

- **Cleared Green** (`oklch(0.48 0.097 165.2)`): Success states, confirmed actions.
- **Cut Red** (`oklch(0.54 0.127 14.8)`): Destructive actions, error states, danger buttons.
- **Warning Amber** (`oklch(0.56 0.101 56.1)`): Warnings and cautionary notices.

### Named Rules

**The One Accent Rule.** Working Amber appears on ≤5% of any given screen. It carries meaning: something is in progress, something is selected, something matters. Diluting it with decorative use destroys its signal value.

**The Hue Cohesion Rule.** All neutrals are derived from `--base-neutral: oklch(.461 .0257 51)` via relative-color-syntax — never from independent gray values. A new surface color is always `oklch(from var(--base-neutral) <L> calc(c * <factor>) h)`. This prevents the warm/cool drift that makes surfaces feel inconsistent at scale.

## 3. Typography: The Two-Voice System

**Interface Font:** IBM Plex Sans Variable (weights 100–700, variable axis)
**Script Font:** Courier Prime (400 regular, 700 bold)

**Character:** IBM Plex Sans is a humanist grotesque with technical precision — clinical enough to stay neutral in an editor, warm enough not to feel corporate. Courier Prime is a screen-optimized serif monospace: it carries the visual grammar of a script page (the look of Final Draft, the feel of a photocopied prompt book) without the rendering roughness of Courier New. Together they create a two-register system: the interface speaks sans, the script canvas speaks mono.

### Hierarchy

- **Display** (weight 500, clamp(1.75rem, 4vw, 2.25rem), line-height 1.1, letter-spacing -0.02em): Page titles, modal headlines. Rare; used only at section-leading scale.
- **Headline** (weight 500, 1.375rem / 22px, line-height 1.2, letter-spacing -0.02em): Section headings, card titles, panel headers.
- **Title** (weight 500, 1.125rem / 18px, line-height 1.2): Sub-section labels, dialog section titles.
- **Body** (weight 400, 0.8125rem / 13px base, line-height 1.5): Default interface text. All readable prose, form labels, descriptions. Max line length 65ch in reading contexts.
- **Label / Mono** (Courier Prime, weight 400, 0.6875rem / 11px, letter-spacing 0.08em): Tags, structural markers, shortcut indicators, script element names in the sidebar. The mono voice signals "this is about the script's structure."

### Named Rules

**The Two-Voice Rule.** Courier Prime is the script's voice; IBM Plex Sans is the tool's voice. They don't overlap. Body copy in the interface is always sans. Script-canvas text and structural labels (act, scene, character name, lyric) are always mono. Mixing the two on the same element is prohibited.

**The Size-Scale Rule.** All font sizes, spacing values, and control heights are multiplied by `--size-scale` (default 1.08). New values must follow this pattern. Never define a fixed-pixel font size that bypasses the scale.

## 4. Elevation: Structural Shadows Only

Surfaces are flat at rest. Depth is conveyed through tonal layering (the three-step surface stack: Script Paper → Working Surface → Surface Raised) rather than ambient shadows. Shadows are reserved strictly for floating elements that break out of the document flow.

The shadow vocabulary is warm-tinted: all shadows derive from `--base-shadow: oklch(.177 .0062 41.5)` — a dark amber near-black. This keeps shadows from reading as cold or arbitrary against the warm surface stack.

### Shadow Vocabulary

- **Popover** (`0 10px 30px oklch(.177 .006 41.5 / .18)`): Dropdown menus, select panels, tooltips, command palettes. The deepest shadow in the system.
- **Panel** (`0 12px 32px oklch(.177 .006 41.5 / .08)`): Floating sidebars and detached panels.
- **Card** (`0 10px 20px oklch(.177 .006 41.5 / .08)`): Used on hover state only — not at rest. Cards are flat until they become interactive.
- **Canvas** (`0 12px 30px oklch(.177 .006 41.5 / .06)`): The editor canvas elevated over the app background.

In dark mode, all shadow alpha values increase significantly (popover: 0.5, panel/card: 0.24–0.3, canvas: 0.22) to remain visible against dark surfaces.

### Named Rules

**The Flat-By-Default Rule.** No element carries a shadow at rest unless it is a floating overlay. If it's in the document flow, it uses tonal layering. If it's floating (popover, modal, drawer), it uses shadow. There is no middle ground.

## 5. Components

### Buttons

Buttons use full pill radius (`9999px`) for all variants — this is the system's single opinionated shape decision. The pill signals interactivity without requiring heavy visual weight.

- **Primary:** Manuscript background (`oklch(0.155 0.014 51)`) with Script Paper text. Medium weight (500). Padding: 8px 20px. Hover: slightly lightened background (`oklch(0.22 0.014 51)`). Transition: 150ms ease.
- **Secondary:** Working Surface background, Manuscript text, Folded Edge border (1px). Hover: Surface Raised background.
- **Ghost:** Transparent background, Marginalia text. Hover: Surface Raised background, Manuscript text. Used for toolbar actions and icon buttons — the lowest visual weight.
- **Outline:** Transparent background, Manuscript text, Folded Edge border. Hover: Surface Raised background. Functionally close to Secondary; use when the border should read as structural rather than incidental.
- **Danger:** Transparent background, Cut Red text, partial Cut Red border (35% Cut Red mixed with Folded Edge). Hover: 10% Cut Red fill. Never a solid red background — destructive actions should look deliberate, not alarming.

All variants share: `font-weight: 500`, `cursor: pointer`, `transition: background 150ms ease, border-color 150ms ease, color 150ms ease`. Disabled state: `opacity: 0.6`, `cursor: not-allowed`.

### Cards

Cards are structural containers for grouped content. Their shape is gently rounded (`--radius-lg` / 10px). Default padding: 20px. The compact variant (panel rows, list items): 12px vertical / 16px horizontal.

- **Default:** Working Surface background, Folded Edge border (1px), no shadow at rest.
- **Highlight:** Surface Raised background — used to draw attention to a selected or featured item.
- **Interactive (hover/focus):** Border shifts toward Manuscript at 12% mix. Card shadow appears (not at rest). Focus ring via `box-shadow` in Note Blue.

Nested cards are prohibited. A Card inside a Card is always a layout problem.

### Inputs / Text Fields

- **Shape:** Rounded small (`--radius-sm` / 6px)
- **Default:** Working Surface background, Folded Edge border (1px), Manuscript text
- **Focus:** Border shifts to Surface Tint (`--color-surface-accent`). No outline — the border change is the focus indicator.
- **Placeholder:** Marginalia color at 60% opacity
- **Disabled:** `opacity: 0.4`, `cursor: not-allowed`
- **Sizes:** sm (6px × 10px padding, 12px font), md (12px all-around, 16px font — the script title input)

### Tags / Chips

Tags carry a mono voice: they use Courier Prime at 11px, uppercase, letter-spacing 0.08em. Surface Tint background, Marginalia text, pill radius. Used for element type labels (ACT, SCENE, CHARACTER) and metadata chips.

### App Layout

The editor shell is a three-zone layout: sticky header, main canvas, optional sidebar (280px scaled). At ≤1024px, the sidebar collapses. The main canvas has a right border (`--color-border`, 1px) as the only structural divider — no other horizontal rules between zones.

### Signature Component: Script Canvas

The editor canvas uses Courier Prime throughout. It presents as a white page elevated over the surface with Canvas shadow. Page margins are controlled by user-configurable page layout settings. The canvas is always the visual center of the screen: no competing surfaces at the same visual weight.

## 6. Do's and Don'ts

### Do:

- **Do** keep the script canvas as the highest-contrast, most visually prominent element on any editor screen. Everything else recedes around it.
- **Do** use the OKLCH relative-color-syntax pattern for all new surface colors: `oklch(from var(--base-neutral) <L> calc(c * <factor>) h)`. Never introduce a new gray hex value that bypasses the hue system.
- **Do** derive all spacing and font sizes through `--size-scale`. `margin: calc(12px * var(--size-scale))`, not `margin: 12px`.
- **Do** use Courier Prime for any label, marker, or element that belongs to the theatrical script structure (act, scene, character, stage direction, lyric). The mono voice signals "this is part of the script."
- **Do** keep Working Amber rare. It appears on progress bars and active selection highlights. If you're reaching for amber for decoration, use Surface Tint instead.
- **Do** apply shadows only to floating elements that break the document flow (popovers, modals, drawers, the canvas). Everything else is flat.
- **Do** support `prefers-reduced-motion`. Any transition or animation must have a zero-duration or fade-only fallback inside `@media (prefers-reduced-motion: reduce)`.
- **Do** use `color-mix(in oklch, ...)` for all hover/state color derivations. Never hardcode a hover hex that isn't rooted in the token system.

### Don't:

- **Don't** introduce heavy SaaS dashboard patterns: dense sidebars with 20+ items, data tables as the default view, enterprise navigation structures. Stagistic is a writing instrument.
- **Don't** add gamified or colorful elements: badges, reward animations, colored progress streaks, visual busy-ness that pulls focus from the script.
- **Don't** use loud marketing aesthetics on any surface: purple gradients, hero-metric number blocks, identical feature-card grids, buzzword-dense copy, or the "FEATURES / PROCESS / PRICING" eyebrow-on-every-section pattern. If it could appear on a generic AI SaaS landing page, it doesn't belong here.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on any component. If you need to call attention to a callout or alert, use a background tint or a full border — never a side stripe.
- **Don't** use `background-clip: text` with a gradient for decorative text. All text is a single solid color. Emphasis is carried by weight and size.
- **Don't** mix IBM Plex Sans and Courier Prime on the same text element. The two voices operate in separate registers. Courier Prime is for script structure; IBM Plex Sans is for the interface.
- **Don't** add nested cards (a Card component inside another Card). Restructure the layout instead.
- **Don't** introduce a new gray color that doesn't derive from `--base-neutral` hue 51°. Cool gray injections break the warm cohesion.
- **Don't** use `z-index` values above 20 in component CSS. The semantic z-index scale is: sticky (10) → dropdown/popover (12) → modal backdrop (15) → modal (16) → toast (18) → tooltip (19).
