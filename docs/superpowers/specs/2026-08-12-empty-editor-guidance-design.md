# Initial Scene Template Design

**Date:** 2026-08-12

## Goal

Let a writer begin immediately with one visible scene heading, without canvas
guidance, an extra chooser action, or duplicate placeholder text.

## Scope

- A new multi-act script contains `ACT ONE` followed by `SCENE ONE`.
- A new one-act script contains `SCENE ONE`.
- A fresh script receives focus at the end of `SCENE ONE`.
- The standard Characters empty-state message remains unchanged.

## Architecture

`@stagistic/script` creates the populated scene block in both document
factories. The script-route focus predicate recognizes the untouched
templates, and the editor resolves its initial selection at the end of the
first Scene. No canvas guidance state or new editor UI is needed.

## Testing

Test both document factories, focus eligibility, the selection offset, the
absence of canvas guidance, and the existing Characters empty state.

## Non-goals

- Changing the initial `ACT ONE` structure for multi-act scripts.
- Removing placeholders from genuinely empty, user-created blocks.
- Changing chooser behavior or document schema.
