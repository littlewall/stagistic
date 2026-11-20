import {
    type ScriptDocument,
    serializeStagisticFragment,
    serializeStagisticUnits,
} from '@stagistic/script';
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
import {
    type EditorSnapshotStore,
    EMPTY_BLOCK_PAGES,
    EMPTY_SCENE_PLACEMENT,
} from '../live/store';
import {buildIndexSnapshotFromPmDoc} from '../runtime/buildIndexSnapshotFromPmDoc';
import {createStructureCommands} from './structureTransactions';
import {createUnloadWarning} from './unloadWarning';

/** Quiet time after the last edit before the script is saved. */
export const AUTOSAVE_DEBOUNCE_MS = 1500;
/** Longest an edit may stay unsaved while the writer keeps typing. */
export const AUTOSAVE_MAX_WAIT_MS = 10_000;
/*
 * Longest a save may run before it counts as failed. Measured on real workers:
 * an edit saves in 35 ms, the first save of a 3,000-block script in 232 ms, and
 * a save held while a follower takes over as leader waits 423 ms at most, so
 * about 0.7 s in the worst legitimate case. 15 s still leaves room on a machine
 * ten times slower. Too short costs a false warning and a repeated save, which
 * writes the same document; too long leaves a writer typing with nothing saved.
 */
export const SAVE_DEADLINE_MS = 15_000;

type SessionSnapshot = {
    revision: number,
    isReady: boolean,
    isDirty: boolean,
    canUndo: boolean,
    canRedo: boolean,
};
type SessionBinding = {
    onAutoSave?: (value: ScriptDocument) => Promise<boolean>,
    /** A save ran out of time. It never reported back, so the app has not shown it as failed. */
    onSaveTimedOut?: () => void,
};

export const createScriptDocumentSession = ({
    initialValue,
    isReadOnly,
    liveStore,
    saveDeadlineMs = SAVE_DEADLINE_MS,
}: {
    initialValue: ScriptDocument,
    isReadOnly: boolean,
    liveStore: EditorSnapshotStore,
    saveDeadlineMs?: number,
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
    let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
    const unloadWarning = createUnloadWarning();
    let pendingSave: Promise<boolean> | null = null;
    let isEditingStopped = false;
    const listeners = new Set<() => void>();

    const publish = (next: SessionSnapshot) => {
        snapshot = next;
        unloadWarning.set(next.isDirty);
        listeners.forEach(listener => listener());
    };
    const getDocument = (): ScriptDocument => editor && !editor.isDestroyed
        ? stripScriptSettings(editor.getJSON() as ScriptDocument)
        : detachedValue;
    /*
     * Every later save waits for the one running, so one that never returns would
     * silently end all saving. Giving up does not stop it: should it still land,
     * the repository keeps saves of a script in order and the document stays dirty
     * here, so the next save writes the newest text over it.
     */
    const withinDeadline = (saving: Promise<boolean>) => new Promise<boolean>(resolve => {
        const deadline = setTimeout(() => {
            binding.onSaveTimedOut?.();
            resolve(false);
        }, saveDeadlineMs);

        void saving.then(result => {
            clearTimeout(deadline);
            resolve(result);
        });
    });
    const runSave = async (manualSave?: (value: ScriptDocument) => Promise<boolean>): Promise<boolean> => {
        clearTimeout(timer);
        clearTimeout(maxWaitTimer);
        maxWaitTimer = undefined;

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

        pendingSave = withinDeadline(Promise.resolve().then(() => save(value)).catch(() => false));

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
                blockPages: EMPTY_BLOCK_PAGES,
            });
        }

        clearTimeout(timer);
        timer = setTimeout(() => void flush(), AUTOSAVE_DEBOUNCE_MS);
        maxWaitTimer ??= setTimeout(() => void flush(), AUTOSAVE_MAX_WAIT_MS);
    };
    const detach = () => {
        detachedValue = getDocument();
        editor?.off('transaction', onUpdate);
        editor = null;
        publish({...snapshot, isReady: false});
    };

    return {
        liveStore,
        commands: createStructureCommands(() => isEditingStopped ? null : editor, isReadOnly),
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

            if (isEditingStopped) {
                instance.setEditable(false, false);
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
            if (isReadOnly || isEditingStopped || !editor || editor.isDestroyed) {
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
        undo: () => !isReadOnly && !isEditingStopped && !!editor && editor.commands.undo(),
        redo: () => !isReadOnly && !isEditingStopped && !!editor && editor.commands.redo(),
        flush,
        /** The rest of the document's life is read-only; what was typed can still be flushed. */
        stopEditing: () => {
            isEditingStopped = true;
            editor?.setEditable(false, false);
        },
        /** The script as plain text, for a writer rescuing it by hand. */
        getText: () => serializeStagisticFragment(serializeStagisticUnits(getDocument())).text,
        saveManual: (save: (value: ScriptDocument) => Promise<boolean>) => runSave(save),
        dispose: () => {
            clearTimeout(timer);
            detach();
            // A save still running keeps the warning until it ends, then it always goes.
            void flush().finally(() => unloadWarning.set(false));
            listeners.clear();
        },
    };
};

export type ScriptDocumentSession = ReturnType<typeof createScriptDocumentSession>;
