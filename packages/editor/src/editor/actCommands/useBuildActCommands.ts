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
import {TextSelection} from '@tiptap/pm/state';
import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject, useCallback, useEffect, useRef,
} from 'react';

import type {EditorIndexSnapshot, EditorValueChangeMeta} from '../contracts';
import {moveSceneSegment} from '../hooks/structureReorder';
import {
    insertActBlockBeforeId,
    removeActBlockById,
    setPlainTextContent,
    tryCommitDocument,
    tryCommitSceneReorder,
} from '../hooks/structureRequestMutations';
import {type AutosaveSchedulePayload} from '../hooks/useAutosaveController';
import {setActiveBlockSyncSuppressed} from '../hooks/useEditorActiveBlockSync';
import {
    findFountainBlockSelectionPosFromState,
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../tiptap/fountainCore';
import type {EditorActCommands} from './context';

interface UseBuildActCommandsArgs {
    instance: TiptapEditor | null,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument, meta?: EditorValueChangeMeta) => void) | undefined>,
    onIndexChangeRef: MutableRefObject<((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void) | undefined>,
    setLatestValue: (value: ScriptDocument, revision?: number) => void,
    scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    revisionRef: MutableRefObject<number>,
}

export const useBuildActCommands = ({
    instance,
    onValueChangeRef,
    onIndexChangeRef,
    setLatestValue,
    scheduleAutosave,
    revisionRef,
}: UseBuildActCommandsArgs): EditorActCommands => {
    const releaseSyncSuppressionFrameRef = useRef<number | null>(null);

    useEffect(() => () => {
        if (releaseSyncSuppressionFrameRef.current !== null) {
            window.cancelAnimationFrame(releaseSyncSuppressionFrameRef.current);
        }
    }, []);

    const restoreSelectionForBlock = useCallback((blockId: string | null) => {
        if (!instance || !blockId) {
            return;
        }

        const selectionPos = findFountainBlockSelectionPosFromState(instance.state, blockId);

        if (selectionPos === null) {
            return;
        }

        const tr = instance.state.tr
            .setSelection(TextSelection.near(instance.state.doc.resolve(selectionPos), 1))
            .setMeta('preventUpdate', true)
            .scrollIntoView();

        instance.view.dispatch(tr);
    }, [instance]);

    const withActiveBlockPreserved = useCallback((callback: () => void) => {
        if (!instance) {
            return;
        }

        const activeBlock = getActiveFountainBlockFromState(instance.state, FOUNTAIN_BLOCK_NODE_NAME);
        const preservedBlockId = activeBlock?.id ?? null;

        setActiveBlockSyncSuppressed(instance, true);

        try {
            callback();
            restoreSelectionForBlock(preservedBlockId);
        } finally {
            if (releaseSyncSuppressionFrameRef.current !== null) {
                window.cancelAnimationFrame(releaseSyncSuppressionFrameRef.current);
            }

            releaseSyncSuppressionFrameRef.current = window.requestAnimationFrame(() => {
                releaseSyncSuppressionFrameRef.current = null;
                setActiveBlockSyncSuppressed(instance, false);
            });
        }
    }, [instance, restoreSelectionForBlock]);

    const insertAct = useCallback((beforeBlockId: string | null) => {
        if (!instance) {
            return;
        }

        const currentValue = instance.getJSON() as ScriptDocument;
        const actCount = collectStructureBlocks(currentValue.content)
            .filter(block => block.blockType === ELEMENT_ACT)
            .length;
        const nextActName = getDefaultActName(actCount + 1);
        const prefersLegacyNodeType = currentValue.content.some(
            node => isScriptBlockNode(node) && node.type === FOUNTAIN_BLOCK_NODE_NAME,
        );
        const nextActNodeType = prefersLegacyNodeType
            ? FOUNTAIN_BLOCK_NODE_NAME
            : resolveScriptBlockNodeType(ELEMENT_ACT) ?? FOUNTAIN_BLOCK_NODE_NAME;
        const nextActBlock: FountainJSONContent = {
            type: nextActNodeType,
            attrs: {id: createNodeId(), blockType: ELEMENT_ACT},
            content: [{type: 'text', text: nextActName}],
        };

        let nextContent = [...currentValue.content, nextActBlock];
        let didChange = true;
        let resolvedBeforeBlockId = beforeBlockId;

        if (actCount === 0) {
            const firstBlock = currentValue.content.find(node => isScriptBlockNode(node));
            const firstBlockId = firstBlock ? getScriptBlockId(firstBlock) : null;

            if (firstBlockId) {
                resolvedBeforeBlockId = firstBlockId;
            }
        }

        if (typeof resolvedBeforeBlockId === 'string' && resolvedBeforeBlockId.length > 0) {
            const [insertedContent, didInsert] = insertActBlockBeforeId(
                currentValue.content,
                resolvedBeforeBlockId,
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
            instance,
            nextContent,
            didChange,
            currentValue.attrs,
            setLatestValue,
            onValueChangeRef,
            onIndexChangeRef,
            scheduleAutosave,
            revisionRef,
        );
    }, [
        instance,
        onIndexChangeRef,
        onValueChangeRef,
        revisionRef,
        scheduleAutosave,
        setLatestValue,
    ]);

    const renameAct = useCallback((blockId: string, nextName: string) => {
        if (!instance || !blockId) {
            return;
        }

        const currentValue = instance.getJSON() as ScriptDocument;
        const [nextContent, didChange] = setPlainTextContent(currentValue.content, blockId, nextName.trim().toLocaleUpperCase());

        tryCommitDocument(
            instance,
            nextContent,
            didChange,
            currentValue.attrs,
            setLatestValue,
            onValueChangeRef,
            onIndexChangeRef,
            scheduleAutosave,
            revisionRef,
        );
    }, [
        instance,
        onIndexChangeRef,
        onValueChangeRef,
        revisionRef,
        scheduleAutosave,
        setLatestValue,
    ]);

    const deleteAct = useCallback((blockId: string) => {
        if (!instance || !blockId) {
            return;
        }

        const currentValue = instance.getJSON() as ScriptDocument;
        const firstNode = currentValue.content?.[0];

        if (
            firstNode
            && isScriptBlockNode(firstNode)
            && getScriptBlockLegacyType(firstNode) === ELEMENT_ACT
            && getScriptBlockId(firstNode) === blockId
        ) {
            return;
        }

        const [nextContent, didChange] = removeActBlockById(currentValue.content, blockId);

        tryCommitDocument(
            instance,
            nextContent,
            didChange,
            currentValue.attrs,
            setLatestValue,
            onValueChangeRef,
            onIndexChangeRef,
            scheduleAutosave,
            revisionRef,
        );
    }, [
        instance,
        onIndexChangeRef,
        onValueChangeRef,
        revisionRef,
        scheduleAutosave,
        setLatestValue,
    ]);

    const moveScene = useCallback((sourceSceneBlockId: string, beforeBlockId: string | null) => {
        if (!instance || !sourceSceneBlockId || sourceSceneBlockId === beforeBlockId) {
            return;
        }

        const currentValue = instance.getJSON() as ScriptDocument;
        const [nextContent, didChange] = moveSceneSegment(currentValue.content, sourceSceneBlockId, beforeBlockId);

        if (!didChange || !Array.isArray(nextContent)) {
            return;
        }

        withActiveBlockPreserved(() => {
            tryCommitSceneReorder(
                instance,
                sourceSceneBlockId,
                beforeBlockId,
                nextContent,
                didChange,
                currentValue.attrs,
                setLatestValue,
                onValueChangeRef,
                onIndexChangeRef,
                scheduleAutosave,
                revisionRef,
            );
        });
    }, [
        instance,
        onIndexChangeRef,
        onValueChangeRef,
        revisionRef,
        scheduleAutosave,
        setLatestValue,
        withActiveBlockPreserved,
    ]);

    return {
        insertAct, renameAct, deleteAct, moveScene,
    };
};
