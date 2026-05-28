import {
    buildScriptBlockIndex,
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    type FountainJSONContent,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    resolveLegacyFountainBlockType,
    type ScriptDocument,
} from '@stagistic/script';
import {Fragment, type Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {Transaction} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';
import type {MutableRefObject} from 'react';

import type {
    EditorIndexSnapshot,
    EditorValueChangeMeta,
} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {isFountainBlockNodeName} from '../tiptap/fountainCore';
import {type AutosaveSchedulePayload} from './useAutosaveController';

export const setPlainTextContent = (
    nodes: FountainJSONContent[] | undefined,
    blockId: string,
    nextName: string,
): [FountainJSONContent[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes = nodes.map(node => {
        if (!node || typeof node !== 'object') {
            return node;
        }

        if (
            isScriptBlockNode(node)
            && getScriptBlockId(node) === blockId
            && getScriptBlockLegacyType(node) === ELEMENT_ACT
        ) {
            const currentText = (node.content ?? [])
                .map(child => {
                    return typeof child.text === 'string' ? child.text : '';
                })
                .join('');
            const normalizedName = nextName.trim().toLocaleUpperCase();

            if (currentText.trim() === normalizedName) {
                return node;
            }

            didChange = true;

            return {
                ...node,
                content: normalizedName.length > 0 ? [
                    {
                        type: 'text',
                        text: normalizedName,
                    },
                ] : [],
            };
        }

        const [nextContent, childChanged] = setPlainTextContent(node.content, blockId, nextName);

        if (!childChanged) {
            return node;
        }

        didChange = true;

        return {
            ...node,
            content: nextContent,
        };
    });

    return [didChange ? nextNodes : nodes, didChange];
};

export const removeActBlockById = (
    nodes: FountainJSONContent[] | undefined,
    blockId: string,
): [FountainJSONContent[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes: FountainJSONContent[] = [];

    nodes.forEach(node => {
        if (!node || typeof node !== 'object') {
            nextNodes.push(node);

            return;
        }

        if (
            isScriptBlockNode(node)
            && getScriptBlockId(node) === blockId
            && getScriptBlockLegacyType(node) === ELEMENT_ACT
        ) {
            didChange = true;

            return;
        }

        const [nextContent, childChanged] = removeActBlockById(node.content, blockId);

        if (!childChanged) {
            nextNodes.push(node);

            return;
        }

        didChange = true;
        nextNodes.push({
            ...node,
            content: nextContent,
        });
    });

    return [didChange ? nextNodes : nodes, didChange];
};

export const insertActBlockBeforeId = (
    nodes: FountainJSONContent[] | undefined,
    beforeBlockId: string,
    actNode: FountainJSONContent,
): [FountainJSONContent[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didInsert = false;
    const nextNodes: FountainJSONContent[] = [];

    nodes.forEach(node => {
        if (!node || typeof node !== 'object') {
            nextNodes.push(node);

            return;
        }

        if (
            !didInsert
            && isScriptBlockNode(node)
            && getScriptBlockId(node) === beforeBlockId
        ) {
            nextNodes.push(actNode, node);
            didInsert = true;

            return;
        }

        if (!didInsert && Array.isArray(node.content)) {
            const [nextContent, childInserted] = insertActBlockBeforeId(
                node.content,
                beforeBlockId,
                actNode,
            );

            if (childInserted) {
                nextNodes.push({
                    ...node,
                    content: nextContent,
                });
                didInsert = true;

                return;
            }
        }

        nextNodes.push(node);
    });

    return [didInsert ? nextNodes : nodes, didInsert];
};

// ---------------------------------------------------------------------------
// Surgical ProseMirror transaction for scene reorder
// ---------------------------------------------------------------------------

interface TopLevelBlockInfo {
    pos: number,
    nodeSize: number,
    blockId: string | null,
    isBoundary: boolean,
}

const getBlockTypeFromPmNode = (node: ProseMirrorNode): string | null => {
    if (typeof node.attrs?.blockType === 'string' && node.attrs.blockType.length > 0) {
        return node.attrs.blockType;
    }

    return resolveLegacyFountainBlockType(node.type.name) ?? null;
};

/**
 * Collect all direct children of the doc that are fountain block nodes.
 * Returns null when non-fountain nodes (e.g. column groups) are detected,
 * which signals the caller to fall back to the setContent path.
 */
const collectTopLevelBlocks = (doc: ProseMirrorNode): TopLevelBlockInfo[] | null => {
    const blocks: TopLevelBlockInfo[] = [];
    let hasUnexpected = false;

    doc.forEach((node, offset) => {
        if (!isFountainBlockNodeName(node.type.name)) {
            hasUnexpected = true;

            return;
        }

        const blockType = getBlockTypeFromPmNode(node);

        blocks.push({
            pos: offset,
            nodeSize: node.nodeSize,
            blockId: typeof node.attrs?.id === 'string' ? node.attrs.id : null,
            isBoundary: blockType === ELEMENT_SCENE_HEADING || blockType === ELEMENT_ACT,
        });
    });

    return hasUnexpected ? null : blocks;
};

/**
 * Build a surgical ProseMirror Transaction that moves a scene segment
 * (scene heading + its body blocks) to a new position, without replacing
 * the entire document.
 *
 * Returns null when the transaction cannot be built (unknown doc structure,
 * missing block IDs, etc.) — the caller must fall back to setContent.
 */
const buildSceneReorderTransaction = (
    editor: TiptapEditor,
    sourceSceneBlockId: string,
    beforeBlockId: string | null,
): Transaction | null => {
    const {state} = editor;
    const {doc} = state;
    const blocks = collectTopLevelBlocks(doc);

    if (!blocks) {
        return null;
    }

    // --- source range -------------------------------------------------------
    const sourceIndex = blocks.findIndex(b => b.blockId === sourceSceneBlockId);

    if (sourceIndex === -1) {
        return null;
    }

    const sourceStart = blocks[sourceIndex].pos;
    let sourceEnd = doc.content.size;

    for (let i = sourceIndex + 1; i < blocks.length; i++) {
        if (blocks[i].isBoundary) {
            sourceEnd = blocks[i].pos;
            break;
        }
    }

    // --- target position ----------------------------------------------------
    let targetPos: number;

    if (beforeBlockId === null) {
        targetPos = doc.content.size;
    } else {
        const targetBlock = blocks.find(b => b.blockId === beforeBlockId);

        if (!targetBlock) {
            return null;
        }

        targetPos = targetBlock.pos;
    }

    // Guard: target inside or equal to source (no-op or impossible)
    if (targetPos > sourceStart && targetPos <= sourceEnd) {
        return null;
    }

    // --- collect moved nodes ------------------------------------------------
    const movedNodes: ProseMirrorNode[] = [];
    let pos = sourceStart;

    while (pos < sourceEnd) {
        const node = doc.nodeAt(pos);

        if (!node) {
            return null;
        }

        movedNodes.push(node);
        pos += node.nodeSize;
    }

    const movedFragment = Fragment.from(movedNodes);
    const movedSize = sourceEnd - sourceStart;

    // --- build transaction --------------------------------------------------
    const tr = state.tr;

    if (targetPos > sourceEnd) {
        // Moving DOWN: delete source first, then insert at adjusted target position.
        tr.delete(sourceStart, sourceEnd);
        tr.insert(targetPos - movedSize, movedFragment);
    } else {
        // Moving UP (targetPos ≤ sourceStart): insert at target, then delete the
        // original range which has shifted by movedSize due to the insertion.
        tr.insert(targetPos, movedFragment);
        tr.delete(sourceStart + movedSize, sourceEnd + movedSize);
    }

    return tr;
};

/**
 * Commit a scene reorder using a surgical PM transaction when possible,
 * with automatic fallback to the full-document-replace path.
 */
export const tryCommitSceneReorder = (
    editor: TiptapEditor,
    sourceSceneBlockId: string,
    beforeBlockId: string | null,
    nextContent: FountainJSONContent[],
    didChange: boolean,
    currentDocAttrs: ScriptDocument['attrs'],
    setLatestValue: (value: ScriptDocument, revision?: number) => void,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument, meta?: EditorValueChangeMeta) => void) | undefined>,
    onIndexChangeRef: MutableRefObject<((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void) | undefined>,
    scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    revisionRef: MutableRefObject<number>,
) => {
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

    // Try surgical PM transaction; fall back to setContent if it can't be built.
    const surgicalTr = buildSceneReorderTransaction(editor, sourceSceneBlockId, beforeBlockId);

    if (surgicalTr) {
        surgicalTr.setMeta('preventUpdate', true);
        editor.view.dispatch(surgicalTr);

        /*
         * The sidebar structure is already updated synchronously via the
         * EditorRuntimeExtension → `transaction` event → syncRuntimeSnapshotFromEditor.
         * Defer the heavy BlockSyncController work (full index rebuild + DB collection
         * updates) so the browser can process user interactions before blocking again.
         */
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
            });
        }, 0);

        return;
    }

    // Fallback: full document replace (setContent path).
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
    });
};

// ---------------------------------------------------------------------------

const commitDocument = (
    editor: TiptapEditor,
    nextContent: FountainJSONContent[],
    currentDocAttrs: ScriptDocument['attrs'],
    setLatestValue: (value: ScriptDocument, revision?: number) => void,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument, meta?: EditorValueChangeMeta) => void) | undefined>,
    onIndexChangeRef: MutableRefObject<((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void) | undefined>,
    scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    revisionRef: MutableRefObject<number>,
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

    const savedValue = stripScriptSettings(nextDocument);

    revisionRef.current += 1;

    const revision = revisionRef.current;

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
    });
};

export const tryCommitDocument = (
    editor: TiptapEditor,
    nextContent: FountainJSONContent[] | undefined,
    didChange: boolean,
    currentDocAttrs: ScriptDocument['attrs'],
    setLatestValue: (value: ScriptDocument, revision?: number) => void,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument, meta?: EditorValueChangeMeta) => void) | undefined>,
    onIndexChangeRef: MutableRefObject<((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void) | undefined>,
    scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    revisionRef: MutableRefObject<number>,
) => {
    if (!didChange || !Array.isArray(nextContent)) {
        return;
    }

    commitDocument(
        editor,
        nextContent,
        currentDocAttrs,
        setLatestValue,
        onValueChangeRef,
        onIndexChangeRef,
        scheduleAutosave,
        revisionRef,
    );
};
