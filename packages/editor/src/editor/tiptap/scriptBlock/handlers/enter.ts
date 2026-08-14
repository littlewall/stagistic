import {
    createNodeId,
    resolveScriptBlockNodeType,
} from '@stagistic/script';
import {getEnterFallback} from '@stagistic/script';
import type {NodeType} from '@tiptap/pm/model';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {isEmptyEnterChooserWriterType} from '../../extensions/EmptyEnterChooserExtension';
import {
    type BlockNodeType,
    getActiveScriptBlockFromState,
    isScriptBlockContentEmpty,
    isScriptBlockNodeName,
    normalizeBlockNodeType,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../../scriptCore';
import {
    insertActionBefore,
    setBlockTypeWithSelection,
    splitBlockWithType,
} from '../commands';
import {
    type BlockContext,
    createBlockContext,
    isEmptyDialogueLikeBlock,
} from '../context';
import {
    type BlockNextElementMap,
    type HandlerMap,
} from './types';

type DialogueLikeBlockType = 'dialogue' | 'lyrics';

type ScriptBlockEntry = {
    pos: number,
    blockType: BlockNodeType,
};

const isDialogueLikeType = (blockType: BlockNodeType): blockType is DialogueLikeBlockType => {
    return blockType === 'dialogue' || blockType === 'lyrics';
};

const collectScriptBlocks = (editor: Editor) => {
    const blocks: ScriptBlockEntry[] = [];

    editor.state.doc.descendants((node, pos) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        blocks.push({
            pos,
            blockType: normalizeBlockNodeType(node.attrs.blockType),
        });

        return false;
    });

    return blocks;
};

const findNearestDialogueLikeType = (
    blocks: ScriptBlockEntry[],
    blockIndex: number,
    direction: -1 | 1,
): DialogueLikeBlockType | null => {
    for (let index = blockIndex + direction; index >= 0 && index < blocks.length; index += direction) {
        const {blockType} = blocks[index];

        if (isDialogueLikeType(blockType)) {
            return blockType;
        }
    }

    return null;
};

export const resolveParentheticalTabTarget = (editor: Editor, blockPos: number): DialogueLikeBlockType => {
    const blocks = collectScriptBlocks(editor);
    const blockIndex = blocks.findIndex(({pos}) => pos === blockPos);

    if (blockIndex < 0) {
        return 'dialogue';
    }

    return findNearestDialogueLikeType(blocks, blockIndex, -1)
        ?? findNearestDialogueLikeType(blocks, blockIndex, 1)
        ?? 'dialogue';
};

const resolveNextTypeOnEnter = (
    blockType: BlockNodeType,
    blockNextElements?: BlockNextElementMap,
): BlockNodeType => {
    const configured = blockNextElements?.[blockType];

    return configured ?? normalizeBlockNodeType(getEnterFallback(blockType));
};

/*
 * The configured "next type" (e.g. dialogue -> character) only makes sense
 * when Enter is advancing the flow, i.e. the cursor was at the very end of
 * the block. Splitting mid-content isn't advancing anything - the new block
 * should stay the same type as the one it was split from, or the writer sees
 * an unexplained type change they never asked for.
 */
const resolveSplitType = (
    context: BlockContext,
    blockNextElements?: BlockNextElementMap,
): BlockNodeType => context.isAtEnd
    ? resolveNextTypeOnEnter(context.block.blockType, blockNextElements)
    : context.block.blockType;

const insertBlockAfter = (
    context: BlockContext,
    blockType: BlockNodeType,
) => {
    const nodes = context.editor.schema.nodes as Record<string, NodeType>;
    const nextNodeType = nodes[resolveScriptBlockNodeType(blockType) ?? ''];

    if (!nextNodeType) {
        return false;
    }

    const insertPos = context.block.pos + context.block.node.nodeSize;
    const insertedNode = nextNodeType.create({
        blockType,
        id: createNodeId(),
    });
    let tr = context.editor.state.tr.insert(insertPos, insertedNode);
    const selectionPos = insertPos + 1;

    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1));
    context.editor.view.dispatch(tr.scrollIntoView());
    context.editor.commands.focus(selectionPos);

    return true;
};

const enterHandlers: HandlerMap<(context: BlockContext, blockNextElements?: BlockNextElementMap) => boolean> = {
    ['act']: (context, blockNextElements) => {
        if (context.isAtEnd) {
            return insertBlockAfter(context, blockNextElements?.['act'] ?? 'scene');
        }

        return splitBlockWithType(context.editor, 'act');
    },
    ['character']: (context, blockNextElements) => {
        if (context.isAtStart) {
            return insertActionBefore(context.editor, context.block.pos, context.block.from);
        }

        return splitBlockWithType(context.editor, resolveSplitType(context, blockNextElements));
    },
};

const shiftEnterHandlers: HandlerMap<(context: BlockContext) => boolean> = {
    ['character']: context => splitBlockWithType(context.editor, 'dialogue'),
    ['dialogue']: context => splitBlockWithType(context.editor, 'dialogue'),
    ['lyrics']: context => splitBlockWithType(context.editor, 'lyrics'),
    ['aside']: context => splitBlockWithType(
        context.editor,
        resolveParentheticalTabTarget(context.editor, context.block.pos),
    ),
};

export const handleEnter = (
    editor: Editor,
    event: KeyboardEvent,
    blockNextElements?: BlockNextElementMap,
) => {
    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block) {
        return false;
    }

    const isEmptyBlock = isScriptBlockContentEmpty(block.node);
    const hasOnlyNonTextContent = !isEmptyBlock
        && (block.node.textContent ?? '').trim().length === 0;
    const wasSelectionEmpty = editor.state.selection.empty;

    if (
        !event.shiftKey
        && editor.state.selection.empty
        && isEmptyBlock
        && isEmptyEnterChooserWriterType(block.blockType)
    ) {
        event.preventDefault();

        const chooserCommands = editor.commands as {
            openEmptyEnterChooser?: (payload: {
                blockId: string,
                blockPos: number,
                blockType: BlockNodeType,
                selectedType?: BlockNodeType,
            }) => boolean,
        };

        chooserCommands.openEmptyEnterChooser?.({
            blockId: block.id,
            blockPos: block.pos,
            blockType: block.blockType,
            selectedType: block.blockType,
        });

        return true;
    }

    event.preventDefault();

    if (!editor.state.selection.empty) {
        editor.commands.deleteSelection();
    }

    const context = createBlockContext(editor, block);

    if (!event.shiftKey && wasSelectionEmpty && hasOnlyNonTextContent) {
        return insertBlockAfter(
            context,
            resolveNextTypeOnEnter(block.blockType, blockNextElements),
        );
    }

    if (
        block.blockType === 'aside'
        && isScriptBlockContentEmpty(block.node)
    ) {
        return setBlockTypeWithSelection(editor, block, 'character');
    }

    if (!event.shiftKey && isEmptyDialogueLikeBlock(block)) {
        return setBlockTypeWithSelection(editor, block, 'character');
    }

    if (event.shiftKey) {
        const shiftHandler = shiftEnterHandlers[block.blockType];

        if (shiftHandler) {
            return shiftHandler(context);
        }
    }

    if (!event.shiftKey) {
        const enterHandler = enterHandlers[block.blockType];

        if (enterHandler) {
            return enterHandler(context, blockNextElements);
        }
    }

    return splitBlockWithType(editor, resolveSplitType(context, blockNextElements));
};

export const enterHandlerMaps = {
    enterHandlers,
    shiftEnterHandlers,
};
