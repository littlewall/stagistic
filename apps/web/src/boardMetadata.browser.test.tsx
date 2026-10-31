import '@stagistic/ui/styles/base.css';

import {createScriptSnapshotFromCurrent} from '@stagistic/app-core';
import {requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {
    cardOf,
    createScript,
    findButton,
    mountApp,
    mountedRoots,
    repository,
    sceneHeadings,
    waitFor,
} from './boardTestFixtures';

const until = async (check: () => Promise<boolean>, timeoutMs = 10_000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (await check()) return;

        await new Promise(resolve => setTimeout(resolve, 25));
    }

    throw new Error('Timed out waiting for the repository');
};

const synopsisOf = async (scriptId: string, headingBlockId: string) => (await repository.getScriptSceneSynopsesSource(scriptId).read())
    .find(row => row.headingBlockId === headingBlockId)?.synopsis ?? null;

const notesOf = async (scriptId: string) => (await repository.listSceneCharacters(scriptId)).map(row => [row.headingBlockId, row.note]);

const remount = async (path: string) => {
    mountedRoots.pop()?.unmount();
    document.body.innerHTML = '';
    await mountApp(path);
    await waitFor(() => sceneHeadings().length === 3);
};

describe('Board scene metadata', () => {
    it('writes an outline and a note on a card that survive a reload', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await userEvent.click(requireValue(findButton('Outline of scene 2')));
        await userEvent.keyboard('Ben hides.{Enter}Night falls.');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        await userEvent.click(requireValue(findButton('BEN')));
        await waitFor(() => document.querySelector('textarea'));
        await userEvent.keyboard('Wants to be found');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        await until(async () => await synopsisOf(scriptId, 's2') === 'Ben hides.\nNight falls.' && (await notesOf(scriptId)).length === 1);
        await remount(`/script/${scriptId}/board/wall`);

        const garden = await waitFor(() => cardOf('2. Garden').textContent?.includes('Wants to be found') && cardOf('2. Garden'));

        expect(garden.textContent).toContain('Ben hides.\nNight falls.');
        expect(findButton('BEN: Wants to be found')).toBeDefined();
    });

    it('keeps a character the script dropped from the scene hollow on the card, with its note', async () => {
        const {scriptId, benId} = await createScript();
        const latest = requireValue(await repository.loadLatest(scriptId));

        await repository.putSceneCharacter(scriptId, 's2', benId, {note: 'Leaves'});
        await repository.saveLatest(scriptId, {...latest, content: latest.content.filter(node => !['c2', 'd2'].includes(String(node.attrs?.id)))});
        await mountApp(`/script/${scriptId}/board/wall`);

        const row = await waitFor(() => findButton('BEN, only on the card: Leaves'));

        await userEvent.click(row);
        await waitFor(() => document.querySelector('[role="dialog"]'));
        await userEvent.click(requireValue(findButton('Remove from card')));
        await until(async () => (await notesOf(scriptId)).length === 0);
        await waitFor(() => !findButton('BEN, only on the card: Leaves'));
    });

    it('adds a new character to a card, colored from the palette', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await userEvent.click(requireValue(findButton('Add character to scene 1')));
        await waitFor(() => document.querySelector('input[type="search"]'));
        await userEvent.keyboard('Harbor master{Enter}');

        const added = await waitFor(() => findButton('HARBOR MASTER, only on the card'));

        expect(getComputedStyle(requireValue(added.querySelector('[data-source="card"]'))).borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
        expect((await repository.listScriptCharacters(scriptId)).map(character => character.key)).toContain('HARBOR MASTER');
    });

    it('brings back the outline and notes when an Editor undo restores a deleted heading', async () => {
        const {scriptId, benId} = await createScript();

        await repository.updateSceneSynopsis(scriptId, 's2', 'In the garden');
        await repository.putSceneCharacter(scriptId, 's2', benId, {note: 'Waits'});
        await mountApp(`/script/${scriptId}/editor`);

        const editor = await waitFor(() => document.querySelector<HTMLElement>('[data-editor-ready="true"] [data-editor="true"]'));

        await userEvent.click(requireValue(editor.querySelector<HTMLElement>('[data-id="s2"]')));
        await userEvent.click(await waitFor(() => document.querySelector<HTMLElement>('[data-block-action-trigger="true"][data-block-id="s2"]')));
        await userEvent.click(await waitFor(() => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent?.trim() === 'Delete scene heading')));
        await userEvent.click(await waitFor(() => findButton('Delete heading')));
        await until(async () => !(await repository.loadLatest(scriptId))?.content.some(node => node.attrs?.id === 's2'));
        await until(async () => (await notesOf(scriptId)).length === 0);

        // One undo brings the heading back: the structure change is a single history step.
        await userEvent.click(await waitFor(() => findButton('Undo')));
        await waitFor(() => editor.querySelector('[data-id="s2"]'), 5000);
        await until(async () => (await notesOf(scriptId)).length === 1, 15_000);
        await userEvent.click(requireValue(findButton('Board')));

        const garden = await waitFor(() => sceneHeadings().length === 3 && cardOf('2. Garden'));

        await waitFor(() => garden.textContent?.includes('Waits') && garden.textContent.includes('In the garden'));
    });

    it('shows a draft’s outline and notes read-only', async () => {
        const {scriptId, benId} = await createScript();

        await repository.updateSceneSynopsis(scriptId, 's2', 'In the garden');
        await repository.putSceneCharacter(scriptId, 's2', benId, {note: 'Waits'});

        const snapshot = requireValue(await createScriptSnapshotFromCurrent({
            repository,
            scriptId,
            kind: 'draft',
        }));

        await mountApp(`/script/${scriptId}/snapshots/${snapshot.id}/board/wall`);

        const garden = await waitFor(() => sceneHeadings().length === 3 && cardOf('2. Garden').textContent?.includes('Waits') && cardOf('2. Garden'));

        await waitFor(() => garden.textContent?.includes('In the garden'));
        expect(findButton('Outline of scene 2')).toBeUndefined();
        expect(findButton('BEN: Waits')).toBeUndefined();
        expect(findButton('Add character to scene 2')).toBeUndefined();
    });
});
