# Agent Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One config (`roles.json` layers) sets provider/model/effort per agent role; `sync` generates Claude agent files, `ask.mjs` runs read roles on Codex/Antigravity with same-tier Claude fallback.

**Architecture:** Self-contained `tools/agent-roles/` (Node built-ins only, no repo imports). `lib/config.mjs` merges and validates layers and resolves each role incl. its Claude fallback; `bin/sync.mjs` renders `.claude/agents/<role>.md`; `bin/ask.mjs` dispatches to provider adapters. Stagistic wires it via `.agents/roles.json`, moon tasks, a skill symlink and an AGENTS.md section.

**Tech Stack:** Node ≥24.12 ESM `.mjs`, `node:test`, `node:child_process`; codex CLI, agy CLI.

**Spec:** `docs/superpowers/specs/2026-10-30-agent-roles-design.md`

## Global Constraints

- Never commit (AGENTS.md golden rule). Each task ends by proposing a commit message; the user commits.
- `tools/agent-roles/` imports nothing outside itself and has no npm dependencies.
- Tests use `node:test` + `node:assert/strict`, live in `tools/agent-roles/test/`, run with `node --test tools/agent-roles/test/`.
- `write`/`execute` roles (implementer, verifier) are provider `claude` only.
- Fallback never moves to a higher tier; exactly one Claude model per tier (`low`, `mid`, `high`).
- External providers always run read-only: codex `-s read-only`, agy `--mode plan --sandbox`.
- No Stagistic specifics (moon, PGlite, product) inside `tools/agent-roles/`.
- Never touch `.jscpd-baseline.json`.
- Exit codes of `ask.mjs`: `0` success, `1` task failure, `2` usage/config error, `3` provider unavailable.

## Review Focus

- Malformed/partial override JSON (syntax error, unknown role, unknown field) → clear error naming the file, not a stack trace. Test in Task 1.
- External CLI installed but not logged in / quota exhausted → exit `3` with cause + fix hint, not `1`. Test in Task 2.
- Prompt containing quotes, newlines or leading `-` → passed verbatim (argv array / stdin, never a shell string). Test in Task 2.
- Hand-edited generated agent file → `sync --check` reports drift and exits non-zero. Test in Task 3.
- Override switches a role from external back to `claude` → generated file loses the `external:` marker and uses the configured model. Test in Task 3.

---

### Task 0: Spike (throwaway, findings only)

**Files:** none kept. Record findings as a short "Spike findings" section at the end of the spec.

- [ ] **Step 1:** Create a temporary `.claude/agents/spike-echo.md` (`model: haiku`, body "Reply with your model id."). Spawn it via the Agent tool in this Synara session. Record: is it listed/spawnable, does the reported model match.
- [ ] **Step 2:** Check Claude Code docs (claude_ai_Claude_Docs or `ctx_fetch_and_index` on the subagents page) for a frontmatter effort field. Record the field name, or "none" plus the chosen substitute (Agent `model` param + `worker-<tier>`-style hint in the role body).
- [ ] **Step 3:** `codex exec -s read-only -m <model> -c model_reasoning_effort="low" -C . -o /tmp/codex.txt "Say ok"`; record valid model ids (from `~/.codex/config.toml`/docs), effort values, exit code + stderr when logged out (`CODEX_HOME=/tmp/empty codex exec …`), and whether `--search`/web search works in exec.
- [ ] **Step 4:** `agy models`; `agy -p "Say ok" --mode plan --sandbox --model <m> --effort low --output-format json`; record JSON shape (field holding the answer), exit code + stderr when logged out/unavailable.
- [ ] **Step 5:** Delete `spike-echo.md`. Fill `roles.default.json` values for Task 1 from findings.

### Task 1: Config load, merge, validate, resolve

**Files:**
- Create: `tools/agent-roles/roles.default.json`, `tools/agent-roles/lib/config.mjs`
- Test: `tools/agent-roles/test/config.test.mjs`

**Interfaces:**
- Produces:
  - `loadConfig({cwd: string, home?: string, files?: string[]}): Config` — reads `roles.default.json`, then `<home>/.config/agent-roles/roles.json`, then `<cwd>/.agents/roles.json` (missing files skipped; `files` overrides the list for tests). Throws `ConfigError` (message starts with the offending file path).
  - `validateConfig(config: Config): string[]` — list of human-readable errors, empty when valid.
  - `resolveRole(config: Config, role: string): ResolvedRole` where `ResolvedRole = {role, kind: 'read'|'write'|'execute', provider: 'claude'|'codex'|'agy', model, effort, tier, tools: string[], fallback: {model, effort} | null}` (`fallback` null for claude).
  - `class ConfigError extends Error`.

`roles.default.json` shape:
```json
{
  "roles": {
    "scout":       {"kind": "read",    "provider": "claude", "model": "haiku",  "effort": "low",    "tools": ["Read", "Grep", "Glob", "Bash"]},
    "implementer": {"kind": "write",   "provider": "claude", "model": "sonnet", "effort": "medium", "tools": ["Read", "Grep", "Glob", "Bash", "Edit", "Write"]},
    "verifier":    {"kind": "execute", "provider": "claude", "model": "haiku",  "effort": "low",    "tools": ["Read", "Bash"]},
    "reviewer":    {"kind": "read",    "provider": "claude", "model": "opus",   "effort": "high",   "tools": ["Read", "Grep", "Glob", "Bash"]},
    "researcher":  {"kind": "read",    "provider": "claude", "model": "sonnet", "effort": "medium", "tools": ["Read", "Grep", "Glob", "WebSearch", "WebFetch"]}
  },
  "tiers":   {"claude": {"haiku": "low", "sonnet": "mid", "opus": "high"}, "codex": {}, "agy": {}},
  "efforts": {"claude": ["low", "medium", "high", "xhigh", "max"], "codex": [], "agy": ["low", "medium", "high", "xhigh", "max"]},
  "effortToClaude": {"codex": {}, "agy": {"low": "low", "medium": "medium", "high": "high", "xhigh": "xhigh", "max": "max"}},
  "timeoutSeconds": 600
}
```
Codex/agy tier, effort and mapping entries come from Task 0.

Merge: deep per role per field; `tiers.<provider>` and `effortToClaude.<provider>` merge per key; arrays replace. Override files may not set `kind` or `tools` (error: "kind/tools are fixed by agent-roles").

- [ ] **Step 1: Write failing tests** in `config.test.mjs` (fixtures written to `fs.mkdtempSync` dirs):
  - `merges repo override over user over defaults` — repo sets `reviewer.provider="codex", model="<codex-high-id>"`; resolved reviewer has those, other fields from defaults.
  - `rejects external provider for write role` — `implementer.provider="codex"` → `validateConfig` includes `"implementer: write roles must use provider claude"`.
  - `rejects external provider for execute role` — same for verifier.
  - `rejects model missing from tier table` → `"reviewer: model x not in tiers.codex"`.
  - `rejects invalid effort` → `"reviewer: effort ultra not valid for codex"`.
  - `rejects claude tier gap` — remove `opus` from `tiers.claude` while reviewer is codex/high → `"no Claude model for tier high"`.
  - `rejects two Claude models in one tier`.
  - `resolves fallback to same-tier Claude model with mapped effort` — codex high model, effort `xhigh` → `fallback = {model: "opus", effort: <mapped>}`.
  - `reports malformed JSON with file path` — `loadConfig` throws `ConfigError` whose message starts with the path.
  - `rejects unknown role and kind/tools overrides`.
- [ ] **Step 2:** `node --test tools/agent-roles/test/config.test.mjs` → FAIL (module missing).
- [ ] **Step 3:** Implement `lib/config.mjs` per Interfaces.
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** Propose commit message `feat(agent-roles): layered role config with validation`.

### Task 2: Provider adapters and `ask.mjs`

**Files:**
- Create: `tools/agent-roles/lib/adapters/codex.mjs`, `tools/agent-roles/lib/adapters/agy.mjs`, `tools/agent-roles/lib/adapters/index.mjs`, `tools/agent-roles/lib/run.mjs`, `tools/agent-roles/bin/ask.mjs`
- Test: `tools/agent-roles/test/adapters.test.mjs`, `tools/agent-roles/test/ask.test.mjs`, fake CLIs in `tools/agent-roles/test/fixtures/bin/{codex,agy}` (executable node scripts driven by env `FAKE_MODE=ok|logged-out|quota|fail|slow`)

**Interfaces:**
- Consumes: `loadConfig`, `validateConfig`, `resolveRole`.
- Produces:
  - Adapter `{name, buildInvocation({model, effort, cwd, prompt, outFile}): {cmd: string, args: string[], stdin?: string}, parseOutput({stdout, outFile}): string, classifyFailure({code, stderr, spawnError}): 'unavailable'|'failed'}`.
  - `adapters: Record<'codex'|'agy', Adapter>` from `adapters/index.mjs`.
  - `runAsk({role, prompt, cwd, overrides?: {provider?, model?, effort?}, env?, timeoutSeconds?}): Promise<{exitCode: 0|1|2|3, output: string, message?: string}>` in `lib/run.mjs`.
  - CLI: `node tools/agent-roles/bin/ask.mjs --role <role> [--cwd <dir>] [--provider p] [--model m] [--effort e] [--timeout s] (<prompt> | -)` — `-` reads prompt from stdin. Prints answer to stdout; on exit 3 prints `agent-roles: <provider> unavailable (<cause>). Fix: <hint>. Fallback: <fallback.model>/<fallback.effort>` to stderr.

Rules: `ask.mjs` refuses non-read roles and `provider: claude` roles with exit `2` ("role X runs as Claude subagent; spawn it with the Agent tool"). Prompt goes via stdin (codex `-` arg / agy per Task 0), never interpolated into a shell. `spawnError.code === 'ENOENT'` → unavailable ("not installed"). Stderr matching `/not logged in|login|unauthori[sz]ed|401/i` → unavailable (hint `codex login` / `agy` login per Task 0); `/quota|rate.?limit|429|usage limit/i` → unavailable ("quota"). Timeout → `1`.

- [ ] **Step 1: Write failing tests:**
  - `codex builds read-only argv` — args include `exec`, `-s`, `read-only`, `-m`, model, `-c`, `model_reasoning_effort="<effort>"`, `-C`, cwd, `-o`, outFile; no element contains the prompt.
  - `agy builds plan sandbox argv` — includes `-p`, `--mode`, `plan`, `--sandbox`, `--model`, `--effort`, `--output-format`, `json`.
  - `classifies ENOENT, logged-out and quota as unavailable; others failed`.
  - `ask passes prompt with quotes, newlines and leading dash verbatim` — fake CLI echoes stdin; output equals input.
  - `ask exits 3 with fallback in stderr when logged out` — PATH = fixtures/bin, `FAKE_MODE=logged-out`; stderr contains `Fallback: opus`.
  - `ask exits 3 when CLI missing` — PATH without fixtures.
  - `ask exits 1 on task failure and on timeout` (`FAKE_MODE=fail`, `FAKE_MODE=slow` with `--timeout 1`).
  - `ask exits 2 for claude-provider and write roles`.
  - `ask prints only the parsed answer` (agy JSON → answer field).
- [ ] **Step 2:** `node --test tools/agent-roles/test/` → FAIL.
- [ ] **Step 3:** Implement adapters, `run.mjs`, thin `bin/ask.mjs` (arg parsing via `node:util` `parseArgs`).
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** Manual: `node tools/agent-roles/bin/ask.mjs --role reviewer --provider codex --model <id> --effort low "Say ok"` → `ok`, exit 0. Same with `--provider agy`.
- [ ] **Step 6:** Propose commit message `feat(agent-roles): read-only codex/agy dispatch with fallback signal`.

### Task 3: Role prompts and `sync`

**Files:**
- Create: `tools/agent-roles/prompts/{scout,implementer,verifier,reviewer,researcher}.md`, `tools/agent-roles/lib/render.mjs`, `tools/agent-roles/bin/sync.mjs`
- Test: `tools/agent-roles/test/sync.test.mjs`

**Interfaces:**
- Consumes: `loadConfig`, `validateConfig`, `resolveRole`.
- Produces:
  - `renderAgent(resolved: ResolvedRole, promptBody: string): string`.
  - `syncAgents({cwd, home?, check?: boolean}): {written: string[], drift: string[], errors: string[]}`.
  - CLI: `node tools/agent-roles/bin/sync.mjs [--cwd <dir>] [--check]`; exit 0 ok, 1 drift (check) or validation errors (nothing written).

Rendered file:
```markdown
---
name: <role>
description: <first line of prompt>
model: <claude model, or fallback.model when external>
<effort field per Task 0, value = effort or fallback.effort>
tools: <comma-joined tools>
---
<!-- generated by agent-roles sync from tools/agent-roles/prompts/<role>.md; edit roles.json or the prompt, then run sync -->
<!-- external: <provider>/<model>/<effort> -->   (only when external)
<prompt body>
```

Prompt content (each ≤40 lines, repo-agnostic): role purpose; "Follow the repository's AGENTS.md/CLAUDE.md; they override this prompt"; output contract (read roles: concise findings with `file:line`/URLs; implementer: changed files + checks run + open issues; verifier: command, scope, pass/fail, log path, failure excerpt); never commit; scout: "if `graphify-out/graph.json` exists, start with `graphify query`"; verifier: "run only the check commands you are given; never edit files"; read roles: "never modify files".

- [ ] **Step 1: Write failing tests:**
  - `renders claude role with configured model and tools`.
  - `renders external role with fallback model and external marker`.
  - `switching external back to claude removes marker` (re-sync over previous output).
  - `check reports drift for hand-edited file and writes nothing`.
  - `validation errors abort without writing any file`.
  - `sync is idempotent` (second run: no content change).
  - `sync removes nothing it did not generate` (unrelated `.claude/agents/other.md` untouched).
- [ ] **Step 2:** `node --test tools/agent-roles/test/` → FAIL.
- [ ] **Step 3:** Write prompts, `render.mjs`, `bin/sync.mjs`.
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** Propose commit message `feat(agent-roles): generate Claude agent files from role config`.

### Task 4: Skill and README

**Files:**
- Create: `tools/agent-roles/skills/external-agents/SKILL.md`, `tools/agent-roles/README.md`

**Interfaces:**
- Consumes: CLI contracts of `ask.mjs` and `sync.mjs`.

SKILL.md (frontmatter `name: external-agents`, description: "Use when delegating to an agent role (scout, implementer, verifier, reviewer, researcher) or asking Codex/Antigravity for a read-only second opinion"). Body: the dispatch algorithm from the spec (read generated file → `external:` marker? → `ask.mjs`; exit 3 → spawn `<role>` subagent and tell the user the substitution from stderr; exit 1 → report, no fallback; exit 2 → fix call); how to change a model (edit `.agents/roles.json`, run sync); never give external providers write tasks.

README: purpose, layout, config layers and fields, commands, exit codes, how to adopt in another repo (copy dir, add `.agents/roles.json`, run sync, link skill, add Delegation section to AGENTS.md).

- [ ] **Step 1:** Write both files.
- [ ] **Step 2:** Check every command in them runs as documented (`--help`-free: run sync `--check`, ask with a fake/real provider).
- [ ] **Step 3:** Propose commit message `docs(agent-roles): external-agents skill and README`.

### Task 5: Stagistic wiring

**Files:**
- Create: `.agents/roles.json`, `.claude/skills/external-agents` (symlink → `../../tools/agent-roles/skills/external-agents`), generated `.claude/agents/{scout,implementer,verifier,reviewer,researcher}.md`
- Modify: `moon.yml` (tasks), `.jscpd.json` (`path` += `"tools"`), `AGENTS.md` (new "Delegation" section after "Agent verification workflow")

**Interfaces:**
- Consumes: `sync.mjs` CLI, `node --test` suite.

- [ ] **Step 1:** `.agents/roles.json` = `{"roles": {}}` (defaults suffice; user edits later). Add moon tasks in `moon.yml` next to `verify`, each `options: {cache: false}`:
  - `agents-sync: node tools/agent-roles/bin/sync.mjs`
  - `agents-check: node tools/agent-roles/bin/sync.mjs --check`
  - `agents-test: node --test tools/agent-roles/test/`
  Append `&& node tools/agent-roles/bin/sync.mjs --check` to root `lint` script.
- [ ] **Step 2:** Create symlink; `moon run root:agents-sync`; confirm five files generated.
- [ ] **Step 3:** AGENTS.md "Delegation" section, ≤25 lines, content from spec section "Delegation section in AGENTS.md" plus: "Role models live in `.agents/roles.json` (defaults `tools/agent-roles/roles.default.json`); change them there and run `moon run root:agents-sync`. Dispatch per the `external-agents` skill."
- [ ] **Step 4:** Verify via shared runner: `moon run root:verify -- root:agents-test`, `moon run root:verify -- root:agents-check`, `moon run root:verify -- root:format-check -- <changed .mjs files>`, `moon run root:duplicates-changed`. All pass.
- [ ] **Step 5:** Propose commit message `chore: wire agent-roles into Stagistic`.

### Task 6: Pilot smoke (main thread)

- [ ] **Step 1:** Spawn `scout` with "Where is SCRIPT_DOCUMENT_SCHEMA_VERSION defined?" → answer with `file:line`.
- [ ] **Step 2:** Temporarily set `reviewer` to codex in `.agents/roles.json`, sync, run reviewer on the spec via `ask.mjs` → concise review. Repeat with agy.
- [ ] **Step 3:** Simulate unavailable (`PATH` without codex) → exit 3, then spawn `reviewer` subagent on the fallback model; confirm the substitution message.
- [ ] **Step 4:** Restore `.agents/roles.json` to the user's chosen values, sync, `agents-check` passes. Report results; propose final commit message.
