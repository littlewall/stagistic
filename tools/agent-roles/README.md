# agent-roles

One config for agent roles: provider, model and effort per role. Claude Code fallback files and OpenCode permission definitions are generated from it. Go workers run directly through OpenCode CLI with persistent sessions; they do not create Synara threads. Codex and Antigravity remain read-only.

Self-contained: Node ≥24 built-ins only, no imports outside this directory.

## Roles

| Role | Kind | Providers |
|---|---|---|
| scout | read | claude, opencode, codex, agy |
| implementer | write | claude, opencode |
| verifier | execute | claude, opencode |
| reviewer | read | claude, opencode, codex, agy |
| researcher | read | claude, opencode, codex, agy |

Prompts: `prompts/<role>.md` (first line = agent description). They defer to the repository's AGENTS.md/CLAUDE.md.

## Config

Layers, later wins (per role, per field):

1. `roles.default.json` (this directory)
2. `<repo>/.agents/roles.json` (repository, optional)

No user-level layer: generated agent files are committed, so they must not depend on one machine's settings.

```json
{
  "roles": {"reviewer": {"provider": "codex", "model": "gpt-6.1-sol", "effort": "high"}},
  "tiers": {"codex": {"gpt-7-sol": "high"}},
  "effortToClaude": {"codex": {"ultra": "max"}},
  "timeoutSeconds": 600
}
```

- `roles.<role>`: only `provider`, `model`, `effort`, and for OpenCode optionally `models` instead of `model`; `kind`/`tools` are fixed.
- `models` (OpenCode only): same-tier Go candidates in preference order, each supporting the role effort. `ask` lists live models with `opencode models` on every call and runs the first one offered; changing the list needs no sync.
- `tiers.<provider>`: model → `low` | `mid` | `high`. OpenCode Go tiers follow the official per-token output price (https://opencode.ai/docs/go/): `low` ≤ $0.60/M or free, `mid` $0.87–4.40/M, `high` ≥ $6/M. Exactly one Claude model per tier; it is the fallback for external models of that tier.
- `efforts.<provider>`: valid effort values (replaced, not merged).
- `effortToClaude.<provider>`: external effort → Claude effort for the fallback.
- `modelEfforts.opencode.<model>`: variants supported by that exact Go model. Go model ids must start with `opencode-go/`. `default` omits the CLI variant; use it for models without reasoning variants. Add models/variants in these tables, not in adapter code.

Malformed files fail with an error naming the file. Validation rejects: mixed-tier or non-OpenCode `models` lists, Codex/agy for write/execute roles, unknown provider/role, model missing from its tier table, invalid model effort, missing Claude tier or effort mapping, several Claude models in one tier.

## Commands

```bash
node tools/agent-roles/bin/sync.mjs [--cwd <dir>] [--check]
node tools/agent-roles/bin/models.mjs [--cwd <dir>]
node tools/agent-roles/bin/ask.mjs --role <role> [--task key] [--cwd <dir>] [--provider p] [--model m] [--effort e] [--timeout s] (<prompt> | -)
node --test 'tools/agent-roles/test/*.test.mjs'
```

`sync` writes `.claude/agents/<role>.md` plus `.opencode/agents/roles-<role>.md` for Go roles (only changed files; never deletes unrelated files). `--check` exits 1 on drift. External roles get their Claude fallback model plus an `<!-- external: provider/model/effort -->` marker; OpenCode markers name the tier (`opencode/tier-mid/high`) because the model is chosen at run time. The CLI refuses a missing/stale OpenCode definition; run sync after changing a role's provider, effort or tier. A one-off Go `--model` must keep the role's tier.

`models` (moon `root:agents-models`) prints each Go role's current pick, configured models Go no longer offers, and offered models without a tier. Classifying a new model (tier + variants) is a reviewed config change, never automatic.

`ask` exit codes: `0` answer on stdout, `1` task failure/timeout/cancellation/lock conflict (also empty/unfinished/malformed zero-exit responses), `2` usage/config error or a Claude role that must be spawned natively, `3` provider unavailable (for Go also: model list failed or no candidate offered; nothing was started) with `Fix:` and `Fallback: <model>/<effort> (subagent <role>)` on stderr. The fallback is always the stored role's Claude model, also for one-off calls. A started Go write/execute job always fails with `1`, even for auth/quota: inspect the diff/untracked files/logs before retrying or handing off. Only a missing executable or a read-only role may return `3` for Go.

Read-only providers:
- codex: `codex exec -s read-only` with live web search, prompt on stdin, answer from `-o`.
- agy: headless print mode with `--sandbox` (writes are auto-denied; `--mode plan` is not used because it writes a plan instead of answering). No `--effort`: agy model ids carry the effort; the configured agy effort only maps the Claude fallback.

## Direct OpenCode Go workers

Stagistic keeps Claude orchestration/review and configures scout/verifier on GLM Flash, implementer on GLM-5.2. Change `.agents/roles.json` to select another configured target. The tool defaults remain Claude so other repositories opt into Go explicitly.

```sh
node tools/agent-roles/bin/ask.mjs --role implementer --task feature-scene-notes - < task.md
```

Record one safe ASCII task key in the feature/fix-cycle state and reuse it across follow-ups (1–80 lowercase letters/digits/hyphens/underscores, starting with a letter/digit). Roles and task keys have separate sessions. A changed target or agent definition starts a fresh session rather than mixing contexts. Prompts travel on stdin, preserving quotes/newlines and leading dashes.

The adapter uses the installed OpenCode 2 CLI: `run --standalone --format json --agent roles-<role> --model <provider/model#variant>`, adding `--session` for follow-ups. It parses JSON events, persists the real session id, and accepts a nonempty final assistant response only after a completed stop step. Normal assistant text mentioning quota/auth is not an error. The namespace `opencode-go/` selects Go, rather than Zen's `opencode/` models. This CLI contract was checked against OpenCode 2.2.3; older CLI versions with `--attach`/`--variant` need an explicit adapter change.

State: `.scratch/agent-roles/<task>/<role>/session.json`; each invocation has a separate `runs/<id>/` containing prompt, stdout JSONL, stderr, result and (for write/execute) before/after git status and tracked diff snapshots. These paths are private local artifacts and must be git-ignored when adopting elsewhere. Check untracked file contents separately; git patch snapshots do not include them. Answers are bounded to 64 KiB in memory; full events stay on disk.

Read agents deny shell/edit/delegation; pass graphify/diff context from the orchestrator. The verifier denies edits and restricts shell to the shared verify runner and read-only git inspection. The implementer may edit/run commands, with direct git mutations and remote issue tools denied. These are tool permissions and documented ownership constraints, not a filesystem sandbox.

Per-session locks prevent concurrent follow-ups. A checkout-wide lock serializes write and execute roles. The adapter tracks the private POSIX process tree, including observed detached descendant groups. Timeout and SIGINT/SIGTERM/SIGHUP first request termination, then force cleanup; known descendants must settle before locks are released. It also cleans up on normal parent exit and final CLI close. Workers must run commands in the foreground, without daemons/background services; this is process supervision, not OS sandbox containment. If inspection/cleanup cannot be confirmed, locks remain. After a hard parent crash or cleanup failure, inspect the recorded PID, run logs and working changes before removing a stale lock; never auto-start another writer. Windows process-tree isolation is not implemented.

If OpenCode rejects a saved session as missing, first confirm the previous worker is stopped and inspect its changes. Move that role's `session.json` aside (keep its run logs) and retry to start fresh. Do not automatically discard session state after a failed writer. Failed/oversized git snapshots produce `*.snapshot-errors.json` and an explicit result warning; inspect the live tree rather than treating a partial patch as complete evidence.

Scoped verification: `moon run root:verify -- agent-roles:test` and `agent-roles:lint`. The project test task accepts a file/name filter, e.g. `moon run agent-roles:test -- --test-name-pattern=resumes test/opencode.test.mjs`. Live CLI checks and ignored fixture inputs require `--fresh`. No Synara task creation or archival is involved in ordinary role dispatch.

## Adopt in another repository

1. Copy this directory (later: install from its own repository).
2. Add `.agents/roles.json` with overrides (or `{"roles": {}}`).
3. Run `sync`; commit the generated `.claude/agents/*.md`.
4. Link the skill: `ln -s ../../tools/agent-roles/skills/external-agents .claude/skills/external-agents`.
5. Add a "Delegation" section to AGENTS.md: triggers, one writer, approval points, how to change models.
