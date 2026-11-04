# Agent flows

Two local entry skills route ordinary Czech/English requests into feature development or iterative bug fixing. They read the installed mattpocock skills at runtime and apply local overrides. Node ≥24 and the system `diff` command are required; no npm dependencies or imports outside this directory.

## Use

In a new Stagistic session, say e.g. "Budeme vyvíjet novou feature: …" or "Budu testovat aplikaci a posílat chyby: …". AGENTS.md selects `feature-flow` or `fix-cycle` without a slash command. Explicit skill requests take precedence; other work has no flow. This is instruction-based routing, not a prompt hook, so check it in a fresh Synara session after installation.

Feature: grill with domain docs → approved local spec → approved tickets → sequential implementation → browser check for UI → Standards/Spec review → scoped verification. Fix cycle: append bugs from chat → reproduce/test/fix → user checks → repeat; one fresh `root:test-all` when the user ends the cycle. One proposed commit message only when requested. Agents never commit or manage branches, worktrees, PRs or remote issues.

State is ignored Markdown under `.scratch/`; resume it instead of restarting. Roles come from `agent-roles` and `.agents/roles.json`, dispatched through `external-agents`. Go workers run directly through OpenCode CLI, not separate Synara threads. Record a stable worker task key in flow state; the adapter resumes per-role sessions under `.scratch/agent-roles/<key>/`. Only one writer runs; the main thread owns visual checks. A failed started Go writer requires inspecting its diff/untracked changes before handoff, never an automatic second writer.

## Review the initial upstream baseline

The installer does not accept upstream instructions on the user's behalf. The first check therefore reports **unreviewed** until the user reviews the installed version and runs accept:

```sh
moon run root:upstream-check
# After review, only the user runs:
node tools/agent-flows/bin/upstream.mjs accept
moon run root:upstream-check
```

`accept` records `upstream.lock.json` (plugin id/version and SHA-256 hashes per monitored file) and `upstream-reviewed/<skill>/` copies. Include these files in the user's commit. Copies exist solely for diffs and are never followed as instructions. The current monitored set includes transitive `domain-modeling` and `codebase-design` dependencies. Changes to the skill set, plugin version, references, additions and deletions all require review.

After a plugin update, the SessionStart hook gives a short, non-blocking warning. Run check for the full diff; review changes through `reviewer`, then the user may accept. Agents never accept, and entry flows pause following changed upstream instructions until the check passes. Missing plugin/config errors also warn at session start without blocking unrelated work.

## Commands

```sh
node tools/agent-flows/bin/upstream.mjs resolve tdd  # live SKILL.md path
node tools/agent-flows/bin/upstream.mjs check       # full review diff
node tools/agent-flows/bin/upstream.mjs session-start  # hook JSON or silence
moon run root:verify -- agent-flows:test
moon run root:verify -- agent-flows:lint
```

CLI exit codes: `0` clean/success, `1` drift/unreviewed, `2` usage/config/IO failure. `session-start` always exits `0`, including errors. Only `accept` writes a lock or reviewed copies. Discovery reads Claude's `~/.claude/plugins/installed_plugins.json`, preferring an installation for the current repository over a user install; it does not guess from cache directory names.

## Adopt elsewhere

1. Copy `tools/agent-flows/` and provide `agent-roles` / `external-agents` (or adapt the documented role dispatch).
2. Install `mattpocock-skills@claude-plugins-official` for that project; disable superpowers in that project's settings only.
3. Symlink `.claude/skills/{feature-flow,fix-cycle,verification-before-completion}` to this directory's matching `skills/` folders.
4. Port AGENTS.md's Session routing and Agent skills sections, `.scratch/` ignore, `docs/agents/` configuration and the SessionStart hook. Adapt repository verification commands in the flows.
5. Register `tools/agent-flows` as a moon project (or run the Node test command directly), review the initial upstream baseline and let the user accept it.

## Attribution

`skills/verification-before-completion` is copied from Jesse Vincent's superpowers 7.0.0, MIT, with a repository-specific precedence paragraph. Its original license is beside the skill. The plugin remains disabled; other superpowers skills are not copied.

mattpocock/skills by Matt Pocock is MIT; `UPSTREAM-LICENSE` covers reviewed snapshots produced by accept. Live upstream instructions stay in the installed plugin. Our entry skills reference them rather than vendor executable instructions.
