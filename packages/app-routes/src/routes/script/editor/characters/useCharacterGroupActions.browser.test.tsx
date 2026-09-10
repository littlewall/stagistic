import type {useScriptCharacterCatalog} from '@stagistic/app-core';
import type {ScriptDocument} from '@stagistic/script';
import {useRef, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ScriptCharacterGroupRecord} from './types';
import {useCharacterDocumentActions} from './useCharacterDocumentActions';
import {useCharacterGroupActions} from './useCharacterGroupActions';

type Catalog = ReturnType<typeof useScriptCharacterCatalog>;

const roots: Root[] = [];

const groupDocument = (linked: boolean): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'character',
            attrs: {
                id: 'cue-1',
                characterRefs: linked ? {ALL: 'group-1'} : {},
            },
            content: [{type: 'text', text: 'ALL'}],
        }, {
            type: 'stageDirection',
            attrs: {id: 'direction-1'},
            content: [
                {
                    type: 'text',
                    text: 'ALL',
                    marks: [
                        {
                            type: 'characterTag',
                            attrs: {
                                characterKey: 'ALL',
                                characterId: linked ? 'group-1' : null,
                            },
                        },
                    ],
                },
            ],
        },
    ],
});

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for group action');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const Harness = ({
    catalog,
    initialDocument,
}: {
    catalog: Catalog,
    initialDocument: ScriptDocument,
}) => {
    const valueRef = useRef(initialDocument);
    const [override, setOverride] = useState<ScriptDocument | null>(null);
    const [renameEvents, setRenameEvents] = useState<string[]>([]);
    const hasConfirmedGroup = JSON.stringify(initialDocument).includes('group-1');
    const documentActions = useCharacterDocumentActions({
        getEditorValue: () => valueRef.current,
        setEditorValue: value => {
            if (value) {
                valueRef.current = value;
            }
        },
        setEditorOverrideValue: setOverride,
        handleAutoSave: () => Promise.resolve(true),
        getCharacterNameForBlockType: name => name,
    });
    const actions = useCharacterGroupActions({
        catalog,
        documentActions,
        confirmedSpeakingEntitySet: new Set(hasConfirmedGroup ? ['ALL'] : []),
        confirmedGroupsById: new Map(hasConfirmedGroup ? [
            [
                'group-1', {
                    id: 'group-1',
                    kind: 'group',
                    key: 'ALL',
                    colorHex: null,
                    memberIds: [],
                },
            ],
        ] : []),
    });
    const recordRename = (_id: string, name: string) => {
        setRenameEvents(previous => [...previous, name]);
    };

    return (
        <div>
            <output data-testid="document">{JSON.stringify(override ?? valueRef.current)}</output>
            <output data-testid="rename-events">{renameEvents.join(',')}</output>
            <button type="button" onClick={() => void actions.handleCreateGroup('ALL')}>Create</button>
            <button type="button" onClick={() => void actions.handleRenameGroup('group-1', 'ALL', 'CHORUS')}>Rename</button>
            <button type="button" onClick={() => void actions.handleDeleteGroup('group-1')}>Delete</button>
            <button
                type="button"
                onClick={() => void actions.handleRenameGroup('group-1', 'ALL', 'CHORUS', {
                    onRenameText: recordRename,
                    onReplaceId: () => undefined,
                }).catch(() => undefined)}
            >
                Rename with editor
            </button>
        </div>
    );
};

const mount = async (catalog: Catalog, initialDocument: ScriptDocument) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    roots.push(root);
    root.render(<Harness catalog={catalog} initialDocument={initialDocument} />);
    await waitFor(() => host.querySelectorAll('button').length === 4);

    return host;
};

const readDocument = (host: HTMLElement) => JSON.parse(
    host.querySelector('[data-testid="document"]')?.textContent ?? '{}',
) as ScriptDocument;

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useCharacterGroupActions', () => {
    it('creates the catalog group before linking same-key cue and tag references', async () => {
        let resolveCreate!: (group: ScriptCharacterGroupRecord) => void;
        const catalog = {
            createGroup: () => new Promise(resolve => {
                resolveCreate = resolve;
            }),
        } as unknown as Catalog;
        const host = await mount(catalog, groupDocument(false));

        host.querySelectorAll<HTMLButtonElement>('button')[0]?.click();
        expect(readDocument(host)).toEqual(groupDocument(false));

        resolveCreate({
            id: 'group-1',
            kind: 'group',
            key: 'ALL',
            colorHex: null,
            memberIds: [],
        });
        await waitFor(() => JSON.stringify(readDocument(host)).includes('group-1'));

        const document = readDocument(host);

        expect(document.content[0].attrs?.characterRefs).toEqual({ALL: 'group-1'});
        expect(document.content[1].content?.[0]?.marks?.[0]?.attrs?.characterId).toBe('group-1');
    });

    it('renames linked cue and tag text while retaining the group ID', async () => {
        const catalog = {
            renameGroup: () => Promise.resolve({
                id: 'group-1',
                kind: 'group',
                key: 'CHORUS',
                colorHex: null,
                memberIds: [],
            }),
        } as unknown as Catalog;
        const host = await mount(catalog, groupDocument(true));

        host.querySelectorAll<HTMLButtonElement>('button')[1]?.click();
        await waitFor(() => JSON.stringify(readDocument(host)).includes('CHORUS'));

        const document = readDocument(host);

        expect(document.content[0].content?.[0]?.text).toBe('CHORUS');
        expect(document.content[0].attrs?.characterRefs).toEqual({CHORUS: 'group-1'});
        expect(document.content[1].content?.[0]?.text).toBe('CHORUS');
        expect(document.content[1].content?.[0]?.marks?.[0]?.attrs).toEqual({
            characterKey: 'CHORUS',
            characterId: 'group-1',
        });
    });

    it('deletes the catalog group before unlinking references without changing text', async () => {
        const catalog = {deleteGroup: () => Promise.resolve()} as unknown as Catalog;
        const host = await mount(catalog, groupDocument(true));

        host.querySelectorAll<HTMLButtonElement>('button')[2]?.click();
        await waitFor(() => !JSON.stringify(readDocument(host)).includes('group-1'));

        const document = readDocument(host);

        expect(document.content[0].content?.[0]?.text).toBe('ALL');
        expect(document.content[0].attrs?.characterRefs).toBeUndefined();
        expect(document.content[1].content?.[0]?.text).toBe('ALL');
        expect(document.content[1].content?.[0]?.marks?.[0]?.attrs?.characterId).toBeNull();
    });

    it('leaves the document unchanged when create or delete persistence fails', async () => {
        const catalog = {
            createGroup: () => Promise.reject(new Error('create failed')),
            deleteGroup: () => Promise.reject(new Error('delete failed')),
        } as unknown as Catalog;
        const unlinkedHost = await mount(catalog, groupDocument(false));
        const linkedHost = await mount(catalog, groupDocument(true));

        unlinkedHost.querySelectorAll<HTMLButtonElement>('button')[0]?.click();
        linkedHost.querySelectorAll<HTMLButtonElement>('button')[2]?.click();
        await new Promise(resolve => window.setTimeout(resolve, 30));

        expect(readDocument(unlinkedHost)).toEqual(groupDocument(false));
        expect(readDocument(linkedHost)).toEqual(groupDocument(true));
    });

    it('restores previous editor text when rename persistence fails', async () => {
        const catalog = {
            renameGroup: () => Promise.reject(new Error('rename failed')),
        } as unknown as Catalog;
        const host = await mount(catalog, groupDocument(true));

        host.querySelectorAll<HTMLButtonElement>('button')[3]?.click();
        await waitFor(() => host.querySelector('[data-testid="rename-events"]')?.textContent === 'CHORUS,ALL');

        expect(host.querySelector('[data-testid="rename-events"]')?.textContent).toBe('CHORUS,ALL');
        expect(readDocument(host)).toEqual(groupDocument(true));
    });
});
