# Landing Mini-Editor Callout

## Goal

Add a hand-drawn `Try it!` annotation above the landing hero's interactive
mini editor. The annotation should make the preview's interactivity obvious
and create a deliberate beat before the hydrated editor content appears.

## Chosen approach

Render both the lettering and curved arrow as custom inline SVG strokes. Do
not add a handwriting font or another image asset. The SVG remains visually
consistent across browsers and keeps this one-off marginal note outside the
landing typography system.

The callout is static Astro markup inside the existing `.heroScript` wrapper,
before `.scriptExcerpt`. The React editor continues hydrating immediately.
Only its visual reveal is delayed.

## Appearance and placement

- Draw `Try it!` as an irregular continuous-looking handwritten stroke.
- Draw a loose curved arrow in the same visual language.
- Use rounded stroke caps and joins with no fill.
- Use the existing copper token because the note points to an action.
- Position the callout outside the card, above its upper-left area.
- Let only the arrow tip enter approximately 10–14 CSS px below the card's top
  edge.
- Keep the tip inside the mini editor's top padding so it never obscures script
  text or an editable block.
- Keep the annotation visually subordinate to the editor and hero headline.
- The callout remains visible after its entrance animation.

The visible SVG is decorative and uses `aria-hidden="true"`. Add a visually
hidden `Try it!` text node so the invitation is still available to assistive
technology without exposing SVG paths as content.

## Animation sequence

Preserve the existing hero tracks and use this sequence:

1. Editor paper enters from `.18s` to `.74s`.
2. The `Try it!` stroke draws from `.62s` to `.94s`.
3. The arrow draws from `.84s` to `1.24s`.
4. The hydrated editor content fades from `1.32s` to `1.68s`.

Use normalized SVG `pathLength` values with `stroke-dasharray` and
`stroke-dashoffset` so the strokes draw without JavaScript. The content reveal
delay is measured from the React wrapper's insertion; hydration and editor
initialization are never postponed.

## Responsive behavior

- Keep the callout above the editor when the hero switches to one column.
- Scale it down slightly at 640 CSS px and below.
- Preserve the arrow-tip inset relative to the card rather than using fixed
  page coordinates.
- Do not let the callout create horizontal page overflow.

## Reduced motion

Under `prefers-reduced-motion: reduce`:

- disable both stroke-drawing animations;
- show the complete annotation immediately;
- keep the existing immediate editor-content reveal.

## Protected contracts

- Do not change editor hydration mode, editor behavior, document content, card
  dimensions, hero copy, CTA labels, or hero grid proportions.
- Do not add JavaScript timers or an editor readiness protocol.
- Do not add a font dependency.

## Verification

- Extend the landing build test to assert the annotation and hidden invitation
  are present before the editor island.
- Build and typecheck the landing app.
- Run landing tests and CSS lint.
- Inspect desktop and mobile rendering when the in-app browser is available.
- Refresh graphify after implementation.

