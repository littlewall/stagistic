import {
    collectStructureBlocks,
    createNodeId,
    ELEMENT_ACT,
    type FountainJSONContent,
    getDefaultActName,
    type ScriptDocument,
} from '@stagistic/script-core';
import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject, useEffect, useRef,
} from 'react';

import {FOUNTAIN_BLOCK_NODE_NAME} from '../tiptap/fountainCore';
import {
    insertActBlockBeforeId,
    removeActBlockById,
    setPlainTextContent,
    tryCommitDocument,
} from './structureRequestMutations';
import {useEditorActiveBlockSync} from './useEditorActiveBlockSync';
import {useEditorMoveRequests} from './useEditorMoveRequests';

type StructureRequestState = {
    insertActRequest?: {
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    renameActRequest?: {
        blockId: string,
        nextName: string,
        requestId: number,
    } | null,
    deleteActRequest?: {
        blockId: string,
        requestId: number,
    } | null,
    moveSceneRequest?: {
        sourceSceneBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    moveActRequest?: {
        sourceActBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null,
};

type UseEditorStructureRequestsArgs = StructureRequestState & {
    editor: TiptapEditor | null,
    focusBlockRequest?: {
        blockId: string,
        requestId: number,
    } | null,
    onActiveBlockChange?: (blockId: string | null) => void,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument) => void) | undefined>,
    setLatestValue: (value: ScriptDocument) => void,
    scheduleAutosave: (value: ScriptDocument) => void,
};

export const useEditorStructureRequests = ({
    editor,
    insertActRequest,
    renameActRequest,
    deleteActRequest,
    moveSceneRequest,
    moveActRequest,
    focusBlockRequest,
    onActiveBlockChange,
    onValueChangeRef,
    setLatestValue,
    scheduleAutosave,
}: UseEditorStructureRequestsArgs) => {
    const lastInsertActRequestIdRef = useRef<number | null>(null);
    const lastRenameActRequestIdRef = useRef<number | null>(null);
    const lastDeleteActRequestIdRef = useRef<number | null>(null);

    useEditorActiveBlockSync({
        editor,
        onActiveBlockChange,
        focusBlockRequest,
    });
    useEditorMoveRequests({
        editor,
        moveSceneRequest,
        moveActRequest,
        onValueChangeRef,
        setLatestValue,
        scheduleAutosave,
    });

    useEffect(() => {
        if (!editor || !insertActRequest) {
            return;
        }

        if (lastInsertActRequestIdRef.current === insertActRequest.requestId) {
            return;
        }

        lastInsertActRequestIdRef.current = insertActRequest.requestId;

        const currentValue = editor.getJSON() as ScriptDocument;
        const actCount = collectStructureBlocks(currentValue.content)
            .filter(block => block.blockType === ELEMENT_ACT)
            .length;
        const nextActName = getDefaultActName(actCount + 1);
        const nextActBlock: FountainJSONContent = {
            type: FOUNTAIN_BLOCK_NODE_NAME,
            attrs: {
                id: createNodeId(),
                blockType: ELEMENT_ACT,
            },
            content: [
                {
                    type: 'text',
                    text: nextActName,
                },
            ],
        };
        let nextContent = [...currentValue.content, nextActBlock];
        let didChange = true;

        if (insertActRequest.beforeBlockId) {
            const [insertedContent, didInsert] = insertActBlockBeforeId(
                currentValue.content,
                insertActRequest.beforeBlockId,
                nextActBlock,
            );

            if (didInsert && Array.isArray(insertedContent)) {
                nextContent = insertedContent;
            }

            if (!didInsert) {
                didChange = false;
            }
        }

        tryCommitDocument(
            editor,
            nextContent,
            didChange,
            setLatestValue,
            onValueChangeRef,
            scheduleAutosave,
        );
    }, [
        editor,
        insertActRequest,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
    ]);

    useEffect(() => {
        if (!editor || !renameActRequest) {
            return;
        }

        if (lastRenameActRequestIdRef.current === renameActRequest.requestId) {
            return;
        }

        lastRenameActRequestIdRef.current = renameActRequest.requestId;

        const normalizedName = renameActRequest.nextName.trim().toLocaleUpperCase();

        if (!renameActRequest.blockId) {
            return;
        }

        const currentValue = editor.getJSON() as ScriptDocument;
        const [nextContent, didChange] = setPlainTextContent(
            currentValue.content,
            renameActRequest.blockId,
            normalizedName,
        );

        tryCommitDocument(
            editor,
            nextContent,
            didChange,
            setLatestValue,
            onValueChangeRef,
            scheduleAutosave,
        );
    }, [
        editor,
        onValueChangeRef,
        renameActRequest,
        scheduleAutosave,
        setLatestValue,
    ]);

    useEffect(() => {
        if (!editor || !deleteActRequest) {
            return;
        }

        if (lastDeleteActRequestIdRef.current === deleteActRequest.requestId) {
            return;
        }

        lastDeleteActRequestIdRef.current = deleteActRequest.requestId;

        if (!deleteActRequest.blockId) {
            return;
        }

        const currentValue = editor.getJSON() as ScriptDocument;
        const [nextContent, didChange] = removeActBlockById(
            currentValue.content,
            deleteActRequest.blockId,
        );

        tryCommitDocument(
            editor,
            nextContent,
            didChange,
            setLatestValue,
            onValueChangeRef,
            scheduleAutosave,
        );
    }, [
        deleteActRequest,
        editor,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
    ]);
};
