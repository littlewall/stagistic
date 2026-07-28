# Attribute Manager: Music and Character Actions

## Scope

Extend the existing Attribute Manager without changing the stored script-document
schema:

- let users search and create music;
- distinguish unassigned music from music placed in the script;
- let users rename characters;
- let users delete assigned and unassigned music after confirmation.

## Music List

The music panel keeps assigned music in script order with its formatted number.
Assigned entries are grouped under headings for the acts that contain them; acts
without music do not appear. Music outside an act remains ungrouped.
Unassigned catalog entries appear at the end under an `Unassigned` group heading
and do not reserve space for a number, so their titles align with the list edge.

A search field filters both assigned and unassigned music by title,
case-insensitively. A plus action beside the search field opens the existing
`AddMusicModal`. Its icon uses the same visible foreground treatment as the
working Characters and Places add actions. After creation, the new unassigned
music is selected.

The existing list-panel layout remains the shared foundation. Its optional list
toolbar and detail action affordances are enabled only for music, so the structure
panel does not change.

## Detail Headers

Character, Music, and Place detail headers show only the selected item name.
Structure retains the `Scene` type label.

For assigned music, the containing scene label appears below the full music
title. Neither line is truncated. Act metadata and the right-side scene metadata
are removed; the right side contains only the delete action. Unassigned music
has no scene subtitle.

## Character Rename

The selected character detail gains a `Name` input following the existing place
rename interaction:

- the draft is reflected immediately in the list and detail heading;
- blur or form submission persists a trimmed name;
- an empty name or a case-insensitive duplicate is rejected inline;
- Escape restores the confirmed name;
- the existing character rename action updates the catalog and all character
  references in the script document.

Pending rename state disables conflicting destructive actions. A persistence
failure keeps the draft visible and relies on the existing catalog error surface.

## Music Delete

The selected music detail gains a trash action. It opens a confirmation dialog
matching the existing destructive dialogs. The action is available for assigned
and unassigned music.

For unassigned music, confirmation deletes the catalog entry directly.

For assigned music, confirmation performs this ordered flow:

1. remove every marker for the music from the live editor document;
2. let the editor publish the resulting document state;
3. delete the music catalog entry;
4. remove attachment bindings through the existing database cascade.

The manager coordinates marker removal through an explicit editor request and
waits for its completion before deleting the catalog entry. This prevents a
document projection from recreating a deleted assigned entry.

While deletion is pending, the destructive action and dialog dismissal are
disabled. A failure leaves the music selected and the dialog open so the user can
retry.

## Components and Data Flow

- `AttributeManagerListPanel` receives narrowly scoped optional affordances for
  search/create and a detail-header action.
- `attributeManagerMusicItems` marks unassigned entries as one trailing
  `Unassigned` group and leaves their number empty.
- `ScriptAttributeManagerModal` owns the music create dialog, delete confirmation,
  and selected-item handoff.
- `useScriptMusicState` exposes the catalog operations and the editor request
  needed for ordered assigned-music deletion.
- `AttributeManagerCharactersPanel` owns keyed name drafts and passes the selected
  draft into `AttributeManagerCharacterDetail`.
- Existing character actions remain responsible for catalog and document
  synchronization.

No database schema or script-document schema changes are required.

## Verification

Browser tests cover:

- filtering music across assigned and unassigned groups;
- opening the add dialog and selecting newly created music;
- rendering assigned numbers and an `Unassigned` group without dash numbers;
- requiring confirmation before deleting music;
- deleting unassigned music directly;
- removing assigned markers before deleting the catalog entry;
- reflecting a character name draft in the list and detail heading;
- persisting a valid character rename;
- rejecting empty and duplicate character names.

Focused typecheck and browser tests run before the canonical package checks.
`graphify update .` runs after code changes.
