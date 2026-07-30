# Example Script — Design

**Date:** 2026-07-29  
**Status:** Approved

## Goal

Let a user create a fully editable example musical script from Home. It must
exercise the editor's core structure without the user first writing content:

- two acts, each with at least two scenes;
- at least two confirmed characters;
- at least one character tag in a stage direction;
- one open music item whose kind is `song`, with lyrics and an integrated-score PDF.

Every click creates an independent user script. The example is repeatable and
must not seed, download, or otherwise become part of the user's database until
the user requests it.

## Scope

- Home's existing **Create example script** start action becomes available.
- The source script and score are lazy-loaded build assets.
- The result uses the normal local persistence model: PGlite for the script,
  metadata, characters, and music; IndexedDB for the score binary.
- The first PDF can be a valid blank one-page placeholder and will later be
  replaced by the supplied score without changing the creation flow.

Out of scope: sharing the example across devices, bundling attachments into
`.stagistic`, changing the generic import flow, a template gallery, or writing
the final dramatic text now.

## Decision

The checked-in template is a `.stagistic` file, not a database seed and not a
custom JSON document. It is the authorable source of the script body. Its
companion PDF is a checked-in static asset. Both are imported from a module that
Home loads with `import()` only after the user clicks the action.

The `.stagistic` parser already assigns fresh IDs to every parsed script block
and `musicStart` atom. Repeated creation therefore cannot collide with a prior
script. Persistent character IDs do not belong in `.stagistic`; they are
allocated while bootstrapping the newly created user script and then linked into
the newly parsed document.

The current generic import flow is deliberately not extended. The example is
similar to an import only in the narrow sense that it parses a `.stagistic`
source. Its asset loading, character confirmation, music normalization, score
attachment, rollback, and Home UX are private to this flow.

## Template assets

Place the assets and their small loader beside the Home route:

```text
packages/app-routes/src/routes/home/example-script/
  example-script.stagistic
  example-score.pdf
  loadExampleScriptTemplate.ts
  prepareExampleScriptDocument.ts
  createExampleScript.ts
```

`example-script.stagistic` contains only normal Stagistic syntax and frontmatter.
It is the single source for acts, scenes, dialogue, lyrics, stage directions,
and music markers. The final copy can be edited by a writer without touching
database-shaped data.

`example-score.pdf` must be a syntactically valid PDF, even while it is a blank
placeholder: the integrated-score exporter uses a PDF parser and cannot consume
a zero-byte file.

`loadExampleScriptTemplate.ts` owns two static imports:

```ts
import source from './example-script.stagistic?raw';
import scoreUrl from './example-score.pdf?url';
```

Since this module itself is loaded dynamically from Home, the raw source stays
out of the initial application JavaScript. Vite emits the PDF as an asset and it
is fetched only when the loader converts `scoreUrl` to a `Blob` after the click.

## Document preparation

The Stagistic syntax deliberately does not serialize every editor-only value:
`@@music` produces a fresh ID and `kind: null`, and `@NAME` character tags
produce `characterId: null`. `prepareExampleScriptDocument` completes those
template-specific values after parsing but before any persistence:

1. Mark the only template music start as `kind: 'song'`. This avoids extending
   the public `.stagistic` syntax for an editor-only field. The template has
   exactly one score-bearing song, so its stable selector is its sole music
   start, not an ID or title.
2. Read all character keys from character cues and stage-direction tags using
   `collectScriptCharacterStats(document, new Set())`. This produces the roster
   without duplicating it in a second asset.
3. Validate the fixed template contract: two acts; at least two scenes under
   each act; at least two character keys; at least one confirmed-targetable
   stage-direction tag; one `song`; lyrics; and no orphan music out.

The validation is both a regression guard for future copy edits and a clear
failure rather than a partially created script if someone damages the source
file.

## Creation flow

`createExampleScript` is an app-routes use-case with dependencies injected for
testability. It receives `createScript` and `deleteScript` from the normal
scripts store plus the current `ScriptRepository`.

```text
Home click
  -> import('./example-script/createExampleScript')
  -> load raw .stagistic + fetch PDF Blob
  -> parse and prepare a new document (fresh block/music IDs)
  -> scriptsStore.createScript(title, document)
  -> confirm one persistent character for every discovered key
  -> link those IDs into character cues and stage-direction tags
  -> repository.saveLatest(linkedDocument)
       -> normal document projection and script_music reconciliation
  -> repository.setMusicAttachment(songId, integrated_score, score Blob)
  -> repository.saveTitlePage(parsed frontmatter settings)
  -> navigate to the normal editor route
```

`saveLatest` is intentional after character linking: it makes the normal
projection writer persist the final character refs and derives `script_music`
from the fresh `musicStart` atom. The score is attached to the song's freshly
parsed `musicId`, found with `buildScriptBlockIndex`, never by a hard-coded
template identifier.

The script is first created through the scripts store so the Home list's
reactive collection receives the new normal script. The remaining operations
use the repository's existing local persistence APIs.

## Failure handling

The action is disabled while it is running. Any loader, parser, validation,
database, or IndexedDB error yields one error toast and no navigation.

After a script ID exists, `createExampleScript` compensates failures in reverse
order:

1. If the score was attached, call `removeMusicAttachment` for its
   `integrated_score` role. This removes metadata and the IndexedDB blob.
2. Delete the newly created script through the normal scripts store. This also
   covers a title-page persistence failure after score attachment.

The original error remains the reported failure. Cleanup failures are logged
only; they must not conceal it. Existing attachment cleanup handles the case in
which blob saving succeeds but its SQL transaction fails.

## Persistence and compatibility

- No schema migration is needed: `script_characters`, `script_music`,
  `script_attachments`, and `script_music_attachments` already model the
  required state.
- No `ScriptDocument` shape changes are made; do not bump
  `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
- PGlite stores only attachment metadata. The PDF binary is stored through the
  existing `IndexedDbFileStorage`.
- `.stagistic` remains attachment-free and portable. The bundled PDF is a
  product asset used only at creation time, not an export/import capability.

## Testing

- Unit tests parse the checked-in source and assert the structural contract,
  `song` normalization, fresh parse IDs, and a non-empty valid PDF blob.
- Use-case tests use a repository double to prove confirmed character linking,
  music attachment to the generated `musicId`, and rollback in failures.
- The Home browser test covers enabled action, pending disabled state, success
  navigation, and failure toast/no navigation.
- Run the canonical typecheck, lint, and focused app-routes tests. Run
  `graphify update .` after implementation.
