# Playwriting & Musical Writing MCP Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Never commit code directly: prepare changes, verify through moon tasks, and request human review.

**Goal:** Expand the read-only Stagistic MCP server with 6 specialized playwriting/musical writing skills (both in-progress drafting checks and post-draft structural audits), standard MCP prompt templates with contextual discovery, analytical read tools for stage logistics and scene telemetry, and deep-link navigation (`stagistic://`) jumping straight to scenes/blocks in Stagistic Editor.

**Architecture:** 
1. Two new read-only analytical queries in `packages/db` (`get_stage_logistics` and `get_scene_telemetry`) compute character presence, entrance/exit buffers, speech metrics, and music cues from PGlite snapshot data within the 32 KiB reply limit.
2. `packages/mcp/crates/protocol` defines the updated contract and exports JSON schemas.
3. `packages/mcp/crates/server` exposes enriched tool descriptions for automated LLM discovery, plus MCP Prompts (`rmcp` `list_prompts` and `get_prompt`) for all 6 skills returning structured Markdown reports with `stagistic://` links.
4. `apps/desktop` registers custom URI scheme handling (`stagistic://script/<script_id>/editor?block=<block_id>`) navigating to the script and scrolling/focusing the target block.

**Tech Stack:** Tauri 3 alpha (macOS custom URL scheme), Rust (`rmcp`, `stagistic-mcp-protocol`, `serde`), TypeScript, React Router (`HashRouter`), PGlite / Drizzle ORM, Moon build system, Vite+ Vitest.

**Spec:** Context from user requirements: 6 playwriting/musical skills (3 in-progress, 3 post-draft), English language prompt templates and tools, read-only MCP constraint, structured Markdown output with click-through links to Stagistic Editor.

## Global Constraints

- MCP server remains strictly read-only: no writes, no mutations, no cloud calls.
- All MCP tools, prompt templates, parameter names, and outputs must be in English.
- Responses must adhere to MCP budget limits: <=16 KiB requests, <=32 KiB domain replies, <=64 KiB MCP frames.
- Deep links use the custom URI scheme: `stagistic://script/{script_id}/editor?block={block_id}` (or `?scene={scene_id}`).
- Database schema and document schema version (`SCRIPT_DOCUMENT_SCHEMA_VERSION`) remain unchanged.
- All checks must run through Moon: `moon run root:typecheck`, `moon run root:lint`, `moon run mcp:test-rust`, `moon run db:test -- src/mcp`.
- Never commit code autonomously; only prepare changes, verify tests, and request user review and commit.

## Review Focus

1. Deep-link invocation when the app is already running vs. launched cold must both reliably route and highlight the target block.
2. Large scripts with 50+ scenes and 30+ characters must not exceed the 32 KiB reply limit in `get_stage_logistics` (compact presence intervals).
3. Scenes with no speeches (pantomime / stage directions only) or scenes with unassigned music cues must not crash `get_scene_telemetry`.
4. Invalid or non-existent `block_id` or `scene_id` in deep link must fall back gracefully to opening the script editor root without error.
5. In MCP prompts, argument validation must handle missing optional arguments without panicking.

---

### Task 1: Deep Link Handler & Block Focus Navigation in Desktop App

**Files:**
- Modify: `apps/desktop/src-tauri/tauri.conf.json`
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`
- Test: `apps/desktop/src/mcp/deepLink.test.ts` (or route navigation test)

**Interfaces:**
- Consumes: URI scheme `stagistic://script/:scriptId/editor?block=:blockId`
- Produces: Navigation to script editor and scroll-into-view + highlight on `[data-block-id=":blockId"]`

- [ ] **Step 1: Write tests for deep link URL parsing**
  Test parsing `stagistic://script/s1/editor?block=blk-123` into `{ scriptId: 's1', blockId: 'blk-123' }` and malformed URLs into `null`.

- [ ] **Step 2: Run test to verify failure**
  Run: `moon run desktop:test`
  Expected: FAIL (parser not defined)

- [ ] **Step 3: Implement deep link parser and listener in desktop app**
  1. Add URL scheme `stagistic` to `apps/desktop/src-tauri/tauri.conf.json` bundle configuration.
  2. In `apps/desktop/src-tauri/src/main.rs`, handle opened URLs and emit a `deep-link-open` event to the webview.
  3. In `apps/desktop/src/App.tsx` / `ScriptEditorRoute.tsx`, listen for `deep-link-open` (or query param `?block=...`), navigate to `#/script/:scriptId/editor?block=:blockId`, scroll target DOM block into view and apply brief CSS highlight class.

- [ ] **Step 4: Run test to verify it passes**
  Run: `moon run desktop:test`
  Expected: PASS

---

### Task 2: Contract & Operations for Stage Logistics & Scene Telemetry

**Files:**
- Modify: `packages/mcp/crates/protocol/src/operations.rs`
- Modify: `packages/mcp/crates/protocol/src/bin/export_contract.rs`
- Modify: `packages/mcp/src/validate.ts`
- Run: `moon run mcp:contract` (regenerates TS definitions and `tools.json`)
- Test: `packages/mcp/crates/protocol/tests/contract.rs`

**Interfaces:**
- Consumes: `ScriptArgs { script_id: String }`, `SceneArgs { script_id: String, scene_id: String }`
- Produces: `ReadOperation::GetStageLogistics(ScriptArgs)`, `ReadOperation::GetSceneTelemetry(SceneArgs)`

- [ ] **Step 1: Add failing test for new contract operations**
  In `packages/mcp/crates/protocol/tests/contract.rs`, assert that `GetStageLogistics` and `GetSceneTelemetry` deserialize correctly and match tool schemas.

- [ ] **Step 2: Run test to verify failure**
  Run: `moon run mcp:test-rust`
  Expected: FAIL (variants not yet defined in enum)

- [ ] **Step 3: Update `ReadOperation` enum in `operations.rs` and export contract**
  1. Add `GetStageLogistics(ScriptArgs)` and `GetSceneTelemetry(SceneArgs)` to `ReadOperation`.
  2. Run `cargo run --manifest-path packages/mcp/crates/protocol/Cargo.toml --bin export_contract` to regenerate `packages/mcp/src/generated/*` and `tools.json`.
  3. Update `packages/mcp/src/validate.ts` if needed.

- [ ] **Step 4: Verify tests and contract generation**
  Run: `moon run mcp:contract && moon run mcp:test-rust`
  Expected: PASS

---

### Task 3: Database Read Service for Stage Logistics & Scene Telemetry

**Files:**
- Create: `packages/db/src/mcp/readLogistics.ts`
- Create: `packages/db/src/mcp/readSceneTelemetry.ts`
- Create: `packages/db/src/mcp/readLogistics.test.ts`
- Create: `packages/db/src/mcp/readSceneTelemetry.test.ts`
- Modify: `packages/db/src/mcp/createLocalMcpReadService.ts`
- Modify: `packages/db/src/mcp/index.ts`

**Interfaces:**
- Consumes: `McpSnapshot` from `readMcpSnapshot(tx, script_id)`
- Produces: 
  - `readStageLogistics(snapshot: McpSnapshot): StageLogisticsPayload`
  - `readSceneTelemetry(snapshot: McpSnapshot, sceneId: string): SceneTelemetryPayload`

- [ ] **Step 1: Write failing tests for `readStageLogistics` and `readSceneTelemetry`**
  1. Test `readStageLogistics` computes French scenes, list of characters present per scene, and quick-change intervals (speeches/scenes between exit and subsequent entrance).
  2. Test `readSceneTelemetry` returns scene word count, character speech breakdown, dialogue ping-pong ratio, and attached music cues with block IDs.

- [ ] **Step 2: Run test to verify failure**
  Run: `moon run db:test -- src/mcp/readLogistics.test.ts`
  Expected: FAIL

- [ ] **Step 3: Implement `readStageLogistics` and `readSceneTelemetry`**
  1. `readStageLogistics.ts`: Iterate over `snapshot.scenes` and `snapshot.blocks`, extract character cues, entrances, exits, and speeches. Build interval records for each character.
  2. `readSceneTelemetry.ts`: Extract blocks within target scene, calculate per-character speech lengths, line counts, and music cue linkages (`snapshot.music`).
  3. Wire into `createLocalMcpReadService.ts` dispatch switch.

- [ ] **Step 4: Run test to verify it passes**
  Run: `moon run db:test -- src/mcp`
  Expected: PASS

---

### Task 4: MCP Prompts and Enriched Tool Descriptions in Server

**Files:**
- Modify: `packages/mcp/crates/server/src/tools.rs`
- Modify: `packages/mcp/crates/server/tests/stdio.rs`
- Test: `packages/mcp/crates/server/tests/prompts.rs`

**Interfaces:**
- Consumes: MCP protocol requests `prompts/list`, `prompts/get`, `tools/list`
- Produces: 6 playwriting prompts and descriptive tool schemas with context-aware metadata

- [ ] **Step 1: Write failing tests for `list_prompts` and `get_prompt`**
  Test calling `prompts/list` returns the 6 playwriting skills:
  - `check-scene-engine`
  - `check-character-voice`
  - `check-song-transition`
  - `audit-epistemic-timeline`
  - `audit-stage-logistics`
  - `audit-musical-architecture`
  Test calling `prompts/get` for each prompt returns structured prompts instructing the agent to use `stagistic://` links.

- [ ] **Step 2: Run test to verify failure**
  Run: `moon run mcp:test-rust`
  Expected: FAIL

- [ ] **Step 3: Implement prompt handlers and enriched tool descriptions in `tools.rs`**
  1. Enable `.enable_prompts()` in `ServerConfig`.
  2. Implement `list_prompts` and `get_prompt` in `StagisticServer`.
  3. Prompts define parameters (e.g. `script_id`, `scene_id`, `character_id`) and return system guidance instructing LLMs to formulate reports with `stagistic://script/{script_id}/editor?block={block_id}` links.
  4. Enrich tool descriptions in `tools.json` / `tool_definitions` with explicit use-cases and trigger phrases for LLM autonomous routing.

- [ ] **Step 4: Run test to verify it passes**
  Run: `moon run mcp:test-rust`
  Expected: PASS

---

### Task 5: Toolchain Verification and Clean-Shield Checks

**Files:**
- All touched files

**Interfaces:**
- Full repository health check across Node, Rust, and linters

- [ ] **Step 1: Run typecheck**
  Run: `moon run root:typecheck`
  Expected: PASS

- [ ] **Step 2: Run linters and formatting**
  Run: `moon run root:lint && moon run root:format-check`
  Expected: PASS

- [ ] **Step 3: Run jscpd duplicates check**
  Run: `moon run root:duplicates-changed`
  Expected: PASS

- [ ] **Step 4: Run full MCP test suite**
  Run: `moon run mcp:test-rust && moon run db:test -- src/mcp`
  Expected: PASS
