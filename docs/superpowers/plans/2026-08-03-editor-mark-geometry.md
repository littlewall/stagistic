# Stagistic Editor Mark Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development or superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Propagate the approved 135 × 130 Editor mark geometry to every
landing logo and favicon asset.

**Architecture:** The two static logo variants and adaptive favicon share one
identical set of paths and rectangles; only their color treatment differs.
Raster icons are regenerated from the canonical light/adaptive SVG output and
validated at their consumer-visible dimensions.

**Tech Stack:** SVG, librsvg, PNG, ICO, Astro landing tests.

## Global Constraints

- Preserve `#3d2a1d`, `#e2a05f`, and `#fffaf6`.
- Preserve the white Apple Touch background and 160 px mark.
- Do not modify unrelated dirty-worktree files.
- Do not create a git commit; the user performs final commits.

---

### Task 1: Asset contract

**Files:**
- Modify: `apps/landing/test/index.test.ts`

- [ ] Add assertions for the three canonical SVG canvases, PNG dimensions,
  Apple Touch dimensions, and ICO entries.
- [ ] Run `pnpm test apps/landing/test/index.test.ts` and confirm failure
  against the old 135 × 111 assets.

### Task 2: Canonical SVG variants

**Files:**
- Modify: `apps/landing/public/assets/stagistic-brand/editor-mark-on-light.svg`
- Modify: `apps/landing/public/assets/stagistic-brand/editor-mark-on-dark.svg`
- Modify: `apps/landing/public/favicon.svg`
- Delete: `apps/landing/public/assets/stagistic-brand/editor-mark-preview.svg`

- [ ] Copy the approved geometry into all three canonical SVGs.
- [ ] Preserve each variant's existing color contract.
- [ ] Parse all SVGs with `xmllint --noout`.

### Task 3: Raster derivatives

**Files:**
- Modify: `apps/landing/public/favicon-16x16.png`
- Modify: `apps/landing/public/favicon-32x32.png`
- Modify: `apps/landing/public/favicon.ico`
- Modify: `apps/landing/public/apple-touch-icon.png`

- [ ] Rasterize the approved geometry at 16 × 16 and 32 × 32.
- [ ] Package both sizes into `favicon.ico`.
- [ ] Render the light mark at 160 px wide, center it on a 180 × 180 white
  canvas, and save the Apple Touch icon.
- [ ] Run the focused test and confirm it passes.

### Task 4: Final verification

**Files:**
- Verify all files above.

- [ ] Render light, dark, and Apple outputs for visual inspection.
- [ ] Run the focused landing test, landing typecheck, landing build, and
  `git diff --check`.
- [ ] Run `graphify update .`.
- [ ] Review `git status --short` without touching unrelated changes.

