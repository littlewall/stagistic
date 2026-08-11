# Script block accessibility design

## Goal

Expose the type of every script block to assistive technology without changing
the ProseMirror node model, the `<p>` element used by pagination, or the
stored `ScriptDocument`.

## Decision

Each script block remains a paragraph. Its rendered DOM receives an
`aria-roledescription` matching the canonical block label:

| Node type | Role description |
| --- | --- |
| `act` | `ACT` |
| `scene` | `Scene` |
| `stageDirection` | `Stage direction` |
| `character` | `Character` |
| `aside` | `Aside` |
| `dialogue` | `Dialogue` |
| `lyrics` | `Lyrics` |
| `note` | `Notes` |

The labels are derived from `BLOCK_ITEMS`, the existing canonical list, rather
than duplicated in the editor. The technical `blocktype` attribute remains
unchanged because editor overlays and selectors use it. `data-block-type` is
not part of this change: it would not expose semantics to assistive technology.

## Rendering contract

`createScriptNode` applies the same role description to both rendering paths:

- the stable node view used in the live editor;
- `renderHTML`, used for serialized HTML.

Changing a block type already recreates its node view, so the description is
updated with the block type. No document attribute, migration, or schema
version change is required.

## Verification

Extend the existing browser fixture for `MiniScriptEditor`, which uses the
real `ScriptBlockNodes`. The regression test asserts that each rendered block:

1. remains a `<p>`;
2. retains its current `blocktype` value;
3. has the matching `aria-roledescription`.

Run the targeted browser test, the editor typecheck, and the relevant
repository checks before handoff.
