import {requireValue} from '@stagistic/shared';
import {
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {
    cardOf,
    createScript,
    findButton,
    mountApp,
    repository,
    sceneHeadings,
    waitFor,
} from './boardTestFixtures';

const deferred = () => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise,
        resolve,
        reject,
    };
};

const syncState = () => document.querySelector('[data-sync-status]')?.getAttribute('data-state');

it('shows an outline before persistence and restores it only when persistence fails', async () => {
    const {scriptId} = await createScript();

    await mountApp(`/script/${scriptId}/board/wall`);
    await waitFor(() => sceneHeadings().length === 3);

    const gate = deferred();
    const save = vi.spyOn(repository, 'updateSceneSynopsis').mockImplementation(() => gate.promise.then(() => true));

    try {
        await userEvent.click(requireValue(findButton('Outline of scene 1')));
        await userEvent.keyboard('Immediate outline{Control>}{Enter}{/Control}');
        await waitFor(() => cardOf('1. Kitchen, night').textContent?.includes('Immediate outline'));
        await waitFor(() => syncState() === 'saving');
        expect((await repository.getScriptSceneSynopsesSource(scriptId).read()).find(row => row.headingBlockId === 's1')?.synopsis).toBeNull();

        gate.reject(new Error('disk full'));
        await waitFor(() => findButton('Outline of scene 1')?.textContent === '');
        await waitFor(() => syncState() === 'error');
        expect(cardOf('1. Kitchen, night').textContent).not.toContain('Immediate outline');
    } finally {
        gate.resolve();
        save.mockRestore();
    }
});

it('shows a note immediately and rolls a failed change back to its previous note', async () => {
    const {scriptId, benId} = await createScript();

    await repository.putSceneCharacter(scriptId, 's2', benId, {note: 'Durable note'});
    await mountApp(`/script/${scriptId}/board/wall`);
    await waitFor(() => findButton('BEN: Durable note'));

    const gate = deferred();
    const save = vi.spyOn(repository, 'putSceneCharacter').mockImplementation(() => gate.promise.then(() => null));

    try {
        await userEvent.click(requireValue(findButton('BEN: Durable note')));
        await waitFor(() => document.activeElement === document.querySelector('textarea'));
        await userEvent.clear(requireValue(document.querySelector('textarea')));
        await userEvent.keyboard('Immediate note');
        expect(document.querySelector('textarea')?.value).toBe('Immediate note');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        await expect.poll(() => save.mock.calls.map(call => call[3]?.note)).toEqual(['Immediate note']);
        await waitFor(() => findButton('BEN: Immediate note'));
        expect((await repository.listSceneCharacters(scriptId))[0]?.note).toBe('Durable note');

        gate.reject(new Error('disk full'));
        await waitFor(() => findButton('BEN: Durable note'));
        await waitFor(() => syncState() === 'error');
        expect(findButton('BEN: Immediate note')).toBeUndefined();
    } finally {
        gate.resolve();
        save.mockRestore();
    }
});

it('puts a new character on the card before creation finishes and honors removing it meanwhile', async () => {
    const {scriptId} = await createScript();

    await mountApp(`/script/${scriptId}/board/wall`);
    await waitFor(() => sceneHeadings().length === 3);

    const gate = deferred();
    const originalConfirm = repository.confirmScriptCharacterWithId.bind(repository);
    const confirm = vi.spyOn(repository, 'confirmScriptCharacterWithId').mockImplementation(async (...args) => {
        await gate.promise;

        return originalConfirm(...args);
    });
    const originalRemove = repository.removeSceneCharacter.bind(repository);
    const removalFinished = deferred();
    const remove = vi.spyOn(repository, 'removeSceneCharacter').mockImplementation((...args) => {
        return originalRemove(...args).finally(removalFinished.resolve);
    });

    try {
        await userEvent.click(requireValue(findButton('Add character to scene 1')));
        await waitFor(() => document.querySelector('input[type="search"]'));
        await userEvent.keyboard('Harbor master{Enter}');
        await waitFor(() => syncState() === 'saving');
        await userEvent.click(requireValue(findButton('Editor')));
        await waitFor(() => document.querySelector('[data-editor-ready="true"]'));
        expect(syncState()).toBe('saving');
        await userEvent.click(requireValue(findButton('Board')));
        await waitFor(() => sceneHeadings().length === 3);
        expect(syncState()).toBe('saving');
        await userEvent.click(await waitFor(() => findButton('HARBOR MASTER, only on the card')));
        await waitFor(() => findButton('Remove from card'));
        expect((await repository.listScriptCharacters(scriptId)).map(row => row.key)).not.toContain('HARBOR MASTER');
        expect(await repository.listSceneCharacters(scriptId)).toHaveLength(0);

        await userEvent.click(requireValue(findButton('Remove from card')));
        await waitFor(() => !findButton('HARBOR MASTER, only on the card'));
        gate.resolve();
        // Await the actual write chain; a short polling timeout races DB work in parallel files.
        await removalFinished.promise;
        await waitFor(() => syncState() === 'saved' || syncState() === 'idle');
        expect((await repository.listScriptCharacters(scriptId)).map(row => row.key)).toContain('HARBOR MASTER');
        expect(await repository.listSceneCharacters(scriptId)).toHaveLength(0);
        expect(findButton('HARBOR MASTER, only on the card')).toBeUndefined();
    } finally {
        gate.resolve();
        confirm.mockRestore();
        remove.mockRestore();
    }
});
