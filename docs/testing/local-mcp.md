# Local MCP integration — validation and handoff

Date: 2026-10-19. Environment: macOS, Apple Silicon, Rust 1.95.0,
Node 24.19.0, pinned MCPB CLI 2.1.2. Branch: `tauri`. No staging or commits.

## Implemented

One Rust `stagistic-mcp` executable implements standard MCP over stdio using
the official `rmcp` SDK. Both manual installation and the binary MCPB contain
the same signed universal macOS executable. End users need no Node runtime.

The bridge connects to a private Unix socket, then the Tauri broker targets
the main WebView and its existing PGlite worker. It reads committed local
state in read-only repeatable-read transactions. Seven tools expose scripts,
outline, scenes, excerpts, characters, confirmed dialogue and PostgreSQL FTS.
Text uses the shared **Stagistic syntax** serializer, including whole speeches,
multiple speakers, inline markup, stage directions and fragment context.

Access defaults off. The frontend functions in
`apps/desktop/src/mcp/client.ts` are ready for a later settings UI:

| Function | Behavior |
| --- | --- |
| `getMcpStatus()` | Enabled/ready status and bridge/protocol versions. |
| `enableMcp()` / `disableMcp()` | Persist preference and start/stop local access for every client. |
| `prepareManualMcp()` | Atomically prepare a stable executable copy; return actual absolute `command`, empty `args`, version. Does not enable access. |
| `installMcpToClaude()` | Prepare MCPB, enable access, request Claude's native installer. Release builds only; returns `installation_requested`. |

Native administration is restricted to the local main WebView. Requests have
an operation allowlist and strict arguments. The broker owns request IDs and
WebView generations; reloads, detach, disable and stale replies cannot cross
generations. Both socket ends validate private filesystem boundaries.

Limits: 16 KiB internal requests, 32 KiB domain replies, 64 KiB MCP frames;
20 items by default, at most 100 (50 for search); 512 code points per query,
240 per snippet; 8 active requests, 10-second broker / 12-second client deadline.
Cursors bind scope, filters and the content revision; oversized individual
speeches fail with their block ID instead of being cut into misleading text.

FTS migration `0026_script_text_search.sql` adds a GIN expression index using
the `simple` dictionary. Czech diacritics work as literal indexed text; Czech
lemmatization and accent-insensitive matching are outside this version.
All 27 migrations were compiled. The document schema version is unchanged.

## Automated evidence

| Check | Result |
| --- | --- |
| `moon run root:typecheck` | PASS. |
| `moon run root:lint` | PASS, including after the native build. |
| Scoped `root:format-check` for changed sources | PASS. |
| `moon run root:duplicates-changed` | PASS, no new clones. |
| `moon run script:test` | PASS, 173 tests; existing full-export expectations unchanged. |
| `moon run db:test -- src/mcp` | PASS, 9 tests. |
| `moon run desktop:test` | PASS, 2 lifecycle tests. |
| `moon run mcp:test-rust` | PASS, 4 tests covering contract, offline stdio and unsafe socket rejection. |
| `moon run desktop:test-rust` | PASS, 5 tests covering broker and installation. |
| `moon run desktop:check-rust` | PASS. |
| `moon run mcp:lint-rust desktop:lint-rust` | PASS after fixing Clippy findings. |
| `moon run mcp:test-e2e` | PASS: real stdio executable → real Rust broker/UDS → real PGlite read service. |
| `moon run desktop:build` | PASS, `.app` and `.dmg`; both MCP resources present under `Contents/Resources/mcp/`. |
| `moon run mcp:verify-artifacts` | PASS: identical x86_64/arm64 binary, executable bit, signature and system-only dynamic dependencies. Both app resources match `dist/`. |
| `moon run root:test-all` | Aggregate stopped at one editor browser failure; that suite passed on an unchanged rerun. Every constituent suite passed as detailed below. |

Final constituent results: Node **1,144/1,144** (236 files); app-core browser
**12/12**; app-routes browser **171/171**; editor browser **285/285** on an
unchanged rerun; UI browser **237/237**; web browser **7/7**; marketing **21/21**.
The aggregate command itself is not reported as passing. Snapshots, assertions,
viewports and timeouts were not modified to obtain these results.

Final native executable SHA-256:
`a016c51a4df6a81e95bebc05311df60b26a905d03adbec2785fe149443aa346b`.
`graphify update .` completed. Its SQL extraction dependency is unavailable;
the TypeScript/Rust graph was refreshed without API calls.

The E2E adapter replaces only Tauri event delivery; it does not replace the
broker, socket, MCP process or database. It is test-only and is excluded from
the MCPB. Actual WebView event delivery still needs the app smoke test below.

Regression tests were observed failing before fixes for: scene boundaries at
the following act, late aborted WebView attachment, unsafe socket directory,
unconfirmed same-name speakers and missing outline metadata. Existing tests
also verify cursor invalidation without timestamp changes, byte limits,
whole speeches, read-only behavior, FTS changes/deletion, concurrency/timeouts,
late generation replies, stale sockets and failed executable replacement.
The successful manual-copy test uses a path with spaces and diacritics and
checks exact bytes, executable permissions and that access stays disabled.

Repository-wide formatting currently fails with **61 existing padding-line
errors in 36 unchanged files**. The incidental formatter edits to those files
were removed from this feature diff. No snapshots or duplication baseline
were changed. One full test run concurrent with release compilation hit three
5-second timeouts in snapshot/database reopen tests; it was repeated without
the release build competing for CPU.
The native build also exposed generated CSS under Rust `target/` to Stylelint;
the shared ignore list now excludes that build output alongside `dist/`.

## Build and installation

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
moon run desktop:dev          # development socket, host bridge, no Claude install
moon run desktop:build        # universal bridge, local ad-hoc signature
moon run mcp:verify-artifacts
```

Production signing uses `STAGISTIC_MCP_SIGNING_IDENTITY` with
`moon run desktop:build-release`. Missing identity fails the build.
This does not perform notarization. Build outputs are ignored, not committed:

- `packages/mcp/dist/stagistic-mcp`
- `packages/mcp/dist/stagistic.mcpb`
- `packages/mcp/dist/artifacts.json`
- `apps/desktop/src-tauri/target/release/bundle/`

The build stages one resource directory for either dev or production, avoiding
Tauri configuration merge collisions. Do not run dev and production packaging
concurrently against this checkout. The MCPB includes the repository license
and generated third-party license texts from the locked native dependency graph.

For another stdio client, copy the returned `command` and `args` from
`prepareManualMcp()` into that client's server definition, then call
`enableMcp()`. Example client wrapper construction (wrapper varies by client):

```ts
const {command, args} = await prepareManualMcp();
const clientConfig = {mcpServers: {stagistic: {command, args}}};
```

No placeholder path needs editing. The stable copy lives in the OS-resolved
app-data directory under `mcp/server/stagistic-mcp`, outside the app bundle,
checkout and Claude directories. The app must remain running. Export alone
does not grant data access. No clients or Claude config files were modified.

## Manual smoke still required

Use the client helpers from a developer test build with WebView devtools, or
wire them into the forthcoming settings UI. For production-endpoint inspection,
a local build can enable Tauri's `tauri/devtools` feature while retaining the
release profile. Do not install the debug MCPB into Claude.

- [ ] Launch the actual app, enable access and check ready status after DB startup.
- [ ] Request Claude installation; verify the intended application opens, accept
  and reject the native dialog separately, and verify seven tools appear.
- [ ] Read a real scene in Stagistic syntax through Claude; compare against saved
  editor content, including multi-speaker/music/inline context.
- [ ] Use the returned absolute command in another stdio client with no Node in
  its environment; compare results with Claude's MCPB copy.
- [ ] Keep a bridge running while the app closes and restarts; calls recover
  without restarting the bridge. Test disabled access, reload, sleep/wake and
  simultaneous clients. Confirm data is unavailable after disabling.
- [ ] Upgrade manual and MCPB installations; restart old client processes after
  `VERSION_MISMATCH`. Check that rejecting an install is never reported as installed.
- [ ] Verify the signed/notarized downloaded distribution with Gatekeeper,
  quarantine preserved, on both Apple Silicon and an actual Intel Mac.

These checks were not performed automatically. Local artifacts use ad-hoc
signatures; they are not evidence of Developer ID signing, notarization,
Gatekeeper acceptance or Intel runtime compatibility. The executable contains
both architectures; the desktop app built here targets the host Apple Silicon.

## Implementation decisions and next work

The approved plan was an outline. Contract generation uses schemars JSON Schema
and `json-schema-to-typescript`, not `ts-rs`. Rust owns operation types and
validation; result item payloads remain JSON records inside a typed page envelope.
Content fingerprints hash the consistently ordered scoped snapshot in JS.
Both can be refined without changing the transport. SQL migrations were edited
manually because the existing Drizzle metadata does not describe all SQL files.

No UI, cloud path, vectors, model downloads, MCP prompts or user skills were added.
The next product step is the editor settings surface using the existing helpers,
followed by the actual-client smoke checks above.

Suggested commit message for the user's review:
`feat(mcp): add local read-only native integration and Claude packaging`
