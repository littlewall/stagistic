# Agent flows: intent routing over mattpocock/skills

Replaces the superpowers plugin with mattpocock/skills, driven by two of our own entry skills that start automatically from a plain-language first message. Works with agent roles (`tools/agent-roles`) and the AGENTS.md golden rule (agents never commit).

## Why

- Superpowers is heavy (mandatory skill invocation, hard gates, plan ledgers, commit-oriented steps) and its interview is gentle. mattpocock/skills has stronger grilling and lighter, composable skills.
- 90 % of sessions are one of two intents; the user should not have to type slash commands.
- Upstream skill updates must keep flowing in, without silently breaking our rules.

## Intents

1. **Feature** — "budeme vyvíjet novou feature …": design and build one feature in this thread.
2. **Fix cycle** — after merging several features, before pushing to `main`: the user clicks through the app and reports bugs in chat, 1–3 per message, iteratively, until they find nothing more. Bugs span features.

Anything else: normal work, no flow.

## Goals

- First user message of a session is classified as feature / fix cycle / other; the matching entry skill starts without a slash command. Unclear → ask once.
- Entry skills follow the **current** upstream SKILL.md files from the installed `mattpocock-skills` plugin, plus fixed overrides.
- Upstream changes to any skill we rely on are detected and reported before they can bite.
- Superpowers plugin disabled; only `verification-before-completion` kept.

## Non-goals

- Worktrees, branches, PRs, issue trackers (GitHub/GitLab).
- `implement-spec` (worktree/branch/merge orchestration) — not used.
- Running `/setup-matt-pocock-skills` (it edits AGENTS.md, may `git init`/`git remote`/`git mv`); we write its config ourselves.
- Routing beyond the first message (user can always invoke skills/slash commands manually).

## Anti-goals

- Any agent committing, branching, merging, pushing or opening PRs.
- Vendored copies of upstream skills used for execution (they go stale).
- An upstream change silently altering behaviour.
- Ceremony for simple bugs.

## Overrides (apply to every upstream skill an entry skill follows; they win over upstream text)

1. Never `git commit`, branch, merge, push, open/mark PRs, create worktrees, `gh`/`glab` label or issue calls. Where a skill says "commit", stop and keep changes in the working tree. Commit messages are proposed only when the user asks.
2. Tracker = local markdown: `.scratch/<feature>/state.md` (start `HEAD`, phase, files touched), `.scratch/<feature>/spec.md`, `.scratch/<feature>/issues/NN-<slug>.md`; fix cycles in `.scratch/fix-cycle/<YYYY-MM-DD>.md` (same state header plus the bug list). `.scratch/` is git-ignored (my call: working files, not history). Hooks and jscpd only see JS/TS/CSS, so Markdown there is unaffected.
3. Subagents map to roles: implementation → `implementer`; review sub-agents (Standards, Spec) → `reviewer` (dispatched per the `external-agents` skill); codebase exploration → `scout`; checks → `verifier`. One writer at a time.
4. "Fixed point" for `code-review` without commits: the `HEAD` recorded when the flow started, plus the list of files the flow touched (kept in the `.scratch` file), because the tree may contain the user's unrelated WIP.
5. AGENTS.md verification workflow governs test scope and the final check set.

## Feature flow (`feature-flow` entry skill)

1. Record start `HEAD` and feature slug in `.scratch/<feature>/state.md`.
2. Grill: follow upstream `grill-with-docs` (it may write glossary/ADR docs in the repo; those stay uncommitted for the user).
3. Spec: follow `to-spec` → `.scratch/<feature>/spec.md`. **User approves the spec.**
4. Tickets: follow `to-tickets` → `.scratch/<feature>/issues/`. **User approves the ticket list** (one message, may be brief).
5. Per ticket, in dependency order: `implementer` follows upstream `implement` (+ `tdd`) without committing; update ticket status.
6. UI tickets: main thread does the visual check in the browser.
7. Review: follow `code-review` with the fixed point; Standards and Spec sub-agents as `reviewer`. Fix findings via `implementer`.
8. Final check set via `verifier` per AGENTS.md. Report. Commit message on request.

## Fix-cycle flow (`fix-cycle` entry skill)

1. Create/continue `.scratch/fix-cycle/<date>.md`: start `HEAD`, bug list with status `open → fixed → confirmed` (confirmed only by the user), files touched.
2. Each user message: append its bugs (numbered, user's words + a one-line restatement). Ask only when a bug is not reproducible from the description.
3. Per bug, sequentially: locate (`scout` if not obvious) → simple bug: `implementer` with a regression test first (upstream `tdd`); hard bug (no obvious cause, flaky, performance): follow upstream `diagnosing-bugs`.
4. After the batch: focused tests for the touched code; reply "ready to check in the app: #4, #5" with one line per fix.
5. User confirms / reports more; repeat. Reopen a bug if the user says it still fails.
6. On request (any time, not only at the end): proposed single commit message covering all fixed bugs so far.
7. When the user says they are done: `reviewer` over the cycle's changes (fixed point), fixes, then `verifier` runs `moon run root:verify -- --fresh root:test-all` (pre-`main` gate). Report.

## Routing

- AGENTS.md section "Session routing": classify the first user message; invoke `feature-flow` or `fix-cycle` (model-invocable, descriptions written for Czech and English phrasing); otherwise proceed normally; unclear → one question. A slash command or explicit skill name from the user always wins.
- No prompt hook in v1. Add a `UserPromptSubmit` hook only if the model misroutes in practice.
- Resumed or compacted sessions: before routing, check `.scratch/` for an unfinished flow (feature `state.md` not marked done; fix-cycle file with bugs not `confirmed` or cycle not closed). If one exists, offer to continue it. A fix cycle continues the latest open file even on a later day; a new file is started only when none is open (my call).

## Upstream skills: use live, detect changes

- Entry skills **Read** upstream SKILL.md files from the installed plugin at run time and apply them as instructions under the overrides (my call). They never invoke them with the Skill tool: most are slash-only (`disable-model-invocation: true`), and a Skill-tool load would arrive as a separate authoritative turn that could outrank the overrides. The cache path contains a version, so a small resolver script prints the current path.
- Upstream facts verified against project-installed `mattpocock-skills` 1.3.1 on 2026-10-30: all used skills exist; `implement` commits to the current branch; `code-review` diffs against a "fixed point" and spawns Standards/Spec sub-agents without a named type; local-markdown tracking is built in (`issue-tracker-local.md`). Repository config docs provide that local tracker without running setup.
- Upstream skills used: `grill-with-docs`, `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `implement`, `tdd`, `codebase-design`, `code-review`, `diagnosing-bugs` (plus files within their folders). `domain-modeling` is called by `grill-with-docs`; `codebase-design` is a conditional reference from `tdd`.
- Lock file stores, per used skill, a hash of the reviewed SKILL.md (and referenced files) plus plugin version; a reviewed copy is stored only to show diffs, never executed.
- Check script reports changed/missing skills with a diff against the reviewed copy. Runs at session start (warning, non-blocking) and as a moon task. An "accept" command updates the lock. Only the user runs accept (my call); agents may review the diff with `reviewer` and recommend, never accept themselves.
- Model-invocable upstream skills (`grilling`, `tdd`, `diagnosing-bugs`, `code-review`) may still trigger on their own; acceptable (none commit). Block them via permissions only if they misfire.

## Packaging

Self-contained like agent-roles, so it can move with it later: `tools/agent-flows/` (entry skills, path resolver, lock + check/accept scripts, tests, README). Stagistic wiring: skill symlinks in `.claude/skills/`, AGENTS.md "Session routing" section, `.gitignore` `.scratch/`, `upstream`-check moon task, SessionStart hook, config docs that `/setup-matt-pocock-skills` would have written (only those the used skills read).

## Superpowers

Disable the plugin. Copy `verification-before-completion` (MIT, small, stable) into `tools/agent-flows/skills/` with attribution. Grep AGENTS.md, `tools/agent-roles` and `.claude/` for superpowers references and update them; `docs/superpowers/…` stays as history.

## Left to the builder

- Exact plugin install command and cache path layout (verify after install).
- Lock/check file formats; session-start hook vs. Synara compatibility (hooks already run in Synara).
- Which `/setup-matt-pocock-skills` config files the used skills actually read.
- Whether `permissions.deny` can target individual plugin skills (only needed if misfires happen).
