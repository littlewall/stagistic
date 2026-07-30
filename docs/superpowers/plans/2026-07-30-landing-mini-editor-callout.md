# Landing Mini-Editor Callout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hand-drawn `Try it!` SVG annotation above the hero mini editor
and reveal the editor content after the annotation finishes drawing.

**Architecture:** Keep the callout in static Astro markup so it is present
before the React island hydrates. Draw both the lettering and arrow with
inline SVG paths animated by CSS, while the mini editor continues mounting
immediately behind a delayed opacity reveal.

**Tech Stack:** Astro 7, CSS Modules, inline SVG, Vite Plus tests

## Global Constraints

- Use custom SVG strokes for both `Try it!` and the arrow.
- Do not add a font, image, JavaScript timer, or editor-readiness dependency.
- Position the note above the editor's upper-left area.
- Let only the arrow tip enter 10–14 CSS px below the card's top edge.
- Never overlap script text or editable content.
- Use the existing copper token and rounded stroke caps and joins.
- Draw `Try it!` from `.62s` to `.94s`.
- Draw the arrow from `.84s` to `1.24s`.
- Reveal editor content from `1.32s` to `1.68s`.
- Hydrate and initialize the editor immediately.
- Show complete content without animation under reduced motion.
- Preserve hero copy, grid, card dimensions, editor behavior, and document.
- Do not commit; prepare the working tree for user review.

---

### Task 1: Hand-drawn invitation and reveal sequence

**Files:**

- Modify: `apps/landing/test/index.test.ts`
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/src/pages/index.module.css`
- Modify:
  `apps/landing/src/components/mini-editor/LandingMiniEditor.module.css`

**Interfaces:**

- Produces: `data-try-editor-callout` before the interactive preview.
- Consumes: the existing `--color-amber`, `.heroScript`, `.scriptExcerpt`, and
  `LandingMiniEditor` hydration behavior.

- [ ] **Step 1: Write the failing build-level test**

Add a test that checks the generated user-facing page:

```ts
it('invites visitors to try the mini editor before the editor island', () => {
    const heroSection = homeHtml.match(
        /<!-- Hero --><section\b[\s\S]*?<\/section>/,
    )?.[0] ?? '';
    const callout = heroSection.match(
        /<div\b[^>]*data-try-editor-callout[\s\S]*?<\/div>/,
    )?.[0] ?? '';

    expect(callout).toContain('>Try it!</span>');
    expect(callout).toContain('aria-hidden="true"');
    expect(heroSection.indexOf('data-try-editor-callout')).toBeGreaterThan(-1);
    expect(heroSection.indexOf('data-try-editor-callout')).toBeLessThan(
        heroSection.indexOf(
            'aria-label="Interactive preview of Stagistic Editor"',
        ),
    );
});
```

- [ ] **Step 2: Run the landing test and confirm RED**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: the new test fails because the callout is absent.

- [ ] **Step 3: Add the inline SVG before the editor card**

Inside `.heroScript`, before `.scriptExcerpt`, render:

```astro
<div class={s.tryEditorCallout} data-try-editor-callout>
    <span class={s.visuallyHidden}>Try it!</span>
    <svg
        viewBox="0 0 176 90"
        aria-hidden="true"
        focusable="false"
    >
        <path
            class={clsx(
                s.tryEditorCalloutStroke,
                s.tryEditorCalloutText,
            )}
            pathLength="1"
            vector-effect="non-scaling-stroke"
            d="M8 17C19 13 31 12 43 14M25 13C22 22 20 32 19 42M38 25C37 31 37 36 37 41M38 29C43 23 49 23 52 27M55 26C56 34 59 39 63 38C68 37 71 30 73 25M73 25C71 38 69 49 63 55M83 26C82 31 81 36 81 41M85 17L84.5 17M94 20C92 28 91 34 91 40C91 43 93 44 96 41M87 27C93 26 99 26 103 27M110 23C109 29 107 36 107 41M112 14L111.5 14M121 18C119 26 118 33 117 38M116 45L116.5 45"
        />
        <path
            class={clsx(
                s.tryEditorCalloutStroke,
                s.tryEditorCalloutArrow,
            )}
            pathLength="1"
            vector-effect="non-scaling-stroke"
            d="M132 27C158 28 170 38 166 52C162 66 142 73 120 70M120 70C126 66 131 61 134 57M120 70C127 72 132 76 136 80"
        />
    </svg>
</div>
```

The hidden text carries the invitation for assistive technology. The visible
SVG is decorative.

- [ ] **Step 4: Position and animate the callout**

Add these CSS contracts:

```css
.tryEditorCallout {
    pointer-events: none;
    position: absolute;
    z-index: 2;
    top: -1.875rem;
    left: .75rem;
    width: 10.5rem;
    color: var(--color-amber);
}

.tryEditorCallout svg {
    display: block;
    overflow: visible;
    width: 100%;
    height: auto;
}

.tryEditorCalloutStroke {
    fill: none;
    stroke: currentcolor;
    stroke-width: 2.35;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.tryEditorCalloutText,
.tryEditorCalloutArrow {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
}

.tryEditorCalloutText {
    animation:
        tryEditorStrokeIn .32s .62s
        cubic-bezier(.65, 0, .35, 1) both;
}

.tryEditorCalloutArrow {
    animation:
        tryEditorStrokeIn .4s .84s
        cubic-bezier(.65, 0, .35, 1) both;
}

@keyframes tryEditorStrokeIn {
    to {
        stroke-dashoffset: 0;
    }
}
```

At 640 px and below, use `width: 9rem`, `top: -1.5rem`, and `left: .5rem`.
Add a conventional local `.visuallyHidden` utility.

- [ ] **Step 5: Delay only the editor-content reveal**

Change:

```css
animation: miniEditorContentIn .34s .66s ease-out both;
```

to:

```css
animation: miniEditorContentIn .36s 1.32s ease-out both;
```

Do not change `client:load` or `LandingMiniEditor.tsx`.

- [ ] **Step 6: Preserve reduced motion**

In the existing reduced-motion query, disable both callout animations and set
their `stroke-dashoffset` to `0`. Keep the existing immediate mini-editor
content reveal.

- [ ] **Step 7: Run the test and confirm GREEN**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: all landing tests pass.

### Task 2: Verification and graph refresh

**Files:**

- Modify: `graphify-out/**` through the canonical update command.

**Interfaces:**

- Consumes: Task 1's built landing page.
- Produces: verified generated HTML/CSS and a refreshed code graph.

- [ ] **Step 1: Run package verification**

Run:

```bash
pnpm --filter @stagistic/landing typecheck
pnpm --filter @stagistic/landing build
npx stylelint \
  apps/landing/src/pages/index.module.css \
  apps/landing/src/components/mini-editor/LandingMiniEditor.module.css
git diff --check
```

Expected: each command exits successfully.

- [ ] **Step 2: Inspect the built contract**

Confirm the built homepage contains `data-try-editor-callout` before the
interactive-preview label and that the emitted CSS contains:

```text
animation:tryEditorStrokeIn .32s .62s
animation:tryEditorStrokeIn .4s .84s
animation:miniEditorContentIn .36s 1.32s
```

- [ ] **Step 3: Refresh graphify**

Run:

```bash
graphify update .
```

Expected: the code graph includes the landing callout changes.

- [ ] **Step 4: Review the final working tree**

Run:

```bash
git status --short
git diff --check
```

Do not modify or remove the user's existing untracked `test.svg`.

