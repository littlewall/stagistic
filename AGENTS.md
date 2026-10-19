## Goldern rules for working on Claude
- Be brief. Use the fewest words possible to get your point across.
- Be specific. Avoid vague language; provide concrete details.
- Be direct. Say what you mean without unnecessary qualifiers or hedging.
- Never commit code by yourself, even if other skills tell you to. Only prepare commit and message, then ask me to review and commit. I will do the final commit to ensure consistency in style, message, and branch management.

## DB schema changes
After any change to `packages/db/src/` schema or `drizzle/*.sql` files, run:
`moon run db:db-compile-migrations`
(`db:generate` does this automatically; manual SQL edits do not.)

## Document schema version
`SCRIPT_DOCUMENT_SCHEMA_VERSION` changes only when the stored `ScriptDocument`
shape or meaning changes: node/mark types, attrs, cue/character-tag representation,
or document-to-projection semantics. Do not bump it for DB-only projection changes,
metadata columns, UI, autosave internals, or export layout changes.

## Checks (clean-shield toolchain)
Canonical commands run through moon. Root workflows are defined in `moon.yml`; reusable project tasks live in `.moon/tasks/global.yml`; project overrides live beside each app/package in `moon.yml`. The implementation still uses Vite+, oxfmt, oxlint, stylelint, Biome, Astro, and other underlying tools, but invoke them through moon.
- Typecheck: `moon run root:typecheck` (whole graph) or `moon run <project>:typecheck`.
- Lint: `moon run root:lint`; auto-fix: `moon run root:lint-fix`. For one project use `moon run <project>:lint`.
- Format: `moon run root:format` (ESLint `@stylistic` + import sort, writes in place) / `moon run root:format-check`. Linter configs (ESLint, oxlint, stylelint) live in `packages/linters`. oxlint handles correctness only; there is no oxfmt.
- Agent hooks: `.claude/settings.json` runs `scripts/agent-fix.mjs` after every Write/Edit and on `Stop` (before Claude finishes its response). The post-edit hook checks the edited file; `Stop` batches all staged, unstaged and untracked JS/TS/CSS/Astro changes and jscpd config/baseline changes, including shell edits. Both run the commit hook's fixers (`vp lint --fix` + `eslint --fix`, `stylelint --fix` for CSS), recheck JavaScript lint after formatting, then run `duplicates-changed`. Neither stages files. Remaining errors return to Claude with exit 2; fix them before finishing. An unchanged failure on an immediate Stop-hook continuation is shown to the user instead of triggering an endless loop; report unresolved errors explicitly. Keep the commands in step with the `lint-js-fix`/`format`/`stylelint-fix`/`duplicates-changed` tasks in `moon.yml`. (Ultracite was evaluated and not used: its `fix` always adds Prettier/oxfmt/Biome formatting outside our rules.)
- Duplication: `moon run root:duplicates` scans all production source roots; `moon run root:duplicates-changed` reports clones touching changed files but still compares against unchanged sources. If the config or baseline changes, the shared wrapper checks all clones, including in commit and Claude hooks. Both tasks fail on any new clone relative to the versioned `.jscpd-baseline.json`. `.jscpd.json` requires at least 10 lines and 100 tokens and excludes tests, fixtures and generated files. jscpd is also part of root lint, the commit hook and both Claude hooks; it does not auto-refactor code. `moon run root:duplicates-baseline` explicitly accepts the current clone set: only update it for reviewed, intentional duplication, never to silence a new finding automatically.
- Commit hook: moon manages `.moon/hooks` from `.moon/workspace.yml` and runs `moon run root:staged`. The task delegates staged-file selection and re-staging to Vite+ using the map in `vite.config.ts`, then runs jscpd on changed files against all source roots. jscpd's changed-file filter includes staged, unstaged and untracked files. Run `moon sync hooks` to install or refresh hooks explicitly; normal moon commands also sync them because `vcs.sync` is enabled.
- Node tests: `moon run root:test` (whole repo), `moon run <project>:test`, or `moon run <project>:test-watch`. Test imports use `vite-plus/test`. The root run lists each project's own config (`test.projects` in `vite.config.ts`), so per-project include/timeouts apply there too; a new package with node tests needs a `vite.config.ts` with a `test` section. Browser, e2e (`web:test-e2e`), cloud (`web:test-e2e-cloud`) and `marketing:test` (builds the site first) are separate tasks. db tests share modules per worker (`isolate: false`) and clone one migrated PGlite template (`createTestDb`).
- Browser tests: `moon run <project>:test-browser` (app-core/app-routes/editor/ui/web). Each config loads `@stagistic/vite-config/browser-test` (`BROWSER_TEST_SETUP`), which focuses the test iframe before every test. Focus set by tiptap `autofocus`/`commands.focus` lands one animation frame later: poll for it, never assert `document.activeElement` synchronously.
- Root `vite.config.ts` only configures the test runner; `vite.config.js` is a gitignored compiled artifact — never edit or commit it.

## Handling test/lint/ts failures
- Don't spend turns proving a failure isn't from your change. Establish a baseline ONCE (`git stash` → run → `git stash pop`, or check a file you didn't touch), then move on.
- A failure in code you didn't touch: fix it only if the cause is clear and the fix is local. Do NOT mutate golden snapshots, loosen assertions, or change a viewport to make a red go green — that masks WIP bugs. Flag it instead (`spawn_task`) and keep going.
- For a self-contained pre-existing failure worth fixing now, dispatch a subagent to fix it in isolation so it doesn't derail the current task.

## Design context
See [PRODUCT.md](PRODUCT.md) before any UI work.

**Register:** product (app-first). The editor app (`apps/web`) is the primary surface; the marketing website (`apps/marketing`) is brand register.

**North Star:** "The Dark Stage" — the interface exists in the wings; the script is the spotlight.

**Five principles:**
1. The script is the center — when in doubt, subtract.
2. Theatrical without theatrics — prompt-book precision, not poster noise.
3. Structure is a first-class feature — acts, scenes, characters are meaningful data.
4. Compose, don't sprawl — editor + future production apps grow by composition.
5. Professional discretion — no onboarding fanfare; a playwright picks it up and works.

**Anti-references:** Heavy SaaS dashboards (Jira/Asana), gamified writing apps, loud marketing/AI landing aesthetics (gradients, feature grids, eyebrow-on-every-section).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
