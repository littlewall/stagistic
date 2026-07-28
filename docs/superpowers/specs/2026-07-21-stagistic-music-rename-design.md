# Stagistic Music Rename — Design

**Date:** 2026-07-21  
**Status:** Approved in conversation; awaiting written-spec review  
**Supersedes terminology in:** the cue editor, cue numbering, cue attachment,
and persistence designs where `cue` meant script-bound music

## 1. Motivation

The current `cue` entity represents music referenced by the script: a musical
number, instrumental passage, underscoring, recorded backing music, or short
musical hit. It is written for authors, actors, and directors. It is not a
production sound cue for the sound department.

Keeping the name `cue` would collide with future light, sound, and FX cues,
which will live in separate production views and have different behavior. The
script-bound entity is therefore renamed to `music` throughout the product,
document model, source code, syntax, persistence layer, and current
documentation.

## 2. Decisions

- The domain name is **music**.
- The text syntax is `@@music N "title"` and `@@out N`.
- The document nodes are `musicStart` and `musicOut`.
- The stable identity attribute is `musicId`.
- The relational tables are `script_music` and
  `script_music_attachments`; the attachment foreign key is `music_id`.
- `open` and `hit` modes retain their current behavior.
- This is a clean break. There are no deprecated aliases and the parser does
  not accept `@@cue`.
- No generic abstraction for future production cues is introduced.

`@@out` remains intentionally short. Within the script syntax it closes the
currently open music entry, and “out” is the established theatrical expression
for music ending at a point. `@@end` would be less specific and could be
mistaken for the end of another structural element.

## 3. Naming contract

The rename uses the following vocabulary consistently:

| Current | Replacement |
| --- | --- |
| `Cue`, `ScriptMusic`, `DerivedMusic` | `Music`, `ScriptMusic`, `DerivedMusic` |
| `MusicAtom`, `MusicBlockInput` | `MusicAtom`, `MusicBlockInput` |
| `cue`, `cues` for this domain | `music` |
| `musicId`, `musicIds` | `musicId`, `musicIds` |
| `musicStart`, `musicOut` | `musicStart`, `musicOut` |
| `deriveMusic` | `deriveMusic` |
| `scriptMusic` | `scriptMusic` |
| `script_music` | `script_music` |
| `script_music_attachments` | `script_music_attachments` |
| `music_id` | `music_id` |
| `@@cue` | `@@music` |
| UI label “Cue(s)” | “Music” |

Names derived from these terms follow the same transformation, including
constants, callback props, commands, extensions, plugin keys, React
components, hooks, repository methods, query payloads, file names, directory
names, CSS classes, DOM data attributes, accessibility labels, test helpers,
and package exports.

Because `music` is an uncountable noun, collections are named `music` rather
than introducing `musicItems`. A single relational/domain row is
`ScriptMusic`; its identity is `musicId`.

## 4. Semantic boundaries

The rename applies only where `cue` currently means script-bound music.

Legitimate uses of `cue` remain when they mean a different theatrical concept:

- a character cue or character cue line;
- an explicitly described future sound, light, or FX cue;
- historical SQL migrations that must remain immutable;
- dropped historical production-cue tables in immutable migrations.

All other occurrences must be renamed or removed. In particular, code must not
keep `cue` as a hidden implementation synonym for music.

Repository documentation that still describes the active music feature as
`cue` is updated to the new vocabulary. Earlier design documents may retain a
short supersession note, but their active requirements and examples use
`music` unless they discuss actual production or character cues.

## 5. Behavior

This change does not alter feature behavior. It preserves:

- `#` compose inside a stage direction;
- insertion at the end of the block;
- at most one music marker per stage-direction block;
- scene-derived numbering;
- positional pairing of an open entry with `musicOut`;
- implicit closure at the next open music entry or scene end;
- zero-duration `hit` entries;
- assignment and unassignment of catalogued music;
- title and kind editing;
- integrated-score attachments;
- sidebar, attribute-manager, import, and export behavior.

The end-to-end data flow becomes:

```text
# compose or block action
→ musicStart / musicOut in ScriptDocument
→ deriveMusic
→ live editor index and labels
→ script_music relational projection
→ Music sidebar, attribute manager, and export
```

## 6. Text syntax

The canonical start form is:

```text
@@music 1 "Overture"
```

The canonical explicit end form remains:

```text
@@out 1
```

The parser, serializer, error messages, fixtures, landing-page syntax
documentation, and tests use `@@music`. The old `@@cue` token is invalid and
must fail parsing rather than being silently accepted or normalized.

## 7. Document schema

The persisted ProseMirror-compatible document shape changes:

```text
musicStart → musicStart
musicOut   → musicOut
musicId    → musicId
```

This changes stored node types and attributes, so
`SCRIPT_DOCUMENT_SCHEMA_VERSION` increases from `1` to `2`.

The relational projection stores inline block content in
`script_blocks.content_json`. The database migration rewrites existing JSON
before the new editor schema reads it. After migration, the runtime has no
legacy `musicStart`, `musicOut`, or `musicId` compatibility path.

## 8. Database migration

A new forward Drizzle migration preserves existing local data while renaming
the current schema:

1. Rename `script_music` to `script_music`.
2. Rename `script_music_attachments` to `script_music_attachments`.
3. Rename `music_id` to `music_id`.
4. Rename all affected constraints and indexes so the final schema contains
   music terminology.
5. Rewrite `script_blocks.content_json` node types and identity attributes.
6. Rewrite pending sync-outbox operation types, entity keys, and JSON payload
   property names from the old music terminology to the new terminology.

The migration preserves music row ids, script ownership, numbering, mode,
title, kind, start/end block assignments, timestamps, attachment bindings,
attachment roles, and attachment storage keys.

After editing the schema or migration, run:

```bash
pnpm --filter @stagistic/db db:compile-migrations
```

Historical migrations are not edited. `migrations.compiled.ts` is regenerated
from the full migration chain.

## 9. Application scope

The source rename spans every active layer:

- `@stagistic/script`: constants, types, derivation, formatting, indexing,
  parsing, serialization, and public exports;
- `@stagistic/editor`: nodes, NodeViews, commands, compose extension,
  numbering extension, live snapshots, element selection, block actions,
  callbacks, DOM attributes, styles, and public exports;
- `@stagistic/db`: schema, query functions, payloads, repositories, extraction,
  projection persistence, reactive sources, attachment bindings, and sync
  envelopes;
- `@stagistic/app-core`: stores and React hooks;
- `@stagistic/app-routes`: editor wiring, Music sidebar, modals, attribute
  manager, settings, and attachment detail;
- `@stagistic/ui`: shared music detail and list UI;
- `@stagistic/export`: music-aware export planning;
- landing pages and active product/persistence/syntax documentation.

Paths named for the old music domain are renamed as well. Public packages do
not export aliases under old names.

Sync operation types and entity keys become `music.*` and `music:*`. DOM
markers become `data-music-*`, and ARIA labels use Music terminology.

## 10. Future production cues

Future light, sound, and FX cues are out of scope. They will live outside the
script editor in separate production views and may overlap, bind to different
positions, and follow department-specific rules. This rename deliberately
reserves `cue` for that future domain but does not create shared cue interfaces,
tables, or UI today.

## 11. Testing

The implementation adds or updates tests for:

- migration of table names, foreign keys, indexes, constraints, music rows,
  attachment bindings, inline JSON, and pending outbox data;
- parsing and round-trip serialization of `@@music` / `@@out`;
- rejection of `@@cue`;
- music derivation, numbering, open/hit behavior, explicit outs, and implicit
  closure;
- document extraction and relational projection;
- music query/repository/reactive APIs;
- app-core stores and hooks;
- editor compose, commands, pills, labels, selection, sidebar, modals, and
  attachment manager;
- exports and public package surfaces.

Verification commands are:

```bash
pnpm --filter @stagistic/db db:compile-migrations
npx tsc -b
pnpm lint
pnpm test
```

Relevant package browser tests are also run. Known pre-existing editor browser
failures are reported without weakening assertions or changing viewport
expectations.

Finally, a case-insensitive repository search for `cue` classifies every
remaining occurrence. Each must refer to a character cue, a real/future
production cue, or immutable migration history. Run `graphify update .` after
the source changes.

## 12. Acceptance criteria

- Users see Music terminology everywhere this feature appears.
- New text import/export uses `@@music` and `@@out`; `@@cue` is rejected.
- New documents store `musicStart`, `musicOut`, and `musicId`.
- Existing local music rows, assignments, and attachments survive migration.
- The resulting live database schema contains no music-domain table, column,
  index, or constraint named `cue`.
- Active source APIs, variables, paths, DOM attributes, and tests use Music
  terminology for this domain.
- Remaining `cue` occurrences pass the semantic audit in §4.
- Music behavior and numbering are unchanged.
- `SCRIPT_DOCUMENT_SCHEMA_VERSION` is `2`.
- The canonical checks pass, apart from explicitly identified pre-existing
  browser-test failures.
- No commit is created by the agent.
