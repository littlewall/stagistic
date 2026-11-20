import {createDefaultScriptDocument, type ScriptDocument} from '@stagistic/script';
import {hasUnsavedWork, installUnsavedWorkWarning} from '@stagistic/shared';
import {Editor} from '@tiptap/core';
import History from '@tiptap/extension-history';
import Text from '@tiptap/extension-text';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createEditorSnapshotStore} from '../live/store';
import {DocumentWithSettings} from '../tiptap/extensions/DocumentExtension';
import {ScriptBlockNodes} from '../tiptap/nodes';
import {createScriptDocumentSession, SAVE_DEADLINE_MS} from './createScriptDocumentSession';

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

const createSession = (isReadOnly = false) => createScriptDocumentSession({
    initialValue,
    isReadOnly,
    liveStore: createEditorSnapshotStore(),
});

const askBeforeUnload = () => {
    const event = new Event('beforeunload', {cancelable: true});

    window.dispatchEvent(event);

    return event.defaultPrevented;
};

let removeUnloadWarning = () => {};

beforeEach(() => {
    removeUnloadWarning = installUnsavedWorkWarning(window);
});

afterEach(() => {
    removeUnloadWarning();
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, 'isTauri');
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

    it('stops accepting edits and still saves what was typed before', async () => {
        const session = createSession();
        const editor = createEditor();
        const saved: ScriptDocument[] = [];

        session.attach(editor, {
            onAutoSave: value => {
                saved.push(value);

                return Promise.resolve(true);
            },
        });
        editor.commands.insertContentAt(1, 'Typed before the handover');
        session.stopEditing();

        expect(editor.isEditable).toBe(false);
        expect(session.undo()).toBe(false);
        expect(session.applyDocumentChange(named('Replaced'))).toBe(false);
        expect(session.commands.insertAct(null)).toBeNull();

        await expect(session.flush()).resolves.toBe(true);
        expect(JSON.stringify(saved.at(-1))).toContain('Typed before the handover');
    });

    it('keeps a surface attached after the stop read-only', () => {
        const session = createSession();

        session.stopEditing();

        const editor = createEditor();

        session.attach(editor, {});

        expect(editor.isEditable).toBe(false);
    });

    it('gives the script as text, also after the editor is gone', () => {
        const session = createSession();
        const editor = createEditor();

        session.attach(editor, {});
        editor.commands.insertContentAt(1, 'Rescue this line');

        expect(session.getText()).toContain('Rescue this line');

        session.detach(editor);

        expect(session.getText()).toContain('Rescue this line');
        session.dispose();
    });
});

describe('script document session autosave timing', () => {
    const type = (editor: Editor, text: string) => editor.commands.insertContent(text);

    it('saves after a normal pause of 1.5 s', async () => {
        vi.useFakeTimers();

        const save = vi.fn(() => Promise.resolve(true));
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: save});
        type(editor, 'a');
        await vi.advanceTimersByTimeAsync(1499);

        expect(save).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);

        expect(save).toHaveBeenCalledTimes(1);
        session.dispose();
    });

    it('saves at least every 10 s while typing never pauses', async () => {
        vi.useFakeTimers();

        const save = vi.fn(() => Promise.resolve(true));
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: save});

        for (let elapsed = 0; elapsed < 9900; elapsed += 300) {
            type(editor, 'a');
            await vi.advanceTimersByTimeAsync(300);
        }

        expect(save).not.toHaveBeenCalled();

        type(editor, 'a');
        await vi.advanceTimersByTimeAsync(100);

        expect(save).toHaveBeenCalledTimes(1);

        for (let elapsed = 0; elapsed < 9900; elapsed += 300) {
            type(editor, 'b');
            await vi.advanceTimersByTimeAsync(300);
        }

        expect(save).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(200);

        expect(save).toHaveBeenCalledTimes(2);
        session.dispose();
    });

    it('measures the limit from the first unsaved edit, not from an earlier save', async () => {
        vi.useFakeTimers();

        const save = vi.fn(() => Promise.resolve(true));
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: save});
        type(editor, 'a');
        await vi.advanceTimersByTimeAsync(2000);

        expect(save).toHaveBeenCalledTimes(1);

        for (let elapsed = 0; elapsed < 9900; elapsed += 300) {
            type(editor, 'b');
            await vi.advanceTimersByTimeAsync(300);
        }

        expect(save).toHaveBeenCalledTimes(1);
        session.dispose();
    });

    it('does not fire the limit again after a manual flush', async () => {
        vi.useFakeTimers();

        const save = vi.fn(() => Promise.resolve(true));
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: save});
        type(editor, 'a');
        await session.flush();
        await vi.advanceTimersByTimeAsync(30000);

        expect(save).toHaveBeenCalledTimes(1);
        session.dispose();
    });
});

describe('script document session save deadline', () => {
    const type = (editor: Editor, text: string) => editor.commands.insertContent(text);
    const neverAnswers = () => new Promise<boolean>(() => {});

    it('turns a save that never returns into a failed one and tells the app once', async () => {
        vi.useFakeTimers();

        const onSaveTimedOut = vi.fn();
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: neverAnswers, onSaveTimedOut});
        type(editor, 'a');

        const flushed = session.flush();

        await vi.advanceTimersByTimeAsync(SAVE_DEADLINE_MS - 1);
        expect(onSaveTimedOut).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);

        await expect(flushed).resolves.toBe(false);
        expect(onSaveTimedOut).toHaveBeenCalledTimes(1);
        expect(session.getSnapshot().isDirty).toBe(true);
        session.dispose();
        await vi.advanceTimersByTimeAsync(SAVE_DEADLINE_MS);
    });

    it('lets a disposed session with a stuck save go once the deadline has passed', async () => {
        vi.useFakeTimers();

        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: neverAnswers});
        type(editor, 'a');
        session.dispose();
        expect(hasUnsavedWork()).toBe(true);

        await vi.advanceTimersByTimeAsync(SAVE_DEADLINE_MS);

        expect(hasUnsavedWork()).toBe(false);
    });

    it('saves again once a stuck save has been given up', async () => {
        vi.useFakeTimers();

        const save = vi.fn<() => Promise<boolean>>()
            .mockImplementationOnce(neverAnswers)
            .mockResolvedValue(true);
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: save});
        type(editor, 'a');
        void session.flush();
        await vi.advanceTimersByTimeAsync(SAVE_DEADLINE_MS);

        type(editor, 'b');
        await expect(session.flush()).resolves.toBe(true);

        expect(save).toHaveBeenCalledTimes(2);
        expect(session.getSnapshot().isDirty).toBe(false);
        session.dispose();
    });

    it('does not take a save landing after its deadline for the edits made since', async () => {
        vi.useFakeTimers();

        let landLate = (_saved: boolean) => {};
        const save = vi.fn<() => Promise<boolean>>()
            .mockImplementationOnce(() => new Promise(resolve => {
                landLate = resolve;
            }))
            .mockResolvedValue(false);
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: save});
        type(editor, 'a');
        void session.flush();
        await vi.advanceTimersByTimeAsync(SAVE_DEADLINE_MS);

        type(editor, 'b');
        await expect(session.flush()).resolves.toBe(false);

        landLate(true);
        await vi.advanceTimersByTimeAsync(0);

        expect(session.getSnapshot().isDirty).toBe(true);
        session.dispose();
        await vi.advanceTimersByTimeAsync(0);
    });

    it('stays quiet about a save that finishes in time', async () => {
        vi.useFakeTimers();

        const onSaveTimedOut = vi.fn();
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: () => Promise.resolve(true), onSaveTimedOut});
        type(editor, 'a');
        await expect(session.flush()).resolves.toBe(true);
        await vi.advanceTimersByTimeAsync(SAVE_DEADLINE_MS);

        expect(onSaveTimedOut).not.toHaveBeenCalled();
        session.dispose();
    });
});

describe('script document session unload warning', () => {
    it('asks before leaving while text is unsaved, and not before or after saving', async () => {
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: () => Promise.resolve(true)});

        expect(askBeforeUnload()).toBe(false);

        editor.commands.insertContent('Unsaved');

        expect(askBeforeUnload()).toBe(true);

        await session.flush();

        expect(askBeforeUnload()).toBe(false);
        session.dispose();
    });

    it('tells the app about unsaved text until it is saved, a running save included', async () => {
        let finish: ((success: boolean) => void) | undefined;
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {
            onAutoSave: () => new Promise<boolean>(resolve => {
                finish = resolve;
            }),
        });
        expect(hasUnsavedWork()).toBe(false);

        editor.commands.insertContent('Unsaved');
        expect(hasUnsavedWork()).toBe(true);

        const flushing = session.flush();

        await vi.waitFor(() => expect(finish).toBeDefined());
        expect(hasUnsavedWork()).toBe(true);

        finish?.(true);
        await flushing;
        expect(hasUnsavedWork()).toBe(false);
        session.dispose();
    });

    it('clears the mark of a disposed session once its last save ended', async () => {
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: () => Promise.resolve(true)});
        editor.commands.insertContent('Unsaved');
        session.dispose();

        await vi.waitFor(() => expect(hasUnsavedWork()).toBe(false));
    });

    it('keeps asking while a save is still running and after one fails', async () => {
        let finish: ((success: boolean) => void) | undefined;
        const save = vi.fn()
            .mockImplementationOnce(() => new Promise<boolean>(resolve => {
                finish = resolve;
            }))
            .mockResolvedValue(true);
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: save});
        editor.commands.insertContent('Unsaved');

        const flushing = session.flush();

        await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));

        expect(askBeforeUnload()).toBe(true);
        finish?.(false);
        await flushing;

        expect(askBeforeUnload()).toBe(true);
        await session.flush();

        expect(askBeforeUnload()).toBe(false);
        session.dispose();
    });

    it('does not ask after the handover saved and stopped editing', async () => {
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: () => Promise.resolve(true)});
        editor.commands.insertContent('Typed before the handover');
        session.stopEditing();
        await session.flush();

        expect(askBeforeUnload()).toBe(false);
        session.dispose();
    });

    it('asks while the failed-save handover still holds the text', async () => {
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: () => Promise.resolve(false)});
        editor.commands.insertContent('Typed before the handover');
        session.stopEditing();
        await session.flush();

        expect(askBeforeUnload()).toBe(true);
        session.dispose();
    });

    it('keeps asking for one session while another one goes clean', async () => {
        const dirtyEditor = createEditor();
        const dirty = createSession();
        const clean = createSession();

        dirty.attach(dirtyEditor, {onAutoSave: () => Promise.resolve(false)});
        clean.attach(createEditor(), {onAutoSave: () => Promise.resolve(true)});
        dirtyEditor.commands.insertContent('Unsaved');
        clean.dispose();
        await Promise.resolve();

        expect(askBeforeUnload()).toBe(true);
        dirty.dispose();
        await vi.waitFor(() => expect(askBeforeUnload()).toBe(false));
    });

    it('never asks in a read-only session', () => {
        const editor = createEditor();
        const session = createSession(true);

        session.attach(editor, {});
        editor.commands.insertContent('Cannot be saved');

        expect(askBeforeUnload()).toBe(false);
        session.dispose();
    });

    it('never asks in the desktop shell', () => {
        Reflect.set(globalThis, 'isTauri', true);

        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: () => Promise.resolve(true)});
        editor.commands.insertContent('Unsaved');

        expect(session.getSnapshot().isDirty).toBe(true);
        expect(askBeforeUnload()).toBe(false);
        session.dispose();
    });

    it('keeps the prompt up through dispose with a save running, and adds no listener of its own', async () => {
        const added = vi.spyOn(window, 'addEventListener');
        const removed = vi.spyOn(window, 'removeEventListener');
        let finish: ((success: boolean) => void) | undefined;
        const save = vi.fn(() => new Promise<boolean>(resolve => {
            finish = resolve;
        }));
        const editor = createEditor();
        const session = createSession();
        const count = (spy: typeof added) => spy.mock.calls.filter(([type]) => type === 'beforeunload').length;

        session.attach(editor, {onAutoSave: save});
        editor.commands.insertContent('Unsaved');
        session.dispose();
        await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));

        expect(askBeforeUnload()).toBe(true);
        finish?.(true);
        await vi.waitFor(() => expect(askBeforeUnload()).toBe(false));
        expect(count(added)).toBe(0);
        expect(count(removed)).toBe(0);
        added.mockRestore();
        removed.mockRestore();
    });

    it('drops the warning when disposed with a save that cannot succeed', async () => {
        const editor = createEditor();
        const session = createSession();

        session.attach(editor, {onAutoSave: () => Promise.resolve(false)});
        editor.commands.insertContent('Unsaved');
        session.dispose();

        await vi.waitFor(() => expect(askBeforeUnload()).toBe(false));
    });
});
