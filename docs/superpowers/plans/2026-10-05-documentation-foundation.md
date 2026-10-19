# Documentation Foundation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Keep changes uncommitted for the user's review.

**Goal:** Prepare a working docs application and a reviewable category proposal without writing feature instructions.

**Architecture:** A standalone static Astro/Starlight application in `apps/docs`, targeting `https://docs.stagistic.com`. User guide and technical reference share the application but have separate navigation groups. Existing landing and editor surfaces remain unchanged in this foundation phase.

**Tech Stack:** Astro 7.3.5, Starlight 0.42.5, Markdown/MDX, pnpm workspace, moon.

**Spec:** `docs/proposals/editor-user-documentation.md`

## Global Constraints

- User approved preparing the app, infrastructure and category proposal in this turn. Execute locally in the current workspace.
- Do not commit, publish, configure DNS, migrate syntax content or write concrete feature instructions.
- English public shell provisionally follows the current product; Czech structure proposal is for review. Adjust if the user supplies a language preference.
- Use canonical moon checks. No synthetic unit tests for declarative scaffolding; verify actual build, typecheck, formatting, lint and generated navigation.
- Preserve `/editor/syntax` for its later marketing summary; full syntax will belong in technical reference.
- Keep the scaffold unindexed by search engines until real content is ready.

## Review Focus

- Every navigation target resolves in the production build, including generated heading anchors.
- Deep links resolve as static directory indexes with a genuine 404 for unknown paths.
- Production search assets exist; search works on the built site.
- Desktop and narrow layouts retain readable navigation and keyboard access.
- The user guide does not require understanding the text format; technical content remains separately identified.

## Task 1: Working docs application

**Files:** `apps/docs/package.json`, `moon.yml`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/content.config.ts`, `src/styles/docs.css`, `src/content/docs/**/*.md`, `public/favicon.svg`, `pnpm-lock.yaml`.

- [x] Create Astro/Starlight configuration, content collection and moon dev/build/preview/typecheck/lint tasks. Request port 4322; Astro selects the next available port if occupied.
- [x] Add the public shell, category overview pages and a technical overview. Keep detailed article proposals in the internal structure document.
- [x] Install workspace dependencies and verify `moon run docs:typecheck` and `moon run docs:build` sequentially.

## Task 2: Structure and hosting handoff

**Files:** `docs/proposals/editor-documentation-structure.md`, `apps/docs/README.md`.

- [x] Propose task-oriented categories, planned article URLs, canonical homes for hidden interactions and a short article template.
- [x] Document source organization, local commands, static output, hosting requirements, search behavior and next-phase boundaries.
- [x] Verify generated internal links and Pagefind assets in the real build; exercise the preview in a browser.

## Task 3: Verification and review

- [x] Run focused moon format, lint and typecheck checks; fix findings in the new application.
- [x] Review the change against the approved scope, record validation and any limitations below.
- [x] Run `graphify update .` and leave all changes uncommitted.

## Execution Record

- Ruling: implement in the current clean workspace, with no commits or additional approval handoff, as explicitly requested in this turn. The user's staged workflow governs scope: detailed content remains deferred.
- Ruling: use English provisionally because current product copy is English; the asynchronous language question remains open. Changing this later requires relabeling the shell, not rewriting completed feature guides.
- Ruling: replace the global `docs` ignore with scoped ignores for local design/mockup artifacts. The old rule prevented moon from discovering `apps/docs` and ignored authored documentation. Existing unrelated source documents remain outside this change.
- `moon run docs:lint`, `moon run docs:typecheck`, `moon run docs:build` and focused `root:format-check`: passed.
- `pnpm install --frozen-lockfile`, `landing:typecheck` and `landing:build`: passed. Landing was checked because its shared Astro peer resolution changed in the lockfile.
- Real output: 11 HTML pages, 258 internal references and 66 heading references; zero missing targets. Pagefind assets and global noindex verified. Existing brand favicon reused exactly.
- Browser: production search returned character pages and opened a result; Cmd+K/Escape worked. Mobile menu navigated to Music and lyrics at 390px without horizontal overflow. Light and dark themes inspected at desktop width. Unknown URL returned the branded page with HTTP 404.
- Preview requested 4322 but that port was occupied by another server; this task's preview runs at `http://localhost:4324/`.
- Independent reviewer: no findings; recommended landing compatibility checks, which passed.
- Known build warning: Starlight's custom 404 entry overlaps its dedicated 404 route. The winning route renders the correct page; verified via real HTTP response. No library routing patch introduced.
- Existing peer warnings: Vitest/Vite, Tiptap and stylelint; none in docs dependencies.
- Graph updated successfully with AST-only extraction. Graphify reports unavailable SQL parser and zero-node data files; no semantic/API extraction performed.
- Suggested commit: `feat(docs): add documentation app and guide structure`. No files staged, committed or deployed.
