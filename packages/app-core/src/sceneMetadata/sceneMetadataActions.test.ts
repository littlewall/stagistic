import type {ScriptRepository} from '@stagistic/db';
import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createSceneMetadataActions} from './sceneMetadataActions';

it('guards every read-only metadata action before calling the repository', async () => {
    const repository = {
        putSceneCharacter: vi.fn(),
        removeSceneCharacter: vi.fn(),
        updateSceneSynopsis: vi.fn(),
    };
    const actions = createSceneMetadataActions(repository as unknown as ScriptRepository, 's1', true);

    await expect(actions.putSceneCharacter('h1', 'c1', {note: 'No'})).rejects.toThrow('read-only');
    await expect(actions.removeSceneCharacter('h1', 'c1')).rejects.toThrow('read-only');
    await expect(actions.updateSceneSynopsis('h1', 'No')).rejects.toThrow('read-only');
    expect(repository.putSceneCharacter).not.toHaveBeenCalled();
    expect(repository.removeSceneCharacter).not.toHaveBeenCalled();
    expect(repository.updateSceneSynopsis).not.toHaveBeenCalled();
});

describe('scene metadata actions', () => {
    it('scopes writes to its script', async () => {
        const repository = {
            putSceneCharacter: vi.fn(() => Promise.resolve(null)),
            removeSceneCharacter: vi.fn(() => Promise.resolve()),
            updateSceneSynopsis: vi.fn(() => Promise.resolve(true)),
        };
        const actions = createSceneMetadataActions(repository as unknown as ScriptRepository, 's1');

        await actions.putSceneCharacter('h1', 'c1', {arcValue: 1});
        await actions.removeSceneCharacter('h1', 'c1');
        await actions.updateSceneSynopsis('h1', 'Hello');
        expect(repository.putSceneCharacter).toHaveBeenCalledWith('s1', 'h1', 'c1', {arcValue: 1});
        expect(repository.removeSceneCharacter).toHaveBeenCalledWith('s1', 'h1', 'c1');
        expect(repository.updateSceneSynopsis).toHaveBeenCalledWith('s1', 'h1', 'Hello');
    });
});
