import {
    collectStructureBlocks,
    createNodeId,
    ELEMENT_ACT,
    type FountainJSONContent,
    getDefaultActName,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    resolveScriptBlockNodeType,
    type ScriptDocument,
} from '@stagistic/script';
import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject, useEffect, useRef,
} from 'react';

import type {
    EditorIndexSnapshot,
    EditorStructureRequests,
    EditorValueChangeMeta,
    InsertActRequest,
} from '../contracts';

const findFirstActBlockId = (content: FountainJSONContent[] | undefined): string | null => {
    if (!Array.isArray(content)) {
        return null;
    }

    for (const node of content) {
        if (isScriptBlockNode(node) && getScriptBlockLegacyType(node) === ELEMENT_ACT) {
            return getScriptBlockId(node);
        }
    }

    return null;
};
import {FOUNTAIN_BLOCK_NODE_NAME} from '../tiptap/fountainCore';
import {
    insertActBlockBeforeId,
    removeActBlockById,
    setPlainTextContent,
    tryCommitDocument,
} from './structureRequestMutations';
import {type AutosaveSchedulePayload} from './useAutosaveController';
import {useEditorMoveRequests} from './useEditorMoveRequests';

interface UseEditorStructureRequestsArgs {
    editor: TiptapEditor | null,
    requests?: EditorStructureRequests,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument, meta?: EditorValueChangeMeta) => void) | undefined>,
    onIndexChangeRef: MutableRefObject<((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void) | undefined>,
    setLatestValue: (value: ScriptDocument, revision?: number) => void,
    scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    revisionRef: MutableRefObject<number>,
}

const canInsertBeforeExistingBlock = (
    request: InsertActRequest,
): request is InsertActRequest & {beforeBlockId: string} => {
    return typeof request.beforeBlockId === 'string' && request.beforeBlockId.length > 0;
};

export const useEditorStructureRequests = ({
    editor,
    requests,
    onValueChangeRef,
    onIndexChangeRef,
    setLatestValue,
    scheduleAutosave,
    revisionRef,
}: UseEditorStructureRequestsArgs) => {
    const {
        insertActRequest,
        renameActRequest,
        deleteActRequest,
        moveSceneRequest,
    } = requests ?? {};
    const lastInsertActRequestIdRef = useRef<number | null>(null);
    const lastRenameActRequestIdRef = useRef<number | null>(null);
    const lastDeleteActRequestIdRef = useRef<number | null>(null);

    useEditorMoveRequests({
        editor,
        requests: {
            moveSceneRequest,
        },
        onValueChangeRef,
        onIndexChangeRef,
        setLatestValue,
        scheduleAutosave,
        revisionRef,
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
        const prefersLegacyNodeType = currentValue.content.some(node => isScriptBlockNode(node) && node.type === FOUNTAIN_BLOCK_NODE_NAME);
        const nextActNodeType = prefersLegacyNodeType
            ? FOUNTAIN_BLOCK_NODE_NAME
            : resolveScriptBlockNodeType(ELEMENT_ACT) ?? FOUNTAIN_BLOCK_NODE_NAME;
        const nextActBlock: FountainJSONContent = {
            type: nextActNodeType,
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

        if (canInsertBeforeExistingBlock(insertActRequest)) {
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
            onIndexChangeRef,
            scheduleAutosave,
            revisionRef,
        );
    }, [
        editor,
        insertActRequest,
        onIndexChangeRef,
        onValueChangeRef,
        revisionRef,
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
            onIndexChangeRef,
            scheduleAutosave,
            revisionRef,
        );
    }, [
        editor,
        onIndexChangeRef,
        onValueChangeRef,
        renameActRequest,
        revisionRef,
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
        const firstActBlockId = findFirstActBlockId(currentValue.content);

        if (firstActBlockId && deleteActRequest.blockId === firstActBlockId) {
            return;
        }

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
            onIndexChangeRef,
            scheduleAutosave,
            revisionRef,
        );
    }, [
        deleteActRequest,
        editor,
        onIndexChangeRef,
        onValueChangeRef,
        revisionRef,
        scheduleAutosave,
        setLatestValue,
    ]);
};
