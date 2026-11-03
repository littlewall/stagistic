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
    locationText,
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

const recordsOf = async (scriptId: string) => await repository.listSceneCharacters(scriptId);

const legend = (name: string) => [...document.querySelectorAll<HTMLElement>('button[data-arc-id]')].find(item => item.textContent?.trim() === name);

const stop = (index: number) => document.querySelector<SVGElement>(`[data-stop="${index}"]`);

const point = (characterId: string, sceneIndex: number) => document.querySelector<SVGCircleElement>(`[data-point="${characterId}:${sceneIndex}"]`);

const activate = async (name: string) => {
    const path = await waitFor(() => document.querySelector<SVGPathElement>(`[aria-label="Edit arc for ${name}"]`));

    path.focus();
    await userEvent.keyboard('{Enter}');
};

const openArcs = async (scriptId: string) => {
    await mountApp(`/script/${scriptId}/board/wall`);
    await waitFor(() => sceneHeadings().length === 3);
    await userEvent.click(requireValue(findButton('Arcs')));
    await waitFor(() => legend('ANNA'));
    expect(locationText()).toContain(`/script/${scriptId}/board/arcs`);
};

/* Adds a point to the active character by clicking a scene column at the neutral axis. */
const clickColumn = (sceneIndex: number) => {
    const column = requireValue(stop(sceneIndex), `column ${sceneIndex}`);
    const rect = column.getBoundingClientRect();

    column.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
    }));
};

const remount = async (path: string) => {
    mountedRoots.pop()?.unmount();
    document.body.innerHTML = '';
    await mountApp(path);
};

describe('Board Arcs editing', () => {
    it('adds a hollow point off the card, keeps the character off Wall and Matrix, and survives a reload', async () => {
        const {scriptId, annaId} = await createScript();

        await openArcs(scriptId);
        await activate('ANNA');
        await waitFor(() => stop(1));
        clickColumn(1);

        const hollow = await waitFor(() => point(annaId, 1));

        expect(hollow.getAttribute('data-evidence')).toBe('false');
        await until(async () => (await recordsOf(scriptId)).some(row => row.headingBlockId === 's2' && row.characterId === annaId && row.onCard === false && row.arcValue !== null));

        await userEvent.click(requireValue(findButton('Wall')));
        await waitFor(() => sceneHeadings().length === 3);
        expect(cardOf('2. Garden').textContent).not.toContain('ANNA');

        await userEvent.click(requireValue(findButton('Matrix')));
        await waitFor(() => findButton('ANNA, Garden: not in the scene'));

        await remount(`/script/${scriptId}/board/arcs`);
        await waitFor(() => point(annaId, 1));
        expect(point(annaId, 1)?.getAttribute('data-evidence')).toBe('false');
    });

    it('puts the character on the card when its sentence is written, and removes only the point afterwards', async () => {
        const {scriptId, annaId} = await createScript();

        await repository.putSceneCharacter(scriptId, 's2', annaId, {arcValue: 30, onCard: false});
        await openArcs(scriptId);
        await activate('ANNA');
        await waitFor(() => point(annaId, 1));

        requireValue(stop(1), 'garden column').focus();
        await userEvent.keyboard('{Enter}');
        await waitFor(() => document.querySelector('textarea[aria-label="Note for ANNA"]'));
        await userEvent.keyboard('Looks for Ben');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        await until(async () => (await recordsOf(scriptId)).some(row => row.headingBlockId === 's2' && row.note === 'Looks for Ben' && row.onCard));

        await userEvent.click(requireValue(findButton('Wall')));
        await waitFor(() => sceneHeadings().length === 3);
        await waitFor(() => cardOf('2. Garden').textContent?.includes('Looks for Ben'));

        await userEvent.click(requireValue(findButton('Arcs')));
        await activate('ANNA');
        requireValue(await waitFor(() => stop(1)), 'garden column').focus();
        await userEvent.keyboard('{Enter}');

        const removePoint = await waitFor(() => findButton('Remove point'));

        expect(findButton('Remove from card')).toBeUndefined();
        await userEvent.click(removePoint);
        await waitFor(() => !point(annaId, 1));

        /* The sentence and the card stay; only the point goes. */
        await until(async () => (await recordsOf(scriptId)).some(row => row.headingBlockId === 's2' && row.note === 'Looks for Ben' && row.onCard && row.arcValue === null));
    });

    it('deletes a point that exists on its own with Delete', async () => {
        const {scriptId, annaId} = await createScript();

        await openArcs(scriptId);
        await activate('ANNA');
        await waitFor(() => stop(1));
        clickColumn(1);
        await waitFor(() => point(annaId, 1));

        requireValue(stop(1), 'garden column').focus();
        await userEvent.keyboard('{Delete}');
        await waitFor(() => !point(annaId, 1));
        await until(async () => !(await recordsOf(scriptId)).some(row => row.headingBlockId === 's2' && row.characterId === annaId));
    });

    it('shows a snapshot\'s Arcs read-only: points are there, nothing can be added or removed', async () => {
        const {scriptId, annaId} = await createScript();

        await repository.putSceneCharacter(scriptId, 's2', annaId, {arcValue: 30, onCard: false});

        const snapshot = requireValue(await createScriptSnapshotFromCurrent({
            repository,
            scriptId,
            kind: 'draft',
        }));

        await mountApp(`/script/${scriptId}/snapshots/${snapshot.id}/board/arcs`);
        await waitFor(() => legend('ANNA'));
        await activate('ANNA');

        await waitFor(() => point(annaId, 1));
        expect(document.querySelectorAll('[data-stop]')).toHaveLength(0);

        await userEvent.click(requireValue(point(annaId, 1)));
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(findButton('Remove point')).toBeUndefined();
    });
});
