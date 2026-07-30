# Landing Editor Branding and Favicons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distinguish Stagistic Editor from the Stagistic umbrella brand,
simplify the Stagistic Syntax header, and add a non-PWA favicon set.

**Architecture:** Keep the existing Astro page structure and CSS system.
Reference reusable editor-mark SVG assets from the homepage, share favicon
metadata through one Astro component, and verify the generated HTML through
the existing build-level landing tests.

**Tech Stack:** Astro 7, CSS Modules, Vite Plus tests, SVG, ImageMagick

## Global Constraints

- Use **Stagistic Editor** whenever copy describes the editor product.
- Keep **Stagistic** in the homepage footer.
- Keep **Stagistic Syntax** as the independent format name.
- The homepage header uses the on-dark editor mark and one uninterrupted
  `Stagistic Editor` text run.
- Do not change the homepage layout, anchors, CTA URLs, or motion.
- `/syntax` has only a left-aligned `Back to site` header link.
- Add no manifest, PWA metadata, or PWA-sized icons.
- Use the revised editor-mark geometry with the portal ending at `y = 96`.
- Add an outline `Explore features` hero action linking to `#features`.
- State that every current and future Stagistic Editor feature remains free;
  only separate future Stagistic tools may be paid.
- Render the on-light Apple Touch mark 160 px wide on `#fffaf6`, and clear SVG
  page offsets before centering it on both axes in the 180×180 canvas.
- Do not commit; prepare a commit message for the user.

---

### Task 1: Brand language and headers

**Files:**

- Create: `apps/landing/brand-spec.md`
- Create: `apps/landing/public/assets/stagistic-brand/editor-mark-on-light.svg`
- Create: `apps/landing/public/assets/stagistic-brand/editor-mark-on-dark.svg`
- Modify: `apps/landing/test/index.test.ts`
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/src/pages/index.module.css`
- Modify: `apps/landing/src/pages/syntax.astro`
- Modify: `apps/landing/src/pages/syntax.module.css`

**Interfaces:**

- Consumes: the supplied 135×111 editor SVG geometry and two palettes.
- Produces: `/assets/stagistic-brand/editor-mark-on-dark.svg` for the homepage
  lockup and a documented on-light counterpart.

- [ ] **Step 1: Write failing build-level tests**

Extend the existing suite to read both generated pages and assert:

```ts
expect(homeHtml).toContain('Stagistic Editor</span>');
expect(homeHtml).toContain(
    'src="/assets/stagistic-brand/editor-mark-on-dark.svg"',
);
expect(homeHtml).not.toContain('>Editor</span></span>');
expect(homeHtml).toContain('© Stagistic • Made with 💛 in Prague');
expect(syntaxHtml).toContain('>Back to site</a>');
expect(syntaxHtml).not.toContain('href="/#features"');
expect(syntaxHtml).not.toContain('class="_logo');
expect(syntaxHtml).toContain('Stagistic syntax');
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: failures for the absent mark, old split wordmark, and old syntax
navigation.

- [ ] **Step 3: Add the logo assets and brand inventory**

Create the supplied geometry twice:

```svg
<svg viewBox="0 0 135 111" xmlns="http://www.w3.org/2000/svg">
  <path d="m20,101l0,-69.5c0,-19.4 16,-31.5 40,-31.5l35,0c24,0 40,12.1 40,31.5l0,69.5l-115,0z"/>
  <path d="m48,76l87,0l0,25l-11.2,10l-115,0l39.2,-35z"/>
  <g>
    <rect rx="7.5" height="15" width="38" y="21.5" x="59.5"/>
    <rect rx="5" height="10" width="83" y="50.5" x="38.5"/>
    <rect rx="5" height="10" width="83" y="68" x="38.5"/>
    <rect rx="5" height="10" width="59" y="84.5" x="38.5"/>
  </g>
</svg>
```

Use `#3d2a1d / #e2a05f / #fffaf6` for on-light and
`#fffaf6 / #e2a05f / #3d2a1d` for on-dark. Record these paths, existing
screenshots, fonts, and color roles in `apps/landing/brand-spec.md`.

- [ ] **Step 4: Implement the homepage lockup and product copy**

Render a decorative mark beside one wordmark:

```astro
<div class={s.navLogo}>
    <img
        src="/assets/stagistic-brand/editor-mark-on-dark.svg"
        alt=""
        class={s.logoMark}
    />
    <span class={s.logoText}>Stagistic Editor</span>
</div>
```

Update title, meta description, hero, theatre prose, image alternative text,
free-section prose, and FAQ prose when they refer to the editor.

- [ ] **Step 5: Simplify the syntax header**

Render only:

```astro
<header class={s.nav}>
    <div class={s.navInner}>
        <a href="/" class={s.navLink}>Back to site</a>
    </div>
</header>
```

Remove the now-unused syntax logo and link-group CSS.

- [ ] **Step 6: Run the test and confirm GREEN**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: all landing tests pass.

### Task 2: Favicons and browser theme

**Files:**

- Create: `apps/landing/src/components/SiteIcons.astro`
- Create: `apps/landing/public/favicon.svg`
- Create: `apps/landing/public/favicon-16x16.png`
- Create: `apps/landing/public/favicon-32x32.png`
- Create: `apps/landing/public/favicon.ico`
- Create: `apps/landing/public/apple-touch-icon.png`
- Modify: `apps/landing/test/index.test.ts`
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/src/pages/syntax.astro`

**Interfaces:**

- Produces: `<SiteIcons />`, an Astro component with no props that renders all
  favicon links and `<meta name="theme-color" content="#3d2a1d" />`.
- Consumes: the same editor-mark geometry and brand colors as Task 1.

- [ ] **Step 1: Write failing metadata and asset tests**

Assert both generated pages contain:

```ts
expect(html).toContain('<link rel="icon" href="/favicon.svg"');
expect(html).toContain(
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png"',
);
expect(html).toContain(
    '<meta name="theme-color" content="#3d2a1d">',
);
```

Also assert that each declared file exists in `apps/landing/public`.

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: failures for missing metadata and files.

- [ ] **Step 3: Add the shared head component**

Implement:

```astro
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
<link rel="shortcut icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
<meta name="theme-color" content="#3d2a1d" />
```

Use `<SiteIcons />` in both page heads.

- [ ] **Step 4: Create adaptive and raster assets**

Create `favicon.svg` with transparent background and a
`prefers-color-scheme: dark` palette override. Render the light-palette default
to 16×16 and 32×32 PNG, combine those into `favicon.ico`, and render the
on-dark mark with safe padding on a 180×180 brown canvas for Apple Touch.

- [ ] **Step 5: Run the test and confirm GREEN**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: all landing tests pass.

### Task 3: Revised mark, hero CTA, and free-product promise

**Files:**

- Modify: `apps/landing/public/assets/stagistic-brand/editor-mark-on-light.svg`
- Modify: `apps/landing/public/assets/stagistic-brand/editor-mark-on-dark.svg`
- Modify: `apps/landing/public/favicon.svg`
- Regenerate: `apps/landing/public/favicon-16x16.png`
- Regenerate: `apps/landing/public/favicon-32x32.png`
- Regenerate: `apps/landing/public/favicon.ico`
- Regenerate: `apps/landing/public/apple-touch-icon.png`
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/src/pages/index.module.css`
- Modify: `apps/landing/test/index.test.ts`

**Interfaces:**

- Consumes: the revised 135×111 SVG geometry supplied by the user.
- Produces: a second hero action linking to the existing `#features` anchor,
  unambiguous Editor pricing copy, and regenerated favicon assets.

- [ ] **Step 1: Write failing CTA and copy tests**

Extend the generated-homepage assertions:

```ts
expect(homeHtml).toContain(
    '<a href="#features" class="_btnOutline_',
);
expect(homeHtml).toContain('>Explore features</a>');
expect(homeHtml).toContain(
    'Every current and future Editor feature will remain free.',
);
expect(homeHtml).toContain(
    'Some future tools may be paid, but Stagistic Editor will always be free and open source.',
);
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: failures for the missing outline action and old ambiguous copy.

- [ ] **Step 3: Replace the mark geometry**

Use these paths in both mark assets and the adaptive favicon, preserving their
existing palette roles:

```svg
<path d="M20 96 V31.5 C20 12.1 36 0 60 0 H95 C119 0 135 12.1 135 31.5 V96 Z"/>
<path d="M48 76 H135 V96 L123.8 111 H-1 Z"/>
```

- [ ] **Step 4: Add the hero action and revised copy**

Add beside the primary action:

```astro
<a href="#features" class={s.btnOutline}>
    Explore features
</a>
```

Keep the heading and replace the two paragraphs with:

```text
Stagistic Editor is free to use in your browser, with no account or paywall.
Every current and future Editor feature will remain free.

Stagistic will grow into a family of tools for theatre and production. Some
future tools may be paid, but Stagistic Editor will always be free and open
source.
```

Style `btnOutline` with the primary button's dimensions, radius, motion, and
focus ring. Use transparent background, existing text color, and existing
strong border color at rest.

- [ ] **Step 5: Regenerate favicon rasters**

Render the revised on-light mark to the 16×16 and 32×32 fallbacks, rebuild the
multi-frame ICO, and generate Apple Touch with:

```bash
magick -size 180x180 xc:'#fffaf6' \
  \( +size -background none \
     apps/landing/public/assets/stagistic-brand/editor-mark-on-light.svg \
     -resize 160x160 +repage \) \
  -gravity center -composite \
  apps/landing/public/apple-touch-icon.png
```

- [ ] **Step 6: Run the test and confirm GREEN**

Run:

```bash
pnpm test apps/landing/test/index.test.ts
```

Expected: all landing tests pass.

### Task 4: Verification and graph refresh

**Files:**

- Modify: `graphify-out/**` through the canonical graph update command.

- [ ] **Step 1: Verify asset formats and dimensions**

Run:

```bash
identify \
  apps/landing/public/favicon-16x16.png \
  apps/landing/public/favicon-32x32.png \
  apps/landing/public/favicon.ico \
  apps/landing/public/apple-touch-icon.png
```

Expected: PNG dimensions 16×16, 32×32, Apple 180×180, and ICO containing
16×16 plus 32×32 frames.

- [ ] **Step 2: Run package checks**

Run:

```bash
pnpm --filter @stagistic/landing typecheck
pnpm test apps/landing/test/index.test.ts
npx eslint \
  apps/landing/src/components/SiteIcons.astro \
  apps/landing/src/pages/index.astro \
  apps/landing/src/pages/syntax.astro \
  apps/landing/test/index.test.ts
npx stylelint \
  apps/landing/src/pages/index.module.css \
  apps/landing/src/pages/syntax.module.css
```

Expected: every command exits successfully.

- [ ] **Step 3: Check the final diff**

Run:

```bash
git diff --check
git status --short
```

Confirm no unrelated user files changed, especially the existing untracked
`test.svg`.

- [ ] **Step 4: Refresh graphify**

Run:

```bash
graphify update .
```

Expected: the knowledge graph reflects the landing changes.

- [ ] **Step 5: Prepare the handoff**

Suggest:

```text
feat(landing): add editor branding and favicon set
```

Do not stage or commit.
