# Local MCP execution ledger

Plan: `docs/superpowers/plans/2026-10-19-local-mcp.md`.

- Ruling: implement in the existing `tauri` feature checkout, preserving the user's branch and uncommitted design documents; no commits or staging.
- Preflight: contract → DB/bridge/server; serializer → fragment reader; broker → frontend lifecycle; executable → both distribution paths. No conflicting operation names found.
- Task 1: Rust validation RED→GREEN (2 tests), TS validation RED→GREEN (2 tests). Generated contract exported successfully; typecheck exposed composite JSON include requirement, corrected.
- Ruling: generate TypeScript from schemars JSON Schema with json-schema-to-typescript instead of ts-rs; one canonical contract, fewer independent generators.
- Task 2: context/speech tests RED→GREEN; all 173 script tests pass with unchanged existing serialization expectations.
- Tasks 3–6: initial read/FTS tests RED→GREEN (3 integration tests); DB, script and contract typechecks pass.
- Ruling: repository contains 26 SQL migrations but only one Drizzle metadata entry. Added manual `0026_script_text_search.sql` and compiled all 27; generation from stale Drizzle metadata would be unsafe.
- Ruling: first read implementation fingerprints the already loaded, deterministically ordered scoped snapshot in JS. This preserves correctness and token limits; SQL-only fingerprint optimization remains possible without changing the API.
- Task 7: native SDK subprocess handshake/tools/offline call test RED→GREEN.
- Task 8: desktop baseline compiler is Rust 1.93, existing Tauri 3 dependencies require 1.95. Installing/pinning 1.95 for the workspace rather than downgrading Tauri.
- Tasks 8–10: implemented; broker lifecycle, frontend bridge, native installer helpers and universal MCPB packaging are present. No UI and no actual Claude installation.
- Fresh review: four important findings fixed (aborted listener attach, UDS client ownership/modes, dev/prod resource merge, scene boundary at next act). All behavioral regressions observed RED→GREEN; resource mapping verified in the built app.
- Minor review findings also fixed: unconfirmed same-name speakers, outline numbers/counts, artifact paths with spaces and non-system dynamic library detection.
- Native install tests verify failed replacement preserves the old executable and successful preparation preserves bytes at the user's actual Unicode path without enabling access.
- Task 11: automated checks and desktop bundles produced; actual Claude/UI, signing/notarization, Gatekeeper and Intel runtime smoke remain explicitly manual. See `docs/testing/local-mcp.md` for final evidence.
- No commits, staging, actual Claude installation or client configuration writes.
- Final evidence: 1,144 Node tests; all constituent browser/marketing suites green (editor passed unchanged rerun after one intermittent failure). Native contract/stdio/UDS 4 tests, broker/install 5 tests, WebView lifecycle 2 tests and real end-to-end 1 test green.
- Final typecheck, correctness lint, Rust fmt/Clippy, changed-source formatting, duplicate check, universal artifact verification and actual desktop app/DMG build pass. Repository-wide format check retains 61 existing errors in untouched files.
- Final app resources match distribution hashes. Native executable SHA-256: `a016c51a4df6a81e95bebc05311df60b26a905d03adbec2785fe149443aa346b`.
