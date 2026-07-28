import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import {EditorSidebar} from '@stagistic/ui';
import {useEffect} from 'react';
import {
    createRoot,
    type Root,
} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useEditorInstance} from '../context';
import ScriptEditor from '../Editor';
import {useEditorElementSelection} from './context';

type SelectionTestWindow = Window & {
    __selectionEditor?: NonNullable<ReturnType<typeof useEditorInstance>> | null,
};

const documentWithCharacter: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'character',
            attrs: {id: 'character-block'},
            content: [{type: 'text', text: 'ANNA'}],
        },
    ],
};

const documentWithUnconfirmedCharacter: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'character',
            attrs: {id: 'character-block'},
            content: [{type: 'text', text: 'ANN'}],
        },
    ],
};

const documentWithMusicOut: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'scene-1'},
            content: [],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'music-start-block'},
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'music-1', mode: 'open', title: 'Night',
                    },
                },
            ],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'music-out-block'},
            content: [{type: 'musicOut'}],
        },
    ],
};

const SelectionProbe = () => {
    const selection = useEditorElementSelection();

    if (selection?.type === 'music') {
        return <output data-music-selection={selection.musicId} />;
    }

    if (selection?.type !== 'character') {
        return <output data-character-selection="" />;
    }

    return (
        <output
            data-character-selection={selection.characterKey}
            data-character-id={selection.characterId ?? ''}
        />
    );
};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as SelectionTestWindow).__selectionEditor = editor;

        return () => {
            delete (window as SelectionTestWindow).__selectionEditor;
        };
    }, [editor]);

    return null;
};

const CharacterSidebarProbe = () => {
    const selection = useEditorElementSelection();

    return (
        <EditorSidebar
            data={{
                confirmedCharacters: [
                    {
                        id: 'anna-id',
                        key: 'ANNA',
                        color: '#b68a6a',
                        isConfirmed: true,
                    },
                ],
                unconfirmedCharacters: [
                    {
                        key: 'ANN',
                        color: '#8a7b70',
                        isConfirmed: false,
                    },
                ],
            }}
            options={{
                activeCharacterId: selection?.type === 'character'
                    ? selection.characterId
                    : null,
                activeCharacterKey: selection?.type === 'character'
                    ? selection.characterKey
                    : null,
            }}
        />
    );
};

const roots: Root[] = [];

const poll = async <T, >(getValue: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const value = getValue();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    delete (window as SelectionTestWindow).__selectionEditor;
});

describe('editor element selection', () => {
    it('moves the active sidebar row as a character pill is edited', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <ScriptEditor
                document={{
                    initialValue: documentWithUnconfirmedCharacter,
                    persistentCharacters: [{id: 'anna-id', key: 'ANNA'}],
                }}
            >
                <ScriptEditor.LeftSidebar>
                    <EditorProbe />
                    <CharacterSidebarProbe />
                </ScriptEditor.LeftSidebar>
            </ScriptEditor>,
        );
        roots.push(root);

        const editor = await poll(
            () => (window as SelectionTestWindow).__selectionEditor,
            'editor instance',
        );
        const pill = await poll(
            () => document.querySelector<HTMLElement>('[data-character-key="ANN"]'),
            'unconfirmed character pill',
        );

        pill.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
        await poll(
            () => document.querySelector('[aria-current="true"]')?.textContent?.trim() === 'ANN'
                ? true
                : null,
            'active unconfirmed character row',
        );

        editor
            .chain()
            .setTextSelection(4)
            .insertContent('A')
            .run();
        await poll(
            () => document.querySelector('[aria-current="true"]')?.textContent?.trim() === 'ANNA'
                ? true
                : null,
            'active confirmed character row',
        );

        editor
            .chain()
            .setTextSelection(5)
            .deleteRange({from: 4, to: 5})
            .run();
        await poll(
            () => document.querySelector('[aria-current="true"]')?.textContent?.trim() === 'ANN'
                ? true
                : null,
            'reactivated unconfirmed character row',
        );
    });

    it('resolves a music out pill to the music it closes', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <ScriptEditor document={{initialValue: documentWithMusicOut}}>
                <ScriptEditor.LeftSidebar>
                    <SelectionProbe />
                </ScriptEditor.LeftSidebar>
            </ScriptEditor>,
        );
        roots.push(root);

        const pill = await poll(
            () => document.querySelector<HTMLElement>('[data-music-pill="out"]'),
            'music out pill',
        );

        pill.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));

        expect(await poll(
            () => document.querySelector('[data-music-selection="music-1"]'),
            'music out selection',
        )).toBeTruthy();
    });

    it('selects a character pill and clears the selection outside the editor', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <ScriptEditor
                document={{
                    initialValue: documentWithCharacter,
                    persistentCharacters: [{id: 'anna-id', key: 'ANNA'}],
                }}
            >
                <ScriptEditor.LeftSidebar>
                    <SelectionProbe />
                </ScriptEditor.LeftSidebar>
            </ScriptEditor>,
        );
        roots.push(root);

        const pill = await poll(
            () => document.querySelector<HTMLElement>('[data-character-key="ANNA"]'),
            'character pill',
        );

        pill.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));

        const selected = await poll(
            () => document.querySelector<HTMLOutputElement>('[data-character-selection="ANNA"]'),
            'character selection',
        );

        expect(selected.dataset.characterId).toBe('anna-id');

        document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
        await poll(
            () => document.querySelector('[data-character-selection=""]'),
            'cleared character selection',
        );
    });
});
