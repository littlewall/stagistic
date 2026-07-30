# Landing Header and Hero Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the landing header and restore the reference hero
proportions without overflow.

**Architecture:** Keep the existing Astro markup and CSS Module. Represent the
header's navigation and editor action as separate semantic elements, then use a
proportional CSS Grid for the desktop hero while retaining current breakpoints.

**Tech Stack:** Astro 7, CSS Modules, Vite Plus tests

## Global Constraints

- Desktop navigation contains only `Features` and `FAQ`.
- `Try editor` links to `https://editor.stagistic.app`.
- At 640 CSS px and below, hide navigation but keep `Try editor`.
- Do not add a mobile menu.
- Use the existing copper, paper, and umber tokens.
- Keep the hero container at 72 rem and its desktop gap at 5 rem.
- Use an approximate 56/44 copy-to-editor desktop ratio without track overflow.
- Preserve existing anchors, copy, motion, editor preview, and `/syntax`.
- Do not commit; prepare the changes for user review.

---

### Task 1: Header information architecture

**Files:**

- Modify: `apps/landing/test/index.test.ts`
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/src/pages/index.module.css`

**Interfaces:**

- Consumes: the existing `#features`, `#faq`, and editor URL contracts.
- Produces: a two-link primary navigation and a persistent editor CTA.

- [ ] **Step 1: Write the failing header test**

Extract the homepage header and assert:

```ts
expect(header.match(/<nav\b/g) ?? []).toHaveLength(1);
expect(header).toContain('href="#features"');
expect(header).toContain('href="#faq"');
expect(header).not.toContain('href="#alpha"');
expect(header).not.toContain('Early alpha');
expect(header).toContain(
    '<a href="https://editor.stagistic.app" class="_navCta_',
);
expect(header).toContain('>Try editor</a>');
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: the new header test fails because `Get started` and `Early alpha`
remain and `Try editor` is absent.

- [ ] **Step 3: Implement the semantic header**

Keep the lockup, render only the two requested links inside:

```astro
<nav class={s.navLinks} aria-label="Primary">
```

Replace the status badge with:

```astro
<a href="https://editor.stagistic.app" class={s.navCta}>
    Try editor
</a>
```

- [ ] **Step 4: Add responsive CTA styling**

Style `.navCta` as the compact copper header action with hover, active, and
lavender focus-visible states. In the existing `max-width: 640px` query, hide
`.navLinks` and leave `.navCta` visible.

- [ ] **Step 5: Run the test and confirm GREEN**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: all landing tests pass.

### Task 2: Hero grid repair

**Files:**

- Modify: `apps/landing/src/pages/index.module.css`

**Interfaces:**

- Consumes: the existing 72 rem container, 5 rem gap, and responsive
  breakpoints.
- Produces: fitting 5:4 desktop tracks and the existing stacked mobile layout.

- [ ] **Step 1: Record the failing geometry**

The current desktop minima require `38rem + 5rem + 30rem = 73rem` inside a
72 rem container, so the grid cannot fit at its declared maximum.

- [ ] **Step 2: Implement the proportional tracks**

Replace the desktop columns with:

```css
grid-template-columns: minmax(0, 5fr) minmax(0, 4fr);
```

Do not change the 980 px or 860 px responsive compositions.

- [ ] **Step 3: Verify the package**

Run:

```bash
pnpm --filter @stagistic/landing typecheck
pnpm test apps/landing/test/index.test.ts
npx eslint \
  apps/landing/src/pages/index.astro \
  apps/landing/test/index.test.ts
npx stylelint apps/landing/src/pages/index.module.css
git diff --check
```

Expected: every command exits successfully.

- [ ] **Step 4: Verify rendered layouts**

At a desktop viewport, confirm the hero tracks fit the 72 rem container and
retain the 5:4 proportion. At a mobile viewport no wider than 640 px, confirm
the primary navigation is hidden and `Try editor` remains visible.

- [ ] **Step 5: Refresh graphify**

Run:

```bash
graphify update .
```

Expected: the knowledge graph includes the final header and hero source state.

