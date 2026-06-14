import {
    type ScriptDocument,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    useCallback,
    useRef,
} from 'react';

import {moveTopLevelNonStructuralBlock} from '../../../hooks/structureReorder';
import {findScriptBlockSelectionPosFromState} from '../../../tiptap/scriptCore';
import type {DragSessionState} from './types';

interface UseDragPreviewSessionArgs {
    editor: TiptapEditor | null,
}

export const useDragPreviewSession = ({editor}: UseDragPreviewSessionArgs) => {
    const dragSessionRef = useRef<DragSessionState | null>(null);

    const focusBlockById = useCallback((blockId: string) => {
        if (!editor) {
            return;
        }

        const selectionPos = findScriptBlockSelectionPosFromState(
            editor.state,
            blockId,
        );

        if (selectionPos === null) {
            editor.commands.focus();

            return;
        }

        editor
            .chain()
            .focus()
            .setTextSelection(selectionPos)
            .run();
    }, [editor]);

    const buildMovedDocument = useCallback((
        baseDocument: ScriptDocument,
        sourceBlockId: string,
        beforeBlockId: string | null,
    ): {nextDocument: ScriptDocument, didChange: boolean} => {
        const [nextContent, didChange] = moveTopLevelNonStructuralBlock(
            baseDocument.content,
            sourceBlockId,
            beforeBlockId,
        );

        if (!didChange || !Array.isArray(nextContent)) {
            return {
                nextDocument: baseDocument,
                didChange: false,
            };
        }

        return {
            nextDocument: {
                ...baseDocument,
                content: nextContent,
            },
            didChange: true,
        };
    }, []);

    const beginDragPreviewSession = useCallback((sourceBlockId: string) => {
        if (!editor) {
            dragSessionRef.current = null;

            return;
        }

        dragSessionRef.current = {
            sourceBlockId,
            baseDocument: editor.getJSON() as ScriptDocument,
            lastPreviewBeforeBlockId: null,
            hasPreviewChange: false,
        };
    }, [editor]);

    const clearDragPreviewSession = useCallback(() => {
        dragSessionRef.current = null;
    }, []);

    const applyPreviewMove = useCallback((beforeBlockId: string | null) => {
        const session = dragSessionRef.current;

        if (!editor || !session) {
            return;
        }

        if (session.lastPreviewBeforeBlockId === beforeBlockId) {
            return;
        }

        session.lastPreviewBeforeBlockId = beforeBlockId;

        const {nextDocument, didChange} = buildMovedDocument(
            session.baseDocument,
            session.sourceBlockId,
            beforeBlockId,
        );

        if (!didChange) {
            if (session.hasPreviewChange) {
                editor.commands.setContent(session.baseDocument, {emitUpdate: false});
            }

            session.hasPreviewChange = false;

            return;
        }

        editor.commands.setContent(nextDocument, {emitUpdate: false});
        session.hasPreviewChange = true;
    }, [buildMovedDocument, editor]);

    const revertPreviewMove = useCallback(() => {
        const session = dragSessionRef.current;

        if (!editor || !session || !session.hasPreviewChange) {
            dragSessionRef.current = null;

            return;
        }

        editor.commands.setContent(session.baseDocument, {emitUpdate: false});
        dragSessionRef.current = null;
    }, [editor]);

    const commitPreviewMove = useCallback((beforeBlockId: string | null) => {
        const session = dragSessionRef.current;

        if (!editor || !session) {
            dragSessionRef.current = null;

            return;
        }

        const {nextDocument, didChange} = buildMovedDocument(
            session.baseDocument,
            session.sourceBlockId,
            beforeBlockId,
        );

        if (!didChange) {
            if (session.hasPreviewChange) {
                editor.commands.setContent(session.baseDocument, {emitUpdate: false});
            }

            focusBlockById(session.sourceBlockId);
            dragSessionRef.current = null;

            return;
        }

        editor.commands.setContent(nextDocument, {emitUpdate: true});

        const sourceBlockId = session.sourceBlockId;

        dragSessionRef.current = null;
        focusBlockById(sourceBlockId);
    }, [
        buildMovedDocument,
        editor,
        focusBlockById,
    ]);

    return {
        dragSessionRef,
        beginDragPreviewSession,
        clearDragPreviewSession,
        applyPreviewMove,
        revertPreviewMove,
        commitPreviewMove,
    };
};
