# Issue tracker: local Markdown

Specs and tickets live in `.scratch/`, which is ignored by git. Publishing means writing a local file; fetching means reading it. No remote issues, labels or PR operations.

- Feature state: `.scratch/<feature>/state.md` (start HEAD, phase, baseline WIP, touched files).
- Spec: `.scratch/<feature>/spec.md`.
- One file per ticket: `.scratch/<feature>/issues/NN-<slug>.md`, numbered from `01` in dependency order. Record `Blocked by:`, acceptance criteria and `Status:`. Append comments under `## Comments`.
- Fix cycles: `.scratch/fix-cycle/<YYYY-MM-DD>.md`; continue the latest open file even across days. A new cycle on the same day uses a numbered suffix if the original is closed.

Statuses and their meanings are in [triage-labels.md](triage-labels.md). Flow-specific state and bug confirmation rules come from `feature-flow` / `fix-cycle`.

When upstream says "commit", leave changes in the working tree. Only the user commits. Propose one commit message when requested.
