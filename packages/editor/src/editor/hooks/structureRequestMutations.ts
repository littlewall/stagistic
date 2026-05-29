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
import {PAGINATION_CONTROL_META_KEY} from '../tiptap/extensions/pagination/plugin/createPaginationPlugin';
import {isFountainBlockNodeName} from '../tiptap/fountainCore';
import {type AutosaveSchedulePayload} from './useAutosaveController';

let paginationRecalcToken = 0;
const nextPaginationRecalcToken = () => ++paginationRecalcToken;

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
        tr.delete(sourceStart, sourceEnd);
        tr.insert(targetPos - movedSize, movedFragment);
    } else {
        tr.insert(targetPos, movedFragment);
        tr.delete(sourceStart + movedSize, sourceEnd + movedSize);
    }

    return tr;
};

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
