# Group Characters Design

## Goal

Add first-class character groups for collective cues such as `ALL` without treating those groups as cast roles. Groups behave like confirmed characters inside the editor, while the sidebar, attribute manager, persistence, copy, and export layers retain their distinct meaning.

## Data model and identity

Extend `script_characters` with `kind: "character" | "group"`, defaulting existing and newly created ordinary characters to `"character"`. Keep the existing unique `(scriptId, characterKey)` constraint so normalized names cannot collide across characters and groups.

Add a `script_character_group_members` join table containing `groupId -> characterId` pairs. Both columns reference `script_characters` with cascade delete, and the pair is the primary key. Repository mutations validate transactionally that both records belong to the same script, the parent has kind `group`, and every member has kind `character`. Nested groups are invalid.

Groups reuse the existing `colorHex` field. Character-only metadata, including gender and outline, does not apply to groups and is not shown for them.

Document references retain their existing shape: `characterId` may point to either a character or a group. The existing block-reference projection and foreign key therefore remain structurally valid. Because the meaning of the stored reference expands, increment `SCRIPT_DOCUMENT_SCHEMA_VERSION`.

Ordinary character APIs and character-only surfaces explicitly filter to `kind === "character"`. Group operations use dedicated repository methods. Editor projections that need all speaking entities combine both kinds deliberately.

## Editor, sidebar, and attribute manager

The editor receives a unified list of confirmed characters and groups. A group appears in character-cue autocomplete and `@` tag autocomplete, renders its name without expansion, and uses its own explicit or generated color like a character.

The character sidebar presents three ordered sets:

1. confirmed characters;
2. `Groups`, only when at least one group exists;
3. unconfirmed characters.

Groups remain separate from unconfirmed characters. An empty group stays usable in autocomplete and the document and carries a quiet `Empty` tag in the sidebar. Sidebar group actions are limited to changing color, focusing the first occurrence, and opening the group detail in the attribute manager. Creation, renaming, membership editing, and deletion live only in the manager.

The existing `Groups` workspace uses the same two-column browser/detail layout as `Characters`. Its detail contains name, color, and a tag-based `MultiComboBox` member picker matching the scene-place picker. Picker options contain confirmed characters only. `Create group` asks only for a name, selects the created group, and permits an initially empty membership set.

Frontend create and rename validation rejects empty or normalized case-insensitive duplicate names across characters and groups and displays the error next to the field. The database unique constraint remains authoritative.

Creating a group links existing same-named unconfirmed cue and tag occurrences to the new group. Renaming a group rewrites its linked document occurrences. Deleting a group that is used in the document first warns the user; after confirmation, the text remains but its reference is unlinked, so it becomes an unconfirmed character.

Deleting a confirmed character lists every affected group by name in the confirmation dialog and explains that deletion removes the character from those groups. The membership rows are then removed through the database cascade.

Membership is persisted as a complete set. The client applies it optimistically and rolls back to the last confirmed set if the repository mutation fails. Repository mutations remain authoritative and locally transactional.

## Export and derived behavior

Export UI continues to list confirmed characters only. Groups never appear as character-filter choices or in the initial-pages cast list.

Filtering for character `ANNA` includes a scene when the scene contains either:

- a direct occurrence of Anna; or
- an occurrence of any group whose members include Anna.

The exported text is never expanded: `ALL` remains `ALL`. Membership affects only whether the whole scene passes the existing character filter. Empty groups have no effect on character filtering. Selecting a group as an export filter is outside this release.

Script duplication with attributes copies characters, groups, memberships, and document references remapped to the new speaking-entity IDs. Duplication without attributes keeps group text but strips its link, so the occurrences become unconfirmed characters.

## Operations and verification

Coverage includes:

- migration, CRUD, cross-kind name uniqueness, membership validation, and cascades;
- script duplication and reference remapping;
- group create, rename, and delete document behavior;
- autocomplete, colors, sidebar ordering, and the empty-group state;
- Groups workspace and tag-based member picker;
- group deletion and member-character deletion warnings;
- export filtering through membership;
- exclusion of groups from the cast list.

## Out of scope

- selecting a group as an export filter;
- nested groups;
- the Cast workspace;
- automatic deletion of empty groups;
- character-only metadata for groups.
