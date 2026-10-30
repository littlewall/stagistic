---
name: feature-flow
description: Use when starting or continuing development of a new feature, such as "budeme vyvíjet novou feature", "přidáme funkci" or "build a new feature". Excludes iterative bug reports handled by fix-cycle.
---

# Feature flow

Read `tools/agent-flows/skills/flow-rules.md`, then follow live upstream skills under those overrides. Keep one feature in this thread; ask about ambiguous scope before creating a second effort. On resume, continue the first unfinished phase and preserve approvals already recorded.

1. Resume the selected unfinished `.scratch/<feature>/state.md`, or choose a short feature slug and create it. Record `Start HEAD` from `git rev-parse HEAD`, `Phase`, baseline WIP and `Touched files` (initially empty). Update phase and touched files as work proceeds. Changes outside this flow keep their existing ownership.
2. Resolve and Read `grill-with-docs`, `grilling` and `domain-modeling`. Work the decision tree in rounds, with a recommendation for each question. Find codebase facts through `scout`; ask the user for decisions. Challenge fuzzy requirements with concrete edge cases. Capture resolved terms and worthwhile ADRs as upstream describes, leaving files uncommitted. Wait for confirmation of shared understanding.
3. Follow `to-spec` into `.scratch/<feature>/spec.md`, including testing decisions and observable acceptance criteria. Present the spec for user approval. Do not make implementation changes before approval.
4. Follow `to-tickets`: show vertical slices and their blocking edges; get user approval of the list. Write one `.scratch/<feature>/issues/NN-<slug>.md` per approved ticket, blockers first. No remote tracker calls.
5. Dispatch `implementer` one ticket at a time in dependency order, giving it the approved spec, ticket, live `implement` and `tdd` instructions, shared overrides and scoped checks. Pass the agreed test seams; let it resolve and Read `codebase-design` only if module/seam design needs clarification. Keep ticket status and touched files current; do not commit.
6. For UI tickets, the main thread checks the result in the browser against `PRODUCT.md` and the approved acceptance criteria.
7. Follow `code-review` with start HEAD, touched paths, baseline WIP and the spec. Use the shared rules' working-tree comparison instead of upstream's committed-only diff. Dispatch Standards and Spec axes as `reviewer`; fix findings through `implementer`.
8. `verifier` owns the final check set under AGENTS.md. Report changes, checks, unresolved findings and untested surfaces. Set `Phase: done` when the agreed work and checks are complete. Offer no automatic commit step; propose a commit message only on request.
