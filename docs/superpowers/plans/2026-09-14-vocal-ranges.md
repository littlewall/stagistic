# Vocal Ranges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-character vocal range (voice type + low/high pitch) editable in the Attribute Manager, and a new "Vocal Ranges" export initial page that draws each character's range on a musical staff.

**Architecture:** Pure pitch/staff/clef math lives in a new `@stagistic/script/pitch` submodule shared by the widget and the PDF. Notation is drawn as vector primitives (lines + ellipses) plus a tiny shared glyph-path model for the two clefs and two accidentals — no music font. Character metadata gains three nullable columns; the export gains a `vocal-ranges` initial-page plan variant rendered through a new non-text page-item.

**Tech Stack:** TypeScript, drizzle-orm (PGlite for tests), React + react-aria-components (`@stagistic/ui`), jsPDF (`@stagistic/export`), `vite-plus/test` (`vp test`) and `*.browser.test.tsx` (`test:browser`).

**Spec:** `docs/superpowers/specs/2026-09-14-vocal-ranges-design.md`

## Global Constraints

- **Never commit or push.** (AGENTS.md L5.) The "Commit" steps below mean: stage nothing automatically — instead stop, present the change and a commit message, and let the user commit. Treat each "Commit" step as a review checkpoint.
- **Pitch storage is SPN strings** (`C`–`B`, optional `#`/`b`, octave number, e.g. `F#3`, `Bb2`, `C4`). No MIDI in storage.
- **No music font.** Clefs/accidentals are shared vector path constants; staff/noteheads/ledger/connector are `line`/`ellipse` primitives.
- **Two clefs only:** `treble`, `treble-8vb`.
- **Vocal range is for characters only,** never groups.
- **Migrations are hand-written** (drizzle-kit generate is drifted). Add a new `.sql` file and register it in `migrations.compiled.ts`.
- **Canonical checks:** `eslint` + `stylelint`, `tsc -b`, `vp test`, `test:browser` (NOT `vp lint`/`vp fmt`). The editor has pre-existing browser-test reds; only regressions you introduce matter.
- `SCRIPT_DOCUMENT_SCHEMA_VERSION` does **not** change.

---

## File Structure

**New files:**
- `packages/script/src/pitch/types.ts` — `Pitch`, `Clef`.
- `packages/script/src/pitch/pitch.ts` — `parsePitch`, `formatPitch`, `pitchToMidi`.
- `packages/script/src/pitch/staff.ts` — `pickClef`, `staffPosition`, `ledgerPositions`.
- `packages/script/src/pitch/glyphs.ts` — glyph-path command model + clef/accidental path constants + `pathToSvgD`.
- `packages/script/src/pitch/index.ts` — re-exports.
- `packages/script/src/pitch/*.test.ts` — unit tests.
- `packages/ui/src/vocal-range/VocalRangeStaff.tsx` — shared read/interactive SVG staff.
- `packages/ui/src/vocal-range/VoiceTypeField.tsx` — voice-type combobox.
- `packages/ui/src/vocal-range/VocalRangeSection.tsx` — compact section combining both, used in the character detail.
- `packages/ui/src/vocal-range/voiceTypes.ts` — fixed English suggestion list.
- `packages/ui/src/vocal-range/*.browser.test.tsx` — widget tests.
- `packages/db/drizzle/00NN_add_character_vocal_range.sql` — migration.
- `packages/export/src/initialPages/buildVocalRangesPages.ts` — page builder producing staff-row items.
- `packages/export/src/initialPages/buildVocalRangesPages.test.ts`.

**Modified files:**
- `packages/db/src/schema.ts` — 3 columns.
- `packages/db/src/migrations.compiled.ts` — register migration.
- `packages/db/src/types/characters.ts` — extend `ScriptCharacterRef`.
- `packages/db/src/queries/scripts/characters/{read,write,mappers}.ts` — select/persist/map fields.
- `packages/db/src/queries/scripts/payloads.ts` — new payload types.
- `packages/db/src/queries/scripts/duplicate.ts` — carry fields on duplicate.
- `packages/db/src/scriptRepository.ts` — repo setters + interface.
- `packages/app-core/src/characters/scriptCharactersStore.ts` — field commands + store methods.
- `packages/app-core/src/characters/useScriptCharacterCatalog.ts` — expose methods.
- `packages/app-routes/src/routes/script/editor/characters/{useCharacterActions.ts,useScriptEditorCharacters.types.ts}` — handlers.
- `packages/app-routes/src/routes/script/{ScriptCharactersContext.tsx,useScriptCharactersContextValue.ts}` — thread handlers.
- `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx` — pass handlers.
- `packages/ui/src/dialogs/AttributeManagerCharacterDetail.tsx` + `AttributeManagerCharactersPanel.tsx` — render section, thread props.
- `packages/ui/src/index.ts` (or barrel) — export new components.
- `packages/export/src/config.ts` — `VocalRangesValue`, defaults.
- `packages/export/src/settings/merge.ts` (export config merge) — merge new block.
- `packages/export/src/plan.ts` — `VocalRangesInitialPagePlan`.
- `packages/export/src/visualLine.ts` — `StaffRowItem` page-item variant.
- `packages/export/src/initialPages/{buildInitialPagePages.ts,composeLeadingPages.ts}` — handle the new plan/item.
- `packages/export/src/deriveBasicExportPlan.ts` — build the plan entry.
- `packages/export/src/pdf/drawPdf.ts` — draw staff rows.
- `packages/app-routes/src/routes/script/export/collectInitialPageData.ts` + `useExportScriptData.ts` — collect vocal-range entries.
- `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.tsx` — toggle row.

---

## Task 1: Pitch parse/format/midi

**Files:**
- Create: `packages/script/src/pitch/types.ts`, `packages/script/src/pitch/pitch.ts`, `packages/script/src/pitch/index.ts`
- Test: `packages/script/src/pitch/pitch.test.ts`

**Interfaces:**
- Produces: `Pitch`, `Clef`, `parsePitch(spn: string): Pitch | null`, `formatPitch(p: Pitch): string`, `pitchToMidi(p: Pitch): number`.

- [ ] **Step 1: Write `types.ts`**

```ts
export interface Pitch {
    step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
    alter: -1 | 0 | 1,
    octave: number,
}

export type Clef = 'treble' | 'treble-8vb';
```

- [ ] **Step 2: Write the failing test** in `pitch.test.ts`

```ts
import {describe, expect, it} from 'vite-plus/test';

import {formatPitch, parsePitch, pitchToMidi} from './pitch';

describe('parsePitch', () => {
    it('parses a natural note', () => {
        expect(parsePitch('C4')).toEqual({step: 'C', alter: 0, octave: 4});
    });
    it('parses a sharp', () => {
        expect(parsePitch('F#3')).toEqual({step: 'F', alter: 1, octave: 3});
    });
    it('parses a flat', () => {
        expect(parsePitch('Bb2')).toEqual({step: 'B', alter: -1, octave: 2});
    });
    it('rejects malformed input', () => {
        expect(parsePitch('H4')).toBeNull();
        expect(parsePitch('C')).toBeNull();
        expect(parsePitch('')).toBeNull();
    });
});

describe('formatPitch', () => {
    it('round-trips', () => {
        for (const spn of ['C4', 'F#3', 'Bb2', 'A5']) {
            expect(formatPitch(parsePitch(spn)!)).toBe(spn);
        }
    });
});

describe('pitchToMidi', () => {
    it('places middle C at 60', () => {
        expect(pitchToMidi({step: 'C', alter: 0, octave: 4})).toBe(60);
    });
    it('orders low below high', () => {
        expect(pitchToMidi(parsePitch('F#3')!)).toBeLessThan(pitchToMidi(parsePitch('Bb4')!));
    });
    it('treats enharmonics as equal semitone', () => {
        expect(pitchToMidi(parsePitch('A#3')!)).toBe(pitchToMidi(parsePitch('Bb3')!));
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test -- pitch/pitch.test.ts`
Expected: FAIL (module not found / functions undefined).

- [ ] **Step 4: Write `pitch.ts`**

```ts
import type {Pitch} from './types';

const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const SEMITONE_BY_STEP: Record<Pitch['step'], number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};
const PITCH_PATTERN = /^([A-G])([#b]?)(-?\d+)$/u;

export const parsePitch = (spn: string): Pitch | null => {
    const match = PITCH_PATTERN.exec(spn.trim());

    if (!match) {
        return null;
    }

    const [, step, accidental, octave] = match;
    const alter = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;

    return {
        step: step as Pitch['step'],
        alter,
        octave: Number.parseInt(octave, 10),
    };
};

export const formatPitch = (pitch: Pitch): string => {
    const accidental = pitch.alter === 1 ? '#' : pitch.alter === -1 ? 'b' : '';

    return `${pitch.step}${accidental}${pitch.octave}`;
};

export const pitchToMidi = (pitch: Pitch): number => (pitch.octave + 1) * 12
    + SEMITONE_BY_STEP[pitch.step]
    + pitch.alter;
```

- [ ] **Step 5: Write `index.ts`**

```ts
export * from './types';
export * from './pitch';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test -- pitch/pitch.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit** (checkpoint — present diff + message `feat(pitch): add SPN pitch parse/format/midi`)

---

## Task 2: Clef selection + staff geometry

**Files:**
- Create: `packages/script/src/pitch/staff.ts`
- Modify: `packages/script/src/pitch/index.ts`
- Test: `packages/script/src/pitch/staff.test.ts`

**Interfaces:**
- Consumes: `Pitch`, `Clef`, `pitchToMidi` (Task 1).
- Produces: `pickClef(low: Pitch, high: Pitch): Clef`, `staffPosition(p: Pitch, clef: Clef): number` (half staff-spaces from the bottom line; bottom line = 0, top line = 8), `ledgerPositions(position: number): number[]` (even positions of ledger lines the notehead needs).

- [ ] **Step 1: Write the failing test** in `staff.test.ts`

```ts
import {describe, expect, it} from 'vite-plus/test';

import {parsePitch} from './pitch';
import {ledgerPositions, pickClef, staffPosition} from './staff';

const p = (spn: string) => parsePitch(spn)!;

describe('pickClef', () => {
    it('uses treble for a high-centred (soprano) range', () => {
        expect(pickClef(p('C4'), p('C6'))).toBe('treble');
    });
    it('uses treble-8vb for a low-centred (tenor/baritone) range', () => {
        expect(pickClef(p('C3'), p('G4'))).toBe('treble-8vb');
    });
});

describe('staffPosition (treble)', () => {
    it('places E4 on the bottom line', () => {
        expect(staffPosition(p('E4'), 'treble')).toBe(0);
    });
    it('places F5 on the top line', () => {
        expect(staffPosition(p('F5'), 'treble')).toBe(8);
    });
    it('places middle C4 two positions below the staff', () => {
        expect(staffPosition(p('C4'), 'treble')).toBe(-2);
    });
    it('ignores accidental for vertical placement', () => {
        expect(staffPosition(p('F#4'), 'treble')).toBe(staffPosition(p('F4'), 'treble'));
    });
});

describe('staffPosition (treble-8vb) notates one octave higher than it sounds', () => {
    it('places E3 on the bottom line', () => {
        expect(staffPosition(p('E3'), 'treble-8vb')).toBe(0);
    });
});

describe('ledgerPositions', () => {
    it('is empty inside the staff', () => {
        expect(ledgerPositions(4)).toEqual([]);
    });
    it('draws below-staff ledgers down to the note', () => {
        expect(ledgerPositions(-2)).toEqual([-2]);
        expect(ledgerPositions(-4)).toEqual([-2, -4]);
    });
    it('draws above-staff ledgers up to the note', () => {
        expect(ledgerPositions(10)).toEqual([10]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test -- pitch/staff.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `staff.ts`**

```ts
import {pitchToMidi} from './pitch';
import type {Clef, Pitch} from './types';

const DIATONIC_INDEX: Record<Pitch['step'], number> = {
    C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
};

// Comfortable staff centres, as semitone (MIDI) values.
const CENTRE_MIDI: Record<Clef, number> = {
    treble: 71, // B4
    'treble-8vb': 59, // B3
};

// Diatonic ladder value: 7 steps per octave, monotonic with pitch height.
const diatonicLadder = (pitch: Pitch): number => pitch.octave * 7 + DIATONIC_INDEX[pitch.step];

export const pickClef = (low: Pitch, high: Pitch): Clef => {
    const mid = (pitchToMidi(low) + pitchToMidi(high)) / 2;

    return Math.abs(mid - CENTRE_MIDI.treble) <= Math.abs(mid - CENTRE_MIDI['treble-8vb'])
        ? 'treble'
        : 'treble-8vb';
};

export const staffPosition = (pitch: Pitch, clef: Clef): number => {
    // Bottom line reference: E4 for treble, E3 for treble-8vb (notated an octave up).
    const referenceOctave = clef === 'treble' ? 4 : 3;
    const reference = referenceOctave * 7 + DIATONIC_INDEX.E;

    return diatonicLadder(pitch) - reference;
};

export const ledgerPositions = (position: number): number[] => {
    const result: number[] = [];

    for (let ledger = -2; ledger >= position; ledger -= 2) {
        result.push(ledger);
    }

    for (let ledger = 10; ledger <= position; ledger += 2) {
        result.push(ledger);
    }

    return result;
};
```

- [ ] **Step 4: Add `export * from './staff';` to `index.ts`.**

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test -- pitch/staff.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit** (checkpoint — `feat(pitch): add clef selection and staff geometry`)

---

## Task 3: Shared glyph paths (clefs + accidentals)

**Files:**
- Create: `packages/script/src/pitch/glyphs.ts`
- Modify: `packages/script/src/pitch/index.ts`
- Test: `packages/script/src/pitch/glyphs.test.ts`

**Interfaces:**
- Produces:
  - `type GlyphCommand = {c: 'M' | 'L', x: number, y: number} | {c: 'C', x1: number, y1: number, x2: number, y2: number, x: number, y: number}`
  - `type Glyph = {commands: GlyphCommand[], viewBox: {width: number, height: number}}`
  - `CLEF_GLYPHS: Record<Clef, Glyph>`, `ACCIDENTAL_GLYPHS: Record<'sharp' | 'flat', Glyph>`
  - `pathToSvgD(commands: GlyphCommand[]): string` — for SVG `d` in the browser.
- Consumes: `Clef` (Task 1). Used by the widget (Task 8, SVG) and the PDF (Task 13, replayed on `jsPDF` context2d).

Rationale: leading pages are drawn on the `jsPDF` doc, so PDF glyphs are replayed via `doc.context2d` (moveTo/lineTo/bezierCurveTo/fill), not `pdf-lib` `drawSvgPath`. The command list is renderer-neutral: the browser turns it into an SVG `d` string, the PDF replays it on context2d. Same data, two renderers — no music font.

- [ ] **Step 1: Write the failing test** in `glyphs.test.ts`

```ts
import {describe, expect, it} from 'vite-plus/test';

import {ACCIDENTAL_GLYPHS, CLEF_GLYPHS, pathToSvgD} from './glyphs';

describe('glyphs', () => {
    it('exposes both clefs and both accidentals with non-empty commands', () => {
        expect(CLEF_GLYPHS.treble.commands.length).toBeGreaterThan(0);
        expect(CLEF_GLYPHS['treble-8vb'].commands.length).toBeGreaterThan(0);
        expect(ACCIDENTAL_GLYPHS.sharp.commands.length).toBeGreaterThan(0);
        expect(ACCIDENTAL_GLYPHS.flat.commands.length).toBeGreaterThan(0);
    });
    it('treble-8vb is the treble glyph plus extra "8" commands', () => {
        expect(CLEF_GLYPHS['treble-8vb'].commands.length)
            .toBeGreaterThan(CLEF_GLYPHS.treble.commands.length);
    });
    it('renders an SVG path string starting with a moveto', () => {
        const d = pathToSvgD(CLEF_GLYPHS.treble.commands);

        expect(d.startsWith('M')).toBe(true);
        expect(d).toContain('C');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test -- pitch/glyphs.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `glyphs.ts`** — a renderer-neutral path model plus concrete glyph data. Use compact vector outlines normalised to the `viewBox` (widths in the same "half staff-space" unit used by callers, which scale them at draw time). The treble outline can be a simplified single-stroke spiral-and-hook approximation; `treble-8vb` reuses `treble` plus digit-8 commands offset below. Keep the data hand-authored and self-contained.

```ts
import type {Clef} from './types';

export type GlyphCommand =
    | {c: 'M', x: number, y: number}
    | {c: 'L', x: number, y: number}
    | {c: 'C', x1: number, y1: number, x2: number, y2: number, x: number, y: number};

export interface Glyph {
    commands: GlyphCommand[],
    viewBox: {width: number, height: number},
}

export const pathToSvgD = (commands: GlyphCommand[]): string => commands
    .map(command => {
        if (command.c === 'M') {
            return `M${command.x} ${command.y}`;
        }

        if (command.c === 'L') {
            return `L${command.x} ${command.y}`;
        }

        return `C${command.x1} ${command.y1} ${command.x2} ${command.y2} ${command.x} ${command.y}`;
    })
    .join(' ');

// NOTE: coordinates are authored in a local viewBox; callers scale/translate.
// Replace the placeholder command arrays below with the finalised outlines.
const TREBLE_COMMANDS: GlyphCommand[] = [
    // ...hand-authored G-clef outline (M/L/C commands)...
];
const OTTAVA_EIGHT_COMMANDS: GlyphCommand[] = [
    // ...digit "8" outline positioned below the clef...
];

export const CLEF_GLYPHS: Record<Clef, Glyph> = {
    treble: {commands: TREBLE_COMMANDS, viewBox: {width: 20, height: 56}},
    'treble-8vb': {
        commands: [...TREBLE_COMMANDS, ...OTTAVA_EIGHT_COMMANDS],
        viewBox: {width: 20, height: 68},
    },
};

export const ACCIDENTAL_GLYPHS: Record<'sharp' | 'flat', Glyph> = {
    sharp: {commands: [/* ... */], viewBox: {width: 8, height: 20}},
    flat: {commands: [/* ... */], viewBox: {width: 8, height: 20}},
};
```

> Implementation note for the executor: the `commands` arrays must be filled with real outline data before the test's `length > 0` assertions pass. Author them by tracing a public-domain glyph (e.g. from an open SMuFL SVG) into `M/L/C` commands, or approximate with beziers. This is deliberately hand-authored data, not a placeholder to skip — the tests fail until the arrays are non-empty and `treble-8vb` has more commands than `treble`.

- [ ] **Step 4: Add `export * from './glyphs';` to `index.ts`.**

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test -- pitch/glyphs.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit** (checkpoint — `feat(pitch): add shared clef/accidental glyph paths`)

---

## Task 4: Database schema + migration + types

**Files:**
- Modify: `packages/db/src/schema.ts:140-162`, `packages/db/src/types/characters.ts`, `packages/db/src/queries/scripts/characters/mappers.ts`, `packages/db/src/queries/scripts/characters/read.ts:29-37`
- Create: `packages/db/drizzle/00NN_add_character_vocal_range.sql` (use the next free number after the highest existing file)
- Modify: `packages/db/src/migrations.compiled.ts`
- Test: `packages/db/src/queries/scripts/characters/characters.test.ts`

**Interfaces:**
- Produces: `ScriptCharacterRef` extended with `voiceType: string | null`, `vocalRangeLow: string | null`, `vocalRangeHigh: string | null`.

- [ ] **Step 1: Add columns to `scriptCharacters` in `schema.ts`** (after `outline: text('outline'),`):

```ts
        voiceType: text('voice_type'),
        vocalRangeLow: text('vocal_range_low'),
        vocalRangeHigh: text('vocal_range_high'),
```

- [ ] **Step 2: Write the migration** `packages/db/drizzle/00NN_add_character_vocal_range.sql`:

```sql
ALTER TABLE "script_characters" ADD COLUMN "voice_type" text;
ALTER TABLE "script_characters" ADD COLUMN "vocal_range_low" text;
ALTER TABLE "script_characters" ADD COLUMN "vocal_range_high" text;
```

- [ ] **Step 3: Register the migration** in `migrations.compiled.ts` following the existing entry format (inline the SQL string in sequence with the other compiled migrations). Match the surrounding entries exactly (tag/hash/sql fields as used there).

- [ ] **Step 4: Extend types** in `types/characters.ts` — add to `ScriptCharacterRef`:

```ts
    voiceType: string | null,
    vocalRangeLow: string | null,
    vocalRangeHigh: string | null,
```

- [ ] **Step 5: Extend `mappers.ts`** — add the three fields to `ScriptCharacterRow` and to the object returned by `mapCharacterRow` (mirroring `outline`).

- [ ] **Step 6: Extend `read.ts` `characterSelectFields`** — add:

```ts
    voiceType: scriptCharacters.voiceType,
    vocalRangeLow: scriptCharacters.vocalRangeLow,
    vocalRangeHigh: scriptCharacters.vocalRangeHigh,
```

- [ ] **Step 7: Write the failing test** in `characters.test.ts` (add a case; adapt to the file's existing setup/helpers):

```ts
it('persists and reads back vocal range fields', async () => {
    // ...existing harness to create a script + character...
    await repository.setScriptCharacterVoiceType(scriptId, characterId, 'tenor');
    await repository.setScriptCharacterVocalRange(scriptId, characterId, 'C3', 'A4');

    const character = await repository.getScriptCharacterById(scriptId, characterId);

    expect(character?.voiceType).toBe('tenor');
    expect(character?.vocalRangeLow).toBe('C3');
    expect(character?.vocalRangeHigh).toBe('A4');
});
```

> This test also depends on Task 5 (repo setters). Land Task 5's write functions before running it, or write the assertion against a direct `upsertScriptCharacter` in this task and move the setter assertions to Task 5. Choose based on execution order; keep the round-trip covered exactly once.

- [ ] **Step 8: Run the db test suite**

Run: `pnpm --filter @stagistic/db test -- characters.test.ts`
Expected: the mapping/read portion PASSES (setter portion after Task 5).

- [ ] **Step 9: Commit** (checkpoint — `feat(db): add character vocal range columns`)

---

## Task 5: Repository + store plumbing for vocal range

**Files:**
- Modify: `packages/db/src/queries/scripts/payloads.ts:160-166`, `packages/db/src/queries/scripts/characters/write.ts`, `packages/db/src/queries/scripts/duplicate.ts:236-240`, `packages/db/src/scriptRepository.ts:251`
- Modify: `packages/app-core/src/characters/scriptCharactersStore.ts:42-70,268-272`, `packages/app-core/src/characters/useScriptCharacterCatalog.ts:109-197`
- Test: `packages/db/src/queries/scripts/characters/characters.test.ts` (setter round-trip from Task 4)

**Interfaces:**
- Consumes: `ScriptCharacterRef` (Task 4).
- Produces on `ScriptRepository`:
  - `setScriptCharacterVoiceType(scriptId, characterId, voiceType: string | null): Promise<ScriptCharacterRef | null>`
  - `setScriptCharacterVocalRange(scriptId, characterId, low: string | null, high: string | null): Promise<ScriptCharacterRef | null>`
- Produces on the store/catalog: `setCharacterVoiceType(id, value)`, `setCharacterVocalRange(id, low, high)`.

- [ ] **Step 1: Add payload types** in `payloads.ts` (after `UpdateScriptCharacterOutlinePayload`):

```ts
export interface UpdateScriptCharacterVoiceTypePayload {
    scriptId: string,
    characterId: string,
    voiceType: string | null,
    updatedAt: number,
}

export interface UpdateScriptCharacterVocalRangePayload {
    scriptId: string,
    characterId: string,
    vocalRangeLow: string | null,
    vocalRangeHigh: string | null,
    updatedAt: number,
}
```

- [ ] **Step 2: Add write functions** in `write.ts` (mirror `updateScriptCharacterOutline`):

```ts
export const updateScriptCharacterVoiceType = async (
    db: DbClient,
    payload: UpdateScriptCharacterVoiceTypePayload,
) => {
    await db
        .update(scriptCharacters)
        .set({voiceType: payload.voiceType, updatedAt: payload.updatedAt})
        .where(and(
            eq(scriptCharacters.scriptId, payload.scriptId),
            eq(scriptCharacters.id, payload.characterId),
            eq(scriptCharacters.kind, 'character'),
        ));
};

export const updateScriptCharacterVocalRange = async (
    db: DbClient,
    payload: UpdateScriptCharacterVocalRangePayload,
) => {
    await db
        .update(scriptCharacters)
        .set({
            vocalRangeLow: payload.vocalRangeLow,
            vocalRangeHigh: payload.vocalRangeHigh,
            updatedAt: payload.updatedAt,
        })
        .where(and(
            eq(scriptCharacters.scriptId, payload.scriptId),
            eq(scriptCharacters.id, payload.characterId),
            eq(scriptCharacters.kind, 'character'),
        ));
};
```

Also import the two new payload types at the top of `write.ts`.

- [ ] **Step 3: Extend `upsertScriptCharacter`** in `write.ts` — add `voiceType`, `vocalRangeLow`, `vocalRangeHigh` (all `?? null`) to both the `.values({...})` and `.onConflictDoUpdate({set: {...}})` blocks, and add them to `UpsertScriptCharacterPayload` in `payloads.ts`.

- [ ] **Step 4: Carry fields on duplicate** in `duplicate.ts:236-240` (after `outline`):

```ts
                voiceType: entity.kind === 'character' ? entity.voiceType : null,
                vocalRangeLow: entity.kind === 'character' ? entity.vocalRangeLow : null,
                vocalRangeHigh: entity.kind === 'character' ? entity.vocalRangeHigh : null,
```

- [ ] **Step 5: Add repository interface + impl** — declare the two setters in the `ScriptRepository` interface (`scriptRepository.ts:251`, next to `setScriptCharacterOutline`) and implement them in the concrete repository following the `setScriptCharacterOutline` implementation (call the new write function, then re-read via `getScriptCharacterById` and return the ref; match the existing method's flush/`syncToFs` behaviour so local PGlite writes persist across refresh).

- [ ] **Step 6: Store field commands** in `scriptCharactersStore.ts` `update.fieldCommands` (after `outline`):

```ts
                    voiceType: () => repository.setScriptCharacterVoiceType(
                        scriptId, original.id, modified.voiceType,
                    ),
                    vocalRangeLow: () => repository.setScriptCharacterVocalRange(
                        scriptId, original.id, modified.vocalRangeLow, modified.vocalRangeHigh,
                    ),
                    vocalRangeHigh: () => repository.setScriptCharacterVocalRange(
                        scriptId, original.id, modified.vocalRangeLow, modified.vocalRangeHigh,
                    ),
```

Ensure `voiceType`, `vocalRangeLow`, `vocalRangeHigh` are part of the `CharacterField` union / domain character value the collection stores (add them wherever `outline` is listed in this file).

- [ ] **Step 7: Store public methods** in `scriptCharactersStore.ts` return object (after `setCharacterOutline`):

```ts
        setCharacterVoiceType: (id: string, value: string | null) => updateField(id, 'voiceType', value),
        setCharacterVocalRange: (id: string, low: string | null, high: string | null) =>
            updateFields(id, {vocalRangeLow: low, vocalRangeHigh: high}),
```

If a multi-field `updateFields(id, patch)` helper does not already exist next to `updateField`, add one that applies the patch to the collection record in a single mutation (so both range columns persist from one edit). If only `updateField` exists, call it twice (`vocalRangeLow` then `vocalRangeHigh`) — both field commands invoke the same combined repository setter, which is idempotent.

- [ ] **Step 8: Expose from catalog** in `useScriptCharacterCatalog.ts` — add `setCharacterVoiceType` and `setCharacterVocalRange` memoised wrappers (mirror `setCharacterOutline`) and include them in the returned object.

- [ ] **Step 9: Run the db round-trip test from Task 4**

Run: `pnpm --filter @stagistic/db test -- characters.test.ts`
Expected: PASS (including the setter round-trip).

- [ ] **Step 10: Commit** (checkpoint — `feat(db): wire vocal range through repository and store`)

---

## Task 6: Voice-type suggestion list + combobox

**Files:**
- Create: `packages/ui/src/vocal-range/voiceTypes.ts`, `packages/ui/src/vocal-range/VoiceTypeField.tsx`
- Test: `packages/ui/src/vocal-range/VoiceTypeField.browser.test.tsx`

**Interfaces:**
- Produces: `VOICE_TYPE_SUGGESTIONS: string[]`, and
  `VoiceTypeField({value, onChange}: {value: string | null, onChange: (value: string | null) => void})`.

- [ ] **Step 1: Write `voiceTypes.ts`**

```ts
export const VOICE_TYPE_SUGGESTIONS = [
    'soprano',
    'mezzo-soprano',
    'alto',
    'contralto',
    'countertenor',
    'tenor',
    'light baritone',
    'baritone',
    'bass-baritone',
    'bass',
] as const;
```

- [ ] **Step 2: Write the failing browser test** `VoiceTypeField.browser.test.tsx`

```tsx
import {render, screen} from 'vite-plus/test/react';
import {expect, it, vi} from 'vite-plus/test';
import userEvent from '@testing-library/user-event';

import {VoiceTypeField} from './VoiceTypeField';

it('accepts free text and calls onChange', async () => {
    const onChange = vi.fn();

    render(<VoiceTypeField value={null} onChange={onChange} />);
    await userEvent.type(screen.getByRole('combobox'), 'light baritone');
    await userEvent.tab();

    expect(onChange).toHaveBeenLastCalledWith('light baritone');
});

it('clears to null on empty', async () => {
    const onChange = vi.fn();

    render(<VoiceTypeField value="tenor" onChange={onChange} />);
    await userEvent.clear(screen.getByRole('combobox'));
    await userEvent.tab();

    expect(onChange).toHaveBeenLastCalledWith(null);
});
```

> Adjust imports/harness (`vite-plus/test/react`, user-event) to match this repo's existing `*.browser.test.tsx` conventions — copy the import style from a neighbouring dialog test.

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @stagistic/ui test:browser -- VoiceTypeField`
Expected: FAIL.

- [ ] **Step 4: Implement `VoiceTypeField.tsx`** using the existing react-aria-components ComboBox pattern in `ui` (allow custom values / `allowsCustomValue`), listing `VOICE_TYPE_SUGGESTIONS`. On blur/commit: trimmed empty → `onChange(null)`, else `onChange(trimmed)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @stagistic/ui test:browser -- VoiceTypeField`
Expected: PASS.

- [ ] **Step 6: Commit** (checkpoint — `feat(ui): add voice type field`)

---

## Task 7: VocalRangeStaff — read-only rendering

**Files:**
- Create: `packages/ui/src/vocal-range/VocalRangeStaff.tsx`, `packages/ui/src/vocal-range/vocalRangeStaff.module.css`
- Test: `packages/ui/src/vocal-range/VocalRangeStaff.browser.test.tsx`

**Interfaces:**
- Consumes: `@stagistic/script` — `parsePitch`, `pickClef`, `staffPosition`, `ledgerPositions`, `CLEF_GLYPHS`, `ACCIDENTAL_GLYPHS`, `pathToSvgD`, `formatPitch`, type `Pitch`.
- Produces:
  `VocalRangeStaff({low, high, interactive?, onChange}: {low: Pitch | null, high: Pitch | null, interactive?: boolean, onChange?: (which: 'low' | 'high', pitch: Pitch) => void})` — renders 5 staff lines, clef (from `pickClef` when both notes exist, else a default `treble`), whole-note heads at `staffPosition`, ledger lines from `ledgerPositions`, accidentals left of heads, and the thin connecting line between the two heads.

- [ ] **Step 1: Write the failing browser test** — assert structural output for a known range:

```tsx
import {render} from 'vite-plus/test/react';
import {expect, it} from 'vite-plus/test';

import {parsePitch} from '@stagistic/script';

import {VocalRangeStaff} from './VocalRangeStaff';

it('renders two noteheads and five staff lines for a set range', () => {
    const {container} = render(
        <VocalRangeStaff low={parsePitch('C3')} high={parsePitch('A4')} />,
    );

    expect(container.querySelectorAll('[data-staff-line]').length).toBe(5);
    expect(container.querySelectorAll('[data-notehead]').length).toBe(2);
});

it('renders an accidental glyph for a sharp note', () => {
    const {container} = render(
        <VocalRangeStaff low={parsePitch('F#3')} high={parsePitch('A4')} />,
    );

    expect(container.querySelectorAll('[data-accidental]').length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/ui test:browser -- VocalRangeStaff`
Expected: FAIL.

- [ ] **Step 3: Implement `VocalRangeStaff.tsx`** — an `<svg>` with:
  - A fixed staff-space unit (e.g. `SPACE = 6px`); staff lines at positions 0,2,4,6,8 mapped to `y = baseY - position * (SPACE / 2)`.
  - Clef via `<path d={pathToSvgD(CLEF_GLYPHS[clef].commands)} data-clef>` scaled to staff height.
  - For each present note: notehead as `<ellipse data-notehead>` (open/whole), ledger lines `<line data-staff-line-ledger>` from `ledgerPositions`, accidental `<path data-accidental>` when `alter !== 0`.
  - Connector `<line>` from low head to high head.
  - Mark the 5 main lines with `data-staff-line`.
  - When `!low || !high`, still render the empty staff + default clef.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/ui test:browser -- VocalRangeStaff`
Expected: PASS.

- [ ] **Step 5: Commit** (checkpoint — `feat(ui): render vocal range staff`)

---

## Task 8: VocalRangeStaff — interactive editing

**Files:**
- Modify: `packages/ui/src/vocal-range/VocalRangeStaff.tsx`
- Test: `packages/ui/src/vocal-range/VocalRangeStaff.interactive.browser.test.tsx`

**Interfaces:**
- Consumes/Produces: extends Task 7's component; `interactive` enables click-to-place and per-note controls, calling `onChange('low' | 'high', pitch)`.

- [ ] **Step 1: Write the failing browser test**

```tsx
import {render, screen} from 'vite-plus/test/react';
import {expect, it, vi} from 'vite-plus/test';
import userEvent from '@testing-library/user-event';

import {parsePitch} from '@stagistic/script';

import {VocalRangeStaff} from './VocalRangeStaff';

it('raises the low note an octave via the octave-up control', async () => {
    const onChange = vi.fn();

    render(
        <VocalRangeStaff
            interactive
            low={parsePitch('C3')}
            high={parsePitch('A4')}
            onChange={onChange}
        />,
    );
    await userEvent.click(screen.getByRole('button', {name: /low octave up/iu}));

    expect(onChange).toHaveBeenCalledWith('low', parsePitch('C4'));
});

it('toggles a sharp on the low note', async () => {
    const onChange = vi.fn();

    render(
        <VocalRangeStaff
            interactive
            low={parsePitch('C3')}
            high={parsePitch('A4')}
            onChange={onChange}
        />,
    );
    await userEvent.click(screen.getByRole('button', {name: /low sharp/iu}));

    expect(onChange).toHaveBeenCalledWith('low', parsePitch('C#3'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/ui test:browser -- VocalRangeStaff.interactive`
Expected: FAIL.

- [ ] **Step 3: Implement interactivity** — when `interactive`:
  - Clicking on the staff area for a note snaps to the nearest line/space (invert the `staffPosition` mapping back to a `Pitch` using the current clef; keep the note's `alter`).
  - Per-note `♯` / `♭` toggle buttons (aria-labels `low sharp`, `low flat`, `high sharp`, `high flat`) cycling `alter` in {−1,0,1}.
  - Per-note `▲` / `▼` octave buttons (aria-labels `low octave up`, etc.) adjusting `octave`.
  - A clamp to the widget bounds (`C2`–`C6`).
  - Add an inverse helper `positionToPitch(position, clef, alter): Pitch` next to the existing math usage (may live in `@stagistic/script/pitch/staff.ts` with its own unit test if cleaner — if added there, extend Task 2's exports and tests).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/ui test:browser -- VocalRangeStaff.interactive`
Expected: PASS.

- [ ] **Step 5: Commit** (checkpoint — `feat(ui): interactive vocal range editing`)

---

## Task 9: VocalRangeSection + wire into character detail

**Files:**
- Create: `packages/ui/src/vocal-range/VocalRangeSection.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerCharacterDetail.tsx`, `packages/ui/src/dialogs/AttributeManagerCharactersPanel.tsx`, `packages/ui/src/dialogs/AttributeManagerCharactersPanel.module.css` (compact layout), the `ui` barrel export
- Modify (app-routes plumbing): `useCharacterActions.ts`, `useScriptEditorCharacters.types.ts`, `ScriptCharactersContext.tsx`, `useScriptCharactersContextValue.ts`, `ScriptAttributeManagerModal.tsx`
- Test: `packages/ui/src/dialogs/AttributeManagerCharacterDetail.browser.test.tsx` (or the panel's existing test)

**Interfaces:**
- Consumes: `VoiceTypeField` (Task 6), `VocalRangeStaff` (Tasks 7–8), catalog methods (Task 5).
- Produces: `AttributeManagerCharacter` gains `voiceType`, `vocalRangeLow`, `vocalRangeHigh`; detail props gain `onSetCharacterVoiceType(id, value)` and `onSetCharacterVocalRange(id, low, high)`.

- [ ] **Step 1: Write `VocalRangeSection.tsx`** — a compact block: label "Vocal range", `VoiceTypeField` on the first row, `VocalRangeStaff interactive` below, and a "Clear" affordance that calls `onSetCharacterVocalRange(id, null, null)`. It converts SPN strings ↔ `Pitch` via `parsePitch`/`formatPitch`. Keep it visually tight (dense, inline controls) per the compactness constraint.

Props: `{character: {id, voiceType, vocalRangeLow, vocalRangeHigh}, onSetCharacterVoiceType, onSetCharacterVocalRange}`.

- [ ] **Step 2: Extend `AttributeManagerCharacter`** (in `AttributeManagerCharactersPanel.tsx`) with `voiceType: string | null`, `vocalRangeLow: string | null`, `vocalRangeHigh: string | null`, and thread the two new callbacks through the panel to the detail (mirror `onSetCharacterOutline`).

- [ ] **Step 3: Render the section** in `AttributeManagerCharacterDetail.tsx` under the Outline `<section>`:

```tsx
<VocalRangeSection
    character={{
        id: character.id,
        voiceType: character.voiceType,
        vocalRangeLow: character.vocalRangeLow,
        vocalRangeHigh: character.vocalRangeHigh,
    }}
    onSetCharacterVoiceType={onSetCharacterVoiceType}
    onSetCharacterVocalRange={onSetCharacterVocalRange}
/>
```

Add the two props to `AttributeManagerCharacterDetailProps`.

- [ ] **Step 4: Thread through app-routes** — add `handleSetCharacterVoiceType`/`handleSetCharacterVocalRange` in `useCharacterActions.ts` (mirror `handleSetCharacterOutline`, calling `catalog.setCharacterVoiceType` / `catalog.setCharacterVocalRange`), declare them in `useScriptEditorCharacters.types.ts` and `ScriptCharactersContext.tsx`, return them from `useScriptCharactersContextValue.ts`, and pass them in `ScriptAttributeManagerModal.tsx` (next to `onSetCharacterOutline={characters.handleSetCharacterOutline}`). Also ensure the characters mapped into `AttributeManagerCharacter` include the three new fields from the catalog ref.

- [ ] **Step 5: Write/extend the failing browser test** — assert the section renders and editing voice type calls the handler:

```tsx
it('edits voice type from the character detail', async () => {
    const onSetCharacterVoiceType = vi.fn();
    // ...render AttributeManagerCharacterDetail with a character + handlers...
    await userEvent.type(screen.getByRole('combobox', {name: /voice type/iu}), 'tenor');
    await userEvent.tab();

    expect(onSetCharacterVoiceType).toHaveBeenLastCalledWith(character.id, 'tenor');
});
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @stagistic/ui test:browser -- AttributeManagerCharacterDetail`
Expected: PASS.

- [ ] **Step 7: Commit** (checkpoint — `feat(ui): vocal range section in character detail`)

---

## Task 10: Export config value + defaults + merge

**Files:**
- Modify: `packages/export/src/config.ts`
- Modify: export config merge (`packages/export/src/config.ts` merge helper or `merge.ts` — locate the function that deep-merges persisted config into `BASIC_DEFAULTS`)
- Test: `packages/export/src/config.test.ts`

**Interfaces:**
- Produces: `VocalRangesValue = {enabled: boolean}`; `InitialPagesValue.vocalRanges: VocalRangesValue`; defaults `enabled: true`.

- [ ] **Step 1: Write the failing test** in `config.test.ts`

```ts
it('defaults vocal ranges on', () => {
    expect(BASIC_DEFAULTS.initialPages.vocalRanges).toEqual({enabled: true});
});

it('merges a persisted vocal ranges toggle', () => {
    const merged = mergeBasicConfig({
        initialPages: {vocalRanges: {enabled: false}},
    });

    expect(merged.initialPages.vocalRanges.enabled).toBe(false);
    // untouched siblings keep defaults
    expect(merged.initialPages.contents.enabled).toBe(true);
});
```

> Use the actual merge entry point this repo exposes; copy its name from a neighbouring config test.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/export test -- config.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add types + defaults** in `config.ts`:

```ts
export interface VocalRangesValue {
    enabled: boolean,
}
```

Add `vocalRanges: VocalRangesValue` to `InitialPagesValue`; add `vocalRanges: {enabled: true}` to `BASIC_DEFAULTS.initialPages`; add `vocalRanges: {...BASIC_DEFAULTS.initialPages.vocalRanges}` to `INTEGRATED_SCORE_DEFAULTS.initialPages`. Ensure the merge helper deep-merges the new block (add it wherever `contents` is handled).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/export test -- config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** (checkpoint — `feat(export): add vocal ranges config toggle`)

---

## Task 11: Vocal ranges plan type + data collection

**Files:**
- Modify: `packages/export/src/plan.ts`
- Modify: `packages/app-routes/src/routes/script/export/collectInitialPageData.ts`, `packages/app-routes/src/routes/script/export/useExportScriptData.ts`
- Modify: `packages/app-routes/src/routes/script/export/collectInitialPageData.test.ts`

**Interfaces:**
- Consumes: `ExportCatalogEntity` (extend the `character` variant with `voiceType`, `vocalRangeLow`, `vocalRangeHigh`), `parsePitch`.
- Produces: `VocalRangesInitialPagePlan` (per the spec) and `collectVocalRanges(...)` returning `Array<{id, displayName, voiceType, low, high}>`, ordered by `characterOrder`, containing only characters whose low+high both `parsePitch`.

- [ ] **Step 1: Add the plan type** in `plan.ts`:

```ts
export interface VocalRangesInitialPagePlan {
    kind: 'vocal-ranges',
    entries: Array<{
        id: string,
        displayName: string,
        voiceType: string | null,
        low: string,
        high: string,
    }>,
}
```

Add `| VocalRangesInitialPagePlan` to the `InitialPagePlan` union.

- [ ] **Step 2: Write the failing test** in `collectInitialPageData.test.ts`

```ts
it('collects only characters with a complete, valid range', () => {
    const entities: ExportCatalogEntity[] = [
        {id: 'a', kind: 'character', key: 'KYLIE', voiceType: 'soprano', vocalRangeLow: 'A3', vocalRangeHigh: 'C6'},
        {id: 'b', kind: 'character', key: 'NOLOW', voiceType: 'tenor', vocalRangeLow: null, vocalRangeHigh: 'C5'},
        {id: 'c', kind: 'character', key: 'BADPITCH', voiceType: null, vocalRangeLow: 'H3', vocalRangeHigh: 'C5'},
    ];

    const result = collectVocalRanges(snapshot, entities, 'name');

    expect(result.map(entry => entry.id)).toEqual(['a']);
    expect(result[0]).toMatchObject({displayName: 'Kylie', voiceType: 'soprano', low: 'A3', high: 'C6'});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @stagistic/app-routes test -- collectInitialPageData`
Expected: FAIL.

- [ ] **Step 4: Extend `ExportCatalogEntity`** `character` variant with `voiceType`, `vocalRangeLow`, `vocalRangeHigh`, and implement `collectVocalRanges(snapshot, entities, characterOrder)` in `collectInitialPageData.ts`: filter to characters where both `parsePitch(low)` and `parsePitch(high)` succeed, map to entries (`displayName` via `toDisplayName`), order by name or first-appearance (reuse the `firstOrder*` maps already built for `collectCharacters`). Export it alongside `collectInitialPageData` (or fold into its return object).

- [ ] **Step 5: Populate the fields** where `ExportCatalogEntity` values are built in `useExportScriptData.ts` (from the character catalog refs).

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @stagistic/app-routes test -- collectInitialPageData`
Expected: PASS.

- [ ] **Step 7: Commit** (checkpoint — `feat(export): collect vocal range entries`)

---

## Task 12: Build vocal-ranges pages (staff-row item)

**Files:**
- Modify: `packages/export/src/visualLine.ts`
- Create: `packages/export/src/initialPages/buildVocalRangesPages.ts`, `packages/export/src/initialPages/buildVocalRangesPages.test.ts`
- Modify: `packages/export/src/initialPages/buildInitialPagePages.ts`, `packages/export/src/initialPages/composeLeadingPages.ts` (type widening), `packages/export/src/deriveBasicExportPlan.ts`

**Interfaces:**
- Produces on `visualLine.ts`:

```ts
export interface StaffRowItem {
    type: 'staff-row',
    y: number,
    label: {text: string, x: number, fontSizePx: number},
    staff: {
        xPx: number,
        widthPx: number,
        clef: 'treble' | 'treble-8vb',
        notes: Array<{position: number, alter: -1 | 0 | 1, xFraction: number}>,
    },
}
```

  `PageItem` becomes `VisualLine | StaffRowItem | {type: '__page_break__'}`. `VisualPage` (in `buildCharactersAndPlacesPages.ts`) widens to `Array<VisualLine | StaffRowItem>`.
- Consumes: `VocalRangesInitialPagePlan` (Task 11), `pickClef`, `parsePitch`, `staffPosition` (Tasks 1–2), `EditorSettings`.

- [ ] **Step 1: Add `StaffRowItem`** to `visualLine.ts` and widen `PageItem` and the `VisualPage` alias. Fix resulting type errors in `composeLeadingPages.ts` (it maps pages through; the roman footer still only appends `VisualLine`s — that stays valid).

- [ ] **Step 2: Write the failing test** `buildVocalRangesPages.test.ts`

```ts
import {describe, expect, it} from 'vite-plus/test';

import type {VocalRangesInitialPagePlan} from '../plan';
import {buildVocalRangesPages} from './buildVocalRangesPages';
import {makeSettings} from '../testUtils'; // reuse existing helper

const plan: VocalRangesInitialPagePlan = {
    kind: 'vocal-ranges',
    entries: [
        {id: 'a', displayName: 'Kylie', voiceType: 'soprano', low: 'A3', high: 'C6'},
        {id: 'b', displayName: 'Whit', voiceType: null, low: 'C3', high: 'A4'},
    ],
};

describe('buildVocalRangesPages', () => {
    it('emits one staff row per entry', () => {
        const pages = buildVocalRangesPages(plan, makeSettings());
        const rows = pages.flat().filter(item => 'type' in item && item.type === 'staff-row');

        expect(rows.length).toBe(2);
    });
    it('shows the voice type parenthesis only when present', () => {
        const [kylie, whit] = buildVocalRangesPages(plan, makeSettings())
            .flat()
            .filter((item): item is Extract<typeof item, {type: 'staff-row'}> =>
                'type' in item && item.type === 'staff-row');

        expect(kylie.label.text).toBe('KYLIE (soprano)');
        expect(whit.label.text).toBe('WHIT');
    });
    it('picks treble-8vb for a low range and treble for a high one', () => {
        const rows = buildVocalRangesPages(plan, makeSettings())
            .flat()
            .filter((item): item is Extract<typeof item, {type: 'staff-row'}> =>
                'type' in item && item.type === 'staff-row');

        expect(rows[0].staff.clef).toBe('treble');
        expect(rows[1].staff.clef).toBe('treble-8vb');
    });
});
```

> Match `makeSettings`/test helpers to whatever `testUtils.ts` and the sibling `buildCharactersAndPlacesPages.test.ts` actually export.

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @stagistic/export test -- buildVocalRangesPages`
Expected: FAIL.

- [ ] **Step 4: Implement `buildVocalRangesPages.ts`** — a page-titled layout ("Vocal Ranges" heading centred, matching the reference) then one `StaffRowItem` per entry:
  - Label text: `DISPLAYNAME` uppercased, plus ` (voiceType)` only when `voiceType` is non-empty.
  - `clef = pickClef(parsePitch(low)!, parsePitch(high)!)`.
  - `notes`: low then high, each `{position: staffPosition(pitch, clef), alter: pitch.alter, xFraction}` where low sits left (`xFraction ≈ 0.15`) and high right (`xFraction ≈ 0.75`).
  - Paginate rows by available content height (reuse the geometry approach from `buildCharactersAndPlacesPages.ts`; emit further pages when the cursor overflows).

- [ ] **Step 5: Register the builder** in `buildInitialPagePages.ts` `BUILDERS`:

```ts
    'vocal-ranges': (plan, settings) => plan.kind === 'vocal-ranges'
        ? buildVocalRangesPages(plan, settings)
        : [],
```

- [ ] **Step 6: Emit the plan** in `deriveBasicExportPlan.ts` — when `config.initialPages.vocalRanges.enabled` and the collected entries are non-empty, push a `{kind: 'vocal-ranges', entries}` plan into `leadingPages.initialPages` (in the same order the other initial pages are appended). When entries are empty, push nothing (self-suppression).

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @stagistic/export test -- buildVocalRangesPages`
Expected: PASS. Also run `pnpm --filter @stagistic/export test` to catch type/`VisualPage`-widening regressions.

- [ ] **Step 8: Commit** (checkpoint — `feat(export): build vocal ranges pages`)

---

## Task 13: Draw staff rows in the PDF

**Files:**
- Modify: `packages/export/src/pdf/drawPdf.ts`
- Test: `packages/export/src/pdf/drawPdf` coverage via an integration-style assertion (or extend an existing drawPdf/transcribe test that exercises leading-page items)

**Interfaces:**
- Consumes: `StaffRowItem` (Task 12), `CLEF_GLYPHS`, `ACCIDENTAL_GLYPHS` (Task 3), `PX_TO_PT`.

- [ ] **Step 1: Add a `StaffRowItem` guard + branch** in the `transcript.items.forEach` loop of `drawPdf` (`drawPdf.ts:160`):

```ts
    transcript.items.forEach(item => {
        if (isPageBreak(item)) {
            doc.addPage();

            return;
        }

        if ('type' in item && item.type === 'staff-row') {
            drawStaffRow(doc, item, monoFontFamily);

            return;
        }

        drawLine(doc, item, monoFontFamily);
    });
```

- [ ] **Step 2: Implement `drawStaffRow(doc, item, monoFontFamily)`** using `jsPDF` primitives:
  - Label: `doc.text(item.label.text, item.label.x * PX_TO_PT, ...)` in the mono font, matching `drawLine`'s baseline math.
  - Staff: 5 `doc.line(...)` calls at the row's 5 line Y positions across `[xPx, xPx + widthPx]`.
  - Clef: replay `CLEF_GLYPHS[item.staff.clef].commands` on `doc.context2d` (`moveTo`/`lineTo`/`bezierCurveTo` + `fill()`), scaled to staff height and translated to the staff's left edge. Add a small `pathToContext2d(ctx, commands, transform)` helper local to `drawPdf.ts`.
  - Notes: for each note, `doc.ellipse(cx, cy, rx, ry)` (open notehead — set draw style to stroke), ledger `doc.line(...)` for `ledgerPositions(position)`, and accidental via the same context2d replay left of the head when `alter !== 0`.
  - Connector: `doc.line(...)` from the low head to the high head.
  - Convert all px to pt with `PX_TO_PT`; map `position` to Y with the same half-space unit the staff lines use.

- [ ] **Step 3: Write/extend a test** — the cheapest reliable assertion is that `drawPdf` returns a non-empty PDF `Blob` for a transcript containing a `staff-row` item without throwing, plus (if the repo has a text-extraction or snapshot pattern) that the label text is present. If no drawPdf unit test exists, add a minimal smoke test:

```ts
it('draws a staff-row leading page without throwing', async () => {
    const blob = await drawPdf(transcriptWithStaffRow);

    expect(blob.size).toBeGreaterThan(0);
});
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @stagistic/export test`
Expected: PASS.

- [ ] **Step 5: Commit** (checkpoint — `feat(export): draw vocal range staves in PDF`)

---

## Task 14: Settings toggle UI

**Files:**
- Modify: `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.tsx`
- Test: `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.browser.test.tsx`

**Interfaces:**
- Consumes: `InitialPagesValue.vocalRanges` (Task 10).

- [ ] **Step 1: Write the failing test** — toggling "Vocal ranges" calls `onChange` with `vocalRanges.enabled` flipped:

```tsx
it('toggles vocal ranges', async () => {
    const onChange = vi.fn();
    // ...render InitialPagesModule with value where vocalRanges.enabled = true...
    await userEvent.click(screen.getByRole('switch', {name: /vocal ranges/iu}));

    expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({vocalRanges: {enabled: false}}),
    );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/app-routes test:browser -- InitialPagesModule`
Expected: FAIL.

- [ ] **Step 3: Add the toggle row** in `InitialPagesModule.tsx` (a new `<div className={styles.initialPage}>` block mirroring the Contents block), driving `value.vocalRanges.enabled`:

```tsx
<div className={styles.initialPage}>
    <ExportSettingRow>
        <Switch
            variant="setting"
            isSelected={value.vocalRanges.enabled}
            onChange={enabled => onChange({...value, vocalRanges: {...value.vocalRanges, enabled}})}
        >
            <span className={styles.initialPageTitle}>Vocal ranges</span>
        </Switch>
    </ExportSettingRow>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/app-routes test:browser -- InitialPagesModule`
Expected: PASS.

- [ ] **Step 5: Commit** (checkpoint — `feat(export): vocal ranges settings toggle`)

---

## Task 15: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Typecheck** — Run: `pnpm tsc -b` — Expected: no new errors.
- [ ] **Step 2: Lint** — Run: `pnpm eslint .` and `pnpm stylelint "**/*.css"` (repo canonical form) — Expected: clean for touched files.
- [ ] **Step 3: Unit tests** — Run: `pnpm vp test` — Expected: PASS (no new reds vs baseline).
- [ ] **Step 4: Browser tests** — Run: `pnpm test:browser` — Expected: only the known pre-existing editor reds; nothing new from vocal-range files.
- [ ] **Step 5: Manual visual check (user)** — Build a script with 3–4 characters (soprano high range, tenor/baritone low ranges, one with a sharp, one without a voice type), open the Attribute Manager to set ranges via the widget, then export and confirm the Vocal Ranges page matches the reference layout (clef auto-selection, parenthesis only when a type is set, ledger lines, connector). Confirm the page disappears when no character has a range and the toggle is respected. The user performs the final visual check.
- [ ] **Step 6: Commit any doc/cleanup** (checkpoint).

---

## Self-Review Notes

- **Spec coverage:** data model (T4–5), shared pitch module (T1–3), widget incl. voice-type autocomplete + compact staff (T6–9), config toggle + default-on/self-suppress (T10, T12.6, T14), plan/collection (T11), page build with auto clef + conditional parenthesis + `characterOrder` (T12), vector PDF rendering (T13), tests throughout, verification (T15). Groups excluded (T5.4, T11). SPN storage (T4). Two clefs only (T2). No music font (T3, T13).
- **Deviation from spec mechanism (intentional):** the spec named `pdf-lib` `drawSvgPath`; leading pages are drawn on the `jsPDF` doc (and the non-integrated export returns that doc directly), so glyphs are replayed on `doc.context2d` from the shared command list instead. Same outcome — vector, no font.
- **Type consistency:** `voiceType` / `vocalRangeLow` / `vocalRangeHigh` used verbatim across db, store, catalog, UI, export entity. `setScriptCharacterVoiceType` / `setScriptCharacterVocalRange` (repo), `setCharacterVoiceType` / `setCharacterVocalRange` (store/catalog), `onSetCharacterVoiceType` / `onSetCharacterVocalRange` (UI). `StaffRowItem.type === 'staff-row'`. Plan `kind === 'vocal-ranges'`.
- **Known executor decisions flagged inline:** glyph outline data must be hand-authored (T3); migration number/format to match repo (T4); `updateFields` vs double `updateField` (T5.7); `positionToPitch` location (T8).
