import type {ScriptDocument} from '@stagistic/script';
import type {Editor} from '@tiptap/core';
import {
    closeHistory,
    redoDepth,
    undoDepth,
} from '@tiptap/pm/history';
import type {Transaction} from '@tiptap/pm/state';

import type {EditorLifecycleCallbacks} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {buildSidebarProjectionFromIndex} from '../live/buildSidebarProjectionFromIndex';
import {type EditorSnapshotStore, EMPTY_SCENE_PLACEMENT} from '../live/store';
import {buildIndexSnapshotFromPmDoc} from '../runtime/buildIndexSnapshotFromPmDoc';
import {createStructureCommands} from './structureTransactions';

type SessionSnapshot = {
    revision: number,
    isReady: boolean,
    isDirty: boolean,
    canUndo: boolean,
    canRedo: boolean,
};
type SessionBinding = {onAutoSave?: (value: ScriptDocument) => Promise<boolean>};

export const createScriptDocumentSession = ({
    initialValue,
    isReadOnly,
    liveStore,
}: {
    initialValue: ScriptDocument,
    isReadOnly: boolean,
    liveStore: EditorSnapshotStore,
}) => {
    let editor: Editor | null = null;
    let detachedValue = initialValue;
    let binding: SessionBinding = {};
    let callbacks: EditorLifecycleCallbacks = {};
    let snapshot: SessionSnapshot = {
        revision: 0,
        isReady: false,
        isDirty: false,
        canUndo: false,
        canRedo: false,
    };
    let savedRevision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingSave: Promise<boolean> | null = null;
    const listeners = new Set<() => void>();

    const publish = (next: SessionSnapshot) => {
        snapshot = next;
        listeners.forEach(listener => listener());
    };
    const getDocument = (): ScriptDocument => editor && !editor.isDestroyed
        ? stripScriptSettings(editor.getJSON() as ScriptDocument)
        : detachedValue;
    const runSave = async (manualSave?: (value: ScriptDocument) => Promise<boolean>): Promise<boolean> => {
        clearTimeout(timer);

        if (isReadOnly || (!manualSave && snapshot.revision <= savedRevision)) {
            return true;
        }

        if (pendingSave) {
            return await pendingSave && runSave(manualSave);
        }

        const save = manualSave ?? binding.onAutoSave;

        if (!save) {
            return false;
        }

        const revision = snapshot.revision;
        const value = getDocument();

        pendingSave = Promise.resolve().then(() => save(value)).catch(() => false);

        const success = await pendingSave;

        pendingSave = null;

        if (!success) {
            return false;
        }

        savedRevision = Math.max(savedRevision, revision);
        publish({...snapshot, isDirty: snapshot.revision > savedRevision});

        return snapshot.revision > savedRevision ? runSave() : true;
    };
    const flush = () => runSave();
    const onUpdate = ({transaction}: {transaction: Transaction}) => {
        if (!editor || isReadOnly || !transaction.docChanged) {
            return;
        }

        publish({
            revision: snapshot.revision + 1,
            isReady: true,
            isDirty: true,
            canUndo: undoDepth(editor.state) > 0,
            canRedo: redoDepth(editor.state) > 0,
        });

        if (!editor.view.dom.isConnected) {
            const index = buildIndexSnapshotFromPmDoc(editor.state.doc);

            liveStore.patchSnapshot({
                index,
                structure: buildSidebarProjectionFromIndex(index).structure,
                music: index.music,
                scenePlacement: EMPTY_SCENE_PLACEMENT,
            });
        }

        clearTimeout(timer);
        timer = setTimeout(() => void flush(), 1500);
    };
    const detach = () => {
        detachedValue = getDocument();
        editor?.off('transaction', onUpdate);
        editor = null;
        publish({...snapshot, isReady: false});
    };

    return {
        liveStore,
        commands: createStructureCommands(() => editor, isReadOnly),
        getDocument,
        getEditor: () => editor,
        getCallbacks: () => callbacks,
        bindCallbacks: (next: EditorLifecycleCallbacks) => {
            callbacks = next;

            return () => {
                if (callbacks === next) callbacks = {};
            };
        },
        getSnapshot: () => snapshot,
        subscribe: (listener: () => void) => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        attach: (instance: Editor, nextBinding: SessionBinding) => {
            if (editor !== instance) {
                editor?.off('transaction', onUpdate);
                editor = instance;
                editor.on('transaction', onUpdate);
            }

            binding = nextBinding;
            publish({...snapshot, isReady: true});
        },
        detach: (instance: Editor) => {
            if (editor !== instance) return;

            detach();
            void flush();
        },
        applyDocumentChange: (value: ScriptDocument) => {
            if (isReadOnly || !editor || editor.isDestroyed) {
                return false;
            }

            const next = editor.schema.nodeFromJSON(value);

            if (editor.state.doc.eq(next)) {
                return false;
            }

            const tr = closeHistory(editor.state.tr).replaceWith(0, editor.state.doc.content.size, next.content);

            editor.view.dispatch(tr);

            return true;
        },
        undo: () => !isReadOnly && !!editor && editor.commands.undo(),
        redo: () => !isReadOnly && !!editor && editor.commands.redo(),
        flush,
        saveManual: (save: (value: ScriptDocument) => Promise<boolean>) => runSave(save),
        dispose: () => {
            clearTimeout(timer);
            detach();
            void flush();
            listeners.clear();
        },
    };
};

export type ScriptDocumentSession = ReturnType<typeof createScriptDocumentSession>;
