import {
    buildScriptBlockIndex,
    type ScriptNode,
    type ScriptDocument,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import type {MutableRefObject} from 'react';

import type {
    EditorIndexSnapshot,
    EditorValueChangeMeta,
} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {PAGINATION_CONTROL_META_KEY} from '../tiptap/extensions/pagination/plugin/createPaginationPlugin';
import {buildSceneReorderTransaction} from './sceneReorder';
import {type AutosaveSchedulePayload} from './useAutosaveController';

let paginationRecalcToken = 0;
const nextPaginationRecalcToken = () => ++paginationRecalcToken;

export interface CommitContext {
    editor: TiptapEditor,
    setLatestValue: (value: ScriptDocument, revision?: number) => void,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument, meta?: EditorValueChangeMeta) => void) | undefined>,
    onIndexChangeRef: MutableRefObject<((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void) | undefined>,
    scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    revisionRef: MutableRefObject<number>,
}

export {
    buildInsertActContent,
    insertActBlockBeforeId,
    removeActBlockById,
    setPlainTextContent,
} from './blockMutations';

const commitDocument = (
    {
        editor, setLatestValue, onValueChangeRef, onIndexChangeRef, scheduleAutosave, revisionRef,
    }: CommitContext,
    nextContent: ScriptNode[],
    currentDocAttrs: ScriptDocument['attrs'],
) => {
    const nextDocument: ScriptDocument = {
        type: 'doc',
        attrs: currentDocAttrs,
        content: nextContent,
    };

    editor.commands.setContent(nextDocument, {emitUpdate: false});
    editor.view.dispatch(
        editor.state.tr
            .setDocAttribute('settings', currentDocAttrs?.settings ?? null)
            .setMeta('preventUpdate', true),
    );

    editor.view.dispatch(
        editor.state.tr
            .setMeta('preventUpdate', true)
            .setMeta(PAGINATION_CONTROL_META_KEY, {forceRecalcToken: nextPaginationRecalcToken()}),
    );

    const savedValue = stripScriptSettings(nextDocument);

    revisionRef.current += 1;

    const revision = revisionRef.current;

    setLatestValue(savedValue, revision);

    window.setTimeout(() => {
        onValueChangeRef.current?.(savedValue, {
            source: 'structure',
            revision,
        });
        onIndexChangeRef.current?.(buildScriptBlockIndex(savedValue).snapshot, {
            source: 'structure',
            revision,
        });
        scheduleAutosave({
            value: savedValue,
            revision,
            immediate: true,
        });
    }, 0);
};

export const tryCommitSceneReorder = (
    ctx: CommitContext,
    sourceSceneBlockId: string,
    beforeBlockId: string | null,
    nextContent: ScriptNode[],
    didChange: boolean,
    currentDocAttrs: ScriptDocument['attrs'],
) => {
    const {
        editor, setLatestValue, onValueChangeRef, onIndexChangeRef, scheduleAutosave, revisionRef,
    } = ctx;

    if (!didChange || !Array.isArray(nextContent)) {
        return;
    }

    const savedValue = stripScriptSettings({
        type: 'doc',
        attrs: currentDocAttrs,
        content: nextContent,
    });

    revisionRef.current += 1;

    const revision = revisionRef.current;

    const surgicalTr = buildSceneReorderTransaction(editor, sourceSceneBlockId, beforeBlockId);

    if (surgicalTr) {
        surgicalTr.setMeta('preventUpdate', true);
        editor.view.dispatch(surgicalTr);

        editor.view.dispatch(
            editor.state.tr
                .setMeta('preventUpdate', true)
                .setMeta(PAGINATION_CONTROL_META_KEY, {forceRecalcToken: nextPaginationRecalcToken()}),
        );

        setLatestValue(savedValue, revision);

        window.setTimeout(() => {
            onValueChangeRef.current?.(savedValue, {
                source: 'structure',
                revision,
            });
            onIndexChangeRef.current?.(buildScriptBlockIndex(savedValue).snapshot, {
                source: 'structure',
                revision,
            });
            scheduleAutosave({
                value: savedValue,
                revision,
                immediate: true,
            });
        }, 0);

        return;
    }

    const nextDocument: ScriptDocument = {
        type: 'doc',
        attrs: currentDocAttrs,
        content: nextContent,
    };

    editor.commands.setContent(nextDocument, {emitUpdate: false});
    editor.view.dispatch(
        editor.state.tr
            .setDocAttribute('settings', currentDocAttrs?.settings ?? null)
            .setMeta('preventUpdate', true),
    );

    setLatestValue(savedValue, revision);
    onValueChangeRef.current?.(savedValue, {
        source: 'structure',
        revision,
    });
    onIndexChangeRef.current?.(buildScriptBlockIndex(savedValue).snapshot, {
        source: 'structure',
        revision,
    });
    scheduleAutosave({
        value: savedValue,
        revision,
        immediate: true,
    });
};

export const tryCommitDocument = (
    ctx: CommitContext,
    nextContent: ScriptNode[] | undefined,
    didChange: boolean,
    currentDocAttrs: ScriptDocument['attrs'],
) => {
    if (!didChange || !Array.isArray(nextContent)) {
        return;
    }

    commitDocument(ctx, nextContent, currentDocAttrs);
};
