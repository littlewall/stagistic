# agent-roles

One config for agent roles: provider, model and effort per role. Claude Code agent files are generated from it; read-only roles can run on Codex or Antigravity with a same-tier Claude fallback.

Self-contained: Node ≥24 built-ins only, no imports outside this directory.

## Roles

| Role | Kind | Providers |
|---|---|---|
| scout | read | claude, codex, agy |
| implementer | write | claude |
| verifier | execute | claude |
| reviewer | read | claude, codex, agy |
| researcher | read | claude, codex, agy |

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

- `roles.<role>`: only `provider`, `model`, `effort`; `kind`/`tools` are fixed.
- `tiers.<provider>`: model → `low` | `mid` | `high`. Exactly one Claude model per tier; it is the fallback for external models of that tier.
- `efforts.<provider>`: valid effort values (replaced, not merged).
- `effortToClaude.<provider>`: external effort → Claude effort for the fallback.

Malformed files fail with an error naming the file. Validation rejects: non-Claude provider for write/execute roles, unknown provider/role, model missing from its tier table, invalid effort, missing Claude tier or effort mapping, several Claude models in one tier.

## Commands

```bash
node tools/agent-roles/bin/sync.mjs [--cwd <dir>] [--check]
node tools/agent-roles/bin/ask.mjs --role <role> [--cwd <dir>] [--provider p] [--model m] [--effort e] [--timeout s] (<prompt> | -)
node --test 'tools/agent-roles/test/*.test.mjs'
```

`sync` writes `.claude/agents/<role>.md` (only changed files; never deletes others). `--check` exits 1 on drift. External roles get their Claude fallback model plus an `<!-- external: provider/model/effort -->` marker.

`ask` exit codes: `0` answer on stdout, `1` task failure/timeout, `2` usage/config error or non-read/Claude role, `3` provider unavailable (not installed, not logged in, quota) with `Fix:` and `Fallback:` on stderr.

Providers always run read-only:
- codex: `codex exec -s read-only` with live web search, prompt on stdin, answer from `-o`.
- agy: headless print mode with `--sandbox` (writes are auto-denied; `--mode plan` is not used because it writes a plan instead of answering).

## Adopt in another repository

1. Copy this directory (later: install from its own repository).
2. Add `.agents/roles.json` with overrides (or `{"roles": {}}`).
3. Run `sync`; commit the generated `.claude/agents/*.md`.
4. Link the skill: `ln -s ../../tools/agent-roles/skills/external-agents .claude/skills/external-agents`.
5. Add a "Delegation" section to AGENTS.md: triggers, one writer, approval points, how to change models.
