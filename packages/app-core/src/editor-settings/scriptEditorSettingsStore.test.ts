import {
    createInMemoryReactiveQuerySource,
    type ScriptEditorSettingsRecord,
    type ScriptRepository,
} from '@stagistic/db';
import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createScriptEditorSettingsStore} from './scriptEditorSettingsStore';

describe('script editor settings store', () => {
    it('confirms saves and deletes empty overrides through one source', async () => {
        const initial: ScriptEditorSettingsRecord = {
            scriptId: 'script-1',
            settings: {visual: {characterColorSaturation: 0.5}},
        };
        const source = createInMemoryReactiveQuerySource([initial]);
        const saveScriptSettings = vi.fn((
            scriptId: string,
            settings: ScriptEditorSettingsRecord['settings'],
        ) => {
            source.emit([{scriptId, settings}]);

            return Promise.resolve();
        });
        const deleteScriptSettings = vi.fn(() => {
            source.emit([]);

            return Promise.resolve();
        });
        const repository = {
            getScriptEditorSettingsSource: () => source,
            saveScriptSettings,
            deleteScriptSettings,
        } as unknown as ScriptRepository;
        const store = createScriptEditorSettingsStore(repository, 'script-1');

        await store.collection.preload();
        await store.save({page: {widthPx: 720}});

        expect(await source.read()).toEqual([
            {
                scriptId: 'script-1',
                settings: {page: {widthPx: 720}},
            },
        ]);

        await store.save({page: {widthPx: undefined}});

        expect(deleteScriptSettings).toHaveBeenCalledOnce();
        expect(await source.read()).toEqual([]);
    });
});
