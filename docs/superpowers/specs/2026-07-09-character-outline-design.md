# Character outline in the Characters sidebar

Date: 2026-07-09
Status: Approved (design), pending implementation plan

## Summary

Rework the expanded confirmed-character row in the editor Characters sidebar:

1. Remove the gender picker from the sidebar entirely (the `gender_key` DB field
   stays; gender will be edited elsewhere in a future Attribution settings surface).
2. Add an auto-growing **outline** field (a short character description) in the
   expanded row, persisted to a new `script_characters.outline` column.

Export rendering of the outline is explicitly **out of scope** for this change —
we only store it now.

## Motivation

The confirmed-character row currently exposes gender change + delete. Gender editing
moves out of the sidebar. The outline is a short, export-facing character description
the playwright fills in inline while working, without opening a separate panel.

## Non-goals

- Wiring the outline into the export output (later, separate change).
- Any gender editing UI (removed here; DB column and lower-layer plumbing retained).
- Reusing `notes` / `backstory` — those stay free for future Attribution settings.

## UI

File: `packages/ui/src/editor-panels/characterRowConfirmed/CharacterRowDetails.tsx`
(plus the row contracts/types, `EditorSidebar.tsx` wiring, and
`EditorSidebar.module.css`).

- **Remove** the `CharacterGenderPopover` render and all gender props/state feeding
  the row from the sidebar. The delete button (footer-right) stays.
- **Add** an outline `<textarea>` in the expanded area:
  - Starts at a single line (`rows=1`), auto-grows to a max of **2 line-heights**,
    then scrolls (`overflow-y: auto`). Auto-resize via a small measure-on-input
    effect capped at 2 lines.
  - **Placeholder only**, text `Outline` (English). No visible label.
  - Value bound to the character's `outline`.
  - Save: debounced while typing **and** flush on blur → `onSetCharacterOutline(characterId, value)`.

New data/handlers threaded `ScriptCharactersSidebar → EditorSidebar → row`:
the `outline` string value + `onSetCharacterOutline` callback.

Gender picker files that become unreferenced by the sidebar
(`CharacterGenderPopover.tsx`, gender picker state/util hooks) are removed as part
of the cleanup so the sidebar carries no dead gender UI. The gender **action/state**
in the app layer (`handleSetCharacterGender`, `handleUpsertCharacterGender`) and all
DB/repository gender methods are retained untouched for future reuse.

## Data layer (`packages/db`)

- `schema.ts`: add `outline: text('outline')` to the `scriptCharacters` table.
- Migration: **hand-write** a new migration file with
  `ALTER TABLE "script_characters" ADD COLUMN "outline" text;`
  then run `pnpm --filter @stagistic/db db:compile-migrations`
  (project uses hand-written migrations; `drizzle-kit generate` has drifted).
- `types/characters.ts`: add `outline: string | null` to `ScriptCharacterRef`.
- `queries/scripts/characters/read.ts`: select `outline`.
- `queries/scripts/characters/mappers.ts`: map `outline`.
- `queries/scripts/characters/write.ts`: include `outline` in `upsertScriptCharacter`
  (default `null`); add `updateScriptCharacterOutline` mirroring
  `updateScriptCharacterNotes`.
- `queries/scripts/payloads.ts`: add `UpdateScriptCharacterOutlinePayload`.
- `queries/scripts/duplicate.ts`: copy `outline` alongside `notes`/`backstory`.

## Repository

- `scriptRepository.ts`:
  - `ScriptCharactersRepository`: add
    `setOutline(scriptId, characterId, outline: string | null): Promise<ScriptCharacterRef | null>`.
  - Flat `ScriptRepository`: add
    `setScriptCharacterOutline(scriptId, characterId, outline): Promise<ScriptCharacterRef | null>`.
- New handler `setScriptCharacterOutline` mirrors `setScriptCharacterColor`
  (load current → update → touch script → record outbox → return fresh row) **but
  additionally calls `syncToFs` after the write**. Rationale: character writes today
  rely on a later content autosave to flush PGlite to the FS; the outline textarea
  does not touch editor content, so without an explicit flush the value would vanish
  on refresh (the known PGlite `syncToFs` bug). This requires threading `syncDb` into
  the character handlers for the outline mutation.
- Wire into `createLocalPgliteRepository`: `characters.setOutline` + the flat
  `setScriptCharacterOutline` method.

## App-routes (`packages/app-routes`)

- New action hook `useSetCharacterOutline` mirroring `useSetCharacterColor`, including
  an optimistic update of `confirmedCharacterRecords`.
- `useCharacterActions` / `CharacterActions`: add `handleSetCharacterOutline`.
- `useCharacterComputed`: surface `outline` onto the confirmed-character model so the
  row can render it.
- Plumb `onSetCharacterOutline` (and the outline value on each confirmed character)
  through `ScriptCharactersSidebar` into `EditorSidebar`.

## Persistence & sync

- Outline writes flush via `syncToFs` (see Repository) so they survive refresh
  independent of editor-content autosave.
- Optimistic UI update on save keeps the field responsive; the repository call
  reconciles with the returned row.

## Testing

- DB: extend character query/write tests to cover reading and updating `outline`
  (round-trip through `upsertScriptCharacter` / `updateScriptCharacterOutline`), and
  that `duplicate` carries it over.
- Repository: `setScriptCharacterOutline` returns the updated row and flushes.
- App-routes: `useSetCharacterOutline` applies optimistic update and calls the repo.
- UI (browser test where sensible): expanded row shows the textarea, typing +
  blur invokes `onSetCharacterOutline`, and the gender picker is absent.

## Rollout / ordering

Data layer → repository → app-routes → UI, so each layer compiles against the one
below it. Migration compiled before running app.
