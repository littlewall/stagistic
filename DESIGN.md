---
name: Stagistic
description: Open-source editor for theatre and musical scripts
colors:
  # Product neutrals — light mode
  script-paper: "oklch(0.97 0.004 51)"
  working-surface: "oklch(0.985 0.004 51)"
  surface-raised: "oklch(0.952 0.004 51)"
  manuscript: "oklch(0.155 0.014 51)"
  marginalia: "oklch(0.465 0.014 51)"
  placeholder: "oklch(0.42 0.014 51)"
  folded-edge: "oklch(0.875 0.014 51)"
  folded-edge-strong: "oklch(0.79 0.014 51)"
  # Semantic accents
  copper: "oklch(0.6622 0.1479 62.72)"
  lavender: "oklch(0.6251 0.0699 277.48)"
  # Landing brand register
  brand-paper: "oklch(0.9591 0.0074 80.72)"
  brand-umber: "oklch(0.2557 0.0382 56.44)"
  brand-aubergine: "oklch(0.333 0.0203 13.4)"
  # Status
  cleared-green: "oklch(0.48 0.097 165.2)"
  cut-red: "oklch(0.54 0.127 14.8)"
  warning-amber: "oklch(0.56 0.101 56.1)"
  # Product neutrals — dark mode
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
  4xl: "28px"
  5xl: "32px"
  6xl: "40px"
  7xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.manuscript}"
    textColor: "{colors.script-paper}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  button-secondary:
    backgroundColor: "{colors.working-surface}"
    textColor: "{colors.manuscript}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.marginalia}"
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
  input:
    backgroundColor: "{colors.working-surface}"
    textColor: "{colors.manuscript}"
    placeholderColor: "{colors.placeholder}"
    focusColor: "{colors.lavender}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
  tag:
    backgroundColor: "lavender mixed with working surface"
    textColor: "{colors.marginalia}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Stagistic

## 1. Overview

**Creative North Star: “The Dark Stage”**

The theatre before the house lights come up. Attention belongs to the work on the page, not to the tool holding it. Stagistic exists in the wings: disciplined, unobtrusive, and available exactly when the playwright needs it. The interface never interrupts a line of dialogue or a blocking note to announce itself.

The product is compact and information-rich without becoming a dashboard. In dark mode, near-black warm surfaces form the stage and the script becomes the light. In light mode, the same structure reads as ink and paper. Both themes share semantics and layout; lightness and contrast change, meaning does not.

Stagistic uses two related visual registers:

- **Product register:** warm, hue-cohesive neutrals with restrained copper and lavender semantics. The script canvas remains dominant.
- **Brand register:** the landing page may use paper, umber, and aubergine more expressively, while preserving the same copper/lavender meanings and editorial restraint.

The system rejects heavy SaaS dashboards, gamified writing interfaces, and generic loud marketing aesthetics. Decoration does not earn space by itself.

**Key characteristics**

- The script is always the highest-priority surface.
- Warm product neutrals derive from one base hue; no arbitrary cool gray injection.
- Copper and lavender have distinct semantic jobs and are not interchangeable.
- IBM Plex Sans Variable is the interface voice; Courier Prime is the script voice.
- Surfaces are flat at rest; shadows communicate actual floating depth.
- Light and dark themes preserve the same structure and semantic roles.
- OKLCH and `color-mix(in oklch, ...)` keep derived states visually coherent.
- `--size-scale` changes interface density without changing component relationships.

## 2. Color

### Product neutral system

The editor application uses a warm neutral system anchored by `--base-neutral: oklch(.461 .0257 51)`. Surfaces, text, and borders derive from that base through relative color syntax.

- **Script Paper** (`oklch(0.97 0.004 51)`): application background in light mode.
- **Working Surface** (`oklch(0.985 0.004 51)`): panels, controls, cards, and dialogs.
- **Surface Raised** (`oklch(0.952 0.004 51)`): hover and highlighted states.
- **Manuscript** (`oklch(0.155 0.014 51)`): primary text in light mode.
- **Marginalia** (`oklch(0.465 0.014 51)`): secondary text and quiet metadata.
- **Placeholder** (`oklch(0.42 0.014 51)`): explicit placeholder text; never simulated by lowering opacity.
- **Folded Edge** (`oklch(0.875 0.014 51)`): default borders and dividers.
- **Folded Edge Strong** (`oklch(0.79 0.014 51)`): stronger structural separation.
- **Dark Stage** (`oklch(0.135 0.006 51)`): application background in dark mode.
- **Backstage Flat** (`oklch(0.17 0.006 51)`): primary dark-mode surface.
- **Illuminated Script** (`oklch(0.92 0.014 51)`): primary dark-mode text.

`--color-surface-accent` is not another neutral. It is a low-chroma lavender mix used for selection, active rows, tags, and utility hover states: 16% lavender in light mode and 26% in dark mode.

### Semantic accents

- **Copper** (`oklch(0.6622 0.1479 62.72)`): branded and high-signal actions, progress, and music-specific emphasis. In the product, ordinary primary buttons can remain ink-colored; copper is reserved for moments that benefit from a distinct working-light signal.
- **Lavender** (`oklch(0.6251 0.0699 277.48)`): selection, keyboard focus, links, and utility states. Lavender may be mixed into a surface, but it is not a CTA or progress color.

### Landing brand register

The landing page uses a broader palette because it has a brand role rather than a long-session editing role.

- **Brand Paper** (`oklch(0.9591 0.0074 80.72)`): primary light background.
- **Brand Umber** (`oklch(0.2557 0.0382 56.44)`): primary brand text and dark stage sections.
- **Brand Aubergine** (`oklch(0.333 0.0203 13.4)`): muted text, borders, and warm shadow derivation.
- **Copper and Lavender:** retain their product semantics across the landing page.

The brand register must not leak into the editor as decorative surface color. The product remains quieter than its landing page.

### Status

- **Cleared Green** (`oklch(0.48 0.097 165.2)`): success and confirmed actions.
- **Cut Red** (`oklch(0.54 0.127 14.8)`): destructive actions and errors.
- **Warning Amber** (`oklch(0.56 0.101 56.1)`): warnings and caution. It is a status token, not a substitute for Copper.

### Named rules

**The Two Semantic Accents Rule.** Copper means action, progress, or music. Lavender means selection, focus, or utility. Neither accent is general decoration, and the two must not be swapped because one looks better in isolation. A screen does not need to display both.

**The Hue Cohesion Rule.** Product neutrals derive from `--base-neutral` through relative color syntax. New product surfaces do not use independent gray values.

**The Register Rule.** The editor uses product neutrals. The landing page may use Brand Paper, Umber, and Aubergine. Shared brand colors retain the same semantic meaning in both registers.

## 3. Typography: The Two-Voice System

- **Interface font:** IBM Plex Sans Variable, weights 100–700
- **Script font:** Courier Prime, regular/bold and italic variants

IBM Plex Sans is precise without feeling corporate. Courier Prime carries the visual grammar of a theatrical script while rendering more cleanly than Courier New. The interface speaks sans; the script speaks mono.

### Hierarchy

- **Display:** weight 500, `clamp(1.75rem, 4vw, 2.25rem)`, line-height 1.1, letter-spacing `-0.02em`. Page-leading or modal headlines; rare.
- **Headline:** weight 500, 22px base, line-height 1.2, letter-spacing `-0.02em`. Section headings and panel headers.
- **Title:** weight 500, 18px base, line-height 1.2. Subsections and dialog sections.
- **Body:** weight 400, 13px base, line-height 1.5. Default interface text. Reading contexts use a maximum line length of 65ch.
- **Label / Mono:** Courier Prime, weight 400, 11px base, letter-spacing `0.08em`. Structural markers, shortcut indicators, and script element names.

### Named rules

**The Two-Voice Rule.** Courier Prime is the script’s voice; IBM Plex Sans is the tool’s voice. Interface prose stays sans. Script content and structural labels such as act, scene, character, and lyric may use mono. Do not mix both faces within one text element.

**The Size-Scale Rule.** Spacing, radii, font sizes, and control heights derive from `--size-scale`. The root fallback is `1.08`; explicit modes currently set `.size-sm` to `1`, `.size-md` to `1.1`, and `.size-lg` to `1.2`. New fixed values must use the scale unless they are intentionally physical CSS pixels, such as a 1px border or 2px focus outline.

## 4. Elevation

Surfaces are flat at rest. Depth comes from the tonal stack—background, surface, raised surface—not from ambient card shadows. Shadows are reserved for elements that float above document flow and for the script canvas.

All shadows derive from `--base-shadow: oklch(.177 .0062 41.5)`, keeping them warm against both product and brand surfaces.

- **Popover:** `0 10px 30px`, alpha .18 in light mode and .5 in dark mode.
- **Panel:** `0 12px 32px`, alpha .08 in light mode and .3 in dark mode.
- **Card:** `0 10px 20px`, alpha .08 in light mode and .24 in dark mode; interactive state only.
- **Canvas:** `0 12px 30px`, alpha .06 in light mode and .22 in dark mode.

**The Flat-by-Default Rule.** If an element participates in normal document flow, use tonal layering. If it floats—popover, modal, detached panel, canvas—use the matching shadow token.

## 5. Components

### Buttons

The shared Button atom uses a full pill radius. Compact selectors, segmented controls, menu items, and editor-specific icon controls may use smaller semantic radii when their shape communicates grouping or placement.

- **Primary:** Manuscript background with surface text. Used for the main action inside product flows.
- **Secondary:** Working Surface background, Manuscript text, Folded Edge border.
- **Ghost:** Transparent, Marginalia text; raised surface on hover. Used for low-emphasis toolbar and contextual actions.
- **Outline:** Transparent with Folded Edge border. Use when the boundary is structurally useful.
- **Danger:** Cut Red text and a restrained mixed border; never solid red by default.
- **Brand CTA:** Copper may be used for the landing page’s principal action. This is not the default product button treatment.

Shared button behavior: weight 500, 150ms color/background/border transitions, `cursor: pointer`; disabled controls use opacity .6 and `cursor: not-allowed`.

### Cards

Cards are structural containers, not the default page-building unit. They use `--radius-lg`, a 1px Folded Edge border, and no shadow at rest. Default padding is 20px; compact padding is 12px by 16px.

Interactive hover may strengthen the border and add the Card shadow. Prefer a named link or button within a card over making the entire container clickable. Never nest interactive descendants inside a clickable card, and never nest Card components.

### Inputs and form controls

- **Shape:** `--radius-sm` for text fields; control-specific radii for grouped selectors.
- **Default:** Working Surface background, Folded Edge border, Manuscript text.
- **Focus:** border shifts toward the lavender surface accent.
- **Focus visible:** 2px solid `--color-focus-ring` with a 2px offset.
- **Placeholder:** explicit `--color-text-placeholder` at full opacity and at least 4.5:1 contrast.
- **Disabled:** opacity .4 and `cursor: not-allowed`.

### Tags

Tags use Courier Prime, uppercase, 11px base size, `0.08em` letter-spacing, a lavender-mixed surface, Marginalia text, and a pill radius. They identify script structure and compact metadata; they are not decorative badges.

### App layout

The standard app shell has a sticky header, a main working surface, and an optional 280px scaled sidebar. The sidebar is removed from the in-flow layout at 1024px and below. The editor itself may compose additional left or right panels, but the script canvas must remain the visual center.

### Signature component: Script Canvas

The script canvas uses Courier Prime and `--color-surface-paper` throughout. It represents the printable page, including user-configurable layout and pagination, and floats above its surroundings with the Canvas shadow. No adjacent surface should compete with it at the same contrast or visual weight.

## 6. Responsive Layout Contract

The alpha editor is desktop-first. Its supported minimum is a **1024 CSS px viewport**; this is a browser viewport measurement, not a device’s physical screen resolution.

- **Wide editor (`≥1200px`):** editor sidebars participate in the in-flow layout.
- **Compact desktop (`1024–1199px`):** editor sidebars become mutually exclusive overlay drawers so the script canvas keeps useful working width.
- **Best effort (`900–1023px`):** primary actions and content remain reachable, but layout density and composition are not guaranteed.
- **Below 900px:** not supported in the alpha release. A future mobile interface may use different navigation and editing behavior rather than compressing the desktop UI.

The 1024px support boundary is product-wide. Component breakpoints may be higher when their content has a larger intrinsic width; these are layout constraints, not separate device categories. Dropdowns and popovers must remain inside the viewport, prefer their normal placement, and flip when the available space cannot contain them.

**The CSS Viewport Rule.** Responsive decisions use CSS viewport dimensions. Do not infer the input mode or device class from a breakpoint.

**The Canvas Preservation Rule.** Compact behavior protects the script canvas before compressing editor controls or allowing multiple panels to compete with it.

## 7. Content Contract

Stagistic uses concise English UI copy until a complete localization layer exists. Do not mix locales within one product surface or introduce one-off translated strings.

- Navigation, buttons, field labels, headings, and instructional copy use sentence case: `Title page`, `Page layout`, `Visual preferences`.
- Uppercase belongs to the script’s structural voice: `ACT`, `SCENE`, and character cues. Ordinary instructions use common nouns: `character block`, `scene`, `stage direction`.
- Product copy is direct and professional. Avoid marketing language, celebratory filler, and redundant explanation inside the editor.
- Empty states describe the absence and provide the next useful action. In split views, the list states what is missing while the detail pane explains what the user can do; do not repeat one sentence in both panes.
- Search-empty copy distinguishes an empty collection from zero matching results.
- Production primary flows do not contain dead actions or `Coming soon` placeholders.

**The One-Locale Rule.** Every released product surface uses one complete locale. English is the only product locale until localization is implemented as a system.

**The Next-Action Rule.** An empty state earns its space by helping the user continue, not merely by restating that no data exists.

## 8. Accessibility Contract

Accessibility states are part of the visual system, not browser cleanup.

- Every keyboard-interactive control has a visible `:focus-visible` treatment.
- The default contract is `var(--focus-ring)`: 2px solid lavender with a 2px offset.
- Never remove an outline without an equally visible replacement.
- Placeholder text uses an explicit token at full opacity and maintains at least 4.5:1 contrast.
- Selection uses the lavender surface accent and remains distinguishable in both themes.
- Color does not carry status or selection meaning alone; structure, text, or state attributes provide the same information.
- Motion respects `prefers-reduced-motion`; continuous movement becomes static or fade-only.
- Interactive containers must not contain nested buttons or links.

## 9. Do and Don’t

### Do

- Keep the script canvas the most prominent element in the editor.
- Derive product neutrals from `--base-neutral` with OKLCH relative color syntax.
- Use Copper for branded/high-signal action, progress, and music-specific emphasis.
- Use Lavender for selection, focus, links, and utility states.
- Use `--size-scale` for spacing, typography, radii, and control dimensions.
- Use Courier Prime when the interface is speaking in the script’s structural voice.
- Use shadows only for true elevation.
- Use `color-mix(in oklch, ...)` for derived hover and state colors.
- Preserve the quieter product register and the more expressive editorial landing register.
- Write UI copy in concise English sentence case; reserve uppercase for structural script labels.

### Don’t

- Don’t swap Copper and Lavender or use either as arbitrary decoration.
- Don’t introduce product grays that bypass the hue-cohesive neutral system.
- Don’t bring Paper, Umber, or Aubergine brand surfaces into the editor without a defined semantic role.
- Don’t introduce heavy SaaS navigation, default data tables, gamification, or visual reward mechanics.
- Don’t use loud marketing conventions such as purple gradients, hero metrics, feature-card grids, or buzzword-heavy copy.
- Don’t use thick colored side borders as accent stripes; prefer a full border or a surface tint.
- Don’t use gradient-clipped decorative text.
- Don’t mix IBM Plex Sans and Courier Prime within one text element.
- Don’t nest cards or interactive controls inside a clickable container.
- Don’t use placeholder opacity to manufacture a muted color.
- Don’t remove keyboard focus indicators.
- Don’t use component `z-index` values above 20. The shared order is sticky (10), dropdown/popover (12), modal backdrop (15), modal (16), toast (18), tooltip (19), and exceptional editor overlays (20).
