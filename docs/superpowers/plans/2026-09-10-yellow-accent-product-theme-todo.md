# Yellow-accent Product Theme TODO

**Status:** complete
**Current:** none
**Plan:** docs/superpowers/plans/2026-09-10-yellow-accent-product-theme.md

- [x] Task 1 — Establish semantic theme foundation and contrast tests
- [x] Task 2 — Separate music identity from interaction state
- [x] Task 3 — Tighten floating-surface radii
- [x] Task 4 — Apply yellow action semantics to shared buttons
- [x] Task 5 — Make active sidebar rows Lime-filled and borderless
- [x] Task 6 — Recolor the continuous script surface and scene marker
- [x] Task 7 — Run complete verification and visual QA

## Verification record

- `npx tsc -b` — passed.
- `pnpm lint` — passed; 27 route CSS modules justified.
- UI browser tests — 125/125 passed.
- Editor browser tests — 171/171 passed.
- App-routes browser tests — 114/114 passed.
- Manual light/dark editor QA — passed: continuous script blocks, yellow scene marker,
  Lime active sidebar fill without border or shadow.
- Light chrome refinement — `#f9f6ed` is the light-surface base; panels use it
  directly, paper and raised layers are near-white derivatives, hover stays close
  to the base, and the canvas surround remains at `L=.955`. Steel Wool remains
  limited to text, edges, and shadows.
- `pnpm test` — all product-package tests passed; root remains red only for two
  untouched landing breakpoint assertions (`1000px` expected, `62.4375em` emitted).
- `apps/landing` and `packages/db` — no diff.
- `graphify update .` — ran; the existing graph is empty, so there was no topology
  output to update.

## Resume protocol

- Resume at the first unchecked task.
- Follow the detailed steps and commands in the implementation plan.
- Check a task only after its scoped verification passes or any baseline failure is recorded.
- Preserve unrelated changes and never commit; the user performs commits.
