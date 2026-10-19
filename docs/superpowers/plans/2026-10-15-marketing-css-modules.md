# Marketing CSS Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the remaining marketing component styles into adjacent CSS Modules without changing their rendered appearance or behavior.

**Architecture:** Each Astro component imports its own `.module.css` file and binds local classes through that import. Markdown descendants remain anchored to the article body class. Existing global tokens, resets, and existing CSS Modules retain their responsibilities.

**Tech Stack:** Astro, CSS Modules, Moon, Playwright.

**Spec:** The user's request in this session: audit the whole marketing app and move styles into separate CSS Modules wherever they are still embedded.

## Global Constraints

- Preserve the existing uncommitted article listing and metadata changes.
- Preserve page content, URLs, layout, colors, responsive behavior, focus states, and header menu interactions.
- Keep `src/styles/global.css` global: it owns font imports, tokens, and document resets.
- Keep existing CSS Modules and their consumers intact.
- No new dependencies, commits, branch changes, images, or unrelated refactors.
- Use native file editing tools and canonical Moon commands.

## Review Focus

- Bare element selectors must not become global after extraction.
- Article Markdown headings, links, lists, and inline code must retain their styling.
- Header and footer styles must not leak into the article or editor preview.
- Header dropdown scripting uses stable data attributes, independently of hashed classes.
- Desktop and mobile rendering, keyboard focus, and the recently changed article cards must remain unchanged.

## Task 1: Extract the eight remaining component styles

**Files:** Modify these components and create an adjacent matching `.module.css` file for each:

- `apps/marketing/src/layouts/ArticleLayout.astro`
- `apps/marketing/src/components/Header.astro`
- `apps/marketing/src/components/Footer.astro`
- `apps/marketing/src/components/HeaderEditorMenu.astro`
- `apps/marketing/src/components/SyntaxIntro.astro`
- `apps/marketing/src/components/articles/ArticleIndex.astro`
- `apps/marketing/src/components/articles/ArticleFooter.astro`
- `apps/marketing/src/components/articles/ArticleMeta.astro`

**Interfaces:** Preserve component props, script data attributes, and public markup semantics. Only CSS imports and class bindings change.

- [x] Capture computed styles and layout on all eight built routes at 390px and 1280px before editing.
- [x] Extract each style block, bind module classes, and scope former bare element selectors with local classes.
- [x] Preserve styling of article Markdown descendants and component-specific focus and hover states.
- [x] Run `moon run marketing:typecheck`, `moon run marketing:build`, and `moon run root:lint` (marketing checks pass; root lint has 10 existing errors outside marketing).
- [x] Compare computed styles and layout with the baseline for all sixteen route/viewport combinations; check menu and article interactions.
- [x] Obtain an independent review of the complete uncommitted migration (spec and quality pass, no findings).
- [x] Run `graphify update .` and `git diff --check`.
- [x] Prepare a commit message for the user to review and commit: `refactor(marketing): extract component styles into CSS modules`.
