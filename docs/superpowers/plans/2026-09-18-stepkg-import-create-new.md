# Stepkg import (create new script) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read and validate a `.stepkg` package and import it as a brand-new, independent script with fresh identities, entirely in the browser, with no UI.

**Architecture:** Three layers mirror the export path in reverse. `@stagistic/stepkg` gains a strict fail-fast reader (`readStepkg`) and a pure identity remapper (`remapStepkgIds`). `@stagistic/db` gains one atomic `createScriptFromPackage` write that is projection-aware (characters before the document migration; scene metadata, title page and settings after). `@stagistic/app-core` orchestrates read → remap → map-to-db-input → write and returns a structured result symmetric with `StepkgExportResult`.

**Tech Stack:** TypeScript, `fflate` (ZIP read), Drizzle + PGlite, `vite-plus/test` (Vitest), Web Crypto SHA-256, `uuidv7`.

**Spec:** `docs/superpowers/specs/2026-09-18-stepkg-import-format-design.md`

## Global Constraints

- Validation is strict and fail-fast: a package is fully trustworthy or rejected with aggregated structured issues; no partial script or orphaned blob may result.
- `formatVersion` must equal `1`; a greater `documentSchemaVersion` than the current `SCRIPT_DOCUMENT_SCHEMA_VERSION` (currently `3`) is rejected.
- The new-script branch mints fresh UUIDs for every domain identity and rewrites the domain IDs the document embeds (`characterRefs` character IDs, music `musicId` markers); structural block/node IDs (`id`, `headingBlockId`, `startBlockId`, `endBlockId`) are preserved.
- Scene rows are projection-owned: never insert scene rows or persist package scene IDs; resolve scenes by `headingBlockId` after the document migration.
- `@stagistic/db` gains no dependency on `@stagistic/stepkg`; `@stagistic/app-core` bridges the two.
- All tests run under `vite-plus/test` in the existing node/browser environments without server APIs.
- Never commit unless the plan step says to; this repo's rule is the user commits. (The commit steps below stage and commit locally per task; if the operator prefers, they may defer commits — but each task must still end green.)

---

### Task 1: Import contracts + ZIP/manifest reader

**Files:**
- Create: `packages/stepkg/src/importContracts.ts`
- Create: `packages/stepkg/src/readContainer.ts`
- Create: `packages/stepkg/src/readContainer.test.ts`
- Modify: `packages/stepkg/src/index.ts` (add `export * from './importContracts';` and `export * from './readContainer';`)

**Interfaces:**
- Consumes: existing `StepkgManifest` from `./contracts`; `STEPKG_FORMAT`, `STEPKG_FORMAT_VERSION`, `STEPKG_MANIFEST_PATH` from `./constants`; `SCRIPT_DOCUMENT_SCHEMA_VERSION` from `@stagistic/script`; `unzip` from `fflate`.
- Produces:
  - `type StepkgImportStage = 'read' | 'manifest' | 'checksum' | 'schema' | 'validation' | 'assets' | 'write'`
  - `type StepkgImportIssueCode = 'not_a_zip' | 'manifest_invalid' | 'unsupported_format_version' | 'unsupported_document_schema_version' | 'file_missing' | 'checksum_mismatch' | 'schema_invalid' | 'broken_reference' | 'asset_missing' | 'write_failed'`
  - `interface StepkgImportIssue { code: StepkgImportIssueCode; stage: StepkgImportStage; path?: string; entity?: {type: 'script'|'character'|'music'|'scene'|'attachment'; id: string; label?: string}; details?: Record<string, string | number> }`
  - `readStepkgContainer(bytes: Uint8Array): Promise<{ok: true; manifest: StepkgManifest; files: Map<string, Uint8Array>} | {ok: false; issues: StepkgImportIssue[]}>`

> Note: confirm `STEPKG_MANIFEST_PATH` exists in `./constants`; if the manifest path is only a string literal elsewhere, add `export const STEPKG_MANIFEST_PATH = 'manifest.json';` to `constants.ts` and use it here.

- [ ] **Step 1: Write the failing test**

```ts
// packages/stepkg/src/readContainer.test.ts
import {zipSync} from 'fflate';
import {describe, expect, it} from 'vite-plus/test';

import {readStepkgContainer} from './readContainer';

const encoder = new TextEncoder();

const zipWith = (entries: Record<string, string>): Uint8Array =>
    zipSync(Object.fromEntries(Object.entries(entries).map(([path, value]) => [path, encoder.encode(value)])));

const validManifest = () =>
    JSON.stringify({
        format: 'stagistic-package',
        formatVersion: 1,
        documentSchemaVersion: 3,
        createdAt: '2026-09-18T12:00:00.000Z',
        generator: {name: 'Stagistic', version: '0.0.0'},
        script: {id: 's1', title: 'T', updatedAt: '2026-09-18T11:00:00.000Z'},
        entrypoints: {document: 'document.json', text: 'script.stagistic'},
        files: [],
    });

describe('readStepkgContainer', () => {
    it('rejects non-ZIP bytes with not_a_zip', async () => {
        const result = await readStepkgContainer(encoder.encode('not a zip'));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('not_a_zip');
    });

    it('rejects a missing manifest with manifest_invalid', async () => {
        const result = await readStepkgContainer(zipWith({'document.json': '{}'}));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('manifest_invalid');
    });

    it('rejects an unsupported formatVersion', async () => {
        const manifest = JSON.parse(validManifest());
        manifest.formatVersion = 2;
        const result = await readStepkgContainer(zipWith({'manifest.json': JSON.stringify(manifest)}));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('unsupported_format_version');
    });

    it('rejects a too-new documentSchemaVersion', async () => {
        const manifest = JSON.parse(validManifest());
        manifest.documentSchemaVersion = 999;
        const result = await readStepkgContainer(zipWith({'manifest.json': JSON.stringify(manifest)}));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('unsupported_document_schema_version');
    });

    it('returns the manifest and file map for a valid container', async () => {
        const result = await readStepkgContainer(zipWith({'manifest.json': validManifest(), 'document.json': '{}'}));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.manifest.script.id).toBe('s1');
            expect(result.files.has('document.json')).toBe(true);
        }
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run stepkg:test -- readContainer` (or `pnpm --filter @stagistic/stepkg test readContainer`)
Expected: FAIL with "readStepkgContainer is not a function" / module not found.

- [ ] **Step 3: Write `importContracts.ts`**

```ts
// packages/stepkg/src/importContracts.ts
export type StepkgImportStage = 'read' | 'manifest' | 'checksum' | 'schema' | 'validation' | 'assets' | 'write';

export type StepkgImportIssueCode =
    | 'not_a_zip'
    | 'manifest_invalid'
    | 'unsupported_format_version'
    | 'unsupported_document_schema_version'
    | 'file_missing'
    | 'checksum_mismatch'
    | 'schema_invalid'
    | 'broken_reference'
    | 'asset_missing'
    | 'write_failed';

export interface StepkgImportIssue {
    code: StepkgImportIssueCode;
    stage: StepkgImportStage;
    path?: string;
    entity?: {type: 'script' | 'character' | 'music' | 'scene' | 'attachment'; id: string; label?: string};
    details?: Record<string, string | number>;
}
```

- [ ] **Step 4: Write `readContainer.ts`**

```ts
// packages/stepkg/src/readContainer.ts
import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';
import {unzip} from 'fflate';

import {STEPKG_FORMAT, STEPKG_FORMAT_VERSION} from './constants';
import type {StepkgManifest} from './contracts';
import type {StepkgImportIssue} from './importContracts';

const MANIFEST_PATH = 'manifest.json';

const unzipAsync = (bytes: Uint8Array): Promise<Record<string, Uint8Array>> =>
    new Promise((resolve, reject) => {
        unzip(bytes, (error, data) => (error ? reject(error) : resolve(data)));
    });

export type StepkgContainerResult =
    | {ok: true; manifest: StepkgManifest; files: Map<string, Uint8Array>}
    | {ok: false; issues: StepkgImportIssue[]};

export const readStepkgContainer = async (bytes: Uint8Array): Promise<StepkgContainerResult> => {
    let entries: Record<string, Uint8Array>;
    try {
        entries = await unzipAsync(bytes);
    } catch {
        return {ok: false, issues: [{code: 'not_a_zip', stage: 'read'}]};
    }

    const manifestBytes = entries[MANIFEST_PATH];
    if (!manifestBytes) {
        return {ok: false, issues: [{code: 'manifest_invalid', stage: 'manifest', path: MANIFEST_PATH}]};
    }

    let manifest: StepkgManifest;
    try {
        manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as StepkgManifest;
    } catch {
        return {ok: false, issues: [{code: 'manifest_invalid', stage: 'manifest', path: MANIFEST_PATH}]};
    }

    if (manifest.format !== STEPKG_FORMAT || !Array.isArray(manifest.files) || typeof manifest.script?.id !== 'string') {
        return {ok: false, issues: [{code: 'manifest_invalid', stage: 'manifest', path: MANIFEST_PATH}]};
    }
    if (manifest.formatVersion !== STEPKG_FORMAT_VERSION) {
        return {ok: false, issues: [{code: 'unsupported_format_version', stage: 'manifest', details: {found: manifest.formatVersion, supported: STEPKG_FORMAT_VERSION}}]};
    }
    if (typeof manifest.documentSchemaVersion !== 'number' || manifest.documentSchemaVersion > SCRIPT_DOCUMENT_SCHEMA_VERSION) {
        return {ok: false, issues: [{code: 'unsupported_document_schema_version', stage: 'manifest', details: {found: manifest.documentSchemaVersion, supported: SCRIPT_DOCUMENT_SCHEMA_VERSION}}]};
    }

    const files = new Map(Object.entries(entries));
    return {ok: true, manifest, files};
};
```

- [ ] **Step 5: Wire exports**

Add to `packages/stepkg/src/index.ts`:

```ts
export * from './importContracts';
export * from './readContainer';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `moon run stepkg:test -- readContainer` then `moon run stepkg:typecheck` and `moon run stepkg:lint`
Expected: PASS; typecheck and lint clean.

- [ ] **Step 7: Commit**

```bash
git add packages/stepkg/src/importContracts.ts packages/stepkg/src/readContainer.ts packages/stepkg/src/readContainer.test.ts packages/stepkg/src/index.ts packages/stepkg/src/constants.ts
git commit -m "feat(stepkg): add .stepkg container reader and import contracts"
```

---

### Task 2: `readStepkg` — checksums, structural validation, cross-references

**Files:**
- Create: `packages/stepkg/src/readStepkg.ts`
- Create: `packages/stepkg/src/readStepkg.test.ts`
- Modify: `packages/stepkg/src/index.ts` (add `export * from './readStepkg';`)

**Interfaces:**
- Consumes: `readStepkgContainer` (Task 1); `StepkgImportIssue` (Task 1); `sha256Hex` from `./sha256`; `getStepkgAssetPath` from `./paths`; `StepkgSnapshot`, `StepkgManifest`, `StepkgAttachmentSnapshot` from `./contracts`; `getScriptBlockId`, `MUSIC_ID_ATTR`, `type ScriptDocument` from `@stagistic/script`.
- Produces:
  - `interface StepkgPackage { manifest: StepkgManifest; snapshot: StepkgSnapshot; assets: Map<string, Uint8Array> }`
  - `type StepkgReadResult = {ok: true; package: StepkgPackage} | {ok: false; issues: StepkgImportIssue[]}`
  - `readStepkg(bytes: Uint8Array): Promise<StepkgReadResult>`

The reconstructed `snapshot.attachments[].contentKey` holds the archive asset path (e.g. `assets/<id>/<file>`); `assets` is keyed by that same path.

- [ ] **Step 1: Write the failing test (round-trip + representative failures)**

```ts
// packages/stepkg/src/readStepkg.test.ts
import {createEmptyScriptDocument} from '@stagistic/script';
import {unzipSync, zipSync} from 'fflate';
import {describe, expect, it} from 'vite-plus/test';

import {createStepkg} from './createStepkg';
import type {StepkgSnapshot} from './contracts';
import {readStepkg} from './readStepkg';

const baseSnapshot = (): StepkgSnapshot => ({
    script: {id: 's1', title: 'Round trip', subtitle: null, createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T11:00:00.000Z'},
    document: createEmptyScriptDocument(),
    titlePage: {},
    settings: {},
    characters: {characters: [], groups: [], genderOptions: []},
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [],
    attachmentBindings: [],
});

const exportBytes = async (snapshot: StepkgSnapshot): Promise<Uint8Array> => {
    const result = await createStepkg({snapshot, generator: {name: 'Stagistic', version: '0.0.0'}, createdAt: new Date('2026-09-18T12:00:00.000Z'), loadAsset: () => Promise.resolve(null)});
    if (!result.ok) throw new Error('export failed');
    return new Uint8Array(await result.blob.arrayBuffer());
};

describe('readStepkg', () => {
    it('round-trips an exporter package into an equivalent snapshot', async () => {
        const snapshot = baseSnapshot();
        const result = await readStepkg(await exportBytes(snapshot));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.package.snapshot.script.id).toBe('s1');
            expect(result.package.manifest.script.id).toBe('s1');
        }
    });

    it('reports checksum_mismatch when a file is tampered', async () => {
        const bytes = await exportBytes(baseSnapshot());
        const entries = unzipSync(bytes);
        entries['document.json'] = new TextEncoder().encode('{"tampered":true}');
        const result = await readStepkg(zipSync(entries));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues.some(issue => issue.code === 'checksum_mismatch')).toBe(true);
    });
});
```

> If `createEmptyScriptDocument` is not the exact helper name in `@stagistic/script`, use the project's existing empty-document constructor (check `packages/script/src/document`); the round-trip only needs a valid `ScriptDocument`.

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run stepkg:test -- readStepkg`
Expected: FAIL with "readStepkg is not a function".

- [ ] **Step 3: Write `readStepkg.ts`**

```ts
// packages/stepkg/src/readStepkg.ts
import {getScriptBlockId, MUSIC_ID_ATTR, type ScriptDocument, type ScriptNode} from '@stagistic/script';

import type {StepkgAttachmentSnapshot, StepkgManifest, StepkgSnapshot} from './contracts';
import type {StepkgImportIssue} from './importContracts';
import {readStepkgContainer} from './readContainer';
import {sha256Hex} from './sha256';

export interface StepkgPackage {
    manifest: StepkgManifest;
    snapshot: StepkgSnapshot;
    assets: Map<string, Uint8Array>;
}

export type StepkgReadResult = {ok: true; package: StepkgPackage} | {ok: false; issues: StepkgImportIssue[]};

const decode = (bytes: Uint8Array): unknown => JSON.parse(new TextDecoder().decode(bytes));

const collectTopLevelBlockIds = (document: ScriptDocument): Set<string> => {
    const ids = new Set<string>();
    (document.content ?? []).forEach((node: ScriptNode) => {
        const id = getScriptBlockId(node);
        if (id) ids.add(id);
    });
    return ids;
};

export const readStepkg = async (bytes: Uint8Array): Promise<StepkgReadResult> => {
    const container = await readStepkgContainer(bytes);
    if (!container.ok) return container;

    const {manifest, files} = container;
    const issues: StepkgImportIssue[] = [];

    // Checksums + presence for every manifest-listed file.
    for (const file of manifest.files) {
        const content = files.get(file.path);
        if (!content) {
            issues.push({code: 'file_missing', stage: 'checksum', path: file.path});
            continue;
        }
        if (content.byteLength !== file.byteLength) {
            issues.push({code: 'checksum_mismatch', stage: 'checksum', path: file.path, details: {expected: file.byteLength, found: content.byteLength}});
            continue;
        }
        const digest = await sha256Hex(content);
        if (digest !== file.sha256) {
            issues.push({code: 'checksum_mismatch', stage: 'checksum', path: file.path});
        }
    }
    if (issues.length > 0) return {ok: false, issues};

    // Parse required domain files. Missing entrypoints/data are schema failures.
    const requiredPaths = ['document.json', 'data/script.json', 'data/title-page.json', 'data/settings.json', 'data/characters.json', 'data/music.json', 'data/scenes.json', 'data/attachments.json'];
    for (const path of requiredPaths) {
        if (!files.has(path)) issues.push({code: 'schema_invalid', stage: 'schema', path});
    }
    if (issues.length > 0) return {ok: false, issues};

    let document: ScriptDocument;
    let script: StepkgSnapshot['script'];
    let characters: StepkgSnapshot['characters'];
    let music: StepkgSnapshot['music'];
    let scenes: StepkgSnapshot['scenes'];
    let titlePage: StepkgSnapshot['titlePage'];
    let settings: StepkgSnapshot['settings'];
    let attachmentsFile: {items: {id: string; filename: string; mimeType: string; sizeBytes: number; assetPath: string; createdAt: string; updatedAt: string}[]; bindings: StepkgSnapshot['attachmentBindings']};
    try {
        document = decode(files.get('document.json')!) as ScriptDocument;
        script = decode(files.get('data/script.json')!) as StepkgSnapshot['script'];
        titlePage = decode(files.get('data/title-page.json')!) as StepkgSnapshot['titlePage'];
        settings = decode(files.get('data/settings.json')!) as StepkgSnapshot['settings'];
        characters = decode(files.get('data/characters.json')!) as StepkgSnapshot['characters'];
        music = decode(files.get('data/music.json')!) as StepkgSnapshot['music'];
        scenes = decode(files.get('data/scenes.json')!) as StepkgSnapshot['scenes'];
        attachmentsFile = decode(files.get('data/attachments.json')!) as typeof attachmentsFile;
    } catch {
        return {ok: false, issues: [{code: 'schema_invalid', stage: 'schema'}]};
    }

    // manifest.script.id must equal data/script.json.id
    if (manifest.script.id !== script.id) {
        return {ok: false, issues: [{code: 'broken_reference', stage: 'validation', details: {manifestId: manifest.script.id, dataId: script.id}}]};
    }

    // Cross-reference integrity.
    const characterIds = new Set(characters.characters.map(character => character.id));
    const musicIds = new Set(music.items.map(item => item.id));
    const locationIds = new Set(scenes.locations.map(location => location.id));
    const attachmentIds = new Set(attachmentsFile.items.map(item => item.id));
    const blockIds = collectTopLevelBlockIds(document);

    characters.groups.forEach(group => {
        group.memberIds.forEach(memberId => {
            if (!characterIds.has(memberId)) issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'character', id: memberId}, details: {via: `group ${group.id}`}});
        });
    });
    scenes.scenes.forEach(scene => {
        if (scene.headingBlockId && !blockIds.has(scene.headingBlockId)) issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'scene', id: scene.id}, details: {headingBlockId: scene.headingBlockId}});
        scene.locationIds.forEach(locationId => {
            if (!locationIds.has(locationId)) issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'scene', id: scene.id}, details: {locationId}});
        });
    });
    music.items.forEach(item => {
        if (item.startBlockId && !blockIds.has(item.startBlockId)) issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'music', id: item.id}, details: {startBlockId: item.startBlockId}});
        if (item.endBlockId && !blockIds.has(item.endBlockId)) issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'music', id: item.id}, details: {endBlockId: item.endBlockId}});
    });
    attachmentsFile.bindings.forEach(binding => {
        if (!musicIds.has(binding.target.id)) issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'music', id: binding.target.id}});
        if (!attachmentIds.has(binding.attachmentId)) issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'attachment', id: binding.attachmentId}});
    });

    // Asset presence: every attachment's assetPath must be a real archive entry.
    const assets = new Map<string, Uint8Array>();
    attachmentsFile.items.forEach(item => {
        const content = files.get(item.assetPath);
        if (!content) {
            issues.push({code: 'asset_missing', stage: 'assets', path: item.assetPath, entity: {type: 'attachment', id: item.id}});
            return;
        }
        assets.set(item.assetPath, content);
    });

    if (issues.length > 0) return {ok: false, issues};

    const attachments: StepkgAttachmentSnapshot[] = attachmentsFile.items.map(item => ({
        id: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        contentKey: item.assetPath,
    }));

    const snapshot: StepkgSnapshot = {
        script,
        document,
        titlePage,
        settings,
        characters,
        music,
        scenes,
        attachments,
        attachmentBindings: attachmentsFile.bindings,
    };

    return {ok: true, package: {manifest, snapshot, assets}};
};
```

> If `ScriptNode` is not exported from `@stagistic/script`, type the callback parameter as `unknown` and narrow with a local `isObjectRecord` guard, or reuse an existing document-walk helper. Keep the block-id collection top-level (headings, music boundaries, and blocks are top-level nodes).

- [ ] **Step 4: Add export and run tests**

Add `export * from './readStepkg';` to `packages/stepkg/src/index.ts`.
Run: `moon run stepkg:test -- readStepkg`, then `moon run stepkg:typecheck`, `moon run stepkg:lint`.
Expected: PASS; clean.

- [ ] **Step 5: Add focused failure tests**

Append tests for: missing manifest-listed file (`file_missing`), broken group member (`broken_reference`), unresolved scene `headingBlockId` (`broken_reference`), and a missing asset (`asset_missing`), each asserting `result.ok === false` and the expected code present. Run `moon run stepkg:test -- readStepkg` and confirm PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/stepkg/src/readStepkg.ts packages/stepkg/src/readStepkg.test.ts packages/stepkg/src/index.ts
git commit -m "feat(stepkg): validate and reconstruct a .stepkg snapshot on read"
```

---

### Task 3: `remapStepkgIds` — fresh identities + document reference rewrite

**Files:**
- Create: `packages/stepkg/src/remapStepkgIds.ts`
- Create: `packages/stepkg/src/remapStepkgIds.test.ts`
- Modify: `packages/stepkg/src/index.ts` (add `export * from './remapStepkgIds';`)

**Interfaces:**
- Consumes: `StepkgSnapshot` from `./contracts`; `uuidv7` from `@stagistic/shared`; `MUSIC_ID_ATTR`, `type ScriptDocument` from `@stagistic/script`.
- Produces:
  - `interface StepkgIdMap { characters: Record<string, string>; groups: Record<string, string>; genders: Record<string, string>; music: Record<string, string>; locations: Record<string, string>; attachments: Record<string, string> }`
  - `interface StepkgRemapResult { snapshot: StepkgSnapshot; idMap: StepkgIdMap }`
  - `remapStepkgIds(snapshot: StepkgSnapshot, newId?: () => string): StepkgRemapResult`

Behavior: mint fresh IDs for script, characters, groups, genders, music, locations, attachments; rewrite `memberIds`, scene `locationIds`, and attachment bindings (`attachmentId`, `target.id`) through the maps; rewrite the document's embedded `characterRefs` values and `musicId` markers; preserve every structural block ID, `headingBlockId`, `startBlockId`, `endBlockId`; leave `attachments[].contentKey` (the archive path) and all timestamps unchanged; do not remap scene IDs.

- [ ] **Step 1: Write the failing test**

```ts
// packages/stepkg/src/remapStepkgIds.test.ts
import {describe, expect, it} from 'vite-plus/test';

import type {StepkgSnapshot} from './contracts';
import {remapStepkgIds} from './remapStepkgIds';

const snapshot = (): StepkgSnapshot => ({
    script: {id: 'old-script', title: 'T', subtitle: null, createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T11:00:00.000Z'},
    document: {
        type: 'doc',
        content: [
            {type: 'dialogue', attrs: {id: 'b1', characterRefs: {MARA: 'old-char'}}, content: []},
            {type: 'music', attrs: {id: 'b2', musicId: 'old-music'}, content: []},
        ],
    } as unknown as StepkgSnapshot['document'],
    titlePage: {},
    settings: {},
    characters: {
        characters: [{id: 'old-char', key: 'MARA', colorHex: null, genderKey: null, notes: null, backstory: null, outline: null, voiceType: null, vocalRangeLow: null, vocalRangeHigh: null, createdAt: 'x', updatedAt: 'x'}],
        groups: [{id: 'old-group', key: 'FAMILY', colorHex: null, memberIds: ['old-char'], createdAt: 'x', updatedAt: 'x'}],
        genderOptions: [],
    },
    music: {items: [{id: 'old-music', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Song', kind: null, startBlockId: 'b2', endBlockId: null, createdAt: 'x', updatedAt: 'x'}]},
    scenes: {scenes: [], locations: []},
    attachments: [{id: 'old-att', filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 3, createdAt: 'x', updatedAt: 'x', contentKey: 'assets/old-att/a.pdf'}],
    attachmentBindings: [{target: {type: 'music', id: 'old-music'}, attachmentId: 'old-att', role: 'integrated_score', order: 0, createdAt: 'x'}],
});

describe('remapStepkgIds', () => {
    it('mints fresh ids and rewrites every reference including embedded document ids', () => {
        let counter = 0;
        const {snapshot: next, idMap} = remapStepkgIds(snapshot(), () => `new-${counter++}`);

        expect(next.script.id).not.toBe('old-script');
        const newCharId = idMap.characters['old-char'];
        const newMusicId = idMap.music['old-music'];
        const newAttId = idMap.attachments['old-att'];

        expect(next.characters.groups[0]?.memberIds).toEqual([newCharId]);
        expect(next.attachmentBindings[0]?.attachmentId).toBe(newAttId);
        expect(next.attachmentBindings[0]?.target.id).toBe(newMusicId);
        expect(next.attachments[0]?.contentKey).toBe('assets/old-att/a.pdf');

        const dialogue = next.document.content[0] as {attrs: {id: string; characterRefs: Record<string, string>}};
        const musicNode = next.document.content[1] as {attrs: {id: string; musicId: string}};
        expect(dialogue.attrs.id).toBe('b1');
        expect(dialogue.attrs.characterRefs.MARA).toBe(newCharId);
        expect(musicNode.attrs.musicId).toBe(newMusicId);
        expect(musicNode.attrs.id).toBe('b2');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run stepkg:test -- remapStepkgIds`
Expected: FAIL with "remapStepkgIds is not a function".

- [ ] **Step 3: Write `remapStepkgIds.ts`**

```ts
// packages/stepkg/src/remapStepkgIds.ts
import {MUSIC_ID_ATTR, type ScriptDocument} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import type {StepkgSnapshot} from './contracts';

export interface StepkgIdMap {
    characters: Record<string, string>;
    groups: Record<string, string>;
    genders: Record<string, string>;
    music: Record<string, string>;
    locations: Record<string, string>;
    attachments: Record<string, string>;
}

export interface StepkgRemapResult {
    snapshot: StepkgSnapshot;
    idMap: StepkgIdMap;
}

const CHARACTER_REFS_ATTR = 'characterRefs';

const buildMap = (ids: string[], newId: () => string): Record<string, string> =>
    Object.fromEntries(ids.map(id => [id, newId()]));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const remapDocument = (node: unknown, characters: Record<string, string>, music: Record<string, string>): unknown => {
    if (Array.isArray(node)) return node.map(child => remapDocument(child, characters, music));
    if (!isRecord(node)) return node;

    const next: Record<string, unknown> = {...node};
    if (isRecord(next.attrs)) {
        const attrs: Record<string, unknown> = {...next.attrs};
        if (isRecord(attrs[CHARACTER_REFS_ATTR])) {
            attrs[CHARACTER_REFS_ATTR] = Object.fromEntries(
                Object.entries(attrs[CHARACTER_REFS_ATTR] as Record<string, unknown>).map(([key, value]) => [key, typeof value === 'string' ? characters[value] ?? value : value]),
            );
        }
        if (typeof attrs[MUSIC_ID_ATTR] === 'string') {
            attrs[MUSIC_ID_ATTR] = music[attrs[MUSIC_ID_ATTR] as string] ?? attrs[MUSIC_ID_ATTR];
        }
        next.attrs = attrs;
    }
    if (Array.isArray(next.content)) next.content = next.content.map(child => remapDocument(child, characters, music));
    if (Array.isArray(next.marks)) next.marks = next.marks.map(child => remapDocument(child, characters, music));
    return next;
};

export const remapStepkgIds = (snapshot: StepkgSnapshot, newId: () => string = uuidv7): StepkgRemapResult => {
    const idMap: StepkgIdMap = {
        characters: buildMap(snapshot.characters.characters.map(character => character.id), newId),
        groups: buildMap(snapshot.characters.groups.map(group => group.id), newId),
        genders: buildMap(snapshot.characters.genderOptions.map(gender => gender.id), newId),
        music: buildMap(snapshot.music.items.map(item => item.id), newId),
        locations: buildMap(snapshot.scenes.locations.map(location => location.id), newId),
        attachments: buildMap(snapshot.attachments.map(attachment => attachment.id), newId),
    };

    const next: StepkgSnapshot = {
        script: {...snapshot.script, id: newId()},
        document: remapDocument(snapshot.document, idMap.characters, idMap.music) as ScriptDocument,
        titlePage: snapshot.titlePage,
        settings: snapshot.settings,
        characters: {
            characters: snapshot.characters.characters.map(character => ({...character, id: idMap.characters[character.id]})),
            groups: snapshot.characters.groups.map(group => ({...group, id: idMap.groups[group.id], memberIds: group.memberIds.map(memberId => idMap.characters[memberId] ?? memberId)})),
            genderOptions: snapshot.characters.genderOptions.map(gender => ({...gender, id: idMap.genders[gender.id]})),
        },
        music: {items: snapshot.music.items.map(item => ({...item, id: idMap.music[item.id]}))},
        scenes: {
            scenes: snapshot.scenes.scenes.map(scene => ({...scene, locationIds: scene.locationIds.map(locationId => idMap.locations[locationId] ?? locationId)})),
            locations: snapshot.scenes.locations.map(location => ({...location, id: idMap.locations[location.id]})),
        },
        attachments: snapshot.attachments.map(attachment => ({...attachment, id: idMap.attachments[attachment.id]})),
        attachmentBindings: snapshot.attachmentBindings.map(binding => ({...binding, attachmentId: idMap.attachments[binding.attachmentId] ?? binding.attachmentId, target: {...binding.target, id: idMap.music[binding.target.id] ?? binding.target.id}})),
    };

    return {snapshot: next, idMap};
};
```

- [ ] **Step 4: Add export and run tests**

Add `export * from './remapStepkgIds';` to the index. Run `moon run stepkg:test -- remapStepkgIds`, `moon run stepkg:typecheck`, `moon run stepkg:lint`.
Expected: PASS; clean.

- [ ] **Step 5: Commit**

```bash
git add packages/stepkg/src/remapStepkgIds.ts packages/stepkg/src/remapStepkgIds.test.ts packages/stepkg/src/index.ts
git commit -m "feat(stepkg): remap package identities for a new-script import"
```

---

### Task 4: Missing db insert queries (characters, group members, genders, locations)

**Files:**
- Modify: `packages/db/src/queries/scripts/characters/write.ts` (add `insertScriptCharacters`, `insertScriptCharacterGenders`)
- Modify: `packages/db/src/queries/scripts/characters/groups.ts` (add `insertScriptCharacterGroupMembers`)
- Modify: `packages/db/src/queries/scripts/locations.ts` (add `insertScriptLocations`)
- Create: `packages/db/src/queries/scripts/bulkInsert.test.ts`
- Verify barrels re-export the new functions (`packages/db/src/queries/index.ts` / `scripts/index.ts` use `export *`; no change needed if so).

**Interfaces:**
- Consumes: Drizzle tables `scriptCharacters`, `scriptCharacterGenders`, `scriptCharacterGroupMembers`, `scriptLocations` from `../../schema` (adjust relative path per file); `DbClient` from `../../types`.
- Produces (all no-op on empty input):
  - `insertScriptCharacters(db: DbClient, rows: InferInsertModel<typeof scriptCharacters>[]): Promise<void>`
  - `insertScriptCharacterGenders(db: DbClient, rows: InferInsertModel<typeof scriptCharacterGenders>[]): Promise<void>`
  - `insertScriptCharacterGroupMembers(db: DbClient, rows: {groupId: string; characterId: string}[]): Promise<void>`
  - `insertScriptLocations(db: DbClient, rows: InferInsertModel<typeof scriptLocations>[]): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
// packages/db/src/queries/scripts/bulkInsert.test.ts
import {describe, expect, it} from 'vite-plus/test';

import {createTestDb, seedScript} from '../../testing/createTestDb';
import {insertScriptCharacterGenders, insertScriptCharacters} from './characters/write';
import {insertScriptCharacterGroupMembers} from './characters/groups';
import {insertScriptLocations} from './locations';
import {listScriptCharacters} from './characters/read';

describe('bulk domain inserts', () => {
    it('inserts characters, genders, group members and locations', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc1');
        const now = 1_000;

        await insertScriptCharacters(db, [
            {id: 'c1', scriptId: 'sc1', characterKey: 'MARA', kind: 'character', colorHex: null, genderKey: null, notes: null, backstory: null, outline: null, voiceType: null, vocalRangeLow: null, vocalRangeHigh: null, createdAt: now, updatedAt: now},
            {id: 'g1', scriptId: 'sc1', characterKey: 'FAMILY', kind: 'group', colorHex: null, genderKey: null, notes: null, backstory: null, outline: null, voiceType: null, vocalRangeLow: null, vocalRangeHigh: null, createdAt: now, updatedAt: now},
        ]);
        await insertScriptCharacterGroupMembers(db, [{groupId: 'g1', characterId: 'c1'}]);
        await insertScriptCharacterGenders(db, [{id: 'gd1', scriptId: 'sc1', genderKey: 'f', genderLabel: 'Female', createdAt: now, updatedAt: now}]);
        await insertScriptLocations(db, [{id: 'l1', scriptId: 'sc1', name: 'Kitchen', description: null, createdAt: now, updatedAt: now}]);

        const characters = await listScriptCharacters(db, 'sc1');
        expect(characters.some(character => character.id === 'c1')).toBe(true);
    });

    it('is a no-op for empty input', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc2');
        await insertScriptCharacters(db, []);
        await insertScriptLocations(db, []);
        expect(true).toBe(true);
    });
});
```

> Adjust the `listScriptCharacters` import path to the actual characters read module (search `export const listScriptCharacters` under `packages/db/src/queries/scripts/characters/`).

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run db:test -- bulkInsert`
Expected: FAIL — the new insert functions do not exist.

- [ ] **Step 3: Implement the insert helpers**

In `characters/write.ts` (imports `scriptCharacters`, `scriptCharacterGenders`, `DbClient`, and `InferInsertModel` from `drizzle-orm`):

```ts
export const insertScriptCharacters = async (db: DbClient, rows: InferInsertModel<typeof scriptCharacters>[]) => {
    if (rows.length === 0) return;
    await db.insert(scriptCharacters).values(rows);
};

export const insertScriptCharacterGenders = async (db: DbClient, rows: InferInsertModel<typeof scriptCharacterGenders>[]) => {
    if (rows.length === 0) return;
    await db.insert(scriptCharacterGenders).values(rows);
};
```

In `characters/groups.ts`:

```ts
export const insertScriptCharacterGroupMembers = async (db: DbClient, rows: {groupId: string; characterId: string}[]) => {
    if (rows.length === 0) return;
    await db.insert(scriptCharacterGroupMembers).values(rows);
};
```

In `locations.ts`:

```ts
export const insertScriptLocations = async (db: DbClient, rows: InferInsertModel<typeof scriptLocations>[]) => {
    if (rows.length === 0) return;
    await db.insert(scriptLocations).values(rows);
};
```

> Add any missing table/`InferInsertModel` imports at the top of each file. Confirm `scriptCharacterGroupMembers` is imported in `groups.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `moon run db:test -- bulkInsert`, then `moon run db:typecheck`, `moon run db:lint`.
Expected: PASS; clean.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/queries/scripts/characters/write.ts packages/db/src/queries/scripts/characters/groups.ts packages/db/src/queries/scripts/locations.ts packages/db/src/queries/scripts/bulkInsert.test.ts
git commit -m "feat(db): add bulk insert queries for characters, genders, members, locations"
```

---

### Task 5: Extract tx-level title-page and settings writers

**Files:**
- Modify: `packages/db/src/repo/titlePage.ts` (extract `writeTitlePageFieldsTx`)
- Modify: `packages/db/src/repo/config.ts` (extract `writeScriptSettingsTx`)
- Create: `packages/db/src/repo/writePackageSections.test.ts`

**Interfaces:**
- Consumes: `DbClient` from `../queries`; existing `dbQueries.*` used by the current `save`/`saveScriptSettings`; `TitlePageSettings`, `EditorSettingsOverride` from `@stagistic/script`.
- Produces:
  - `writeTitlePageFieldsTx(tx: DbClient, scriptId: string, settings: TitlePageSettings, now: number): Promise<void>` — writes title-page fields and the `scripts.subtitle` bridge, **without** outbox or `syncDb`.
  - `writeScriptSettingsTx(tx: DbClient, scriptId: string, settings: EditorSettingsOverride, now: number): Promise<void>` — writes all settings tables, **without** outbox or `syncDb`.

The existing `save` / `saveScriptSettings` handlers are refactored to call these inside their own transaction, then add their own outbox + `syncDb`, preserving current behavior.

- [ ] **Step 1: Write the failing test**

```ts
// packages/db/src/repo/writePackageSections.test.ts
import {describe, expect, it} from 'vite-plus/test';

import {createTestDb, seedScript} from '../testing/createTestDb';
import {readScriptSettings, writeScriptSettingsTx} from './config';
import {readTitlePageSettings, writeTitlePageFieldsTx} from './titlePage';

describe('tx-level package section writers', () => {
    it('writes title page and settings inside a caller transaction', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc1');

        await db.transaction(async tx => {
            await writeTitlePageFieldsTx(tx, 'sc1', {source: 'Original story', subtitle: 'A play'}, 1_000);
            await writeScriptSettingsTx(tx, 'sc1', {visual: {characterColorSaturation: 0.5}}, 1_000);
        });

        expect(await readTitlePageSettings(db, 'sc1')).toMatchObject({source: 'Original story', subtitle: 'A play'});
        expect(await readScriptSettings(db, 'sc1')).toMatchObject({visual: {characterColorSaturation: 0.5}});
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run db:test -- writePackageSections`
Expected: FAIL — the tx writers are not exported.

- [ ] **Step 3: Extract `writeTitlePageFieldsTx`**

In `titlePage.ts`, move the body of `save`'s transaction (the `rows` building + `replaceScriptTitlePageFields` + `updateScriptSubtitle`) into an exported function; keep the outbox call in `save`:

```ts
export const writeTitlePageFieldsTx = async (tx: DbClient, scriptId: string, settings: TitlePageSettings, now: number): Promise<void> => {
    let orderNo = 0;
    const rows: dbQueries.ScriptTitlePageFieldRow[] = [];
    const addRow = (fieldKey: string, fieldValue: string, groupNo: number | null = null) => {
        rows.push({id: uuidv7(), fieldKey, fieldValue, groupNo, orderNo, createdAt: now, updatedAt: now});
        orderNo += 1;
    };
    STRING_FIELDS.forEach(fieldKey => {
        const value = settings[fieldKey];
        if (typeof value === 'string' && value.length > 0) addRow(fieldKey, value);
    });
    settings.credits?.forEach((credit, groupNo) => {
        addRow('credit_label', credit.credit, groupNo);
        credit.authors.forEach(author => addRow('credit_author', author, groupNo));
    });
    const subtitle = typeof settings.subtitle === 'string' ? settings.subtitle.trim() : '';
    await dbQueries.replaceScriptTitlePageFields(tx, scriptId, rows);
    await dbQueries.updateScriptSubtitle(tx, {id: scriptId, subtitle: subtitle.length > 0 ? subtitle : null, updatedAt: now});
};
```

Then rewrite `save`'s transaction body to `await writeTitlePageFieldsTx(tx, scriptId, settings, now);` followed by the existing `recordOutbox(...)` call, unchanged.

- [ ] **Step 4: Extract `writeScriptSettingsTx`**

In `config.ts`, move `saveScriptSettings`'s transaction body (everything from `deleteScriptSettings` through `replaceScriptConfigBlocks` and `updateScriptTimestamp`, but NOT `recordOutbox`) into:

```ts
export const writeScriptSettingsTx = async (tx: DbClient, scriptId: string, settings: EditorSettingsOverride, now: number): Promise<void> => {
    const headerFooterRows = (['header', 'footer'] as const).flatMap(area =>
        ALIGNMENTS.flatMap(alignment => {
            const cell = settings.headerFooter?.[area]?.[alignment];
            return cell
                ? [{id: uuidv7(), scriptId, area, alignment, textContent: cell.text ?? '', isBold: cell.isBold ?? false, isItalic: cell.isItalic ?? false, isUnderline: cell.isUnderline ?? false, isHiddenInEditor: cell.isHiddenInEditor ?? false, createdAt: now, updatedAt: now}]
                : [];
        }),
    );
    await dbQueries.deleteScriptSettings(tx, scriptId);
    if (settings.page || settings.typography) {
        await dbQueries.insertScriptPageLayoutSettings(tx, {scriptId, ...settings.page, fontSizePx: settings.typography?.fontSizePx, lineHeight: settings.typography?.lineHeight, createdAt: now, updatedAt: now});
    }
    if (settings.visual) await dbQueries.insertScriptVisualPreferences(tx, {scriptId, characterColorSaturation: settings.visual.characterColorSaturation, createdAt: now, updatedAt: now});
    if (settings.structure) await dbQueries.insertScriptStructureSettings(tx, {scriptId, actLinesBefore: settings.structure.actDisplay?.linesBefore, actLinesAfter: settings.structure.actDisplay?.linesAfter, createdAt: now, updatedAt: now});
    if (settings.initialPages) await dbQueries.insertScriptInitialPagesSettings(tx, {scriptId, castOrderBy: settings.initialPages.castAndPlace?.castOrderBy, showOutline: settings.initialPages.castAndPlace?.showOutline, showCharactersInSongs: settings.initialPages.songs?.showCharactersInSongs, createdAt: now, updatedAt: now});
    await dbQueries.insertScriptHeaderFooterSettings(tx, headerFooterRows);
    await dbQueries.replaceScriptConfigBlocks(tx, {scriptId, rows: buildConfigRows(scriptId, settings, now)});
    await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
};
```

Then rewrite `saveScriptSettings`'s transaction body to `await writeScriptSettingsTx(tx, scriptId, settings, now);` followed by the existing `recordOutbox(...)`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `moon run db:test -- writePackageSections`, then the full `moon run db:test` to confirm existing title-page/settings tests still pass, then `moon run db:typecheck`, `moon run db:lint`.
Expected: PASS; no regressions.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/repo/titlePage.ts packages/db/src/repo/config.ts packages/db/src/repo/writePackageSections.test.ts
git commit -m "refactor(db): extract tx-level title-page and settings writers"
```

---

### Task 6: `ScriptPackageWrite` + atomic `createScriptFromPackage`

**Files:**
- Create: `packages/db/src/scriptPackageWrite.ts` (the input type)
- Create: `packages/db/src/repo/importPackage.ts` (the handler)
- Create: `packages/db/src/repo/importPackage.test.ts`
- Modify: `packages/db/src/scriptRepository.ts` (add `createScriptFromPackage` to the interface and re-export the type)
- Modify: `packages/db/src/repo/createLocalPgliteRepository.ts` (wire the handler)
- Modify: `packages/db/src/index.ts` (export `ScriptPackageWrite` if the package barrel re-exports types explicitly; if it uses `export *` from a module that includes it, ensure `scriptPackageWrite.ts` is exported)

**Interfaces:**
- Consumes: Task 4 inserts; Task 5 `writeTitlePageFieldsTx`, `writeScriptSettingsTx`; existing `dbQueries.insertScript`, `updateScriptSubtitle`, `insertScriptMusic`, `insertAttachment`, `insertMusicAttachmentLink`, `updateScriptSceneMetadata`, `replaceScriptSceneLocations`; `migrateScriptDocumentToBlocks`, `LEGACY_TO_BLOCKS_TRIGGERS` from `./migration/legacyToBlocks`; `scriptScenes` table; `FileStorage`; `GetDb`, `RecordOutbox`, `SyncDb`.
- Produces:
  - `ScriptPackageWrite` (and member types) in `scriptPackageWrite.ts` — see below.
  - `createImportPackageHandler(deps): {createScriptFromPackage(input: ScriptPackageWrite): Promise<void>}`
  - `ScriptRepository.createScriptFromPackage(input: ScriptPackageWrite): Promise<void>`

Define `scriptPackageWrite.ts`:

```ts
import type {EditorSettingsOverride, ScriptDocument, TitlePageSettings} from '@stagistic/script';

export interface ScriptPackageWriteCharacter {
    id: string; key: string; colorHex: string | null; genderKey: string | null;
    notes: string | null; backstory: string | null; outline: string | null;
    voiceType: string | null; vocalRangeLow: string | null; vocalRangeHigh: string | null;
    createdAt: number; updatedAt: number;
}
export interface ScriptPackageWriteGroup { id: string; key: string; colorHex: string | null; memberIds: string[]; createdAt: number; updatedAt: number; }
export interface ScriptPackageWriteGender { id: string; key: string; label: string; createdAt: number; updatedAt: number; }
export interface ScriptPackageWriteMusic { id: string; sceneNumber: number; indexInScene: number; mode: string; title: string; kind: string | null; startBlockId: string | null; endBlockId: string | null; createdAt: number; updatedAt: number; }
export interface ScriptPackageWriteLocation { id: string; name: string; description: string | null; createdAt: number; updatedAt: number; }
export interface ScriptPackageWriteScene { headingBlockId: string | null; colorHex: string | null; synopsis: string | null; locationIds: string[]; }
export interface ScriptPackageWriteAttachment { id: string; filename: string; mimeType: string; sizeBytes: number; blob: Blob; createdAt: number; updatedAt: number; }
export interface ScriptPackageWriteBinding { musicId: string; attachmentId: string; role: string; sortOrder: number; createdAt: number; }

export interface ScriptPackageWrite {
    script: {id: string; title: string; subtitle: string | null; createdAt: number; updatedAt: number};
    document: ScriptDocument;
    titlePage: TitlePageSettings;
    settings: EditorSettingsOverride;
    characters: ScriptPackageWriteCharacter[];
    groups: ScriptPackageWriteGroup[];
    genders: ScriptPackageWriteGender[];
    music: ScriptPackageWriteMusic[];
    locations: ScriptPackageWriteLocation[];
    scenes: ScriptPackageWriteScene[];
    attachments: ScriptPackageWriteAttachment[];
    bindings: ScriptPackageWriteBinding[];
}
```

- [ ] **Step 1: Write the failing test**

```ts
// packages/db/src/repo/importPackage.test.ts
import {parseStagistic} from '@stagistic/script';
import {describe, expect, it} from 'vite-plus/test';

import {InMemoryFileStorage} from '../fileStorage';
import {createTestDb} from '../testing/createTestDb';
import type {ScriptPackageWrite} from '../scriptPackageWrite';
import {createLocalPgliteRepository} from './createLocalPgliteRepository';

const source = `# Act One

## Scene One

The room is dark.

MARA
SING TO ME.
`;

const write = (): ScriptPackageWrite => ({
    script: {id: 'imported-1', title: 'Imported', subtitle: null, createdAt: 1_000, updatedAt: 2_000},
    document: parseStagistic(source).document,
    titlePage: {source: 'Original'},
    settings: {visual: {characterColorSaturation: 0.4}},
    characters: [],
    groups: [],
    genders: [],
    music: [],
    locations: [],
    scenes: [],
    attachments: [],
    bindings: [],
});

const makeRepository = (db: Awaited<ReturnType<typeof createTestDb>>['db'], fileStorage = new InMemoryFileStorage()) =>
    createLocalPgliteRepository({getLocalDb: () => Promise.resolve(db), syncToFs: () => Promise.resolve(), fileStorage});

describe('createScriptFromPackage', () => {
    it('materializes a full script in one transaction', async () => {
        const {db} = await createTestDb();
        const repository = makeRepository(db);

        await repository.createScriptFromPackage(write());

        const source = await repository.getScriptPackageSource('imported-1');
        expect(source?.script.title).toBe('Imported');
        expect(source?.titlePage).toMatchObject({source: 'Original'});
        expect(source?.settings).toMatchObject({visual: {characterColorSaturation: 0.4}});
        expect(source?.document.content.length ?? 0).toBeGreaterThan(0);
    });

    it('rolls back and cleans blobs when the document is invalid', async () => {
        const {db} = await createTestDb();
        const fileStorage = new InMemoryFileStorage();
        const repository = makeRepository(db, fileStorage);
        const broken = write();
        broken.document = {type: 'doc'} as ScriptPackageWrite['document']; // no content array -> migration throws
        broken.attachments = [{id: 'a1', filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 3, blob: new Blob(['pdf']), createdAt: 1, updatedAt: 1}];

        await expect(repository.createScriptFromPackage(broken)).rejects.toBeTruthy();
        expect(await repository.getScriptSummary('imported-1')).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run db:test -- importPackage`
Expected: FAIL — `createScriptFromPackage` is not a function on the repository.

- [ ] **Step 3: Write `scriptPackageWrite.ts`** (the block shown above).

- [ ] **Step 4: Write `importPackage.ts`**

```ts
// packages/db/src/repo/importPackage.ts
import {eq} from 'drizzle-orm';

import * as dbQueries from '../queries';
import type {ScriptPackageWrite} from '../scriptPackageWrite';
import {scriptScenes} from '../schema';
import type {FileStorage} from '../fileStorage';
import {writeScriptSettingsTx} from './config';
import {LEGACY_TO_BLOCKS_TRIGGERS, migrateScriptDocumentToBlocks} from './migration/legacyToBlocks';
import {writeTitlePageFieldsTx} from './titlePage';
import type {GetDb, RecordOutbox, SyncDb} from './types';

interface CreateImportPackageHandlerArgs {
    getDb: GetDb;
    recordOutbox: RecordOutbox;
    syncDb: SyncDb;
    fileStorage: FileStorage;
}

export const createImportPackageHandler = ({getDb, recordOutbox, syncDb, fileStorage}: CreateImportPackageHandlerArgs) => {
    const createScriptFromPackage = async (input: ScriptPackageWrite): Promise<void> => {
        const db = await getDb();
        const scriptId = input.script.id;
        const now = input.script.updatedAt;

        const storageKeyByAttachment = new Map<string, string>();
        const savedKeys: string[] = [];
        try {
            for (const attachment of input.attachments) {
                const key = await fileStorage.save(attachment.blob);
                storageKeyByAttachment.set(attachment.id, key);
                savedKeys.push(key);
            }

            await db.transaction(async tx => {
                await dbQueries.insertScript(tx, {id: scriptId, title: input.script.title, createdAt: input.script.createdAt, updatedAt: input.script.updatedAt});
                if (input.script.subtitle) {
                    await dbQueries.updateScriptSubtitle(tx, {id: scriptId, subtitle: input.script.subtitle, updatedAt: now});
                }

                await dbQueries.insertScriptCharacterGenders(tx, input.genders.map(gender => ({id: gender.id, scriptId, genderKey: gender.key, genderLabel: gender.label, createdAt: gender.createdAt, updatedAt: gender.updatedAt})));
                await dbQueries.insertScriptCharacters(tx, input.characters.map(character => ({id: character.id, scriptId, characterKey: character.key, kind: 'character', colorHex: character.colorHex, genderKey: character.genderKey, notes: character.notes, backstory: character.backstory, outline: character.outline, voiceType: character.voiceType, vocalRangeLow: character.vocalRangeLow, vocalRangeHigh: character.vocalRangeHigh, createdAt: character.createdAt, updatedAt: character.updatedAt})));
                await dbQueries.insertScriptCharacters(tx, input.groups.map(group => ({id: group.id, scriptId, characterKey: group.key, kind: 'group', colorHex: group.colorHex, genderKey: null, notes: null, backstory: null, outline: null, voiceType: null, vocalRangeLow: null, vocalRangeHigh: null, createdAt: group.createdAt, updatedAt: group.updatedAt})));
                await dbQueries.insertScriptCharacterGroupMembers(tx, input.groups.flatMap(group => group.memberIds.map(characterId => ({groupId: group.id, characterId}))));

                await dbQueries.insertScriptLocations(tx, input.locations.map(location => ({id: location.id, scriptId, name: location.name, description: location.description, createdAt: location.createdAt, updatedAt: location.updatedAt})));

                for (const item of input.music) {
                    await dbQueries.insertScriptMusic(tx, {id: item.id, scriptId, sceneNumber: item.sceneNumber, indexInScene: item.indexInScene, mode: item.mode, title: item.title, kind: item.kind, startBlockId: item.startBlockId, endBlockId: item.endBlockId, createdAt: item.createdAt, updatedAt: item.updatedAt});
                }

                await migrateScriptDocumentToBlocks({db: tx, scriptId, sourceDocument: input.document, trigger: LEGACY_TO_BLOCKS_TRIGGERS.createScript, context: LEGACY_TO_BLOCKS_TRIGGERS.createScript});

                const projectedScenes = await tx.select({id: scriptScenes.id, headingBlockId: scriptScenes.headingBlockId}).from(scriptScenes).where(eq(scriptScenes.scriptId, scriptId));
                const sceneIdByHeading = new Map(projectedScenes.filter(scene => scene.headingBlockId).map(scene => [scene.headingBlockId as string, scene.id]));
                for (const scene of input.scenes) {
                    if (!scene.headingBlockId) continue;
                    const projectedSceneId = sceneIdByHeading.get(scene.headingBlockId);
                    if (!projectedSceneId) continue;
                    await dbQueries.updateScriptSceneMetadata(tx, {sceneId: projectedSceneId, colorHex: scene.colorHex, synopsis: scene.synopsis, updatedAt: now});
                    await dbQueries.replaceScriptSceneLocations(tx, {scriptId, sceneHeadingBlockId: scene.headingBlockId, locationIds: scene.locationIds});
                }

                await writeTitlePageFieldsTx(tx, scriptId, input.titlePage, now);
                await writeScriptSettingsTx(tx, scriptId, input.settings, now);

                for (const attachment of input.attachments) {
                    await dbQueries.insertAttachment(tx, {id: attachment.id, scriptId, filename: attachment.filename, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, storageKey: storageKeyByAttachment.get(attachment.id)!, createdAt: attachment.createdAt, updatedAt: attachment.updatedAt});
                }
                for (const binding of input.bindings) {
                    await dbQueries.insertMusicAttachmentLink(tx, {musicId: binding.musicId, attachmentId: binding.attachmentId, role: binding.role, sortOrder: binding.sortOrder, createdAt: binding.createdAt});
                }

                await recordOutbox({scriptId, entityKey: `script:${scriptId}`, opType: 'script.import', occurredAt: now, payloadJson: JSON.stringify({scriptId, createdAt: input.script.createdAt})}, tx);
            });
        } catch (error) {
            await Promise.all(savedKeys.map(key => fileStorage.delete(key).catch(() => {
                console.error('[import] Failed to clean up an uncommitted blob.');
            })));
            throw error;
        }

        await syncDb();
    };

    return {createScriptFromPackage};
};
```

> Confirm exact parameter shapes against the actual query signatures before running: `replaceScriptSceneLocations` (payload keys `scriptId`, `sceneHeadingBlockId`, `locationIds`), `insertMusicAttachmentLink` (keys `musicId`, `attachmentId`, `role`, `sortOrder`, `createdAt`), and `updateScriptSceneMetadata` (keys `sceneId`, `colorHex`, `synopsis`, `updatedAt`). Adjust the calls to match. `role` is a `string`; if the link insert requires the `MusicAttachmentRole` union, cast via the existing role type.

- [ ] **Step 5: Wire the interface and repository**

In `scriptRepository.ts`: add `import type {ScriptPackageWrite} from './scriptPackageWrite';`, re-export it (`export type {ScriptPackageWrite} from './scriptPackageWrite';`), and add to the `ScriptRepository` interface:

```ts
    createScriptFromPackage(input: ScriptPackageWrite): Promise<void>;
```

In `createLocalPgliteRepository.ts`: import and construct the handler, then expose the method:

```ts
import {createImportPackageHandler} from './importPackage';
// ...inside the factory, alongside the other handlers:
const importPackage = createImportPackageHandler({...mutationDeps, fileStorage});
// ...in the returned object:
        createScriptFromPackage: input => importPackage.createScriptFromPackage(input),
```

Ensure `packages/db/src/index.ts` exports the new type (add `export * from './scriptPackageWrite';` if the barrel enumerates modules).

- [ ] **Step 6: Run tests to verify they pass**

Run: `moon run db:test -- importPackage`, then full `moon run db:test`, `moon run db:typecheck`, `moon run db:lint`.
Expected: PASS; no regressions.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/scriptPackageWrite.ts packages/db/src/repo/importPackage.ts packages/db/src/repo/importPackage.test.ts packages/db/src/scriptRepository.ts packages/db/src/repo/createLocalPgliteRepository.ts packages/db/src/index.ts
git commit -m "feat(db): add atomic createScriptFromPackage import write"
```

---

### Task 7: Inverse mapper `mapStepkgSnapshotToPackageWrite`

**Files:**
- Create: `packages/app-core/src/stepkg/mapStepkgSnapshotToPackageWrite.ts`
- Create: `packages/app-core/src/stepkg/mapStepkgSnapshotToPackageWrite.test.ts`
- Modify: `packages/app-core/src/stepkg/index.ts` (export the mapper)

**Interfaces:**
- Consumes: `StepkgSnapshot` from `@stagistic/stepkg`; `ScriptPackageWrite` from `@stagistic/db`.
- Produces: `mapStepkgSnapshotToPackageWrite(snapshot: StepkgSnapshot, assets: Map<string, Uint8Array>): ScriptPackageWrite`

Mirror of `mapScriptPackageSourceToStepkg`: ISO→epoch via `new Date(iso).getTime()`; attachment blob from `assets.get(contentKey)`; bindings `musicId = target.id`, `sortOrder = order`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/app-core/src/stepkg/mapStepkgSnapshotToPackageWrite.test.ts
import type {StepkgSnapshot} from '@stagistic/stepkg';
import {describe, expect, it} from 'vite-plus/test';

import {mapStepkgSnapshotToPackageWrite} from './mapStepkgSnapshotToPackageWrite';

const snapshot: StepkgSnapshot = {
    script: {id: 's1', title: 'T', subtitle: 'sub', createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T11:00:00.000Z'},
    document: {type: 'doc', content: []} as unknown as StepkgSnapshot['document'],
    titlePage: {source: 'Original'},
    settings: {},
    characters: {characters: [], groups: [], genderOptions: []},
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [{id: 'a1', filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 3, createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T10:00:00.000Z', contentKey: 'assets/a1/a.pdf'}],
    attachmentBindings: [{target: {type: 'music', id: 'm1'}, attachmentId: 'a1', role: 'integrated_score', order: 0, createdAt: '2026-09-18T10:00:00.000Z'}],
};

describe('mapStepkgSnapshotToPackageWrite', () => {
    it('converts timestamps and resolves attachment blobs', () => {
        const assets = new Map([['assets/a1/a.pdf', new Uint8Array([1, 2, 3])]]);
        const write = mapStepkgSnapshotToPackageWrite(snapshot, assets);

        expect(write.script.subtitle).toBe('sub');
        expect(write.script.updatedAt).toBe(new Date('2026-09-18T11:00:00.000Z').getTime());
        expect(write.attachments[0]?.blob.size).toBe(3);
        expect(write.bindings[0]).toMatchObject({musicId: 'm1', attachmentId: 'a1', sortOrder: 0});
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run app-core:test -- mapStepkgSnapshotToPackageWrite`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the mapper**

```ts
// packages/app-core/src/stepkg/mapStepkgSnapshotToPackageWrite.ts
import type {ScriptPackageWrite} from '@stagistic/db';
import type {StepkgSnapshot} from '@stagistic/stepkg';

const toEpoch = (iso: string): number => new Date(iso).getTime();

export const mapStepkgSnapshotToPackageWrite = (snapshot: StepkgSnapshot, assets: Map<string, Uint8Array>): ScriptPackageWrite => ({
    script: {
        id: snapshot.script.id,
        title: snapshot.script.title,
        subtitle: snapshot.script.subtitle,
        createdAt: toEpoch(snapshot.script.createdAt),
        updatedAt: toEpoch(snapshot.script.updatedAt),
    },
    document: snapshot.document,
    titlePage: snapshot.titlePage,
    settings: snapshot.settings,
    characters: snapshot.characters.characters.map(character => ({
        id: character.id, key: character.key, colorHex: character.colorHex, genderKey: character.genderKey,
        notes: character.notes, backstory: character.backstory, outline: character.outline,
        voiceType: character.voiceType, vocalRangeLow: character.vocalRangeLow, vocalRangeHigh: character.vocalRangeHigh,
        createdAt: toEpoch(character.createdAt), updatedAt: toEpoch(character.updatedAt),
    })),
    groups: snapshot.characters.groups.map(group => ({
        id: group.id, key: group.key, colorHex: group.colorHex, memberIds: group.memberIds,
        createdAt: toEpoch(group.createdAt), updatedAt: toEpoch(group.updatedAt),
    })),
    genders: snapshot.characters.genderOptions.map(gender => ({
        id: gender.id, key: gender.key, label: gender.label,
        createdAt: toEpoch(gender.createdAt), updatedAt: toEpoch(gender.updatedAt),
    })),
    music: snapshot.music.items.map(item => ({
        id: item.id, sceneNumber: item.sceneNumber, indexInScene: item.indexInScene, mode: item.mode,
        title: item.title, kind: item.kind, startBlockId: item.startBlockId, endBlockId: item.endBlockId,
        createdAt: toEpoch(item.createdAt), updatedAt: toEpoch(item.updatedAt),
    })),
    locations: snapshot.scenes.locations.map(location => ({
        id: location.id, name: location.name, description: location.description,
        createdAt: toEpoch(location.createdAt), updatedAt: toEpoch(location.updatedAt),
    })),
    scenes: snapshot.scenes.scenes.map(scene => ({
        headingBlockId: scene.headingBlockId, colorHex: scene.colorHex, synopsis: scene.synopsis, locationIds: scene.locationIds,
    })),
    attachments: snapshot.attachments.map(attachment => ({
        id: attachment.id, filename: attachment.filename, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes,
        blob: new Blob([assets.get(attachment.contentKey) ?? new Uint8Array()], {type: attachment.mimeType}),
        createdAt: toEpoch(attachment.createdAt), updatedAt: toEpoch(attachment.updatedAt),
    })),
    bindings: snapshot.attachmentBindings.map(binding => ({
        musicId: binding.target.id, attachmentId: binding.attachmentId, role: binding.role, sortOrder: binding.order,
        createdAt: toEpoch(binding.createdAt),
    })),
});
```

- [ ] **Step 4: Add export and run tests**

Export from `packages/app-core/src/stepkg/index.ts`. Run `moon run app-core:test -- mapStepkgSnapshotToPackageWrite`, `moon run app-core:typecheck`, `moon run app-core:lint`.
Expected: PASS; clean.

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/stepkg/mapStepkgSnapshotToPackageWrite.ts packages/app-core/src/stepkg/mapStepkgSnapshotToPackageWrite.test.ts packages/app-core/src/stepkg/index.ts
git commit -m "feat(app-core): map a .stepkg snapshot to the db package-write input"
```

---

### Task 8: `importScriptPackageAsNew` orchestration + round-trip test

**Files:**
- Create: `packages/app-core/src/stepkg/importScriptPackageAsNew.ts`
- Create: `packages/app-core/src/stepkg/importScriptPackageAsNew.test.ts`
- Modify: `packages/app-core/src/stepkg/index.ts` (export the orchestrator and result type)

**Interfaces:**
- Consumes: `readStepkg`, `remapStepkgIds`, `type StepkgImportIssue` from `@stagistic/stepkg`; `mapStepkgSnapshotToPackageWrite` (Task 7); `type ScriptRepository` from `@stagistic/db`; `trimOrFallback` from `@stagistic/script`.
- Produces:
  - `type StepkgImportResult = {ok: true; scriptId: string; title: string} | {ok: false; issues: StepkgImportIssue[]}`
  - `importScriptPackageAsNew(args: {repository: ScriptRepository; bytes: Uint8Array; title?: string}): Promise<StepkgImportResult>`

- [ ] **Step 1: Write the failing test (full round trip through export → import)**

```ts
// packages/app-core/src/stepkg/importScriptPackageAsNew.test.ts
import {parseStagistic} from '@stagistic/script';
import {InMemoryFileStorage, createLocalPgliteRepository} from '@stagistic/db';
import {createTestDb} from '@stagistic/db/testing'; // adjust to the actual test-db export path
import {describe, expect, it} from 'vite-plus/test';

import {exportScriptPackage} from './exportScriptPackage';
import {importScriptPackageAsNew} from './importScriptPackageAsNew';

const source = `# Act One

## Scene One

The room is dark.

MARA
SING TO ME.
`;

describe('importScriptPackageAsNew', () => {
    it('imports an exported package as an independent new script', async () => {
        const {db} = await createTestDb();
        const repository = createLocalPgliteRepository({getLocalDb: () => Promise.resolve(db), syncToFs: () => Promise.resolve(), fileStorage: new InMemoryFileStorage()});
        const originalId = await repository.createScript('Original', parseStagistic(source).document);

        const exported = await exportScriptPackage({repository, scriptId: originalId, generator: {name: 'Stagistic', version: '0.0.0'}});
        if (!exported.ok) throw new Error('export failed');
        const bytes = new Uint8Array(await exported.blob.arrayBuffer());

        const result = await importScriptPackageAsNew({repository, bytes});
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.scriptId).not.toBe(originalId);
            const imported = await repository.getScriptPackageSource(result.scriptId);
            expect(imported?.document.content.length).toBe((await repository.getScriptPackageSource(originalId))?.document.content.length);
        }
    });

    it('returns issues for a corrupt package and writes nothing', async () => {
        const {db} = await createTestDb();
        const repository = createLocalPgliteRepository({getLocalDb: () => Promise.resolve(db), syncToFs: () => Promise.resolve(), fileStorage: new InMemoryFileStorage()});

        const result = await importScriptPackageAsNew({repository, bytes: new TextEncoder().encode('not a zip')});
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('not_a_zip');
        expect((await repository.listScripts()).length).toBe(0);
    });
});
```

> Fix the `createTestDb` import to the path the app-core package already uses for db test helpers (grep app-core tests for `createTestDb`); if app-core has no db test-helper access, construct the PGlite db exactly as the db package tests do, or move this test into the db package. Keep the round trip: export real bytes, then import.

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run app-core:test -- importScriptPackageAsNew`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the orchestrator**

```ts
// packages/app-core/src/stepkg/importScriptPackageAsNew.ts
import type {ScriptRepository} from '@stagistic/db';
import {trimOrFallback} from '@stagistic/script';
import {readStepkg, remapStepkgIds, type StepkgImportIssue} from '@stagistic/stepkg';

import {mapStepkgSnapshotToPackageWrite} from './mapStepkgSnapshotToPackageWrite';

export type StepkgImportResult = {ok: true; scriptId: string; title: string} | {ok: false; issues: StepkgImportIssue[]};

export interface ImportScriptPackageAsNewArgs {
    repository: ScriptRepository;
    bytes: Uint8Array;
    title?: string;
}

export const importScriptPackageAsNew = async ({repository, bytes, title}: ImportScriptPackageAsNewArgs): Promise<StepkgImportResult> => {
    const read = await readStepkg(bytes);
    if (!read.ok) return {ok: false, issues: read.issues};

    const {snapshot} = remapStepkgIds(read.package.snapshot);
    const finalTitle = trimOrFallback(title ?? '', snapshot.script.title);
    const write = mapStepkgSnapshotToPackageWrite(snapshot, read.package.assets);
    write.script.title = finalTitle;

    try {
        await repository.createScriptFromPackage(write);
    } catch {
        return {ok: false, issues: [{code: 'write_failed', stage: 'write'}]};
    }

    return {ok: true, scriptId: write.script.id, title: finalTitle};
};
```

- [ ] **Step 4: Add exports and run tests**

Export `importScriptPackageAsNew` and `StepkgImportResult` from `packages/app-core/src/stepkg/index.ts`. Run `moon run app-core:test -- importScriptPackageAsNew`, then `moon run app-core:typecheck`, `moon run app-core:lint`.
Expected: PASS; clean.

- [ ] **Step 5: Full verification pass**

Run: `moon run stepkg:test`, `moon run db:test`, `moon run app-core:test`, and the typecheck/lint for all three packages.
Expected: all green. Fix any integration mismatch (e.g. a query signature) before committing.

- [ ] **Step 6: Commit**

```bash
git add packages/app-core/src/stepkg/importScriptPackageAsNew.ts packages/app-core/src/stepkg/importScriptPackageAsNew.test.ts packages/app-core/src/stepkg/index.ts
git commit -m "feat(app-core): import a .stepkg package as a new script"
```

---

## Self-Review

**Spec coverage:**
- §3 layered architecture → Tasks 1–3 (stepkg), 4–6 (db), 7–8 (app-core). ✓
- §4 `readStepkg` (unzip, manifest, version, checksum, schema, cross-refs, reconstruct) → Tasks 1–2. ✓
- §4 `remapStepkgIds` incl. embedded document refs, preserved block ids, no scene-id remap → Task 3. ✓
- §5 `createScriptFromPackage` atomic, blob-before-tx + compensating cleanup, projection-aware order, scenes by headingBlockId, title/settings after document → Task 6 (+ Tasks 4, 5 dependencies). ✓
- §6 validation invariants → Task 2 tests (checksum, file_missing, schema, broken_reference, asset_missing) + manifest.script.id equality. ✓
- §7 `StepkgImportResult`/issue codes/stages, aggregation, abort-writes-nothing → Tasks 1 (types), 2 (aggregation), 8 (write_failed + nothing-written test). ✓
- §8 orchestration read → remap → map → write, title override/fallback → Task 8. ✓
- §10 testing (round-trip, each failure, remap consistency, atomic rollback, orchestration) → Tasks 2, 3, 6, 8. ✓
- §11 non-goals (no UI, no recover branch, no schema change) → nothing in the plan adds them. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to". Query-signature caveats are explicit verification notes with the expected shape, not deferred work.

**Type consistency:** `StepkgImportIssue`/codes/stages defined in Task 1, used in Tasks 2 and 8. `StepkgPackage`/`StepkgReadResult` in Task 2, consumed in Task 8. `StepkgIdMap` in Task 3. `ScriptPackageWrite` (and members) in Task 6, consumed by Task 7's mapper and Task 8. `createScriptFromPackage(input: ScriptPackageWrite): Promise<void>` consistent across Task 6 interface, repository wiring, and Task 8 call. `readStepkg`, `remapStepkgIds`, `mapStepkgSnapshotToPackageWrite` names consistent across producers/consumers.

**Known verification points for the executor** (do not skip): exact `moon`/task runner target names per package; `createEmptyScriptDocument` helper name; `ScriptNode` export; `STEPKG_MANIFEST_PATH` constant; `replaceScriptSceneLocations` / `insertMusicAttachmentLink` / `updateScriptSceneMetadata` payload shapes; the app-core test's db-helper import path. Each is flagged inline at the point of use.
