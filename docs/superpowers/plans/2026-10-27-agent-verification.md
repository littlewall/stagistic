# Shared agent verification

**Goal:** Select checks by change impact, share valid results across agents and the Claude Stop hook, and keep complete regression mandatory before merge.
**Design:** Approved in this thread. Work in the current checkout; no commits or staging. Implement directly without delegated work.

- [x] Document one workflow in AGENTS.md; add CLAUDE.md importing it. Targeted checks during development, one final owner, one baseline investigation per unrelated failure, complete fresh regression before merge.
- [x] Add `root:verify -- [--fresh] <project>:<check> [-- <arguments>]`. Capture logs and concise results. Reuse only successful, identical invocations against identical repository/environment inputs. Never reuse failures, checks whose inputs changed during execution, or complete/external regression runs.
- [x] Share the runner with the Stop hook for related node tests. Keep formatter/lint behavior and index untouched. Do not infer that a project suite covers a different invocation.
- [x] Test real child-process behavior: reuse, invalidation (tracked/untracked/deleted/config/environment), failures, fresh runs, concurrent runs, and hook interoperability.
- [x] Run the targeted linters tests and file-scoped lint/format checks through moon, inspect the diff, and update graphify. Broaden only for new evidence; record remaining limitations.

**Input policy:** Start conservatively with repository-wide content fingerprints, Git change state, Node version, dependency installation markers, environment and ignored dotenv files. Store records/logs under the checkout's Git directory. Explicit `--fresh` for checks depending on external state. No automatic baseline acceptance, snapshot edits, or retries.

## Result and verification

- Added the agreed workflow to AGENTS.md and a CLAUDE.md import; no staging or commits.
- Added shared verification CLI/core/input fingerprinting and integrated related tests with Stop. Reuse is exact invocation only; successes require stable inputs, failures never satisfy another run, complete regression and marketing tests always run fresh. Identical concurrent checks share a lock.
- Red: 11 new behavior cases failed before implementation; existing 16 hook cases passed. A later command-validation case failed for `--update=true`, then passed with the validation fix.
- `moon run root:verify -- linters:test`: 37 tests / 3 files passed. Includes CLI/Stop interoperability, input invalidation, logs/failure status, fresh runs and concurrent agents.
- Real CLI reuse smoke: first execution 15,752 ms; identical second invocation reported REUSED, with moon task duration 265 ms. This extra invocation specifically verified that reuse works through nested moon commands.
- File-scoped `root:lint-js-fix`, `root:format-check` and `root:duplicates-changed` passed. `git diff --check` passed.
- One read-only final reviewer found no actionable issues and reused verification evidence without running tests.
- No browser/full-monorepo regression: changed behavior is Node tooling, covered by the linters suite. `root:test-all` remains required before merge.
- Limitations: repository-wide invalidation intentionally favors safety over maximal reuse. Custom environment variables, external services and ignored runtime fixtures require `--fresh`. Different invocations do not share inferred test coverage. Hook formatting/linting still runs as before; only related-test success is shared.
