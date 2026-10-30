import {createDefaultScriptDocument} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {Editor} from '@tiptap/core';
import History from '@tiptap/extension-history';
import Text from '@tiptap/extension-text';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createEditorSnapshotStore} from '../live/store';
import {DocumentWithSettings} from '../tiptap/extensions/DocumentExtension';
import {ScriptBlockNodes} from '../tiptap/nodes';
import {createScriptDocumentSession} from './createScriptDocumentSession';

const editors: Editor[] = [];
const fixture = {
    ...createDefaultScriptDocument(),
    content: [
        {
            type: 'scene',
            attrs: {id: 'a', blockType: 'scene'},
            content: [{type: 'text', text: 'FIRST'}],
        },
        {
            type: 'dialogue',
            attrs: {id: 'dialogue', blockType: 'dialogue'},
            content: [{type: 'text', text: 'Words'}],
        },
        {
            type: 'act',
            attrs: {id: 'act-b', blockType: 'act'},
            content: [{type: 'text', text: 'ACT B'}],
        },
        {
            type: 'act',
            attrs: {id: 'act-c', blockType: 'act'},
            content: [{type: 'text', text: 'ACT C'}],
        },
        {
            type: 'scene',
            attrs: {id: 'c', blockType: 'scene'},
            content: [{type: 'text', text: 'LAST'}],
        },
    ],
};
const setup = (isReadOnly = false) => {
    const editor = new Editor({
        extensions: [
            DocumentWithSettings,
            Text,
            History,
            ...ScriptBlockNodes,
        ],
        content: fixture,
    });

    editors.push(editor);

    const session = createScriptDocumentSession({
        initialValue: fixture,
        isReadOnly,
        liveStore: createEditorSnapshotStore(),
    });

    session.attach(editor, {});

    return session;
};
const ids = (session: ReturnType<typeof setup>) => session.getDocument().content.map(block => block.attrs?.id);

afterEach(() => {
    editors.forEach(editor => editor.destroy());
    editors.length = 0;
});

describe('structure transactions', () => {
    it('moves the complete scene segment into an empty act and undoes it as one action', () => {
        const session = setup();
        const before = session.getDocument();

        expect(session.commands.moveScene('a', 'act-c')).toBe(true);
        expect(ids(session)).toEqual([
            'act-b',
            'a',
            'dialogue',
            'act-c',
            'c',
        ]);
        expect(session.undo()).toBe(true);
        expect(session.getDocument()).toEqual(before);
        expect(session.redo()).toBe(true);
        expect(ids(session)).toEqual([
            'act-b',
            'a',
            'dialogue',
            'act-c',
            'c',
        ]);
        session.dispose();
    });

    it('inserts scenes and acts at explicit boundaries and keeps IDs when renaming', () => {
        const session = setup();
        const sceneId = session.commands.insertScene('act-c', 'A NEW SCENE');

        expect(sceneId).toBeTruthy();
        expect(ids(session)).toEqual([
            'a',
            'dialogue',
            'act-b',
            sceneId,
            'act-c',
            'c',
        ]);
        expect(session.commands.renameScene(requireValue(sceneId), 'RENAMED')).toBe(true);
        expect(session.getDocument().content[3].content?.[0].text).toBe('RENAMED');

        const actId = session.commands.insertAct('c');

        expect(ids(session)).toEqual([
            'a',
            'dialogue',
            'act-b',
            sceneId,
            'act-c',
            actId,
            'c',
        ]);
        expect(session.commands.deleteAct(requireValue(actId))).toBe(true);
        expect(ids(session)).toEqual([
            'a',
            'dialogue',
            'act-b',
            sceneId,
            'act-c',
            'c',
        ]);
        session.dispose();
    });

    it('rejects missing or wrong-type IDs, empty scene titles, and readonly commands', () => {
        const session = setup();
        const before = session.getDocument();

        expect(session.commands.renameScene('act-b', 'wrong')).toBe(false);
        expect(session.commands.insertScene('missing', 'title')).toBeNull();
        expect(session.commands.insertScene(null, '  ')).toBeNull();
        expect(session.commands.moveScene('a', 'missing')).toBe(false);
        expect(session.commands.deleteAct('a')).toBe(false);
        expect(session.getDocument()).toEqual(before);
        session.dispose();

        const readonly = setup(true);

        expect(readonly.commands.insertAct(null)).toBeNull();
        expect(readonly.commands.moveScene('a', null)).toBe(false);
        readonly.dispose();
    });
});
