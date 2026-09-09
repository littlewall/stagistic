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
- Sizes are `rem` from a whole-pixel ladder, so the interface grows with the reader's browser font size without changing component relationships.

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

`--color-surface-accent` is not another neutral. It is a low-chroma lavender mix—16% lavender in light mode, 26% in dark—and it is the resting tint for tags and other lavender-toned surfaces. It is **not** the raw material for interaction states. Diluting one accent to five different percentages is how selection, hover, navigation, and drop targets came to look alike; those states derive from the dedicated `--state-*` tokens in section 5 instead.

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

**The Sizes Scale With The Reader Rule.** Spacing, radii, font sizes, control heights and chrome dimensions are `rem`, drawn from a whole-pixel ladder in `tokens.css` where every token carries its pixel value in a comment. The root is 16px and 16 is a power of two, so each value converts exactly: 12px is `0.75rem`, 11px is `0.6875rem`. Think in the pixels; ship the rem. A reader who raises their browser's default font size then gets a proportionally larger interface, which px cannot give them — page zoom scales px, the font-size setting does not, and that setting is the standard remedy for low vision. Three domains are deliberately exempt. Hairline borders, focus-ring widths and the `--radius-full` sentinel stay `px`, because a scaled hairline is a blurred sub-pixel line that buys no legibility. Media-query breakpoints are `em`, so the layout responds along with the type rather than giving a reader with large text more content in an unchanged column. The editor canvas is `px` times `--editor-zoom`, because A4 is a physical size and must not change because the menu text grew. Components never write a `rem` literal: they use tokens, which carry the right unit for their domain.

## 4. Layers and Elevation

### The layer model

Every surface in the editor belongs to exactly one of five layers. The layer decides both the background and how the surface is bounded, so a new component never has to invent a recipe.

| Layer | What lives there | Background | Boundary |
| --- | --- | --- | --- |
| **Shell** | app header; anything that frames the application | `--layer-shell-bg` (= `--color-bg`) | `--layer-shell-edge` hairline |
| **Panel** | sidebars, editor toolbar, cards, dialogs | `--layer-panel-bg` (= `--color-surface`) | `--layer-panel-edge` |
| **Canvas** | the script page | `--color-surface-paper` | Canvas shadow, no border |
| **Float** | popovers, modals, tooltips, bubble menus | `--layer-float-bg` | `--layer-panel-edge` plus the matching shadow |
| **Section** | subdivision inside one panel: panel header, toolbar group, list group | none; inherits its panel | `--color-border-subtle` hairline |

The shell is deliberately the *darkest* light-mode layer and the flattest dark-mode one. It recedes so that panels and canvas read as objects placed on it. An app header that is also a raised surface competes with the material it is supposed to hold.

Layer dimensions are tokens as well: `--shell-height`, `--panel-width`, `--panel-head-height`.

### Named rules

**The Recessive Shell Rule.** The application header is not a surface. It sits at background lightness and separates from the content below with a single hairline. Controls inside it carry their own weight; the bar itself carries none.

**The Layer Boundary Rule.** A boundary between two different layers is drawn with a tonal change *and* a `--color-border` line. A boundary inside a single layer—panel header against panel body, one toolbar group against the next—is drawn with a `--color-border-subtle` hairline and nothing else. It never gets a second background. Ignoring this is what turns a header, a toolbar, a panel, and a panel header into four identical slabs.

**The Section Is Not a Panel Rule.** Subdividing a panel does not create a new layer. If a region needs its own background to be legible, it is a panel, and it belongs outside its parent rather than nested inside it.

### Elevation

Surfaces are flat at rest. Depth comes from the tonal stack—background, surface, raised surface—not from ambient card shadows. Shadows are reserved for elements that float above document flow and for the script canvas.

All shadows derive from `--base-shadow: oklch(.177 .0062 41.5)`, keeping them warm against both product and brand surfaces.

- **Popover:** `0 10px 30px`, alpha .18 in light mode and .5 in dark mode.
- **Panel:** `0 12px 32px`, alpha .08 in light mode and .3 in dark mode.
- **Card:** `0 10px 20px`, alpha .08 in light mode and .24 in dark mode; interactive state only.
- **Canvas:** `0 12px 30px`, alpha .06 in light mode and .22 in dark mode.

**The Flat-by-Default Rule.** If an element participates in normal document flow, use tonal layering. If it floats—popover, modal, detached panel, canvas—use the matching shadow token.

## 5. Interaction States

Interaction states are a semantic system, not a set of tints. Each state answers a different question, so each gets a different *kind* of signal rather than a different strength of one signal.

| State | Question it answers | Mechanic | Token |
| --- | --- | --- | --- |
| **Hover** | Where is my pointer? | Neutral tone, no hue | `--state-hover` |
| **Selected** | What have I chosen in the data? | Lavender tint plus a lavender edge | `--state-selected`, `--state-selected-edge` |
| **Current** | Where am I in the application? | Ink bar on the active edge, no fill | `--state-current-edge` |
| **Drop target** | Where will this land? | Dashed lavender edge, no fill | `--state-drop-edge` |
| **Focus visible** | What does the keyboard control? | Lavender ring, offset | `--focus-ring` |
| **Revealed** | Is the region this button opens on screen? | The icon fills in on the side it opens; ink goes to full strength | no token—the icon carries it |

Hover is a pointer echo and carries no meaning, so it stays neutral; that is what frees lavender to mean selection and only selection. Drop target and selected both concern the data, so they share the hue but differ in mechanic—one fills, the other only outlines, and the dashed edge reads as provisional.

### Motion

Durations are tokens, not per-component decisions. A component that writes its own number drifts: the same hover ran at `.12s` in the header, `150ms` on a button, and `160ms` on a music pill before these existed.

| Token | Value | Use |
| --- | --- | --- |
| `--duration-fast` | 120ms | Pointer-scale feedback: icon buttons, header controls, reveal chips |
| `--duration-normal` | 150ms | The default for hover, focus, and colour changes |
| `--duration-slow` | 200ms | Progress and larger fades |
| `--duration-slower` | 240ms | Drawers and panels that travel |
| `--duration-theme` | `--duration-slow` | The light/dark swap only; times the view transition, never a component |

Curves: `--ease-standard` for state changes, `--ease-out` for a control that pops under the pointer, `--ease-emphasized` for a surface that travels.

### Named rules

**The Theme Swaps As One Rule.** Light and dark cross-fade over `--duration-theme` as a single image, and no component times the swap itself. `theme.ts` applies `data-theme` inside `document.startViewTransition`, and `base.css` gives `::view-transition-old(root)` / `::view-transition-new(root)` the token duration and easing. A component that instead relies on its own hover timing leaves the header, the canvas, and a card arriving at three different moments—and any surface with no hover rule snaps in a single frame. Doing it as a transition per element fixes the timing but not the feel: measured on an 8018-element script it spent 184ms in every frame, because each frame is a full style recalc and repaint with every `oklch(from …)` and `color-mix()` re-resolved per element; narrowing the property list or halving the duration changed nothing. One snapshot blended on the compositor holds 8.5ms frames. Where view transitions are unavailable, or under `prefers-reduced-motion`, the swap is instant rather than partial.

**The One Mechanic Per State Rule.** Every interaction state has exactly one mechanic. Two states must never differ only in the alpha of the same color. If a new state needs a look, it gets a new mechanic or it is not a new state.

**The Navigation Is Not Selection Rule.** *Where I am in the application* and *what I have selected in the data* are different facts and never share a treatment. The current route or view is marked with an ink edge—neither Copper nor Lavender—so it sits outside the two-accent system and cannot be confused with a selected scene, character, or music item.

**The Visible Target Rule.** When a toggle opens a region that is itself on screen—a panel, a drawer—its on-state is drawn in the icon, which fills in on the side it opens, and never with `--state-selected`. The open region is already the evidence, so a lavender chip duplicates it and spends selection's mechanic on something that is not a selection. Ink moves from muted to full alongside the icon so the state survives at 16px. This does not apply to a toggle whose target is invisible—`Bold` on a collapsed cursor has nothing else to show its state, so it keeps the selected tint.

**The Affordance Reveal Rule.** Text that is itself a control—the script title in the header, a panel's type picker—shows no chrome at rest, reveals a neutral chip with a hairline border on hover, and takes the full surface treatment while focused or editing. A chevron marks anything that opens a menu, and the control's hit area hugs its text so the chevron sits at the end of the target. This is one idiom for the whole application: text under a neutral chip is operable.

## 6. Components

### The component contract

Appearance is expressed three ways, in order of preference.

| Level | Use when | Written as |
|---|---|---|
| Variant prop | the appearance is a bounded, named set | `<Button variant="danger" size="sm">` |
| CSS variable | the value is genuinely per-instance | `<Panel style={{'--panel-pad': 'var(--space-xl)'}}>` |
| `className` | positioning by the parent only | `<Button className="col-span-2">` |

Components are organised in dependency layers: tokens, then primitives, then
controls, then patterns, then routes. This is a different axis from the five
elevation layers in §4, which decide a surface's background and boundary; a
component sits on exactly one of each. The primitives named below (`Stack`,
`Text`, `Panel`, `Overlay`) do not exist yet — they arrive with the primitives
work that follows this consolidation, and the rule is stated here so that work
is built against it.

### Named rules

**The Layer Dependency Rule.** Tokens, then primitives, then controls, then patterns, then routes — dependency layers, not the elevation layers of §4. A layer may use tokens and the layers below it, never the layers above it. A primitive knows nothing about a script, a scene, or a character.

**The className Is Position Only Rule.** `className` on a control or a pattern may affect where the element sits in its parent—margin, grid or flex placement, width. It may never affect how the element looks—background, border, radius, padding, colour, typography. Those go through a variant or a declared variable. Utility class precedence is decided by the stylesheet, not by the attribute, so repainting through `className` is non-deterministic. Primitives are exempt: placement is what they are for.

**The Declared Surface Rule.** A component's overridable variables are published API: named, defaulted from tokens, listed in its type and in the catalog. Typically three to six. Everything else is internal and may change without notice.

**The Component Variables Are Scoped Rule.** A variable belonging to one component is declared on that component's own root class, not on `:root`. `:root` carries design tokens only. The corollary is a naming obligation: a variable on `:root` must not be named after a component, because the moment a second component reads it the name is a lie. Shared control and menu values live in `--control-*` and `--menu-*`. `--bubble-menu-*` stays on `:root` under that same corollary: two different bubble menus read it, so the name describes a pattern rather than one component.

**The Variant Before Override Rule.** If an appearance recurs, it is a variant with a name. A variable override is for a value that is genuinely per-instance. **The threshold is two.** A variant, a prop, or any other piece of shared API is earned by the second call site, not the first: while one place needs it, it stays in that place; when a second place needs the same thing it moves up, and the first place does not keep a copy. The inverse binds just as hard — a variant whose only consumer is one route is a route-specific modification wearing a shared component's clothes, and it belongs back in the route unless the design changes so that both places want it. Giving it a more general name does not satisfy the test. Extracting *structure* is a different question with a different threshold: a shell may be lifted for a single use, because that is done for legibility rather than sharing. It is the appearance parameter that waits for the second caller.

**The Routes Carry No CSS Rule.** A route composes components. If a route needs a style no component provides, that is a missing component or a missing variant, not a new `.module.css`. The exception is genuinely singular geometry, such as the export page schematic. Every surviving route module opens with a comment saying in one line why it is singular; a module without that header has not been justified and should not exist, and `pnpm lint` enforces it.

**The Nameable Is A Component Rule.** If it has a name in our design language — card, row, panel, toolbar, field, header, dialog — then it *is* the component of that name. A route that assembles one out of primitives has written a component and declined to name it, so the next person will not find it and will write a third. Before building a new visual thing, look for it in `/dev/ui`; if you build it anyway, you must be able to say in one sentence how it differs from the catalogue entry. That sentence is the only legitimate route to singular geometry, and it belongs in the module's header comment.

**The Reusable Skeleton Rule.** A component extracted for cross-application reuse exposes a *visual shell only* — its structure, spacing, and state affordances (the hover echo, the selected edge) reached through declared variables and named slots. It never embeds application behaviour: no event handlers, drag-and-drop, data fetching, or route state live inside it. Behaviour is composed by the consuming route through the shell's slots and children. Single use is not an exemption — a shell used in one place today is still a shell. That is deliberately the opposite threshold from The Variant Before Override Rule: structure may be lifted at one use because the reason is legibility, while an appearance parameter waits for a second caller because the reason is sharing. Its inverse is the boundary that keeps the abstraction honest: content that is fixed to one application and carries heavy handlers (an editor's drag-ordered sidebar body) stays in the route; only the reusable skeleton around it — the sidebar frame, the row geometry — is extracted.

**The Modal Chrome Rule.** A dialog is `ModalDialog` (the backdrop, the panel, the escape and focus handling) with `ModalHeader` for the title block and `ModalActions` for the button row. A dialog whose whole job is to confirm or cancel one action is `ConfirmModal` and is not assembled by hand. Everything between the header and the actions is the caller's: modals carry one-off content by design, and only the chrome around it is shared.

**The Sidebar Frame Rule.** An editor sidebar's header row is `SidebarMiniHeader` — the panel switcher slot, the actions slot, and the `--sidebar-head-height` it defines. Trailing icon actions in that row are grouped by `SidebarActionsGroup`. The panel switcher itself is `Select variant="panel"`; no sidebar re-declares an uppercase trigger or its attached menu.

**The Icon Button Rule.** A square icon action is the `IconButton` atom, never a bespoke `.iconButton` class in a route or an editor module. Its appearance is chosen through props, not `className`: `variant` for the resting surface (ghost, outline, filled), `size` for the footprint (xs, sm, md), `shape="pill"` for a full-round hit area, `tone="danger"` for a destructive action, and `isSelected` for a toggled toolbar state. The old per-surface icon-button classes are gone; there is one icon action, parameterised.

**The Mono Is Script Content Only Rule.** `--font-family-mono` (Courier Prime) is reserved for rendered script content — the canvas, element previews, the header/footer preview cells, the mini editor. Chrome never borrows it. An uppercase, tracked, muted chrome label is `Text variant="eyebrow"` (sans, semibold, uppercase, `--letter-spacing-lg`, Marginalia), so the monospace voice keeps meaning: if it is set in Courier Prime, it is the script.

**The Sidebar Row Rule.** List rows across the editor sidebars share one height — 28px — and one active treatment: the `--state-selected` fill with a 1px inset `--state-selected-edge`. Music and Structure keep their own layout (their columns and drag models differ) but never their own row height or their own selected edge. Music and Characters reach that height through `ListRow size="compact"`. Structure's act/scene rows hardcode the same 28px. The deviation recorded here in step 6 of the route composition — Structure sitting 2.24px short — existed only because `ListRow` multiplied its 28px by the density coefficient while Structure's raw value was not multiplied; retiring that coefficient in the whole-number pixel pass closed the gap, and the two now measure identically.

**The Settings Scaffolding Rule.** A settings surface is built from `SettingsGroup` (the grid of rows), `SettingRow` (one control-height row), and `PanelHeader` (the title and optional description). No route re-implements the group, the row, or the header block; the export panel and the editor setting panels compose these.

**The Status Block Rule.** A warning, an error, or an empty state inside a panel is the `Notice` component — `variant="warning"` for a bordered callout, `variant="error"` for danger text, `variant="empty"` for a centred muted block. Two placements stay outside it by intent and are documented as such: the floating export-error pill (it is positioned chrome, not flow content) and the sidebar inline empty text (it is a single muted line, not a block).

### Buttons

The shared Button atom uses a full pill radius. Compact selectors, segmented controls, menu items, and editor-specific icon controls may use smaller semantic radii when their shape communicates grouping or placement.

- **Primary:** Manuscript background with surface text. Used for the main action inside product flows.
- **Secondary:** Working Surface background, Manuscript text, Folded Edge border.
- **Ghost:** Transparent, Marginalia text; raised surface on hover. Used for low-emphasis toolbar and contextual actions.
- **Outline:** Transparent with Folded Edge border. Use when the boundary is structurally useful.
- **Danger:** Cut Red text and a restrained mixed border; never solid red by default.
- **Brand CTA:** Copper may be used for the landing page’s principal action. This is not the default product button treatment.

Shared button behavior: weight 500, `--duration-normal` color/background/border transitions, `cursor: pointer`; disabled controls use opacity .6 and `cursor: not-allowed`.

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

`Select` carries three variants: `plain` (transparent trigger, the default),
`form` (the bordered field surface, sized `md` or `lg`), and `panel` (the
uppercase, tracked sidebar switcher at `--control-height-xs`, shrunk to its own
label). Its menu matches the trigger's width by default; `align="start"` or
`align="end"` pins one edge instead and lets the menu grow from it.

### Tags

Tags use Courier Prime, uppercase, 11px base size, `0.08em` letter-spacing, a lavender-mixed surface, Marginalia text, and a pill radius. They identify script structure and compact metadata; they are not decorative badges.

### App layout

The standard app shell has a sticky header, a main working surface, and an optional 280px scaled sidebar. The sidebar is removed from the in-flow layout at 1024px and below. The editor itself may compose additional left or right panels, but the script canvas must remain the visual center.

### Signature component: Script Canvas

The script canvas uses Courier Prime and `--color-surface-paper` throughout. It represents the printable page, including user-configurable layout and pagination, and floats above its surroundings with the Canvas shadow. No adjacent surface should compete with it at the same contrast or visual weight.

## 7. Responsive Layout Contract

The alpha editor is desktop-first. Its supported minimum is a **1024 CSS px viewport**; this is a browser viewport measurement, not a device’s physical screen resolution.

- **Wide editor (`≥1200px`):** editor sidebars participate in the in-flow layout.
- **Compact desktop (`1024–1199px`):** editor sidebars become mutually exclusive overlay drawers so the script canvas keeps useful working width.
- **Best effort (`900–1023px`):** primary actions and content remain reachable, but layout density and composition are not guaranteed.
- **Below 900px:** not supported in the alpha release. A future mobile interface may use different navigation and editing behavior rather than compressing the desktop UI.

The 1024px support boundary is product-wide. Component breakpoints may be higher when their content has a larger intrinsic width; these are layout constraints, not separate device categories. Dropdowns and popovers must remain inside the viewport, prefer their normal placement, and flip when the available space cannot contain them.

**The CSS Viewport Rule.** Responsive decisions use CSS viewport dimensions. Do not infer the input mode or device class from a breakpoint.

**The Canvas Preservation Rule.** Compact behavior protects the script canvas before compressing editor controls or allowing multiple panels to compete with it.

## 8. Content Contract

Stagistic uses concise English UI copy until a complete localization layer exists. Do not mix locales within one product surface or introduce one-off translated strings.

- Navigation, buttons, field labels, headings, and instructional copy use sentence case: `Title page`, `Page layout`, `Visual preferences`.
- Uppercase belongs to the script’s structural voice: `ACT`, `SCENE`, and character cues. Ordinary instructions use common nouns: `character block`, `scene`, `stage direction`.
- Product copy is direct and professional. Avoid marketing language, celebratory filler, and redundant explanation inside the editor.
- Empty states describe the absence and provide the next useful action. In split views, the list states what is missing while the detail pane explains what the user can do; do not repeat one sentence in both panes.
- Search-empty copy distinguishes an empty collection from zero matching results.
- Production primary flows do not contain dead actions or `Coming soon` placeholders.

**The One-Locale Rule.** Every released product surface uses one complete locale. English is the only product locale until localization is implemented as a system.

**The Next-Action Rule.** An empty state earns its space by helping the user continue, not merely by restating that no data exists.

### Tooltips

Tooltips open with no delay, so every one of them is part of the visual noise. A tooltip that repeats what the control already shows is a cost with no benefit.

- **Only where there is no visible label.** Tabs, block-type selectors, and panel titles already carry text; a tooltip would cover the words the user is reading.
- **Actions read as verb plus object:** `Open script settings`, not `Settings`. The icon names the thing; the tooltip must supply the action.
- **Toggles read as the name of what they control, identically in both states:** `Structure panel`, `Bold`. State belongs to `aria-pressed` and to the visual treatment.
- **Keyboard shortcuts use the `shortcut` prop,** never inline text inside the label.
- **A deep link names its destination and its entry point:** `Open characters in attribute manager`.
- **Status readouts are the exception** and may change with the data: `Saved a few seconds ago`, `Saving…`, `Couldn’t save — retrying`.

**The Stable Toggle Name Rule.** A toggle button that exposes `aria-pressed` keeps one name in both states. Rewriting the label to `Show` or `Hide` makes the word ambiguous—it could describe the current state or the result of clicking—and duplicates information the pressed state already carries.

## 9. Accessibility Contract

Accessibility states are part of the visual system, not browser cleanup.

- Every keyboard-interactive control has a visible `:focus-visible` treatment.
- The default contract is `var(--focus-ring)`: 2px solid lavender with a 2px offset.
- Never remove an outline without an equally visible replacement.
- Placeholder text uses an explicit token at full opacity and maintains at least 4.5:1 contrast.
- Selection uses `--state-selected` with its matching edge and remains distinguishable in both themes.
- Color does not carry status or selection meaning alone; structure, text, or state attributes provide the same information.
- Toggle buttons expose `aria-pressed` and keep a stable accessible name across states.
- A control whose only affordance appears on hover—see The Affordance Reveal Rule—is still a real button or a text field in the markup, so it reaches keyboard and assistive technology at rest.
- Editable headings such as the script title behave as single-line plain-text fields: `Enter` commits, `Escape` reverts, `Tab` moves focus without inserting a character, and pasted content is stripped to plain text.
- Motion respects `prefers-reduced-motion`; continuous movement becomes static or fade-only.
- Interactive containers must not contain nested buttons or links.

## 10. Do and Don’t

### Do

- Keep the script canvas the most prominent element in the editor.
- Derive product neutrals from `--base-neutral` with OKLCH relative color syntax.
- Use Copper for branded/high-signal action, progress, and music-specific emphasis.
- Use Lavender for selection, focus, links, and utility states.
- Use the ladder tokens for spacing, typography, radii, and control dimensions; they carry the right unit for their domain.
- Use Courier Prime when the interface is speaking in the script’s structural voice.
- Use shadows only for true elevation.
- Use `color-mix(in oklch, ...)` for derived hover and state colors.
- Preserve the quieter product register and the more expressive editorial landing register.
- Write UI copy in concise English sentence case; reserve uppercase for structural script labels.
- Place every surface on one of the five layers and take its background and boundary from that layer.
- Give each interaction state its own mechanic, and reach for the `--state-*` tokens rather than mixing a fresh tint.
- Mark the current route or view with an ink edge so navigation never looks like selection.
- Let a text control reveal its affordance as a neutral chip on hover, with the hit area hugging the text.
- Keep a toggle's tooltip and accessible name stable across states and let `aria-pressed` carry the state.
- Draw the on-state of a panel toggle inside its icon, since the open panel already carries the state itself.

### Don’t

- Don’t swap Copper and Lavender or use either as arbitrary decoration.
- Don’t introduce product grays that bypass the hue-cohesive neutral system.
- Don’t bring Paper, Umber, or Aubergine brand surfaces into the editor without a defined semantic role.
- Don’t introduce heavy SaaS navigation, default data tables, gamification, or visual reward mechanics.
- Don’t use loud marketing conventions such as purple gradients, hero metrics, feature-card grids, or buzzword-heavy copy.
- Don’t use thick colored side borders as accent stripes; prefer a full border or a surface tint.
- Don’t mark a toggle with `--state-selected` when the region it opens is already visible; the tint then says nothing the screen isn’t saying.
- Don’t distinguish two interaction states by the alpha of one shared color.
- Don’t dilute `--color-surface-accent` into a new state tint; add a mechanic instead.
- Don’t give a section inside a panel its own background, and don’t let the application header behave as a raised surface.
- Don’t write a tooltip for a control that already shows its label, and don’t inline a keyboard shortcut into the label text.
- Don’t use gradient-clipped decorative text.
- Don’t mix IBM Plex Sans and Courier Prime within one text element.
- Don’t nest cards or interactive controls inside a clickable container.
- Don’t use placeholder opacity to manufacture a muted color.
- Don’t remove keyboard focus indicators.
- Don’t use component `z-index` values above 20. The shared order is sticky (10), dropdown/popover (12), modal backdrop (15), modal (16), toast (18), tooltip (19), and exceptional editor overlays (20).
