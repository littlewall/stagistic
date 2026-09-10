import {
    linkCharacterRefInScriptDocument,
    parseStagistic,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../fileStorage';
import {createTestDb} from '../testing/createTestDb';
import {createLocalPgliteRepository} from './createLocalPgliteRepository';

describe('example bootstrap persistence', () => {
    it('does not duplicate blocks when an initial document is linked and saved again', async () => {
        const {db} = await createTestDb();
        const repository = createLocalPgliteRepository({
            getLocalDb: () => Promise.resolve(db),
            syncToFs: () => Promise.resolve(),
            fileStorage: new InMemoryFileStorage(),
        });
        const source = `# Act One

## Scene One

The room is dark.

MARA
SING TO ME.

@@music 1 "One Small Light"

!@MARA raises the lamp.

The lamp shines. @@out 1
`;
        const document = parseStagistic(source).document;
        const scriptId = 'example-script';

        await repository.createScriptWithId({
            id: scriptId,
            title: 'Example',
            initialContent: document,
        });

        const characterId = repository.allocateScriptCharacterId();

        await repository.confirmScriptCharacterWithId(scriptId, {
            id: characterId,
            key: 'MARA',
        });

        const linked = linkCharacterRefInScriptDocument(document, 'MARA', characterId).value;

        await repository.saveLatest(scriptId, linked);

        const loaded = await repository.loadLatest(scriptId);
        const loadedIds = loaded?.content.map(node => node.attrs?.id);
        const linkedIds = linked.content.map(node => node.attrs?.id);

        expect(loaded?.content.map(node => node.type)).toEqual(linked.content.map(node => node.type));
        expect(loadedIds).toEqual(linkedIds);
        expect(new Set(loadedIds).size).toBe(linked.content.length);
        expect(loaded?.content.flatMap(node => node.content ?? [])
            .filter(node => node.type === 'musicStart')).toHaveLength(1);
    });
});
