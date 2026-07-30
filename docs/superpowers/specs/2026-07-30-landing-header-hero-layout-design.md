# Landing Header and Hero Layout

## Goal

Simplify the Stagistic Editor landing header and restore the desktop hero
proportions shown in the supplied reference without changing the established
brand system or section structure.

## Design read

- Artifact: existing product landing page.
- Audience: playwrights and librettists evaluating the editor.
- Visual language: restrained editorial tool with a warm theatrical register.
- Mode: extension and repair.
- Visual variance: 3/10; preserve the current composition.
- Motion intensity: 3/10; keep existing transitions.
- Information density: 4/10; remove one redundant navigation action.
- Asset dependence: 6/10; preserve the real editor mark and mini editor.
- Brand fidelity: 10/10; use only existing tokens, typography, and shapes.

## Header

Keep the current `Stagistic Editor` lockup on the left.

On desktop:

- the primary navigation contains only `Features` and `FAQ`;
- remove `Get started`;
- replace the `Early alpha` badge with a `Try editor` link to
  `https://editor.stagistic.app`;
- style `Try editor` as a compact copper CTA that belongs to the current header
  rather than as a status badge.

At 640 CSS px and below:

- hide the primary navigation completely;
- keep the editor lockup on the left;
- keep the `Try editor` CTA on the right;
- do not introduce a menu button or mobile navigation drawer.

The header remains sticky, keyboard accessible, and 3 rem high.

## Hero layout

Keep the current copy, CTAs, mini editor, 72 rem container, and 5 rem desktop
gap. Replace the conflicting desktop track minimums with a proportional grid:

```css
grid-template-columns: minmax(0, 5fr) minmax(0, 4fr);
```

This preserves the reference's approximate 56/44 copy-to-editor ratio while
allowing both tracks to fit inside the container. The mini editor continues to
fill its track up to its existing 35 rem cap.

Keep the existing intermediate layout at 980 px and the single-column layout
at 860 px. No page-wide horizontal overflow may be introduced.

## Protected contracts

- Preserve `#features` and `#faq`.
- Preserve the editor URL.
- Preserve the editor logo, wordmark, copy, hero actions, mini editor, motion,
  colors, fonts, and section order.
- Do not change the `/syntax` header.

## Verification

- Build-level tests assert the exact header navigation and editor CTA.
- Landing tests, typecheck, lint, and stylelint pass.
- Verify desktop and mobile geometry with a rendered browser when available.
- Update the project graph after implementation.

