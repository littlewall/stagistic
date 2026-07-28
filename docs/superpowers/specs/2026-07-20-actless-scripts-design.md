# Actless Scripts Design

## Goal

Support one-act plays and musicals whose document contains no `act` block, while preserving the current multi-act creation flow as the default.

## State ownership

The editor document is the only owner of script structure. A script is multi-act when its Tiptap/ProseMirror document contains at least one `act` block and actless when it contains none.

The new-script choice is only an initialization aid. It must not add a script-type field, database metadata, TanStack DB state, or another persisted source of truth. Document changes continue through the existing editor source and autosave path.

## New-script flow

The new-script dialog adds an accessible choice between:

- **Multi-act** — selected by default; creates `ACT ONE` followed by an empty scene.
- **One-act** — creates an empty scene without an `act` block.

The choice resets to **Multi-act** whenever the dialog is reopened. The dialog passes the selected shape to the existing create action, which supplies the matching initial `ScriptDocument` to the current repository-backed creation flow.

The document package exposes explicit factories for the two initial shapes. Existing callers that rely on the default document continue to receive the multi-act shape.

## Act deletion

Every act, including the first act, exposes the existing delete action. The editor command removes only the targeted `act` block; it does not delete or move scene or content blocks.

Consequences follow directly from document order:

- Deleting the only act makes the script actless.
- Deleting the first of several acts leaves its following scenes before the next act, so those scenes are actless.
- Deleting a later act leaves its following scenes under the preceding act until another act block appears.

Both supported editor command paths must allow deletion of the first act. The first act remains a static, non-draggable structure row, but its delete control is visible and usable like other act rows.

## Stagistic syntax and import

The existing syntax remains unchanged:

- With acts, `#` headings represent acts and `##` headings represent scenes.
- Without acts, `#` headings represent scenes.
- Serialization chooses the matching heading depth based on whether the document contains an `act` block.

Import must preserve an actless parsed document. No creation or normalization step may add an `act` block when the imported document contains scenes but no acts. This is primarily a regression requirement because the parser and serializer already model this form.

## Page marks

Page marks continue to derive structure from the live editor document:

- A page under an act uses `ACT-SCENE-PAGE`, with the existing Roman act number, for example `II-3-12`.
- A page with no preceding act uses `SCENE-PAGE`, for example `3-12`.

No formatting setting or separate script-type flag is introduced. The existing nullable act index remains the input to page-mark formatting.

## Error handling

Creation retains the existing pending and failure behavior. Changing the initial shape does not add a second write or compensation step: the selected document is part of the existing atomic script creation command.

Act deletion retains existing editor/autosave failure semantics. User content is never rolled back by this feature.

## Testing

Tests must cover:

- The multi-act document factory creates `ACT ONE` and a scene.
- The actless document factory creates a scene and no act.
- The new-script dialog defaults to Multi-act, submits both shapes, and resets to Multi-act after reopening.
- The create action passes the chosen initial document through the existing repository boundary.
- Importing Stagistic source with `#` scene headings produces and persists a document with no act.
- Stagistic parse/serialize round trips retain both actful and actless structures.
- The first act delete control is available and calls the delete action.
- Both editor deletion paths remove the first act without removing its scenes.
- Page structure resolution returns a null act for actless pages, and the resulting page mark is `SCENE-PAGE` rather than `ACT-SCENE-PAGE`.

## Non-goals

- Persisting or displaying a permanent “one-act” or “multi-act” script type.
- Preventing users from inserting acts into an actless script or deleting all acts later.
- Renumbering, moving, or deleting scenes as a side effect of act deletion.
- Changing the Stagistic file format.
