---
name: fix-cycle
description: Use when the user reports bugs while manually testing the app and wants iterative fixes from chat, such as "budeme opravovat chyby", "při testování jsem našel" or "let's fix bugs as I test". Continues across bug batches in the same session.
---

# Fix cycle

Read `tools/agent-flows/skills/flow-rules.md`. Keep the cycle open as the user tests and reports more bugs; each new message extends this work.

1. Continue the latest open `.scratch/fix-cycle/<YYYY-MM-DD>.md`, including on a later day. If several open cycles exist, let the user choose. Create today's file only if none is open; preserve a closed file by using a numbered suffix for another cycle that day. Record `Start HEAD`, `Phase: open`, baseline WIP, `Touched files`, and a numbered bug list. Do not reset these on resume.
2. Append each reported bug in the user's words plus a one-line restatement. Track `open → fixed → confirmed`; only the user can confirm. Keep unresolved bugs open, and reopen a fixed/confirmed bug if the user says it still fails. Ask for clarification only when the report does not give enough information to reproduce it.
3. Handle bugs sequentially. Use `scout` to locate the code when needed. For a simple bug, give `implementer` the report, existing public test seam and live `tdd` instructions: regression test goes red before the fix, then green. For an unclear cause, flaky bug or performance regression, also follow live `diagnosing-bugs` to build a reproducible feedback loop before choosing a fix. Shared overrides apply to every nested step.
4. After each batch, run focused checks for the changed behavior under AGENTS.md, recording valid commands/results for later reuse. Update touched paths and statuses. For UI changes, the main thread performs a browser visual check. Reply briefly: "Připraveno k ověření v aplikaci: #4, #5", one line per fix. This means `fixed`, not `confirmed`.
5. Continue with the user's confirmations, regressions or new bugs. Do not add a spec/ticket approval ceremony to ordinary bugs. When asked for a commit message, propose one message covering all fixed bugs so far; keep the cycle open.
6. When the user says they are done, run live `code-review` through `reviewer`, using start HEAD, touched files, baseline WIP and the bug list. Fix findings through `implementer`. Then `verifier` runs `moon run root:verify -- --fresh root:test-all` as the pre-main gate, one suite at a time, plus outstanding scoped checks. Never run this full regression after every batch.
7. Report the final results and unresolved/unconfirmed bugs. Set `Phase: closed` after the closing review and checks; do not silently mark bugs confirmed. No commit, push or merge. A single proposed commit message remains available on request.
