# Rules for both flows

Read these rules before reading any upstream instructions. Repository instructions and these overrides take precedence over upstream text, including nested skill calls.

## Live upstream instructions

From the repository root, run `node tools/agent-flows/bin/upstream.mjs check` before following upstream instructions. On drift or an error, show the result and review it with `reviewer`; ask the user to run `node tools/agent-flows/bin/upstream.mjs accept` after review. Agents never run accept, including the first baseline. Pause upstream execution until the check passes; other independent work may continue.

Resolve each required skill with `node tools/agent-flows/bin/upstream.mjs resolve <name>`, then Read the returned SKILL.md and its relevant relative references. Read the installed files, never `upstream-reviewed/` (copies there exist only for diffs). When upstream says to invoke another skill, resolve and Read it the same way, under these same overrides. `flows.json` includes the transitive `domain-modeling` and `codebase-design` dependencies. An unmonitored dependency must be reviewed and added to the monitored set before use.

Read `docs/agents/issue-tracker.md`, `docs/agents/domain.md` and `docs/agents/triage-labels.md`. Their configuration replaces `/setup-matt-pocock-skills`; never run that setup skill.

## Repository and ownership

- Leave changes in the current working tree. Never commit, branch, merge, push, create worktrees or PRs, or call remote issue/label APIs. Give one proposed commit message covering the requested work only when the user asks, at any point in the session.
- Track specs, tickets and progress in local `.scratch/` Markdown. Keep start HEAD, phase, touched files and baseline WIP in the state file. Record staged, unstaged and untracked paths before editing. Save initial staged/unstaged diffs and pre-existing untracked content for files you will touch under the flow's `.scratch/` directory, so reviewers can distinguish earlier work from this flow's changes.
- Dispatch per `external-agents`: exploration → `scout`, edits → `implementer`, review → `reviewer`, checks → `verifier`, documentation research → `researcher`. Read `.claude/agents/<role>.md`; provider/model/effort come from config. One writer at a time. The main thread talks with the user and performs browser visual checks for UI changes.
- Record a stable `Worker task key` in the flow state (for example `feature-scene-notes` or `fix-cycle-2026-10-30-1`). OpenCode roles use `ask.mjs --task <key>` directly; never create a Synara thread for each worker. Reuse the key for follow-ups; logs/session IDs are managed in `.scratch/agent-roles/<key>/<role>/`. The key must be unique to this effort and survive resume/compaction. On a started writer failure, inspect the resulting diff and untracked files before handing off; no automatic second writer.
- Any upstream request for git bisection or a branch/worktree is replaced with read-only history inspection or an isolated temporary reproduction outside the checkout; preserve the working tree and git state.

## Tests and review

- The AGENTS.md verification workflow controls scope, checkpoints and reuse. An approved feature spec's testing decisions are the agreed test seams. For a bug, propose the existing public test seam in the scope update and use it unless the user objects; ask only when the choice needs a product decision. Avoid repeating seam-approval questions for routine regressions.
- Upstream `implement`'s review step feeds the flow's review checkpoint; it does not add a duplicate full review per ticket. Replace its commit step with updating local ticket status. Do not run overlapping full suites per ticket.
- Review the actual staged, unstaged and untracked work. Start HEAD + the touched-file list identifies scope; `git diff <start-head> -- <paths>` shows tracked working changes, and reviewers must also read untracked touched files. A committed-only `...HEAD` diff misses this work. Use baseline WIP notes to exclude unrelated hunks; when ownership is ambiguous, report that limitation.
- Supply the feature spec or fix-cycle bug list to the Spec reviewer. Dispatch Standards and Spec reviews through the `reviewer` role and retain their separate findings. Fix actionable findings through the single writer, then run the final check set through `verifier`.
- Before reporting success, follow the local `verification-before-completion` skill. Valid shared-runner results may be reused as AGENTS.md permits; report reused results as reused. Never claim unrun checks passed.

## Resume

Use the flow's existing state on compaction, restart or continuation. Do not reset start HEAD or renumber tickets/bugs. A feature is unfinished until `Phase: done`; a fix cycle stays open until `Phase: closed`, even across dates. Record unresolved bugs when closing; `confirmed` is reserved for the user's confirmation.
