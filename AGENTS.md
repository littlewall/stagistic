## Goldern rules for working on Claude
- Be brief. Use the fewest words possible to get your point across.
- Be specific. Avoid vague language; provide concrete details.
- Be direct. Say what you mean without unnecessary qualifiers or hedging.
- Never commit code by yourself, even if other skills tell you to. Only prepare commit and message, then ask me to review and commit. I will do the final commit to ensure consistency in style, message, and branch management.

## DB schema changes
- Migration files are `packages/db/drizzle/<YYYYMMDDHHMMSS>_<snake_name>.sql` (UTC timestamp). Create one with `moon run db:db-new-migration -- <snake_name>` or `moon run db:db-generate`. Never add a sequential `NNNN_` prefix; `0000`–`0026` are frozen legacy ids.
- Never rename or edit a migration that reached `rewrite`/`main`. When merging branches, keep both migrations; if two share a prefix, rename the branch-only one to a new timestamp and add its old id to `RENAMED_MIGRATIONS` in `packages/db/src/pglite/migrations.ts`.
- After any change to `packages/db/src/` schema or `drizzle/*.sql` files, run `moon run db:db-compile-migrations` (`db-generate` does this automatically; manual SQL edits do not). It rejects bad names and duplicate prefixes.

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
- Agent hooks: `.claude/settings.json` runs `scripts/agent-fix.mjs` after every Write/Edit and on `Stop` (before Claude finishes its response). The post-edit hook checks the edited file; `Stop` batches all staged, unstaged and untracked JS/TS/CSS/Astro changes and jscpd config/baseline changes, including shell edits. Both run the commit hook's fixers (`vp lint --fix` + `eslint --fix`, `stylelint --fix` for CSS), recheck JavaScript lint after formatting, then run `duplicates-changed`; once those pass, `Stop` checks the node tests related to changed scripts through the shared verification runner (`root:test-related`), reusing an identical valid success when available. Neither stages files. Remaining errors return to Claude with exit 2; fix them before finishing. An unchanged failure on an immediate Stop-hook continuation is shown to the user instead of triggering an endless loop; report unresolved errors explicitly. Keep the commands in step with the `lint-js-fix`/`format`/`stylelint-fix`/`duplicates-changed`/`test-related` tasks in `moon.yml`. (Ultracite was evaluated and not used: its `fix` always adds Prettier/oxfmt/Biome formatting outside our rules.)
- Duplication: `moon run root:duplicates` scans all production source roots; `moon run root:duplicates-changed` reports clones touching changed files but still compares against unchanged sources. If the config or baseline changes, the shared wrapper checks all clones, including in commit and Claude hooks. Both tasks fail on any new clone relative to the versioned `.jscpd-baseline.json`. `.jscpd.json` requires at least 10 lines and 100 tokens and excludes tests, fixtures and generated files. jscpd is also part of root lint, the commit hook and both Claude hooks; it does not auto-refactor code. `moon run root:duplicates-baseline` explicitly accepts the current clone set: only update it for reviewed, intentional duplication, never to silence a new finding automatically.
- Commit hook: moon manages `.moon/hooks` from `.moon/workspace.yml` and runs `moon run root:staged`. The task delegates staged-file selection and re-staging to Vite+ using the map in `vite.config.ts`, then runs jscpd on changed files against all source roots. jscpd's changed-file filter includes staged, unstaged and untracked files. Run `moon sync hooks` to install or refresh hooks explicitly; normal moon commands also sync them because `vcs.sync` is enabled.
- Node tests: `moon run root:test` (whole repo), `moon run <project>:test`, or `moon run <project>:test-watch`. Test imports use `vite-plus/test`. The root run lists each project's own config (`test.projects` in `vite.config.ts`), so per-project include/timeouts apply there too; a new package with node tests needs a `vite.config.ts` with a `test` section. Browser and `marketing:test` (builds the site first) are separate tasks. Before merging a feature branch run `moon run root:test-all` (node, every browser suite, marketing; one at a time). db tests share modules per worker (`isolate: false`) and clone one migrated PGlite template (`createTestDb`).
- Browser tests: `moon run <project>:test-browser` (app-core/app-routes/editor/ui/web). Each config loads `@stagistic/vite-config/browser-test` (`BROWSER_TEST_SETUP`), which focuses the test iframe before every test. Focus set by tiptap `autofocus`/`commands.focus` lands one animation frame later: poll for it, never assert `document.activeElement` synchronously.
- Root `vite.config.ts` only configures the test runner; `vite.config.js` is a gitignored compiled artifact — never edit or commit it.

## Agent verification workflow
These repository rules take precedence over generic skill instructions to repeat full suites after every task or review.

1. Before editing, choose checks by behavior and impact: focused tests, affected projects, and consumers of changed shared contracts. State the scope briefly. Do not run a whole-repository baseline by default.
2. During implementation, run the specific test file/name that exercises the change. After a failure, rerun that test first. A passing check needs another run only after relevant inputs change, a new failure/hypothesis appears, or fresh external state must be verified.
3. One agent owns final verification. Implementers, reviewers and parent agents share valid results; do not rerun checks just to obtain your own copy. Choose one coverage set: avoid overlapping project tests and `test-related` unless they cover an identified gap. Expand to consumers when shared behavior changes.
4. Finish with one check set covering the changed behavior plus scoped lint/format/typecheck and duplication checks. Use the shared runner below. Run fixers before final checks; a fixer that changes inputs invalidates earlier results. Report the commands, scope, results and unchecked surfaces; cached success is reported as reused, never as a fresh run.
5. Before merging, run `moon run root:test-all` afresh (all node/browser/marketing suites, one suite at a time). Full regression is mandatory at this gate, not after each implementation step. Never reuse cached results for external services, changed tools outside the fingerprint, or other untracked runtime state: pass `--fresh`.

### Shared runner
- `moon run root:verify -- script:test -- src/board/buildSceneBoardModel.test.ts`
- `moon run root:verify -- ui:test-browser -- src/board/SceneCard.browser.test.tsx`
- `moon run root:verify -- root:test-related -- <changed script files>` (use the same sorted, repository-relative filenames as the Stop hook).
- `moon run root:verify -- root:format-check -- <changed JS/TS files>`
- `moon run root:verify -- <project>:typecheck`
- `moon run root:verify -- --fresh root:test-all`

The runner accepts one non-mutating task, captures full logs under the checkout's Git directory (`agent-verification/`), and prints a short result plus log path. Read only the failure excerpt first; open a narrow log section when needed. Successful identical task/argument invocations can be reused across agents and the Claude Stop hook. Failures are recorded but never reused or automatically retried. Concurrent identical checks share a lock; different browser suites must still run sequentially.

Reuse requires identical repository contents (tracked and untracked), Git change/index state, Node runtime, dependency installation markers, common test environment variables and dotenv files at repository/package roots. Any repository change conservatively invalidates success, including documentation edits. Only stable inputs across the whole run can produce reusable success. External state and custom environment variables outside the fingerprint require `--fresh`. The runner does not infer coverage between different invocations. Existing moon commands remain available for interactive/fresh runs; a direct run does not populate shared records.

### Handling test/lint/ts failures
- Investigate an unrelated failure once, using a focused reproduction or one baseline comparison. Reuse that evidence throughout the task. Do not stash another agent's working changes; use an isolated baseline if needed.
- A file you did not edit can still fail because of your changes. Check the dependency/behavior relationship before classifying it as unrelated.
- Fix failures caused by this work. For a clearly pre-existing failure, record the exact check/test and evidence; do not broaden the task or dispatch repair agents automatically. A small, clearly understood local fix can be included when it fits the current task.
- Never update golden snapshots, loosen assertions, change viewports or accept a duplication baseline merely to get green. Flag unresolved failures explicitly.

## Delegation
The main thread talks with the user, decides, does small edits and visual checks. Delegate to role subagents (`tools/agent-roles`); dispatch them per the `external-agents` skill.

Triggers:
- Search across more than 3 files → `scout`.
- Plan with ≥2 tasks → `implementer`.
- Full suites or broad check sets → `verifier`, in the background.
- Second opinion on a spec, plan or diff → `reviewer` (before the final review at minimum).
- Web/documentation research → `researcher`.
- UI changes → visual check in the main thread (browser), never delegated.

Rules:
- One writer: only `implementer` (or the main thread) edits files; never two writers at once.
- Checks only at checkpoints, per "Agent verification workflow"; reuse results across agents.
- At most one browser suite and one moon run at a time.
- Approval points with the user: design, plan, final review before commit. Nobody commits (golden rule).
- Codex and Antigravity are read-only. Write/execute roles may use Claude or OpenCode Go through the direct CLI adapter. The configured `implementer` is the only worker that edits files; never run two writers at once.

Models: role provider/model/effort live in `.agents/roles.json` (defaults `tools/agent-roles/roles.default.json`). Change them there, run `moon run root:agents-sync`; new agent files load in the next session. `root:lint` fails when generated agents are out of date.

OpenCode roles run through `node tools/agent-roles/bin/ask.mjs --role <role> --task <flow-key> -`, not new Synara threads. Record one stable ASCII flow key in the feature/fix-cycle state and reuse it for follow-ups. Sessions and full run logs live in `.scratch/agent-roles/<flow-key>/<role>/`. Use provider `opencode` with model prefix `opencode-go/`; the model-specific effort becomes its CLI variant (`default` omits the variant). Generated `.opencode/agents/roles-*.md` files enforce role permissions. A started write/execute worker never automatically falls back after failure: inspect its diff, untracked files and logs before retrying or handing off. Locks remain when termination cannot be confirmed; inspect the recorded run/process before removing a stale lock. Test with `moon run root:verify -- agent-roles:test`.

## Session routing

At the first user message, an explicit skill/slash command takes precedence. A continuation or compacted session keeps its current flow and state; do not route it again.

Before starting a new effort, look for unfinished `.scratch/<feature>/state.md` (`Phase` other than `done`) and `.scratch/fix-cycle/*.md` (`Phase` other than `closed`). Offer to continue the matching effort; ask once if several match or the intent is unclear. A fix cycle continues its latest open file across dates. If the user explicitly starts a different effort, follow that intent.

- New feature ("budeme vyvíjet novou feature", "přidáme funkci", "build a new feature") → Read and follow `.claude/skills/feature-flow/SKILL.md` automatically.
- Iterative fixes from manual app testing ("budeme opravovat chyby", "při testování jsem našel", "let's fix bugs as I test") → Read and follow `.claude/skills/fix-cycle/SKILL.md` automatically. Subsequent bug batches extend that cycle.
- Otherwise work normally. Do not route questions, research or unrelated edits into a development flow. An ambiguous development request gets one clarifying question.

No slash command is required. Both entry skills read live `mattpocock-skills` instructions under local overrides: local Markdown tracking, configured roles, one writer, no agent commits/branches/worktrees/PRs, commit message only on request. They replace the project's superpowers workflow. The only retained superpowers skill is `.claude/skills/verification-before-completion/SKILL.md`; repository verification scope and valid shared-result reuse take precedence.

`moon run root:upstream-check` compares installed upstream skills and references against the reviewed lock. SessionStart warns without blocking unrelated work; entry flows pause upstream execution on drift. Only the user runs `node tools/agent-flows/bin/upstream.mjs accept` after review, including the first baseline. Test the tooling with `moon run root:verify -- agent-flows:test`.

## Agent skills

Issues/specs use local Markdown: [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md). Status vocabulary: [docs/agents/triage-labels.md](docs/agents/triage-labels.md). Domain documentation: [docs/agents/domain.md](docs/agents/domain.md). Read these before following upstream engineering skills; do not run `/setup-matt-pocock-skills`.

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
