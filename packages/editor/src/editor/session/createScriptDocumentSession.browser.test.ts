import {createDefaultScriptDocument, type ScriptDocument} from '@stagistic/script';
import {Editor} from '@tiptap/core';
import History from '@tiptap/extension-history';
import Text from '@tiptap/extension-text';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createEditorSnapshotStore} from '../live/store';
import {DocumentWithSettings} from '../tiptap/extensions/DocumentExtension';
import {ScriptBlockNodes} from '../tiptap/nodes';
import {createScriptDocumentSession} from './createScriptDocumentSession';

const editors: Editor[] = [];
const initialValue = createDefaultScriptDocument('scene-1');

const createEditor = () => {
    const editor = new Editor({
        extensions: [
            DocumentWithSettings,
            Text,
            History,
            ...ScriptBlockNodes,
        ],
        content: initialValue,
    });

    editors.push(editor);

    return editor;
};

const named = (title: string): ScriptDocument => ({
    ...initialValue,
    content: initialValue.content.map(block => ({...block, content: [{type: 'text', text: title}]})),
});

afterEach(() => {
    editors.forEach(editor => editor.destroy());
    editors.length = 0;
});

describe('script document session', () => {
    it('edits a detached document and keeps undo and redo in the same editor', async () => {
        const save = vi.fn(() => Promise.resolve(true));
        const editor = createEditor();
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });

        session.attach(editor, {onAutoSave: save});

        const original = session.getDocument();

        expect(session.applyDocumentChange(named('A scene'))).toBe(true);
        expect(session.getDocument().content[0].content?.[0].text).toBe('A scene');
        expect(session.undo()).toBe(true);
        expect(session.getDocument().content).toEqual(original.content);
        expect(session.redo()).toBe(true);
        expect(session.getDocument().content[0].content?.[0].text).toBe('A scene');
        expect(await session.flush()).toBe(true);
        expect(save).toHaveBeenLastCalledWith(session.getDocument());
        session.dispose();
    });

    it('keeps failed changes dirty for a successful retry', async () => {
        const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });

        session.attach(createEditor(), {onAutoSave: save});
        session.applyDocumentChange(named('A scene'));

        expect(session.getSnapshot().isDirty).toBe(true);
        expect(await session.flush()).toBe(false);
        expect(session.getSnapshot().isDirty).toBe(true);
        expect(await session.flush()).toBe(true);
        expect(session.getSnapshot().isDirty).toBe(false);
        expect(save).toHaveBeenCalledTimes(2);
        session.dispose();
    });

    it('serializes overlapping saves and persists the newest revision last', async () => {
        let finishFirst: ((success: boolean) => void) | undefined;
        const saved: string[] = [];
        const save = vi.fn((value: ScriptDocument) => {
            saved.push(value.content[0].content?.[0].text ?? '');

            return saved.length === 1
                ? new Promise<boolean>(resolve => {
                    finishFirst = resolve;
                })
                : Promise.resolve(true);
        });
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });

        session.attach(createEditor(), {onAutoSave: save});
        session.applyDocumentChange(named('First'));

        const first = session.flush();

        await Promise.resolve();
        session.applyDocumentChange(named('Second'));

        const second = session.flush();

        expect(save).toHaveBeenCalledTimes(1);
        finishFirst?.(true);
        expect(await first).toBe(true);
        expect(await second).toBe(true);
        expect(saved).toEqual(['First', 'Second']);
        session.dispose();
    });

    it('flushes the newest edit when the workspace is disposed during a save', async () => {
        let finishFirst: ((success: boolean) => void) | undefined;
        const saved: string[] = [];
        const save = vi.fn((value: ScriptDocument) => {
            saved.push(value.content[0].content?.[0].text ?? '');

            return saved.length === 1 ? new Promise<boolean>(resolve => {
                finishFirst = resolve;
            }) : Promise.resolve(true);
        });
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });

        session.attach(createEditor(), {onAutoSave: save});
        session.applyDocumentChange(named('First'));

        const first = session.flush();

        await Promise.resolve();
        session.applyDocumentChange(named('Last'));
        session.dispose();
        finishFirst?.(true);
        expect(await first).toBe(true);
        expect(saved).toEqual(['First', 'Last']);
    });

    it('serializes manual save with newer automatic saves', async () => {
        let finishManual: ((success: boolean) => void) | undefined;
        const stored: string[] = [];
        const automatic = vi.fn((value: ScriptDocument) => {
            stored.push(value.content[0].content?.[0].text ?? '');

            return Promise.resolve(true);
        });
        const manual = vi.fn((value: ScriptDocument) => new Promise<boolean>(resolve => {
            finishManual = success => {
                stored.push(value.content[0].content?.[0].text ?? '');
                resolve(success);
            };
        }));
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });

        session.attach(createEditor(), {onAutoSave: automatic});
        session.applyDocumentChange(named('First'));

        const manualResult = session.saveManual(manual);

        await Promise.resolve();
        session.applyDocumentChange(named('Latest'));

        const automaticResult = session.flush();

        expect(automatic).not.toHaveBeenCalled();
        finishManual?.(true);
        expect(await manualResult).toBe(true);
        expect(await automaticResult).toBe(true);
        expect(stored).toEqual(['First', 'Latest']);
        session.dispose();
    });

    it('rejects edits and history operations for a read-only session', () => {
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: true,
            liveStore: createEditorSnapshotStore(),
        });

        session.attach(createEditor(), {});

        const original = session.getDocument();

        expect(session.applyDocumentChange(named('Changed'))).toBe(false);
        expect(session.undo()).toBe(false);
        expect(session.getDocument().content).toEqual(original.content);
        session.dispose();
    });
});
