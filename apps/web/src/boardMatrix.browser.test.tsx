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
    BOARD_PREFERENCES_KEY,
    cardOf,
    createScript,
    findButton,
    locationText,
    mountApp,
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

const sceneCharactersOf = async (scriptId: string) => await repository.listSceneCharacters(scriptId);

describe('Board matrix editing', () => {
    it('switches to the Matrix, adds from an empty cell and turns the addition into a note the Wall shows', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);

        await userEvent.click(requireValue(findButton('Matrix')));
        await waitFor(() => document.querySelector('[role="grid"]'));

        expect(locationText()).toContain(`/script/${scriptId}/board/matrix`);

        await userEvent.click(requireValue(findButton('ANNA, Garden: not on the card')));
        await waitFor(() => document.querySelector('textarea[aria-label="Note for ANNA"]'));

        /* Closing the popover without a note keeps the character on the card. */
        await userEvent.keyboard('{Escape}');
        await waitFor(() => !document.querySelector('[role="dialog"]'));
        await waitFor(() => findButton('ANNA, Garden: not in scene'));
        await until(async () => (await sceneCharactersOf(scriptId)).length === 1);

        await userEvent.click(requireValue(findButton('ANNA, Garden: not in scene')));

        await waitFor(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Note for ANNA"]'));

        await userEvent.keyboard('Wants to be found');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        await waitFor(() => findButton('ANNA, Garden: note: Wants to be found (not in scene)'));
        await until(async () => (await sceneCharactersOf(scriptId))[0]?.note === 'Wants to be found');

        await userEvent.click(requireValue(findButton('Wall')));
        await waitFor(() => sceneHeadings().length === 3);

        const garden = await waitFor(() => cardOf('2. Garden').textContent?.includes('Wants to be found') && cardOf('2. Garden'));

        expect(garden.textContent).toContain('Wants to be found');
    });

    it('leaves only the selected character\'s rows while filtering; every column stays', async () => {
        const {scriptId, annaId} = await createScript();

        window.localStorage.setItem(`${BOARD_PREFERENCES_KEY}:script:${scriptId}`, JSON.stringify({characterIds: [annaId]}));
        await mountApp(`/script/${scriptId}/board/matrix`);
        await waitFor(() => document.querySelector('[role="grid"]'));

        const rowHeader = requireValue(
            document.querySelector<HTMLElement>('th[scope="row"][aria-label^="ANNA"]'),
            'ANNA row header',
        );

        expect(rowHeader.getAttribute('aria-label')).toBe('ANNA, 2 scenes');
        expect([...document.querySelectorAll('[data-scene-number]')].map(item => item.getAttribute('data-scene-number'))).toEqual([
            '1',
            '2',
            '3',
        ]);
        expect(findButton('ANNA, Garden: not on the card')).toBeDefined();
        expect(findButton('BEN, Garden: in scene')).toBeUndefined();
    });

    it('offers "Add scene" on an empty Matrix for an editable Board and inserts a scene heading', async () => {
        const emptyDocument: Parameters<typeof repository.saveLatest>[1] = {
            type: 'doc',
            content: [
                {
                    type: 'act',
                    attrs: {id: 'a1'},
                    content: [{type: 'text', text: 'ACT ONE'}],
                },
            ],
        };
        const scriptId = await repository.createScript('Empty board', emptyDocument);

        // Saved like the shared fixture does, so the workspace knows the script before it mounts.
        await repository.saveLatest(scriptId, emptyDocument);

        await mountApp(`/script/${scriptId}/board/matrix`);
        await waitFor(() => document.body.textContent?.includes('No scenes yet.'));
        await userEvent.click(requireValue(findButton('Add scene')));
        await userEvent.type(await waitFor(() => document.querySelector<HTMLInputElement>('input[aria-label="Scene name"]')), 'Harbour{Enter}');
        /* A scene without characters: the Matrix says so quietly, and the Wall shows the new card. */
        await waitFor(() => document.body.textContent?.includes('No characters yet.'));
        expect(findButton('Add scene')).toBeUndefined();
        await userEvent.click(requireValue(findButton('Wall') ?? document.querySelector<HTMLElement>('a[href$="/board/wall"]')));
        await waitFor(() => sceneHeadings().some(heading => heading?.includes('HARBOUR') || heading?.includes('Harbour')));
    });

    it('removes a character from a card (○ → empty) through the Matrix popover', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/matrix`);
        await waitFor(() => document.querySelector('[role="grid"]'));

        /* Find and click an empty cell for ANNA in Garden (which will add her optimistically) */
        await userEvent.click(requireValue(findButton('ANNA, Garden: not on the card')));
        await waitFor(() => document.querySelector('textarea[aria-label="Note for ANNA"]'));

        /* Close without adding a note - she stays on the card */
        await userEvent.keyboard('{Escape}');
        await waitFor(() => !document.querySelector('[role="dialog"]'));

        /* Verify the cell now reads "not in scene" (on the card, no script evidence) */
        await waitFor(() => findButton('ANNA, Garden: not in scene'));

        /* Click the card-only cell and open the popover */
        await userEvent.click(requireValue(findButton('ANNA, Garden: not in scene')));
        await waitFor(() => document.querySelector('[role="dialog"]'));

        /* Click Remove from card */
        await userEvent.click(requireValue(findButton('Remove from card')));
        await waitFor(() => !document.querySelector('[role="dialog"]'));

        /* Wait for the cell to become empty */
        await waitFor(() => findButton('ANNA, Garden: not on the card'));
        await until(async () => (await sceneCharactersOf(scriptId)).length === 0);
    });

    it('clears a note (■ → ●) through the Matrix popover', async () => {
        const {scriptId, annaId} = await createScript();

        await repository.putSceneCharacter(scriptId, 's1', annaId, {note: 'Hides the letter'});
        await mountApp(`/script/${scriptId}/board/matrix`);
        await userEvent.click(await waitFor(() => findButton('ANNA, Kitchen, night: note: Hides the letter (in scene)')));
        await userEvent.click(requireValue(findButton('Clear note')));
        await waitFor(() => findButton('ANNA, Kitchen, night: in scene'));
        await until(async () => (await sceneCharactersOf(scriptId)).length === 0);
    });

    it('shows a snapshot\'s Matrix read-only: tooltips stay, no cell is a button', async () => {
        const {scriptId} = await createScript();
        const snapshot = requireValue(await createScriptSnapshotFromCurrent({
            repository,
            scriptId,
            kind: 'draft',
        }));

        await mountApp(`/script/${scriptId}/snapshots/${snapshot.id}/board/matrix`);
        await waitFor(() => document.querySelector('[role="grid"]'));

        expect(document.querySelectorAll('[role="grid"] button')).toHaveLength(0);

        /* Three characters across three scenes: the glyphs are still there to read. */
        expect(document.querySelectorAll('[data-cell]')).toHaveLength(9);

        await userEvent.hover(requireValue(document.querySelector<HTMLElement>('[data-cell][aria-label="ANNA, Kitchen, night: in scene"]')));
        await waitFor(() => document.querySelector('[role="tooltip"]')?.textContent?.includes('Scene: 1. Kitchen, night'));
        expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('in scene');
    });
});
