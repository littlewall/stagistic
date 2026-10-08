import type {ScriptDocument} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/core';
import {useEffect, useMemo} from 'react';

import type {EditorCollaboration} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {getCollaborationDocKey} from '../tiptap/collab/collaborationDocKey';

/*
 * A bound editor reads its content from the Y.Doc, so the doc identity (not
 * its content, which changes while typing) keys the cached surface.
 */
export const useInitialContentSignature = (collaboration: EditorCollaboration | undefined, initialValue: ScriptDocument) => useMemo(
    () => collaboration
        ? `collab:${getCollaborationDocKey(collaboration.document)}:${collaboration.field}`
        : JSON.stringify(stripScriptSettings(initialValue)),
    [collaboration, initialValue],
);

export const useEditorReadOnly = (editor: TiptapEditor | null, readOnly: boolean) => {
    useEffect(() => {
        if (editor && !editor.isDestroyed && editor.isEditable === readOnly) {
            editor.setEditable(!readOnly);
        }
    }, [editor, readOnly]);
};
