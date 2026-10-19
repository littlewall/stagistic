import {buildScriptSummaryMetadata, type ScriptDocument} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/core';

import {stripScriptSettings} from '../editorSettings';
import {paginationKey} from '../tiptap/extensions/pagination/plugin/createPaginationPlugin';
import type {PaginationStorage} from '../tiptap/extensions/pagination/types';
import {getSceneCollapseSnapshot} from '../tiptap/extensions/sceneCollapse/SceneCollapseExtension';

export const getEditorPaginationStorage = (editor: TiptapEditor) => {
    return (editor.storage as unknown as {Pagination?: PaginationStorage}).Pagination;
};

export const getMeasuredEditorPageCount = (editor: TiptapEditor): number | null => {
    if (getSceneCollapseSnapshot(editor.state).collapsedSceneIds.length > 0) {
        return null;
    }

    const storage = getEditorPaginationStorage(editor);
    const pluginState = paginationKey.getState(editor.state);

    if (!storage || !pluginState?.hasMeasuredLayout) {
        return null;
    }

    /*
     * A detached view cannot be measured, but its last full measurement still
     * holds: `hasMeasuredLayout` resets on any document change.
     */
    if (!editor.view.dom.isConnected) {
        return storage.measuredOptionsVersion === storage.optionsVersion ? storage.state.pageCount : null;
    }

    if (editor.view.dom.clientWidth <= storage.options.marginLeft + storage.options.marginRight
        || storage.options.pageHeight <= storage.options.marginTop + storage.options.marginBottom) {
        return null;
    }

    return storage.state.pageCount;
};

/** Read the document and its freshly measured pagination as one save snapshot. */
export const captureEditorSaveSnapshot = (editor: TiptapEditor) => {
    const wasMeasured = getEditorPaginationStorage(editor)?.flushRecalc?.() ?? false;
    const value = stripScriptSettings(editor.getJSON() as ScriptDocument);
    const pageCount = wasMeasured || !editor.view.dom.isConnected ? getMeasuredEditorPageCount(editor) : null;

    return {value, metadata: buildScriptSummaryMetadata(value, pageCount)};
};
