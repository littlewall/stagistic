import {
    createNodeId,
    ELEMENT_ACT,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    resolveScriptBlockNodeType,
} from '@stagistic/script';
import {getEnterFallback} from '@stagistic/script';
import type {NodeType} from '@tiptap/pm/model';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {isEmptyEnterChooserWriterType} from '../../extensions/EmptyEnterChooserExtension';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../../fountainCore';
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

type DialogueLikeBlockType = typeof ELEMENT_DIALOGUE | typeof ELEMENT_LYRICS;

type FountainBlockEntry = {
    pos: number,
    blockType: FountainBlockType,
};

const isDialogueLikeType = (blockType: FountainBlockType): blockType is DialogueLikeBlockType => {
    return blockType === ELEMENT_DIALOGUE || blockType === ELEMENT_LYRICS;
};

const collectFountainBlocks = (editor: Editor) => {
    const blocks: FountainBlockEntry[] = [];

    editor.state.doc.descendants((node, pos) => {
        if (!isFountainBlockNodeName(node.type.name)) {
            return true;
        }

        blocks.push({
            pos,
            blockType: normalizeFountainBlockType(node.attrs.blockType),
        });

        return false;
    });

    return blocks;
};

const findNearestDialogueLikeType = (
    blocks: FountainBlockEntry[],
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
    const blocks = collectFountainBlocks(editor);
    const blockIndex = blocks.findIndex(({pos}) => pos === blockPos);

    if (blockIndex < 0) {
        return ELEMENT_DIALOGUE;
    }

    return findNearestDialogueLikeType(blocks, blockIndex, -1)
        ?? findNearestDialogueLikeType(blocks, blockIndex, 1)
        ?? ELEMENT_DIALOGUE;
};

const resolveNextTypeOnEnter = (
    blockType: FountainBlockType,
    blockNextElements?: BlockNextElementMap,
): FountainBlockType => {
    const configured = blockNextElements?.[blockType];

    return configured ?? normalizeFountainBlockType(getEnterFallback(blockType));
};

const insertBlockAfter = (
    context: BlockContext,
    blockType: FountainBlockType,
) => {
    const nodes = context.editor.schema.nodes as Record<string, NodeType>;
    const currentNodeTypeName = context.block.node.type.name;
    const nextNodeType = currentNodeTypeName === FOUNTAIN_BLOCK_NODE_NAME
        ? nodes[FOUNTAIN_BLOCK_NODE_NAME]
        : nodes[resolveScriptBlockNodeType(blockType) ?? ''];

    if (!nextNodeType) {
        return false;
    }

    const insertPos = context.block.pos + context.block.node.nodeSize;
    const insertedNode = nextNodeType.create({
        blockType,
        id: createNodeId(),
    });
    let tr = context.editor.state.tr.insert(insertPos, insertedNode);
    const selectionPos = tr.mapping.map(insertPos + 1);

    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1));
    context.editor.view.dispatch(tr.scrollIntoView());
    context.editor.commands.focus(selectionPos);

    return true;
};

const enterHandlers: HandlerMap<(context: BlockContext, blockNextElements?: BlockNextElementMap) => boolean> = {
    [ELEMENT_ACT]: (context, blockNextElements) => {
        const nextType = blockNextElements?.[ELEMENT_ACT] ?? ELEMENT_SCENE_HEADING;

        if (context.isAtEnd) {
            return insertBlockAfter(context, nextType);
        }

        return splitBlockWithType(context.editor, nextType);
    },
    [ELEMENT_CHARACTER]: (context, blockNextElements) => {
        if (context.isAtStart) {
            return insertActionBefore(context.editor, context.block.pos, context.block.from);
        }

        return splitBlockWithType(
            context.editor,
            resolveNextTypeOnEnter(ELEMENT_CHARACTER, blockNextElements),
        );
    },
    [ELEMENT_DIALOGUE]: (_context, blockNextElements) => splitBlockWithType(
        _context.editor,
        resolveNextTypeOnEnter(ELEMENT_DIALOGUE, blockNextElements),
    ),
    [ELEMENT_LYRICS]: (_context, blockNextElements) => splitBlockWithType(
        _context.editor,
        resolveNextTypeOnEnter(ELEMENT_LYRICS, blockNextElements),
    ),
    [ELEMENT_PARENTHETICAL]: (_context, blockNextElements) => splitBlockWithType(
        _context.editor,
        resolveNextTypeOnEnter(ELEMENT_PARENTHETICAL, blockNextElements),
    ),
};

const shiftEnterHandlers: HandlerMap<(context: BlockContext) => boolean> = {
    [ELEMENT_CHARACTER]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_DIALOGUE]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_LYRICS]: context => splitBlockWithType(context.editor, ELEMENT_LYRICS),
    [ELEMENT_PARENTHETICAL]: context => splitBlockWithType(
        context.editor,
        resolveParentheticalTabTarget(context.editor, context.block.pos),
    ),
};

export const handleEnter = (
    editor: Editor,
    event: KeyboardEvent,
    blockNextElements?: BlockNextElementMap,
) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    const isEmptyBlock = (block.node.textContent ?? '').trim().length === 0;

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
                blockType: FountainBlockType,
                selectedType?: FountainBlockType,
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

    if (
        block.blockType === ELEMENT_PARENTHETICAL
        && (block.node.textContent ?? '').trim().length === 0
    ) {
        return setBlockTypeWithSelection(editor, block, ELEMENT_CHARACTER);
    }

    if (isEmptyDialogueLikeBlock(block)) {
        return setBlockTypeWithSelection(editor, block, ELEMENT_CHARACTER);
    }

    const context = createBlockContext(editor, block);

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

    const nextType = context.isAtEnd
        ? resolveNextTypeOnEnter(block.blockType, blockNextElements)
        : block.blockType;

    return splitBlockWithType(editor, nextType);
};

export const enterHandlerMaps = {
    enterHandlers,
    shiftEnterHandlers,
};
