# Example Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Home create a new, fully populated example musical script from lazy-loaded `.stagistic` and PDF assets.

**Architecture:** A Home-only lazy module loads the raw Stagistic source and the emitted PDF asset. It parses the source to fresh block/music IDs, normalizes its sole music start to a `song`, discovers and confirms characters, links their IDs into the document, persists it through the normal projection writer, then attaches the PDF to that freshly generated song.

**Tech Stack:** TypeScript, React, Vite asset imports, Stagistic parser, PGlite/Drizzle repository, IndexedDB `FileStorage`, vite-plus tests.

## Global Constraints

- Keep the template and score out of initial application JS and out of database initialization. Load the creation module only from the Home click handler.
- Do not extend `importStagisticFile` or the global import modal.
- Do not change DB schema/migrations or `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
- Use current `ScriptRepository` APIs: `confirmScriptCharacterWithId`, `saveLatest`, `setMusicAttachment`, and `removeMusicAttachment`.
- The template's PDF must be a valid non-empty PDF; never use a zero-byte placeholder.
- Canonical checks: `npx tsc -b`, `pnpm lint`, `pnpm test`, and `pnpm --filter @stagistic/app-routes test:browser`. Do not use `vp lint` or `vp fmt`.
- Test imports use `import {describe, it, expect} from 'vite-plus/test'`.
- Do not commit. After each task, stage the listed files, propose the message, and ask the human to make the commit.
- After code changes run `graphify update .`.

---

## File Structure

**New files**

- `packages/app-routes/src/routes/home/example-script/example-script.stagistic` — source body/frontmatter of the checked-in template.
- `packages/app-routes/src/routes/home/example-script/example-score.pdf` — valid blank score placeholder, later replaced with the supplied score.
- `packages/app-routes/src/routes/home/example-script/loadExampleScriptTemplate.ts` — lazy asset loader and parser boundary.
- `packages/app-routes/src/routes/home/example-script/prepareExampleScriptDocument.ts` — pure document validation, `song` normalization, and character-key discovery.
- `packages/app-routes/src/routes/home/example-script/createExampleScript.ts` — persistence use-case with compensation.
- `packages/app-routes/src/routes/home/example-script/prepareExampleScriptDocument.test.ts` — source-structure regression tests.
- `packages/app-routes/src/routes/home/example-script/loadExampleScriptTemplate.browser.test.ts` — browser asset/PDF-loader test.
- `packages/app-routes/src/routes/home/example-script/createExampleScript.test.ts` — use-case tests with repository fakes.

**Modified files**

- `packages/app-routes/src/routes/home/HomeRoute.tsx` — activate the Home card, lazy-load the use-case, show pending/error states, and navigate on success.
- `packages/app-routes/src/routes/home/HomeRoute.browser.test.tsx` — cover the now-active card and its success/failure state.

## Task 1: Build and validate the lazy template asset

**Files:**

- Create: `packages/app-routes/src/routes/home/example-script/example-script.stagistic`
- Create: `packages/app-routes/src/routes/home/example-script/example-score.pdf`
- Create: `packages/app-routes/src/routes/home/example-script/loadExampleScriptTemplate.ts`
- Create: `packages/app-routes/src/routes/home/example-script/prepareExampleScriptDocument.ts`
- Test: `packages/app-routes/src/routes/home/example-script/prepareExampleScriptDocument.test.ts`
- Test: `packages/app-routes/src/routes/home/example-script/loadExampleScriptTemplate.browser.test.ts`

**Interfaces:**

- Produces `loadExampleScriptTemplate(): Promise<ExampleScriptTemplate>`.
- Produces `prepareExampleScriptDocument(document: ScriptDocument): PreparedExampleScript` where:

```ts
export interface PreparedExampleScript {
    document: ScriptDocument,
    characterKeys: readonly string[],
    scoreMusicId: string,
}

export interface ExampleScriptTemplate extends PreparedExampleScript {
    title: string,
    titlePage: TitlePageSettings,
    score: {
        name: string,
        type: 'application/pdf',
        size: number,
        blob: Blob,
    },
}
```

- Consumed by Task 2 only; the template module must not expose the raw asset URL to Home.

- [ ] **Step 1: Write the structural regression test**

Create `prepareExampleScriptDocument.test.ts`. Import the actual source with
`import source from './example-script.stagistic?raw'`, parse it with
`parseStagistic(source)`, then pass the document to
`prepareExampleScriptDocument()`. Assert all of the following:

```ts
const parsed = parseStagistic(source);
const {document, characterKeys, scoreMusicId} = prepareExampleScriptDocument(parsed.document);
const {snapshot} = buildScriptBlockIndex(document);

expect(snapshot.blocks.filter(block => block.blockType === 'act')).toHaveLength(2);
expect(snapshot.blocks.filter(block => block.blockType === 'scene')).toHaveLength(4);
expect(characterKeys).toHaveLength(2);
expect(snapshot.blocks.some(block => block.blockType === 'stageDirection'
    && block.characterRefs?.some(ref => ref.characterId === null))).toBe(true);
expect(snapshot.blocks.filter(block => block.blockType === 'lyrics').length).toBeGreaterThan(0);
expect(snapshot.music).toHaveLength(1);
expect(snapshot.music[0]).toMatchObject({musicId: scoreMusicId, kind: 'song', mode: 'open'});
expect(snapshot.orphanMusicOutBlockIds).toEqual([]);
```

Add a second test that parses `source` twice and verifies the two prepared
documents have different block IDs and `scoreMusicId` values. This proves the
parser, not the source asset, supplies runtime IDs.

Create `loadExampleScriptTemplate.browser.test.ts` and call the actual loader.
Assert `template.score.type === 'application/pdf'`, `template.score.size > 0`,
and that `pdfjs.getDocument({data: await template.score.blob.arrayBuffer()})`
resolves to a document with `numPages > 0`. Destroy the loaded PDF document in a
`finally` block.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @stagistic/app-routes test run prepareExampleScriptDocument`

Expected: FAIL because the template module does not exist.

- [ ] **Step 3: Author the source and valid score placeholder**

Create `example-script.stagistic` using only standard Stagistic syntax. Before final copy is supplied, use concise neutral copy, but preserve this exact authored structure:

```text
frontmatter with a title
# ACT ONE
## Scene one
first confirmed character cue + dialogue
## Scene two
second confirmed character cue + dialogue
# ACT TWO
## Scene three
stage direction containing @<first character> and @@music 1 "<song title>"
first character cue followed by at least one uppercase lyrics line
stage direction containing @@out 1
## Scene four
second character cue + dialogue
```

The stage-direction character reference must use `@NAME`, not plain text, so it becomes a `characterTag` mark. The `@@out 1` must close the same open song. Store a one-page blank but valid PDF as `example-score.pdf`.

- [ ] **Step 4: Implement the pure preparation function**

In `prepareExampleScriptDocument.ts`:

1. Walk all nodes immutably and replace the only `musicStart` node's attrs with `{...attrs, kind: 'song'}`. Throw `Error('Example script must contain exactly one music start.')` if the count differs.
2. Build `characterKeys` from `collectScriptCharacterStats(document, new Set()).countsByKey`, sorted with `localeCompare`. Throw `Error('Example script must contain at least two characters.')` if fewer than two unique keys exist.
3. Use `buildScriptBlockIndex` to validate exactly two acts; count scene blocks between each act heading and require at least two scenes in each act; require at least one `lyrics` block, at least one stage-direction `characterTag`, one song, and no `orphanMusicOutBlockIds`. Throw an error whose first words are `Invalid example script:` for any contract failure.
4. Return the normalized document, discovered keys, and the sole derived `musicId` as `scoreMusicId`.

Use the exported constants `MUSIC_START_NODE_NAME` and `MUSIC_KIND_ATTR`; do not duplicate raw attribute names outside this one transform.

- [ ] **Step 5: Implement the lazy loader**

In `loadExampleScriptTemplate.ts` use module-local asset imports:

```ts
import source from './example-script.stagistic?raw';
import scoreUrl from './example-score.pdf?url';
```

Implement the loader as:

```ts
export const loadExampleScriptTemplate = async (): Promise<ExampleScriptTemplate> => {
    const parsed = parseStagistic(source);
    const prepared = prepareExampleScriptDocument(parsed.document);
    const response = await fetch(scoreUrl);

    if (!response.ok) {
        throw new Error(`Example score could not be loaded (${response.status}).`);
    }

    const blob = await response.blob();

    if (blob.size === 0 || blob.type !== 'application/pdf') {
        throw new Error('Example score must be a non-empty PDF.');
    }

    return {
        ...prepared,
        title: trimOrFallback(parsed.title, 'Example musical'),
        titlePage: parsed.titlePage,
        score: {
            name: 'example-score.pdf',
            type: 'application/pdf',
            size: blob.size,
            blob,
        },
    };
};
```

- [ ] **Step 6: Run focused checks**

Run:

```bash
pnpm --filter @stagistic/app-routes test run prepareExampleScriptDocument
pnpm --filter @stagistic/app-routes test:browser -- loadExampleScriptTemplate
pnpm --filter @stagistic/app-routes typecheck
```

Expected: both PASS.

- [ ] **Step 7: Stage and request commit**

```bash
git add packages/app-routes/src/routes/home/example-script
```

Proposed message: `feat(home): add lazy example script template assets`.

Stop and ask the human to review and commit.

## Task 2: Persist a fully linked example script with compensation

**Files:**

- Create: `packages/app-routes/src/routes/home/example-script/createExampleScript.ts`
- Test: `packages/app-routes/src/routes/home/example-script/createExampleScript.test.ts`

**Interfaces:**

- Consumes: `ExampleScriptTemplate` and `loadExampleScriptTemplate` from Task 1.
- Produces:

```ts
export interface ExampleScriptActions {
    createScript(title: string, document: ScriptDocument): Promise<string>,
    deleteScript(scriptId: string): Promise<void>,
}

export interface CreateExampleScriptArgs {
    actions: ExampleScriptActions,
    repository: Pick<
        ScriptRepository,
        | 'allocateScriptCharacterId'
        | 'confirmScriptCharacterWithId'
        | 'saveLatest'
        | 'saveTitlePage'
        | 'setMusicAttachment'
        | 'removeMusicAttachment'
    >,
}

export interface CreatedExampleScript {
    scriptId: string,
    title: string,
}

export const createExampleScript: (args: CreateExampleScriptArgs) => Promise<CreatedExampleScript>;
```

- Consumed by Task 3 through a dynamic import.

- [ ] **Step 1: Write the success-path test**

Use a repository fake with deterministic IDs (`character-1`, `character-2`) and spies. Mock `loadExampleScriptTemplate` to return a known prepared template with two keys and `scoreMusicId: 'music-new'`.

Assert in order:

```ts
expect(actions.createScript).toHaveBeenCalledWith('Example musical', template.document);
expect(repository.confirmScriptCharacterWithId).toHaveBeenCalledTimes(2);
expect(repository.saveLatest).toHaveBeenCalledWith('script-new', expect.any(Object));
expect(repository.setMusicAttachment).toHaveBeenCalledWith(
    'script-new',
    'music-new',
    MUSIC_ATTACHMENT_ROLES.integratedScore,
    template.score,
);
expect(actions.deleteScript).not.toHaveBeenCalled();
```

Inspect the saved document with `buildScriptBlockIndex`; every discovered key must have a non-null character ID and the stage-direction tag must contain the corresponding ID.

- [ ] **Step 2: Write compensation tests**

Add two cases:

1. `saveLatest` rejects: `deleteScript('script-new')` is called, but `removeMusicAttachment` is not called.
2. `setMusicAttachment` succeeds and `saveTitlePage` then rejects: `removeMusicAttachment('script-new', 'music-new', MUSIC_ATTACHMENT_ROLES.integratedScore)` runs before `deleteScript('script-new')`.

The returned promise must reject with the primary operation error in both cases.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @stagistic/app-routes test run createExampleScript`

Expected: FAIL because `createExampleScript` does not exist.

- [ ] **Step 4: Implement the use-case**

Implement `createExampleScript` with this sequence:

```ts
const template = await loadExampleScriptTemplate();
const scriptId = await actions.createScript(template.title, template.document);
let attached = false;
let linkedDocument = template.document;

try {
    for (const key of template.characterKeys) {
        const characterId = repository.allocateScriptCharacterId();
        const confirmed = await repository.confirmScriptCharacterWithId(scriptId, {
            id: characterId,
            key,
        });

        if (!confirmed) {
            throw new Error(`Example character ${key} could not be confirmed.`);
        }

        linkedDocument = linkCharacterRefInScriptDocument(
            linkedDocument,
            confirmed.key,
            confirmed.id,
        ).value;
    }

    await repository.saveLatest(scriptId, linkedDocument);
    await repository.setMusicAttachment(
        scriptId,
        template.scoreMusicId,
        MUSIC_ATTACHMENT_ROLES.integratedScore,
        template.score,
    );
    attached = true;
    await repository.saveTitlePage(scriptId, template.titlePage);

    return {scriptId, title: template.title};
} catch (error) {
    if (attached) {
        await repository.removeMusicAttachment(
            scriptId,
            template.scoreMusicId,
            MUSIC_ATTACHMENT_ROLES.integratedScore,
        ).catch(cleanupError => console.error('Failed to remove example score.', cleanupError));
    }

    await actions.deleteScript(scriptId).catch(cleanupError => {
        console.error('Failed to remove incomplete example script.', cleanupError);
    });
    throw error;
}
```

Set `attached = true` immediately after `setMusicAttachment` resolves. `saveLatest` must precede attachment because it is what reconciles the document's generated `musicId` into `script_music`.

- [ ] **Step 5: Run focused checks**

Run:

```bash
pnpm --filter @stagistic/app-routes test run createExampleScript
pnpm --filter @stagistic/app-routes typecheck
```

Expected: both PASS.

- [ ] **Step 6: Stage and request commit**

```bash
git add packages/app-routes/src/routes/home/example-script/createExampleScript.ts \
  packages/app-routes/src/routes/home/example-script/createExampleScript.test.ts
```

Proposed message: `feat(home): persist fully linked example scripts`.

Stop and ask the human to review and commit.

## Task 3: Wire the Home action and user feedback

**Files:**

- Modify: `packages/app-routes/src/routes/home/HomeRoute.tsx`
- Modify: `packages/app-routes/src/routes/home/HomeRoute.browser.test.tsx`

**Interfaces:**

- Consumes: `createExampleScript(args)` from Task 2, dynamically loaded only in the click handler.
- Consumes: `createScript` and `deleteScript` returned by `useScripts()`, plus `useScriptRepository()`.
- Produces: one normal navigation to `/script/:id/editor` on success.

- [ ] **Step 1: Update the Home test doubles and write the success test**

Extend the `@stagistic/app-core` mock to provide `createScript` and `deleteScript` from `useScripts`, plus `useScriptRepository`. Mock `./example-script/createExampleScript` to resolve:

```ts
{scriptId: 'example-1', title: 'Example musical'}
```

Mount Home inside a memory router that renders the current pathname. Click **Create example script** and assert:

```ts
expect(exampleButton?.disabled).toBe(false);
expect(document.body.textContent).toContain('Creating example script');
expect(document.body.textContent).toContain('/script/example-1/editor');
```

Assert that New script and Import script retain their current calls. Do not test the creation internals here; Task 2 owns those.

- [ ] **Step 2: Add the failure-state browser test**

Mock `createExampleScript` to reject `new Error('score missing')`. After clicking the card, assert the button becomes enabled again and the failure copy is visible. Assert the route remains `/`.

- [ ] **Step 3: Run the browser test to verify it fails**

Run: `pnpm --filter @stagistic/app-routes test:browser -- HomeRoute`

Expected: FAIL because the card is currently disabled and does not import the use-case.

- [ ] **Step 4: Implement the Home handler**

In `HomeRoute.tsx`:

1. Read `createScript` and `deleteScript` from `useScripts()` and `scriptRepository` from `useScriptRepository()`.
2. Add `const [isCreatingExample, setIsCreatingExample] = useState(false)`.
3. Add a callback that sets pending state, then dynamically imports the module:

```ts
const {createExampleScript} = await import('./example-script/createExampleScript');
const example = await createExampleScript({
    actions: {createScript, deleteScript},
    repository: scriptRepository,
});
void navigate(`/script/${example.scriptId}/editor`);
```

4. In `catch`, log `Failed to create example script` and render a local visible error message: `Could not create the example script. Please try again.` Do not route or leave a partially disabled card.
5. In `finally`, set `isCreatingExample` back to `false`.
6. Replace the third card's static `disabled` state with `disabled={isCreatingExample}`, add `onClick`, and replace `Not available yet` with `Creating example script…` only while pending. Preserve the existing title and description when idle.

Keep `import('./example-script/createExampleScript')` inside the callback; a top-level import fails the lazy-loading requirement.

- [ ] **Step 5: Run focused browser and type checks**

Run:

```bash
pnpm --filter @stagistic/app-routes test:browser -- HomeRoute
pnpm --filter @stagistic/app-routes typecheck
```

Expected: both PASS.

- [ ] **Step 6: Stage and request commit**

```bash
git add packages/app-routes/src/routes/home/HomeRoute.tsx \
  packages/app-routes/src/routes/home/HomeRoute.browser.test.tsx
```

Proposed message: `feat(home): create example scripts from the start action`.

Stop and ask the human to review and commit.

## Task 4: Verify the complete flow and build boundary

**Files:**

- Modify only if checks demand a local correction: files from Tasks 1–3.

**Interfaces:**

- Verifies the complete result: a normal script in PGlite, confirmed characters and linked refs, a song row, and an IndexedDB-backed `integrated_score` attachment.

- [ ] **Step 1: Run canonical verification**

Run:

```bash
npx tsc -b
pnpm lint
pnpm --filter @stagistic/app-routes test run
pnpm --filter @stagistic/app-routes test:browser -- HomeRoute
graphify update .
```

Expected: all checks pass. If an unrelated pre-existing failure appears, record it once and do not alter snapshots, assertions, or viewport settings to mask it.

- [ ] **Step 2: Inspect the production build output**

Run:

```bash
pnpm --filter @stagistic/web build
```

Inspect the generated Vite manifest/output. Verify the initial Home entry does not contain the raw `.stagistic` text and that the PDF is emitted as a distinct asset referenced only by the lazily loaded example-script chunk.

- [ ] **Step 3: Smoke-test repeated creation in the browser**

Create the example twice from Home. For each resulting script, inspect the Characters and Music Attribute Manager panels and verify two confirmed characters, one `song`, and an `Integrated score` PDF. Return to Home and verify the library has two distinct scripts. This confirms that fresh parsed IDs, rather than a fixed template ID, drive both creations.

- [ ] **Step 4: Stage and request final commit**

```bash
git add packages/app-routes/src/routes/home/example-script \
  packages/app-routes/src/routes/home/HomeRoute.tsx \
  packages/app-routes/src/routes/home/HomeRoute.browser.test.tsx \
  graphify-out
```

Proposed message: `feat(home): add local example musical script`.

Stop and ask the human to review and commit.
