import {
    createInMemoryReactiveQuerySource,
    type ScriptRepository,
    type ScriptSceneCharacter,
    type ScriptSceneSynopsis,
} from '@stagistic/db';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    expect,
    it,
} from 'vite-plus/test';

import {useScriptSceneCharacters, useScriptSceneSynopses} from './useScriptSceneMetadata';

let root: Root | undefined;

afterEach(() => {
    root?.unmount();
    document.body.innerHTML = '';
});

it('refreshes both hooks when a different writer publishes metadata, and switches scripts', async () => {
    const characters = createInMemoryReactiveQuerySource<ScriptSceneCharacter>();
    const synopses = createInMemoryReactiveQuerySource<ScriptSceneSynopsis>();
    const otherCharacters = createInMemoryReactiveQuerySource<ScriptSceneCharacter>();
    const otherSynopses = createInMemoryReactiveQuerySource<ScriptSceneSynopsis>([{headingBlockId: 'other', synopsis: 'Other script'}]);
    const repository = {
        getScriptSceneCharactersSource: (id: string) => (id === 's1' ? characters : otherCharacters),
        getScriptSceneSynopsesSource: (id: string) => (id === 's1' ? synopses : otherSynopses),
    } as unknown as ScriptRepository;
    const Harness = ({scriptId}: {scriptId: string}) => {
        const {sceneCharacters, error: characterError} = useScriptSceneCharacters(scriptId, repository);
        const {sceneSynopses, error: synopsisError} = useScriptSceneSynopses(scriptId, repository);

        return <output>{characterError?.message ?? synopsisError?.message ?? [...sceneCharacters.map(row => row.note), ...sceneSynopses.map(row => row.synopsis)].join('|')}</output>;
    };
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness scriptId="s1" />);
    await expect.poll(() => characters.listenerCount()).toBeGreaterThan(0);
    characters.emit([
        {
            scriptId: 's1',
            headingBlockId: 'h1',
            characterId: 'c1',
            note: 'Leaves',
            arcValue: null,
            createdAt: 1,
            updatedAt: 1,
        },
    ]);
    synopses.emit([{headingBlockId: 'h1', synopsis: 'Goodbye'}]);
    await expect.poll(() => host.textContent).toBe('Leaves|Goodbye');
    root.render(<Harness scriptId="s2" />);
    await expect.poll(() => host.textContent).toBe('Other script');
    characters.emit([]);
    synopses.emit([]);
    await expect.poll(() => host.textContent).toBe('Other script');
});
