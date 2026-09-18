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
- Format: `moon run root:format` (writes in place) / `moon run root:format-check`.
- Commit hook: moon manages `.moon/hooks` from `.moon/workspace.yml` and runs `moon run root:staged`. The task delegates staged-file selection and re-staging to Vite+ using the map in `vite.config.ts`. Run `moon sync hooks` to install or refresh hooks explicitly; normal moon commands also sync them because `vcs.sync` is enabled.
- Node tests: `moon run root:test` (whole repo), `moon run <project>:test`, or `moon run <project>:test-watch`. Test imports use `vite-plus/test`.
- Browser tests: `moon run <project>:test-browser` (app-core/app-routes/editor/ui). They pin no viewport → layout/caret asserts are env-sensitive; editor has known pre-existing reds (overlay viewport-fit, cueCaret off-by-one, tied to WIP).
- Root `vite.config.ts` only configures the test runner; `vite.config.js` is a gitignored compiled artifact — never edit or commit it.

## Handling test/lint/ts failures
- Don't spend turns proving a failure isn't from your change. Establish a baseline ONCE (`git stash` → run → `git stash pop`, or check a file you didn't touch), then move on.
- A failure in code you didn't touch: fix it only if the cause is clear and the fix is local. Do NOT mutate golden snapshots, loosen assertions, or change a viewport to make a red go green — that masks WIP bugs. Flag it instead (`spawn_task`) and keep going.
- For a self-contained pre-existing failure worth fixing now, dispatch a subagent to fix it in isolation so it doesn't derail the current task.

## Design context
See [PRODUCT.md](PRODUCT.md) before any UI work.

**Register:** product (app-first). The editor app (`apps/web`) is the primary surface; the landing page (`apps/landing`) is brand register.

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
