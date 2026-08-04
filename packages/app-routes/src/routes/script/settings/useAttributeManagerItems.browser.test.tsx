import {
    createEditorSnapshotStore,
    EditorSnapshotStoreProvider,
} from '@stagistic/editor';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useAttributeManagerItems} from './useAttributeManagerItems';

const roots: Root[] = [];

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useAttributeManagerItems', () => {
    it('derives group usage and character memberships from live editor data', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const store = createEditorSnapshotStore();

        store.patchSnapshot({
            characters: {
                countsByKey: new Map(),
                countsByCharacterId: new Map([['group-1', 3]]),
                keyByCharacterId: new Map([
                    ['char-1', 'ANNA'],
                    ['group-1', 'EVERYONE'],
                ]),
                displayColorByKey: new Map(),
            },
        });
        document.body.appendChild(host);
        root.render(
            <EditorSnapshotStoreProvider store={store}>
                <ItemsHarness />
            </EditorSnapshotStoreProvider>,
        );
        roots.push(root);

        await expect.poll(() => document.querySelector('[data-testid="character-groups"]')?.textContent)
            .toBe('EVERYONE');
        expect(document.querySelector('[data-testid="group-usage"]')?.textContent).toBe('3');
    });
});

const ItemsHarness = () => {
    const {characterItems, groupItems} = useAttributeManagerItems({
        isOpen: false,
        initialValue: null,
        characters: {
            confirmedCharacterRecords: [{id: 'char-1', key: 'ANNA'}],
            confirmedGroupRecords: [{
                id: 'group-1',
                kind: 'group',
                key: 'ALL',
                colorHex: null,
                memberIds: ['char-1'],
            }],
        } as never,
        music: [],
        getMusicTitleDraft: (_id, title) => title,
    });

    return (
        <>
            <output data-testid="character-groups">{characterItems[0]?.groupNames?.join(',')}</output>
            <output data-testid="group-usage">{groupItems[0]?.usageCount}</output>
        </>
    );
};
