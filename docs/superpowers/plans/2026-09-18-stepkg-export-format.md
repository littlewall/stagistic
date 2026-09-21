# Stagistic Editor Package Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a complete, validated Stagistic Editor backup as a browser-compatible `.stepkg` ZIP Blob without changing the existing `.stagistic` export UI.

**Architecture:** A new dependency-light `@stagistic/stepkg` package owns the portable contract, validation, deterministic serialization, hashing, manifest construction, and ZIP writing. `@stagistic/db` exposes one transactionally consistent, read-only source snapshot; `@stagistic/app-core` maps that source to the portable contract, flushes caller-owned pending state, loads attachment blobs, and returns structured results. UI selection, progress, and error presentation remain outside this plan.

**Tech Stack:** TypeScript 5.9, Vite+ test runner, PGlite/Drizzle, Web Crypto, browser `Blob`, `fflate`, Moon task runner.

**Spec:** `docs/superpowers/specs/2026-09-18-stepkg-export-format-design.md`

## Global Constraints

- The extension is `.stepkg` (`STagistic Editor PacKaGe`).
- The media type is `application/vnd.stagistic.package+zip`.
- The archive must remain a standard ZIP readable after renaming to `.zip`.
- Generation is entirely browser-capable and must not require a server or WASM.
- `document.json` and domain JSON are authoritative; `script.stagistic` is the open generated view.
- Persist original IDs in the package. ID regeneration belongs to the later import phase.
- Package JSON is domain-oriented and must not expose Drizzle row/table shapes as the contract.
- Missing or unreadable required data aborts export and returns stable structured diagnostics.
- Do not change `SCRIPT_DOCUMENT_SCHEMA_VERSION`; this container does not change `ScriptDocument` semantics.
- No DB schema or SQL migration changes are expected. If implementation unexpectedly changes either, run `moon run db:db-compile-migrations`.
- Do not change the current `.stagistic` UI action or add `.stepkg` UI/UX in this plan.
- Never commit automatically. At each checkpoint, show verification evidence and a proposed commit message; the user reviews and performs the commit.

---

## File Structure

### New `@stagistic/stepkg` package

- `packages/stepkg/package.json` — workspace package metadata and `fflate` dependency.
- `packages/stepkg/tsconfig.json` — ES2022 + DOM project configuration.
- `packages/stepkg/src/constants.ts` — format names, paths, versions, extension, and MIME type.
- `packages/stepkg/src/contracts.ts` — portable snapshot, data-document, manifest, entry, and result types.
- `packages/stepkg/src/errors.ts` — stable issue codes and constructors.
- `packages/stepkg/src/stableJson.ts` — deterministic minified UTF-8 JSON serialization.
- `packages/stepkg/src/paths.ts` — safe asset leaf/path construction.
- `packages/stepkg/src/validateSnapshot.ts` — complete preflight validation and issue aggregation.
- `packages/stepkg/src/serializeSnapshot.ts` — authoritative JSON and `.stagistic` entry generation.
- `packages/stepkg/src/sha256.ts` — lowercase-hex SHA-256 over uncompressed bytes.
- `packages/stepkg/src/buildEntries.ts` — asset loading, manifest construction, and build diagnostics.
- `packages/stepkg/src/writeArchive.ts` — DEFLATE/STORE ZIP writer returning a Blob.
- `packages/stepkg/src/createStepkg.ts` — package-level orchestration from snapshot to Blob.
- `packages/stepkg/src/index.ts` — public package API.
- `packages/stepkg/src/schemas/*.schema.json` — version-one manifest and domain JSON Schemas.
- Focused `*.test.ts` files next to each unit.

### Database snapshot

- `packages/db/src/scriptPackageSource.ts` — database-owned source snapshot types.
- `packages/db/src/repo/readScriptPackageSource.ts` — one-transaction aggregate reader.
- `packages/db/src/repo/readScriptPackageSource.test.ts` — complete source snapshot coverage.
- `packages/db/src/repo/config.ts` — expose a transaction-aware settings reader.
- `packages/db/src/repo/titlePage.ts` — expose a transaction-aware title-page reader.
- `packages/db/src/repo/createLocalPgliteRepository.ts` — wire the aggregate read method.
- `packages/db/src/scriptRepository.ts` and `packages/db/src/index.ts` — publish the read contract.

### Application orchestration

- `packages/app-core/src/stepkg/mapStepkgSnapshot.ts` — explicitly map DB source types to portable DTOs.
- `packages/app-core/src/stepkg/exportStepkg.ts` — flush, load, map, build, and normalize failures.
- `packages/app-core/src/stepkg/exportStepkg.test.ts` — orchestration/error coverage.
- `packages/app-core/src/stepkg/exportStepkg.browser.test.ts` — browser Blob/Web Crypto compatibility.
- `packages/app-core/src/stepkg/index.ts` and `packages/app-core/src/index.ts` — public exports.

### Workspace configuration

- `tsconfig.json` — add the `packages/stepkg` project reference.
- `packages/app-core/package.json` — add `@stagistic/stepkg` workspace dependency.
- `pnpm-lock.yaml` — record `fflate` and workspace edges.

---

### Task 1: Scaffold the package and freeze the public contract

**Files:**
- Create: `packages/stepkg/package.json`
- Create: `packages/stepkg/tsconfig.json`
- Create: `packages/stepkg/src/constants.ts`
- Create: `packages/stepkg/src/contracts.ts`
- Create: `packages/stepkg/src/errors.ts`
- Create: `packages/stepkg/src/contracts.test.ts`
- Create: `packages/stepkg/src/index.ts`
- Create: `packages/stepkg/src/schemas/manifest.v1.schema.json`
- Create: `packages/stepkg/src/schemas/script.v1.schema.json`
- Create: `packages/stepkg/src/schemas/title-page.v1.schema.json`
- Create: `packages/stepkg/src/schemas/settings.v1.schema.json`
- Create: `packages/stepkg/src/schemas/characters.v1.schema.json`
- Create: `packages/stepkg/src/schemas/music.v1.schema.json`
- Create: `packages/stepkg/src/schemas/scenes.v1.schema.json`
- Create: `packages/stepkg/src/schemas/attachments.v1.schema.json`
- Modify: `tsconfig.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `ScriptDocument`, `TitlePageSettings`, and `EditorSettingsOverride` from `@stagistic/script`.
- Produces: `StepkgSnapshot`, domain data types, `StepkgManifest`, `StepkgEntry`, `StepkgExportIssue`, and format constants used by every later task.

- [ ] **Step 1: Write the contract test before creating the implementation**

```ts
import {
    STEPKG_EXTENSION,
    STEPKG_FORMAT,
    STEPKG_FORMAT_VERSION,
    STEPKG_MEDIA_TYPE,
    type StepkgManifest,
} from './index';
import {
    describe, expect, it,
} from 'vite-plus/test';

describe('stepkg contract', () => {
    it('pins the version-one discriminator and browser file identity', () => {
        expect(STEPKG_FORMAT).toBe('stagistic-package');
        expect(STEPKG_FORMAT_VERSION).toBe(1);
        expect(STEPKG_EXTENSION).toBe('.stepkg');
        expect(STEPKG_MEDIA_TYPE).toBe('application/vnd.stagistic.package+zip');
    });

    it('requires source script identity in the manifest', () => {
        const manifest: StepkgManifest = {
            format: STEPKG_FORMAT,
            formatVersion: STEPKG_FORMAT_VERSION,
            documentSchemaVersion: 3,
            createdAt: '2026-09-18T12:00:00.000Z',
            generator: {name: 'Stagistic', version: 'test'},
            script: {
                id: 'script-1',
                title: 'Test',
                updatedAt: '2026-09-18T11:00:00.000Z',
            },
            entrypoints: {document: 'document.json', text: 'script.stagistic'},
            files: [],
        };

        expect(manifest.script.id).toBe('script-1');
    });
});
```

- [ ] **Step 2: Run the new package test and verify the missing-package failure**

Run: `moon run stepkg:test`

Expected: FAIL because the project and exports do not exist yet.

- [ ] **Step 3: Add the workspace package and dependency**

Create `packages/stepkg/package.json`:

```json
{
    "name": "@stagistic/stepkg",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "main": "./src/index.ts",
    "dependencies": {
        "@stagistic/script": "workspace:*",
        "fflate": "^0.8.2"
    },
    "devDependencies": {
        "typescript": "^5.9.2"
    }
}
```

Create `packages/stepkg/tsconfig.json`:

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src",
        "lib": ["ES2022", "DOM", "DOM.Iterable"]
    },
    "include": ["src/**/*"]
}
```

Add `{"path": "./packages/stepkg"}` to the root `tsconfig.json` references and run `pnpm install` to update `pnpm-lock.yaml`.

- [ ] **Step 4: Define constants and portable domain types**

Create exact constants:

```ts
export const STEPKG_FORMAT = 'stagistic-package' as const;
export const STEPKG_FORMAT_VERSION = 1 as const;
export const STEPKG_EXTENSION = '.stepkg' as const;
export const STEPKG_MEDIA_TYPE = 'application/vnd.stagistic.package+zip' as const;
export const STEPKG_DOCUMENT_PATH = 'document.json' as const;
export const STEPKG_TEXT_PATH = 'script.stagistic' as const;
```

Define `StepkgSnapshot` as an internal build snapshot containing:

```ts
export interface StepkgSnapshot {
    script: StepkgScriptData,
    document: ScriptDocument,
    titlePage: TitlePageSettings,
    settings: EditorSettingsOverride,
    characters: StepkgCharactersData,
    music: StepkgMusicData,
    scenes: StepkgScenesData,
    attachments: StepkgAttachmentSnapshot[],
    attachmentBindings: StepkgAttachmentBinding[],
}

export interface StepkgScriptData {
    id: string,
    title: string,
    subtitle: string | null,
    createdAt: string,
    updatedAt: string,
}

export interface StepkgAttachmentSnapshot {
    id: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    createdAt: string,
    updatedAt: string,
    contentKey: string,
}
```

Define the remaining domain records explicitly, using ISO timestamp strings and no `scriptId` or storage implementation fields:

```ts
export interface StepkgCharacter {
    id: string,
    key: string,
    colorHex: string | null,
    genderKey: string | null,
    notes: string | null,
    backstory: string | null,
    outline: string | null,
    voiceType: string | null,
    vocalRangeLow: string | null,
    vocalRangeHigh: string | null,
    createdAt: string,
    updatedAt: string,
}

export interface StepkgCharacterGroup {
    id: string,
    key: string,
    colorHex: string | null,
    memberIds: string[],
    createdAt: string,
    updatedAt: string,
}

export interface StepkgGenderOption {
    id: string,
    key: string,
    label: string,
    createdAt: string,
    updatedAt: string,
}

export interface StepkgCharactersData {
    characters: StepkgCharacter[],
    groups: StepkgCharacterGroup[],
    genderOptions: StepkgGenderOption[],
}

export interface StepkgMusicItem {
    id: string,
    sceneNumber: number,
    indexInScene: number,
    mode: string,
    title: string,
    kind: string | null,
    startBlockId: string | null,
    endBlockId: string | null,
    createdAt: string,
    updatedAt: string,
}

export interface StepkgMusicData {items: StepkgMusicItem[]}

export interface StepkgLocation {
    id: string,
    name: string,
    description: string | null,
    createdAt: string,
    updatedAt: string,
}

export interface StepkgScene {
    id: string,
    headingBlockId: string | null,
    sceneNumber: string | null,
    colorHex: string | null,
    synopsis: string | null,
    locationIds: string[],
    createdAt: string,
    updatedAt: string,
}

export interface StepkgScenesData {
    scenes: StepkgScene[],
    locations: StepkgLocation[],
}

export interface StepkgAttachmentBinding {
    target: {type: 'music', id: string},
    attachmentId: string,
    role: string,
    order: number,
    createdAt: string,
}
```

Define serialized attachment data separately so `contentKey` can never leak:

```ts
export interface StepkgAttachmentData {
    id: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    assetPath: string,
    createdAt: string,
    updatedAt: string,
}

export interface StepkgAttachmentsData {
    items: StepkgAttachmentData[],
    bindings: StepkgAttachmentBinding[],
}
```

- [ ] **Step 5: Define manifest, entry, result, and issue contracts**

Use the exact public shapes:

```ts
export type StepkgIssueCode =
    | 'editor_flush_failed'
    | 'script_not_found'
    | 'invalid_snapshot'
    | 'duplicate_id'
    | 'broken_reference'
    | 'asset_blob_missing'
    | 'asset_read_failed'
    | 'serialization_failed'
    | 'archive_creation_failed';

export type StepkgIssueStage =
    | 'flush'
    | 'snapshot'
    | 'validation'
    | 'assets'
    | 'serialization'
    | 'archive';

export interface StepkgExportIssue {
    code: StepkgIssueCode,
    stage: StepkgIssueStage,
    entity?: {
        type: 'script' | 'character' | 'music' | 'scene' | 'attachment',
        id: string,
        label?: string,
    },
    path?: string,
    details?: Record<string, string | number>,
}

export interface StepkgManifestFile {
    path: string,
    mediaType: string,
    byteLength: number,
    sha256: string,
}

export interface StepkgManifest {
    format: typeof STEPKG_FORMAT,
    formatVersion: typeof STEPKG_FORMAT_VERSION,
    documentSchemaVersion: number,
    createdAt: string,
    generator: {name: string, version: string},
    script: {id: string, title: string, updatedAt: string},
    entrypoints: {
        document: typeof STEPKG_DOCUMENT_PATH,
        text: typeof STEPKG_TEXT_PATH,
    },
    files: StepkgManifestFile[],
}

export interface StepkgEntry {
    path: string,
    mediaType: string,
    bytes: Uint8Array,
    compression: 'deflate' | 'store',
}

export type StepkgExportResult =
    | {
        ok: true,
        blob: Blob,
        fileName: string,
        manifest: StepkgManifest,
    }
    | {
        ok: false,
        issues: StepkgExportIssue[],
    };
```

- [ ] **Step 6: Add exact JSON Schemas for the external files**

Each schema must set draft 2020-12, `additionalProperties: false`, and the explicit required keys. The manifest schema begins:

```json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "urn:stagistic:stepkg:manifest:v1",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "format",
        "formatVersion",
        "documentSchemaVersion",
        "createdAt",
        "generator",
        "script",
        "entrypoints",
        "files"
    ],
    "properties": {
        "format": {"const": "stagistic-package"},
        "formatVersion": {"const": 1},
        "documentSchemaVersion": {"type": "integer", "minimum": 1},
        "createdAt": {"type": "string", "format": "date-time"},
        "generator": {
            "type": "object",
            "additionalProperties": false,
            "required": ["name", "version"],
            "properties": {
                "name": {"type": "string", "minLength": 1},
                "version": {"type": "string", "minLength": 1}
            }
        },
        "script": {
            "type": "object",
            "additionalProperties": false,
            "required": ["id", "title", "updatedAt"],
            "properties": {
                "id": {"type": "string", "minLength": 1},
                "title": {"type": "string", "minLength": 1},
                "updatedAt": {"type": "string", "format": "date-time"}
            }
        },
        "entrypoints": {
            "type": "object",
            "additionalProperties": false,
            "required": ["document", "text"],
            "properties": {
                "document": {"const": "document.json"},
                "text": {"const": "script.stagistic"}
            }
        },
        "files": {
            "type": "array",
            "items": {"$ref": "#/$defs/file"}
        }
    },
    "$defs": {
        "file": {
            "type": "object",
            "additionalProperties": false,
            "required": ["path", "mediaType", "byteLength", "sha256"],
            "properties": {
                "path": {"type": "string", "minLength": 1},
                "mediaType": {"type": "string", "minLength": 1},
                "byteLength": {"type": "integer", "minimum": 0},
                "sha256": {"type": "string", "pattern": "^[0-9a-f]{64}$"}
            }
        }
    }
}
```

The remaining schemas use these exact roots:

| File | Required root keys |
|---|---|
| `script.v1.schema.json` | `id`, `title`, `subtitle`, `createdAt`, `updatedAt` |
| `title-page.v1.schema.json` | the properties of `TitlePageSettings`; all optional, no unknown keys |
| `settings.v1.schema.json` | the sections of `EditorSettingsOverride`; all optional, no unknown keys |
| `characters.v1.schema.json` | `characters`, `groups`, `genderOptions` with record fields from `contracts.ts` |
| `music.v1.schema.json` | `items` with every `StepkgMusicItem` field required |
| `scenes.v1.schema.json` | `scenes`, `locations` with every record field required |
| `attachments.v1.schema.json` | `items`, `bindings`; `contentKey` is forbidden |

Use `type: ["string", "null"]` for nullable strings and `format: "date-time"` for every ISO timestamp. Add a contract test that reads every schema through JSON imports and asserts its `$id`, root `additionalProperties`, and required-key array.

- [ ] **Step 7: Export the public contract and run checks**

Export constants, contracts, and errors from `src/index.ts`, then run:

Run: `moon run stepkg:test && moon run stepkg:typecheck && moon run stepkg:lint`

Expected: PASS.

- [ ] **Step 8: Prepare the review checkpoint**

Show the new package contract and schema files, the three passing commands, and propose commit message:

```text
feat(stepkg): define package export contract
```

Do not commit; wait for user review and commit.

---

### Task 2: Deterministic domain and text serialization

**Files:**
- Create: `packages/stepkg/src/stableJson.ts`
- Create: `packages/stepkg/src/stableJson.test.ts`
- Create: `packages/stepkg/src/serializeSnapshot.ts`
- Create: `packages/stepkg/src/serializeSnapshot.test.ts`
- Modify: `packages/stepkg/src/index.ts`

**Interfaces:**
- Consumes: `StepkgSnapshot` from Task 1 and `serializeStagistic` from `@stagistic/script`.
- Produces: `serializeStepkgContent(snapshot): StepkgEntry[]`; Task 4 adds assets and manifest to these content entries.

- [ ] **Step 1: Write failing deterministic JSON tests**

```ts
import {stableJsonBytes, stableJsonStringify} from './stableJson';
import {
    describe, expect, it,
} from 'vite-plus/test';

describe('stableJsonStringify', () => {
    it('sorts object keys recursively without reordering arrays', () => {
        expect(stableJsonStringify({z: 1, a: {y: 2, b: 3}, rows: [{z: 1, a: 2}]}))
            .toBe('{"a":{"b":3,"y":2},"rows":[{"a":2,"z":1}],"z":1}');
    });

    it('returns exact UTF-8 bytes', () => {
        expect(new TextDecoder().decode(stableJsonBytes({title: 'Příliš žluťoučký'})))
            .toBe('{"title":"Příliš žluťoučký"}');
    });
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `moon run stepkg:test`

Expected: FAIL because `stableJsonStringify` and `stableJsonBytes` do not exist.

- [ ] **Step 3: Implement recursive stable serialization**

```ts
const normalizeJson = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map(normalizeJson);
    }

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, field]) => field !== undefined)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, field]) => [key, normalizeJson(field)]),
        );
    }

    return value;
};

export const stableJsonStringify = (value: unknown): string => JSON.stringify(normalizeJson(value));

export const stableJsonBytes = (value: unknown): Uint8Array => {
    return new TextEncoder().encode(stableJsonStringify(value));
};
```

- [ ] **Step 4: Write failing content-entry tests**

Build a complete `StepkgSnapshot` fixture and assert:

```ts
const entries = serializeStepkgContent(snapshot);
const paths = entries.map(entry => entry.path);

expect(paths).toEqual([
    'document.json',
    'script.stagistic',
    'data/script.json',
    'data/title-page.json',
    'data/settings.json',
    'data/characters.json',
    'data/music.json',
    'data/scenes.json',
]);
expect(entries.every(entry => entry.compression === 'deflate')).toBe(true);
expect(decode(entries, 'document.json')).toContain('"id":"block-1"');
expect(decode(entries, 'script.stagistic')).toContain('# Act One');
expect(decode(entries, 'data/script.json')).not.toContain('activeBlockId');
expect(decode(entries, 'data/settings.json')).toBe('{"page":{"widthPx":816}}');
```

- [ ] **Step 5: Implement authoritative content serialization**

Implement:

```ts
export const serializeStepkgContent = (snapshot: StepkgSnapshot): StepkgEntry[] => [
    jsonEntry(STEPKG_DOCUMENT_PATH, snapshot.document),
    textEntry(STEPKG_TEXT_PATH, serializeStagistic(snapshot.document, {
        scriptTitle: snapshot.script.title,
        titlePage: snapshot.titlePage,
    })),
    jsonEntry('data/script.json', snapshot.script),
    jsonEntry('data/title-page.json', snapshot.titlePage),
    jsonEntry('data/settings.json', snapshot.settings),
    jsonEntry('data/characters.json', snapshot.characters),
    jsonEntry('data/music.json', snapshot.music),
    jsonEntry('data/scenes.json', snapshot.scenes),
];
```

`jsonEntry` uses `stableJsonBytes`; `textEntry` uses `TextEncoder`; both set the exact media type and `compression: 'deflate'`.

- [ ] **Step 6: Run package verification**

Run: `moon run stepkg:test && moon run stepkg:typecheck && moon run stepkg:lint`

Expected: PASS.

- [ ] **Step 7: Prepare the review checkpoint**

Proposed commit message:

```text
feat(stepkg): serialize portable package content
```

Do not commit; provide the diff and test evidence for user review.

---

### Task 3: Aggregate preflight validation diagnostics

**Files:**
- Create: `packages/stepkg/src/validateSnapshot.ts`
- Create: `packages/stepkg/src/validateSnapshot.test.ts`
- Create: `packages/stepkg/src/paths.ts`
- Create: `packages/stepkg/src/paths.test.ts`
- Modify: `packages/stepkg/src/index.ts`

**Interfaces:**
- Consumes: `StepkgSnapshot` and `StepkgExportIssue` from Task 1.
- Produces: `validateStepkgSnapshot(snapshot): StepkgExportIssue[]` and `getStepkgAssetPath(attachment): string`.

- [ ] **Step 1: Write failing path tests**

```ts
expect(getStepkgAssetPath({id: 'att-1', filename: '../../score?.pdf'}))
    .toBe('assets/att-1/score-.pdf');
expect(isSafeStepkgPath('../manifest.json')).toBe(false);
expect(isSafeStepkgPath('/assets/a.pdf')).toBe(false);
expect(isSafeStepkgPath('assets\\a.pdf')).toBe(false);
expect(isSafeStepkgPath('assets/a.pdf')).toBe(true);
```

- [ ] **Step 2: Implement safe path construction**

Take the final leaf after splitting the supplied filename on both `/` and `\\`, then sanitize control
characters and `< > : " / \\ | ? *`. Collapse empty/dot-only leaf names to `attachment`. Reject
absolute package paths, backslashes, empty segments, `.` segments, and `..` segments. Never sanitize
the attachment ID silently: require it to match `^[A-Za-z0-9._-]+$`; an unsafe or empty ID is a
validation error.

- [ ] **Step 3: Write a failing multi-issue validation test**

Mutate a valid fixture so it has:

- duplicate character ID `character-1`;
- group member `missing-character`;
- scene heading `missing-heading`;
- music `startBlockId` `missing-block`;
- binding attachment `missing-attachment`;
- duplicate package asset path.

Assert exact issue identities:

```ts
expect(validateStepkgSnapshot(invalidSnapshot).map(issue => [
    issue.code,
    issue.entity?.type,
    issue.entity?.id,
])).toEqual([
    ['duplicate_id', 'character', 'character-1'],
    ['broken_reference', 'character', 'group-1'],
    ['broken_reference', 'scene', 'scene-1'],
    ['broken_reference', 'music', 'music-1'],
    ['broken_reference', 'attachment', 'missing-attachment'],
    ['invalid_snapshot', 'attachment', 'attachment-2'],
]);
```

- [ ] **Step 4: Implement one-pass aggregation**

Collect document block IDs recursively, build a `Set` for each domain, and append issues in deterministic domain order. Validate:

- non-empty unique IDs;
- `manifest`-eligible script identity/title/timestamps;
- character group members;
- character gender keys;
- scene heading and location references;
- music start/end block references;
- attachment binding targets and attachment IDs;
- attachment declared `sizeBytes >= 0`;
- safe unique asset paths.

Do not throw for data errors. Return all deterministic issues.

- [ ] **Step 5: Run package verification**

Run: `moon run stepkg:test && moon run stepkg:typecheck && moon run stepkg:lint`

Expected: PASS.

- [ ] **Step 6: Prepare the review checkpoint**

Proposed commit message:

```text
feat(stepkg): validate package snapshots
```

Do not commit; show the aggregated issue fixture and verification output.

---

### Task 4: Materialize assets, hashes, and the manifest

**Files:**
- Create: `packages/stepkg/src/sha256.ts`
- Create: `packages/stepkg/src/sha256.test.ts`
- Create: `packages/stepkg/src/buildEntries.ts`
- Create: `packages/stepkg/src/buildEntries.test.ts`
- Modify: `packages/stepkg/src/index.ts`

**Interfaces:**
- Consumes: `serializeStepkgContent`, `validateStepkgSnapshot`, asset paths, and snapshot contracts.
- Produces: `buildStepkgEntries(args): Promise<StepkgBuildResult>` where success contains `manifest` and all entries including `manifest.json`.

Define the build boundary explicitly:

```ts
export interface BuildStepkgEntriesArgs {
    snapshot: StepkgSnapshot,
    generator: {name: string, version: string},
    createdAt: Date,
    loadAsset: (contentKey: string) => Promise<Blob | null>,
    serializeContent?: (snapshot: StepkgSnapshot) => StepkgEntry[],
}

export type StepkgBuildResult =
    | {ok: true, manifest: StepkgManifest, entries: StepkgEntry[]}
    | {ok: false, issues: StepkgExportIssue[]};
```

- [ ] **Step 1: Write the failing SHA-256 test**

```ts
expect(await sha256Hex(new TextEncoder().encode('abc')))
    .toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
```

- [ ] **Step 2: Implement Web Crypto hashing**

```ts
export const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', bytes);

    return [...new Uint8Array(digest)]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
};
```

- [ ] **Step 3: Write failing asset and manifest tests**

Test a PDF attachment and assert:

```ts
const result = await buildStepkgEntries({
    snapshot,
    generator: {name: 'Stagistic', version: 'test'},
    createdAt: new Date('2026-09-18T12:00:00.000Z'),
    loadAsset: key => Promise.resolve(key === 'blob-1'
        ? new Blob(['pdf'], {type: 'application/pdf'})
        : null),
});

expect(result.ok).toBe(true);
if (result.ok) {
    expect(result.manifest.script.id).toBe(snapshot.script.id);
    expect(result.manifest.files.some(file => file.path === 'assets/att-1/score.pdf'))
        .toBe(true);
    expect(result.entries.at(-1)?.path).toBe('manifest.json');
    expect(result.manifest.files.some(file => file.path === 'manifest.json')).toBe(false);
}
```

Add another test with two missing blobs and one rejecting loader. Assert that the result contains two `asset_blob_missing` issues and one `asset_read_failed` issue, all with attachment IDs and names, and no entries.

Add a serializer-injection test:

```ts
const result = await buildStepkgEntries({
    ...validArgs,
    serializeContent: () => { throw new Error('bad document'); },
});

expect(result).toEqual({
    ok: false,
    issues: [{code: 'serialization_failed', stage: 'serialization'}],
});
```

- [ ] **Step 4: Implement asset materialization without leaking storage keys**

Run `validateStepkgSnapshot` first and return its complete issue array when non-empty. Invoke
`serializeContent ?? serializeStepkgContent` inside `try/catch`; normalize a thrown serializer to
`serialization_failed` without returning the exception message.

For every attachment, load its Blob with `contentKey`, convert it to bytes, compare `bytes.byteLength` to `sizeBytes`, and append:

```ts
{
    path: getStepkgAssetPath(attachment),
    mediaType: attachment.mimeType,
    bytes,
    compression: attachment.mimeType === 'application/pdf' ? 'store' : 'deflate',
}
```

If loaded size differs from `sizeBytes`, append `invalid_snapshot` at `assets` stage with attachment
identity and numeric `expectedSize`/`actualSize` details. Continue checking the other attachments so
the caller receives the complete deterministic issue set; return no entries when any asset issue
exists.

Serialize `data/attachments.json` only after asset paths are known. It contains `assetPath` and never contains `contentKey`.

- [ ] **Step 5: Build the manifest last**

Hash every uncompressed entry except `manifest.json`, sort `manifest.files` by path, and build:

```ts
const manifest: StepkgManifest = {
    format: STEPKG_FORMAT,
    formatVersion: STEPKG_FORMAT_VERSION,
    documentSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
    createdAt: createdAt.toISOString(),
    generator,
    script: {
        id: snapshot.script.id,
        title: snapshot.script.title,
        updatedAt: snapshot.script.updatedAt,
    },
    entrypoints: {
        document: STEPKG_DOCUMENT_PATH,
        text: STEPKG_TEXT_PATH,
    },
    files,
};
```

Assert `manifest.script.id === snapshot.script.id` before serialization. Add `manifest.json` as a DEFLATE JSON entry after all listed entries.

- [ ] **Step 6: Run package verification**

Run: `moon run stepkg:test && moon run stepkg:typecheck && moon run stepkg:lint`

Expected: PASS.

- [ ] **Step 7: Prepare the review checkpoint**

Proposed commit message:

```text
feat(stepkg): build manifest and asset entries
```

Do not commit; show manifest fixture, failure aggregation, and verification output.

---

### Task 5: Write a standards-compatible ZIP Blob

**Files:**
- Create: `packages/stepkg/src/writeArchive.ts`
- Create: `packages/stepkg/src/writeArchive.test.ts`
- Create: `packages/stepkg/src/createStepkg.ts`
- Create: `packages/stepkg/src/createStepkg.test.ts`
- Modify: `packages/stepkg/src/index.ts`

**Interfaces:**
- Consumes: successful entries from `buildStepkgEntries`.
- Produces: `writeStepkgArchive(entries): Promise<Blob>` and `createStepkg(args): Promise<StepkgExportResult>`.

- [ ] **Step 1: Write the failing ZIP compatibility test**

```ts
const blob = await writeStepkgArchive([
    {
        path: 'script.stagistic',
        mediaType: 'text/plain;charset=utf-8',
        bytes: new TextEncoder().encode('Line one\nLine two\n'),
        compression: 'deflate',
    },
    {
        path: 'assets/att-1/score.pdf',
        mediaType: 'application/pdf',
        bytes: new TextEncoder().encode('%PDF-test'),
        compression: 'store',
    },
]);
const archive = new Uint8Array(await blob.arrayBuffer());
const extracted = unzipSync(archive);

expect(blob.type).toBe(STEPKG_MEDIA_TYPE);
expect(new TextDecoder().decode(extracted['script.stagistic']))
    .toBe('Line one\nLine two\n');
expect(new TextDecoder().decode(extracted['assets/att-1/score.pdf']))
    .toBe('%PDF-test');
expect(readCentralDirectoryMethod(archive, 'script.stagistic')).toBe(8);
expect(readCentralDirectoryMethod(archive, 'assets/att-1/score.pdf')).toBe(0);
```

The test helper scans ZIP central-directory headers (`0x02014b50`) and reads the compression method at byte offset 10. Method `8` is DEFLATE; method `0` is STORE.

- [ ] **Step 2: Verify the ZIP test fails**

Run: `moon run stepkg:test`

Expected: FAIL because `writeStepkgArchive` does not exist.

- [ ] **Step 3: Implement asynchronous fflate ZIP writing**

Map each entry to fflate's per-file tuple so compression policy is explicit:

```ts
export const writeStepkgArchive = (entries: StepkgEntry[]): Promise<Blob> => {
    const zippable = Object.fromEntries(entries.map(entry => [
        entry.path,
        [entry.bytes, {level: entry.compression === 'store' ? 0 : 6}],
    ]));

    return new Promise((resolve, reject) => {
        zip(zippable, (error, data) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(new Blob([data], {type: STEPKG_MEDIA_TYPE}));
        });
    });
};
```

Do not use `zipSync`; asset archives must not synchronously monopolize the main thread.

- [ ] **Step 4: Write orchestration failure tests**

Test that `createStepkg`:

- returns build validation issues unchanged;
- returns `{code: 'archive_creation_failed', stage: 'archive'}` when an injected writer rejects;
- returns `{ok: true, blob, fileName, manifest}` for a valid snapshot;
- sanitizes the result name to `Untitled.stepkg` for an empty/unsafe title.

- [ ] **Step 5: Implement package-level orchestration**

Use dependency injection for tests:

```ts
export interface CreateStepkgArgs extends BuildStepkgEntriesArgs {
    writeArchive?: (entries: StepkgEntry[]) => Promise<Blob>,
}

export const createStepkg = async (args: CreateStepkgArgs): Promise<StepkgExportResult> => {
    const built = await buildStepkgEntries(args);

    if (!built.ok) {
        return built;
    }

    try {
        const blob = await (args.writeArchive ?? writeStepkgArchive)(built.entries);

        return {
            ok: true,
            blob,
            fileName: `${sanitizeFileName(args.snapshot.script.title)}${STEPKG_EXTENSION}`,
            manifest: built.manifest,
        };
    } catch {
        return {
            ok: false,
            issues: [{code: 'archive_creation_failed', stage: 'archive'}],
        };
    }
};
```

- [ ] **Step 6: Run package verification**

Run: `moon run stepkg:test && moon run stepkg:typecheck && moon run stepkg:lint`

Expected: PASS, including standard unzip compatibility and compression-method assertions.

- [ ] **Step 7: Prepare the review checkpoint**

Proposed commit message:

```text
feat(stepkg): create browser zip archives
```

Do not commit; show archive evidence and verification output.

---

### Task 6: Read one consistent database source snapshot

**Files:**
- Create: `packages/db/src/scriptPackageSource.ts`
- Create: `packages/db/src/repo/readScriptPackageSource.ts`
- Create: `packages/db/src/repo/readScriptPackageSource.test.ts`
- Modify: `packages/db/src/repo/config.ts`
- Modify: `packages/db/src/repo/titlePage.ts`
- Modify: `packages/db/src/repo/createLocalPgliteRepository.ts`
- Modify: `packages/db/src/scriptRepository.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Consumes: existing query functions and hydrated read logic inside `content.ts`, `config.ts`, and `titlePage.ts`.
- Produces: `ScriptRepository.getScriptPackageSource(scriptId): Promise<ScriptPackageSource | null>` for Task 7.

- [ ] **Step 1: Define the DB-owned source type**

The source may use DB domain records internally but must describe everything needed by the mapper:

```ts
export interface ScriptPackageSource {
    script: ScriptSummary,
    document: ScriptDocument,
    titlePage: TitlePageSettings,
    settings: EditorSettingsOverride,
    characters: ScriptCharacter[],
    characterGroupMembers: Array<{groupId: string, characterId: string}>,
    characterGenders: ScriptCharacterGender[],
    music: ScriptMusic[],
    locations: ScriptLocation[],
    scenes: ScriptScene[],
    sceneLocations: ScriptSceneLocationAssignment[],
    attachments: ScriptAttachment[],
    musicAttachmentBindings: ScriptMusicAttachmentBinding[],
}
```

Export raw character records for this read path so `createdAt` and `updatedAt` remain available; keep the current `ScriptCharacterRef` APIs unchanged.

- [ ] **Step 2: Write the failing repository integration test**

Create an in-memory PGlite DB, seed one script, document, title page, settings, character + group membership + gender, music item, scene + two locations, attachment metadata, and music binding. Call `repository.getScriptPackageSource('script-1')` and assert:

```ts
expect(source).toMatchObject({
    script: {id: 'script-1', title: 'Test'},
    document: {type: 'doc'},
    titlePage: {subtitle: 'Subtitle'},
    settings: {page: {widthPx: 816}},
});
expect(source?.characters.map(row => row.id)).toEqual(['character-1', 'group-1']);
expect(source?.characterGroupMembers).toEqual([
    {groupId: 'group-1', characterId: 'character-1'},
]);
expect(source?.attachments[0]).toMatchObject({
    id: 'attachment-1', storageKey: 'blob-1', filename: 'score.pdf',
});
expect(source?.musicAttachmentBindings[0]).toMatchObject({
    musicId: 'music-1', attachmentId: 'attachment-1',
});
```

Also assert a missing script returns `null` rather than a partially empty snapshot.

- [ ] **Step 3: Verify the repository test fails**

Run: `moon run db:test -- src/repo/readScriptPackageSource.test.ts`

Expected: FAIL because the repository method does not exist.

- [ ] **Step 4: Extract transaction-aware read helpers without changing existing behavior**

The document reader is already transaction-aware: call
`loadScriptDocumentFromProjection(tx, scriptId)` from `documentProjection.ts` and use its
`document` field. Refactor settings and title-page hydration into exported functions accepting
`DbClient`:

```ts
export const readScriptSettings = async (
    db: DbClient,
    scriptId: string,
): Promise<EditorSettingsOverride | null> => {
    const [
        pageLayout,
        visual,
        structure,
        initialPages,
        headerFooterRows,
        blocks,
    ] = await Promise.all([
        dbQueries.getScriptPageLayoutSettings(db, scriptId),
        dbQueries.getScriptVisualPreferences(db, scriptId),
        dbQueries.getScriptStructureSettings(db, scriptId),
        dbQueries.getScriptInitialPagesSettings(db, scriptId),
        dbQueries.listScriptHeaderFooterSettings(db, scriptId),
        dbQueries.listScriptBlockSettings(db, scriptId),
    ]);

    return hydrateScriptSettingsRows({
        pageLayout,
        visual,
        structure,
        initialPages,
        headerFooterRows,
        blocks,
    });
};

export const readTitlePageSettings = async (
    db: DbClient,
    scriptId: string,
): Promise<TitlePageSettings | null> => {
    const settings = toTitlePageSettings(
        await dbQueries.listScriptTitlePageFields(db, scriptId),
    );
    const subtitle = await dbQueries.getScriptSubtitle(db, scriptId);

    if (subtitle === null || subtitle.length === 0) {
        return settings;
    }

    return {...settings, subtitle};
};
```

Create `hydrateScriptSettingsRows` by moving the current mapping block from
`createSettingsHandlers.loadScriptSettings` without changing its field rules: page and typography
come from `pageLayout`; visual saturation from `visual`; act display from `structure`; cast/song
options from `initialPages`; header/footer cells are accepted only for known area/alignment values;
block rows remain normalized through `hydrateBlockSettings`; an empty `blocks` object is removed.
Keep the existing public repository methods delegating to these helpers and add regression
assertions showing their results are unchanged.

- [ ] **Step 5: Implement the aggregate reader inside one transaction**

`createReadScriptPackageSource({getDb})` returns the repository handler:

```ts
export const createReadScriptPackageSource = ({getDb}: {getDb: GetDb}) => async (
    scriptId: string,
): Promise<ScriptPackageSource | null> => {
    const db = await getDb();

    return db.transaction(async tx => {
        const script = await dbQueries.getScriptSummary(tx, scriptId);

        if (!script) {
            return null;
        }

        const [
            document,
            titlePage,
            settings,
            characters,
            characterGroupMembers,
            characterGenders,
            music,
            locations,
            scenes,
            sceneLocations,
            attachments,
            musicAttachmentBindings,
        ] = await Promise.all([
            loadScriptDocumentFromProjection(tx, scriptId),
            readTitlePageSettings(tx, scriptId),
            readScriptSettings(tx, scriptId),
            dbQueries.listRawScriptCharacters(tx, scriptId),
            dbQueries.listScriptCharacterGroupMembers(tx, scriptId),
            dbQueries.listRawScriptCharacterGenders(tx, scriptId),
            dbQueries.listScriptMusic(tx, scriptId),
            dbQueries.listScriptLocations(tx, scriptId),
            dbQueries.listScriptScenes(tx, scriptId),
            dbQueries.listScriptSceneLocations(tx, scriptId),
            dbQueries.listScriptAttachments(tx, scriptId),
            dbQueries.listScriptMusicAttachmentBindings(tx, scriptId),
        ]);

        if (!document) {
            return null;
        }

        return {
            script,
            document: document.document,
            titlePage: titlePage ?? {},
            settings: settings ?? {},
            characters,
            characterGroupMembers,
            characterGenders,
            music,
            locations,
            scenes,
            sceneLocations,
            attachments,
            musicAttachmentBindings,
        };
    });
};
```

Add the narrowly scoped raw read queries only where current public query functions discard timestamps or membership rows. Do not change schema or write paths.

- [ ] **Step 6: Wire and export the repository method**

Add to `ScriptRepository`:

```ts
getScriptPackageSource(scriptId: string): Promise<ScriptPackageSource | null>,
```

Wire it in `createLocalPgliteRepository` using the same `getDb` dependency as other read handlers. Export the source type from `@stagistic/db`.

- [ ] **Step 7: Run DB verification**

Run: `moon run db:test -- src/repo/readScriptPackageSource.test.ts`

Run: `moon run db:test && moon run db:typecheck && moon run db:lint`

Expected: PASS. Confirm `git diff -- packages/db/src/schema.ts drizzle` is empty, so no migration compilation is required.

- [ ] **Step 8: Prepare the review checkpoint**

Proposed commit message:

```text
feat(db): expose consistent script package snapshot
```

Do not commit; show transaction coverage and DB verification output.

---

### Task 7: Map the DB snapshot to the portable package model

**Files:**
- Create: `packages/app-core/src/stepkg/mapStepkgSnapshot.ts`
- Create: `packages/app-core/src/stepkg/mapStepkgSnapshot.test.ts`
- Create: `packages/app-core/src/stepkg/index.ts`
- Modify: `packages/app-core/src/index.ts`
- Modify: `packages/app-core/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `ScriptPackageSource` from Task 6.
- Produces: `mapStepkgSnapshot(source): StepkgSnapshot` for the orchestration task.

- [ ] **Step 1: Add the workspace dependency**

Add to `packages/app-core/package.json`:

```json
"@stagistic/stepkg": "workspace:*"
```

Run `pnpm install` to update the lockfile.

- [ ] **Step 2: Write the failing mapper test**

Use a source fixture with numeric millisecond timestamps, one character, one group, one location assignment, and one attachment. Assert:

```ts
expect(mapStepkgSnapshot(source)).toEqual({
    script: {
        id: 'script-1',
        title: 'Test',
        subtitle: null,
        createdAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T11:00:00.000Z',
    },
    document: source.document,
    titlePage: source.titlePage,
    settings: source.settings,
    characters: {
        characters: [expect.objectContaining({id: 'character-1'})],
        groups: [expect.objectContaining({
            id: 'group-1', memberIds: ['character-1'],
        })],
        genderOptions: [expect.objectContaining({id: 'gender-1'})],
    },
    music: {items: [expect.objectContaining({id: 'music-1'})]},
    scenes: {
        scenes: [expect.objectContaining({
            id: 'scene-1', locationIds: ['location-1'],
        })],
        locations: [expect.objectContaining({id: 'location-1'})],
    },
    attachments: [expect.objectContaining({
        id: 'attachment-1', contentKey: 'blob-1',
    })],
    attachmentBindings: [expect.objectContaining({
        target: {type: 'music', id: 'music-1'},
        attachmentId: 'attachment-1',
    })],
});
```

- [ ] **Step 3: Implement explicit mapping**

Map each field by name; do not spread raw DB records into the portable contract. Convert every numeric timestamp through:

```ts
const toIsoTimestamp = (value: number): string => new Date(value).toISOString();
```

Build group member IDs and scene location IDs from their relationship arrays. Sort ID-derived arrays by stable source ordering, then by ID as a deterministic tie-breaker. Map `storageKey` only to internal `contentKey`; it must never reach serialized attachment data.

- [ ] **Step 4: Run app-core mapper verification**

Run: `moon run app-core:test -- src/stepkg/mapStepkgSnapshot.test.ts`

Run: `moon run app-core:typecheck && moon run app-core:lint`

Expected: PASS.

- [ ] **Step 5: Prepare the review checkpoint**

Proposed commit message:

```text
feat(app-core): map script package snapshots
```

Do not commit; show the mapper fixture and verification output.

---

### Task 8: Orchestrate flush, snapshot, assets, and structured results

**Files:**
- Create: `packages/app-core/src/stepkg/exportStepkg.ts`
- Create: `packages/app-core/src/stepkg/exportStepkg.test.ts`
- Create: `packages/app-core/src/stepkg/exportStepkg.browser.test.ts`
- Modify: `packages/app-core/src/stepkg/index.ts`

**Interfaces:**
- Consumes: `ScriptRepository.getScriptPackageSource`, `mapStepkgSnapshot`, and `createStepkg`.
- Produces: `exportStepkg(args): Promise<StepkgExportResult>` for the later export UI phase.

- [ ] **Step 1: Write failing orchestration tests**

Test these exact cases with a fake repository:

```ts
it('flushes before reading the repository snapshot', async () => {
    const order: string[] = [];
    const result = await exportStepkg({
        scriptId: 'script-1',
        repository: fakeRepository({
            onReadPackageSource: () => order.push('snapshot'),
        }),
        flush: async () => { order.push('flush'); },
        generator: {name: 'Stagistic', version: 'test'},
        createdAt: new Date('2026-09-18T12:00:00.000Z'),
    });

    expect(order).toEqual(['flush', 'snapshot']);
    expect(result.ok).toBe(true);
});

it('reports flush failure without reading data', async () => {
    const repository = fakeRepository();
    const result = await exportStepkg({
        scriptId: 'script-1',
        repository,
        flush: () => Promise.reject(new Error('save failed')),
        generator: {name: 'Stagistic', version: 'test'},
    });

    expect(result).toEqual({
        ok: false,
        issues: [{code: 'editor_flush_failed', stage: 'flush'}],
    });
    expect(repository.getScriptPackageSource).not.toHaveBeenCalled();
});
```

Also test:

- missing source returns `script_not_found` at `snapshot` stage;
- `getAttachmentBlob` null becomes `asset_blob_missing` with attachment identity;
- `getAttachmentBlob` rejection becomes `asset_read_failed`;
- a successful result contains `.stepkg` filename, expected MIME, and manifest source ID.

- [ ] **Step 2: Verify tests fail**

Run: `moon run app-core:test -- src/stepkg/exportStepkg.test.ts`

Expected: FAIL because `exportStepkg` does not exist.

- [ ] **Step 3: Implement the orchestration boundary**

```ts
export interface ExportStepkgArgs {
    scriptId: string,
    repository: ScriptRepository,
    flush: () => Promise<void>,
    generator: {name: string, version: string},
    createdAt?: Date,
}

export const exportStepkg = async ({
    scriptId,
    repository,
    flush,
    generator,
    createdAt = new Date(),
}: ExportStepkgArgs): Promise<StepkgExportResult> => {
    try {
        await flush();
    } catch {
        return {
            ok: false,
            issues: [{code: 'editor_flush_failed', stage: 'flush'}],
        };
    }

    const source = await repository.getScriptPackageSource(scriptId);

    if (!source) {
        return {
            ok: false,
            issues: [{
                code: 'script_not_found',
                stage: 'snapshot',
                entity: {type: 'script', id: scriptId},
            }],
        };
    }

    const snapshot = mapStepkgSnapshot(source);

    return createStepkg({
        snapshot,
        generator,
        createdAt,
        loadAsset: contentKey => repository.getAttachmentBlob(contentKey),
    });
};
```

Catch unexpected source-read failures and normalize them to `invalid_snapshot` at `snapshot` stage with safe details only; do not expose arbitrary exception messages in the public result.

- [ ] **Step 4: Add a real browser-runtime package test**

In `exportStepkg.browser.test.ts`, use a small fake repository with a PDF Blob and call `exportStepkg`. Read the returned Blob with `arrayBuffer`, unzip it through `fflate`, and assert:

```ts
expect(result.ok).toBe(true);
if (result.ok) {
    expect(result.blob.type).toBe('application/vnd.stagistic.package+zip');
    expect(result.fileName).toBe('Browser Test.stepkg');
    expect(result.manifest.script.id).toBe('script-browser');
}
```

This is the phase-one proof that generation uses browser APIs without a server.

- [ ] **Step 5: Run orchestration verification**

Run: `moon run app-core:test -- src/stepkg/exportStepkg.test.ts`

Run: `moon run app-core:test-browser -- src/stepkg/exportStepkg.browser.test.ts`

Run: `moon run app-core:typecheck && moon run app-core:lint`

Expected: PASS.

- [ ] **Step 6: Prepare the review checkpoint**

Proposed commit message:

```text
feat(app-core): orchestrate stepkg export
```

Do not commit; show node/browser test evidence and the public function signature.

---

### Task 9: End-to-end integrity and workspace verification

**Files:**
- Create: `packages/app-core/src/stepkg/exportStepkg.integration.test.ts`
- Modify: `docs/superpowers/specs/2026-09-18-stepkg-export-format-design.md` only to mark implementation status after every check passes.
- Update generated graph data through `graphify update .`.

**Interfaces:**
- Consumes: all phase-one APIs from Tasks 1–8.
- Produces: one real-repository proof that DB rows and IndexedDB-like attachment storage become a complete, externally readable `.stepkg` Blob.

- [ ] **Step 1: Write the real-repository integration test**

Use `createTestDb`, `InMemoryFileStorage`, and `createLocalPgliteRepository`. Create a script through repository APIs, save a document with fixed block IDs, save title page/settings, confirm a character/group/gender, create music/location data, attach a PDF, retain the returned attachment ID, and call `exportStepkg` with `flush: () => Promise.resolve()`.

Unzip the returned Blob and assert:

```ts
const assetPath = `assets/${attachment.id}/score.pdf`;

expect(Object.keys(files).sort()).toEqual([
    assetPath,
    'data/attachments.json',
    'data/characters.json',
    'data/music.json',
    'data/scenes.json',
    'data/script.json',
    'data/settings.json',
    'data/title-page.json',
    'document.json',
    'manifest.json',
    'script.stagistic',
]);
expect(JSON.parse(text(files['manifest.json'])).script.id).toBe(scriptId);
expect(JSON.parse(text(files['document.json'])).content[0].attrs.id).toBe('block-1');
expect(text(files['script.stagistic'])).toContain('# Act One');
expect(text(files[assetPath])).toBe('%PDF-test');
```

Recompute every manifest SHA-256 from extracted bytes and assert exact equality and `byteLength`.

- [ ] **Step 2: Run focused integration verification**

Run: `moon run app-core:test -- src/stepkg/exportStepkg.integration.test.ts`

Expected: PASS.

- [ ] **Step 3: Run all affected project checks**

Run:

```bash
moon run stepkg:test
moon run stepkg:typecheck
moon run stepkg:lint
moon run db:test
moon run db:typecheck
moon run db:lint
moon run app-core:test
moon run app-core:test-browser
moon run app-core:typecheck
moon run app-core:lint
```

Expected: all PASS. If a known browser-test baseline failure appears outside touched `.stepkg` files, establish the baseline once under the repository rule and report it without changing snapshots, assertions, or viewport.

- [ ] **Step 4: Run whole-workspace safety checks**

Run:

```bash
moon run root:typecheck
moon run root:lint
moon run root:format-check
moon run root:test
```

Expected: all PASS, except any explicitly baselined pre-existing failure documented with its untouched file/test name.

- [ ] **Step 5: Refresh the code graph**

Run: `graphify update .`

Expected: Graphify completes and includes the new `@stagistic/stepkg` package and DB/app-core edges.

- [ ] **Step 6: Perform the final contract audit**

Inspect a generated archive and confirm:

- extension `.stepkg` and MIME are exact;
- renaming to `.zip` opens in a standard ZIP reader;
- `manifest.script.id` equals `data/script.json.id`;
- `manifest.files` lists every entry except `manifest.json`;
- hashes and uncompressed byte lengths match;
- `document.json` retains node IDs;
- `script.stagistic` retains exact serializer line endings after unzip;
- PDFs use STORE and JSON/text use DEFLATE;
- no serialized JSON contains `storageKey`, `contentKey`, table names, cache rows, outbox rows, or `activeBlockId`;
- no existing `.stagistic` action or UI behavior changed.

- [ ] **Step 7: Mark the design implemented only after verification**

Change the design status from `approved design, implementation planned` to `implemented` only when every required check above has evidence.

- [ ] **Step 8: Prepare the final review checkpoint**

Summarize the produced API, archive proof, checks, and any baselined limitations. Propose commit message:

```text
feat: add stepkg package export foundation
```

Do not commit; ask the user to review and perform the final commit.
