import {
    createEditorSnapshotStore,
    EditorSnapshotStoreProvider,
    getConfirmedCharacterColor,
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
    it('derives an implicit sidebar color for characters without an explicit color', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const store = createEditorSnapshotStore();

        document.body.appendChild(host);
        root.render(
            <EditorSnapshotStoreProvider store={store}>
                <ItemsHarness />
            </EditorSnapshotStoreProvider>,
        );
        roots.push(root);

        await expect.poll(() => document.querySelector('[data-testid="character-color"]')?.textContent)
            .toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('derives group usage and character memberships from live editor data', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const store = createEditorSnapshotStore();

        store.patchSnapshot({
            characters: {
                countsByKey: new Map(),
                countsByCharacterId: new Map([['group-1', 3]]),
                keyByCharacterId: new Map([['char-1', 'ANNA'], ['group-1', 'EVERYONE']]),
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

    it('derives group colors with the configured saturation', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const store = createEditorSnapshotStore();

        document.body.appendChild(host);
        root.render(
            <EditorSnapshotStoreProvider store={store}>
                <ItemsHarness characterColorSaturation={60} />
            </EditorSnapshotStoreProvider>,
        );
        roots.push(root);

        await expect.poll(() => document.querySelector('[data-testid="group-color"]')?.textContent)
            .toBe(getConfirmedCharacterColor('group-1', '#A8D4C7', 60));
    });
});

const ItemsHarness = ({characterColorSaturation}: {characterColorSaturation?: number}) => {
    const {characterItems, groupItems} = useAttributeManagerItems({
        isOpen: false,
        initialValue: null,
        characters: {
            confirmedCharacterRecords: [
                {
                    id: 'char-1', key: 'ANNA', colorHex: '#A8D4C7',
                },
            ],
            confirmedGroupRecords: [
                {
                    id: 'group-1',
                    kind: 'group',
                    key: 'ALL',
                    colorHex: '#A8D4C7',
                    memberIds: ['char-1'],
                },
            ],
        } as never,
        music: [],
        getMusicTitleDraft: (_id, title) => title,
        characterColorSaturation,
    });

    return (
        <>
            <output data-testid="character-color">{characterItems[0]?.color ?? ''}</output>
            <output data-testid="character-groups">{characterItems[0]?.groupNames?.join(',')}</output>
            <output data-testid="group-color">{groupItems[0]?.color ?? ''}</output>
            <output data-testid="group-usage">{groupItems[0]?.usageCount}</output>
        </>
    );
};
