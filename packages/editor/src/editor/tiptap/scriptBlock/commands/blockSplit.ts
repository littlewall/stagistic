import {
    createNodeId,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
} from '@stagistic/script';
import type {Node as ProseMirrorNode, NodeType} from '@tiptap/pm/model';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {IMMEDIATE_SAVE_META_KEY} from '../../../saveMeta';
import {
    type ActiveScriptBlock,
    type BlockNodeType,
    getActiveScriptBlockFromState,
    normalizeBlockNodeType,
} from '../../scriptCore';
import {applyBlockType, resolveNodeTypeForBlockType} from './blockTypeChange';
import {focusEditor} from './selection';

const isMusicAtomNodeName = (name: string | undefined): boolean => {
    return name === MUSIC_START_NODE_NAME || name === MUSIC_OUT_NODE_NAME;
};

const blockNodeHasMusicAtom = (node: ProseMirrorNode): boolean => {
    let found = false;

    node.forEach(child => {
        if (isMusicAtomNodeName(child.type.name)) {
            found = true;
        }
    });

    return found;
};

/**
 * A music atom is bound to its block and always sits at the block end (§4.1).
 * A block split moves everything after the caret into the new block, so a
 * music would migrate with it (or, when splitting an otherwise-empty block, be
 * stranded in the wrong sibling). Rather than split a music-bearing block, keep
 * it (with its music and any text) intact and insert an empty typed block right
 * after it, moving the caret there.
 */
const insertEmptyBlockAfterMusicBlock = (editor: Editor, blockType: BlockNodeType): boolean => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nextNodeType = resolveNodeTypeForBlockType(nodes, blockType);

    if (!nextNodeType) {
        return false;
    }

    const block = getActiveScriptBlockFromState(editor.state);

    if (!block) {
        return false;
    }

    const insertPos = block.pos + block.node.nodeSize;
    const insertedNode = nextNodeType.create({blockType, id: createNodeId()});
    let tr = editor.state.tr.insert(insertPos, insertedNode);
    // The inserted block opens at insertPos; its content starts one past that.
    const selectionPos = insertPos + 1;

    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1));
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

/**
 * Splitting at the very start of a block isn't really a split - nothing moves
 * to the new block - it's "push an empty block in above me". Doing it via
 * ProseMirror's splitBlock actively hurts here on two counts: it rewrites the
 * leading (empty) half to the schema's default block type, which is whatever
 * node happens to be registered first (scene) rather than anything the writer
 * asked for; and because a split copies the original attrs to both halves, the
 * caret half is the one that ends up needing a fresh id, leaving the empty
 * block holding the original block's identity. Insert the block directly
 * instead and leave the caret (and the original id) on the text.
 */
const insertEmptyBlockBefore = (editor: Editor, block: ActiveScriptBlock, blockType: BlockNodeType): boolean => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, blockType);

    if (!nodeType) {
        return false;
    }

    const insertedNode = nodeType.create({blockType, id: createNodeId()});
    const {anchor, head} = editor.state.selection;
    let tr = editor.state.tr.insert(block.pos, insertedNode);

    tr = tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(anchor), tr.mapping.map(head)));
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

/*
 * Mirrors prosemirror-commands' own `!atEnd && atStart` test: the caret sits
 * at the block start with content still ahead of it. An empty block is both
 * at start and at end, and must keep taking the normal split path.
 */
const isAtBlockStartWithContentAhead = (editor: Editor, block: ActiveScriptBlock) => {
    const {selection} = editor.state;

    return selection.empty && selection.from === block.from && selection.from !== block.to;
};

/**
 * A scene heading can't be split through ProseMirror's `splitBlock` + convert
 * dance: `splitBlock` first clones the scene (two scene nodes), and the
 * follow-up conversion of the trailing half back to `blockType` drops the scene
 * count, which the scene guard rejects — leaving two scene headings behind
 * (never what Enter should do to a heading). Build the split as a single
 * transaction instead: the scene keeps whatever preceded the caret, and a fresh
 * `blockType` block takes whatever followed it. Net scene count is unchanged, so
 * the guard never fires.
 */
const splitSceneIntoTypedBlock = (editor: Editor, block: ActiveScriptBlock, blockType: BlockNodeType): boolean => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, blockType);

    if (!nodeType) {
        return false;
    }

    const {from} = editor.state.selection;
    const trailing = editor.state.doc.slice(from, block.to);
    const insertedNode = nodeType.create({blockType, id: createNodeId()}, trailing.content);

    let tr = editor.state.tr.delete(from, block.to);
    const insertPos = tr.mapping.map(block.pos + block.node.nodeSize);

    tr = tr.insert(insertPos, insertedNode);
    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1), 1));
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

export const splitBlockWithType = (editor: Editor, blockType: BlockNodeType) => {
    const activeBlock = getActiveScriptBlockFromState(editor.state);

    if (activeBlock && blockNodeHasMusicAtom(activeBlock.node)) {
        return insertEmptyBlockAfterMusicBlock(editor, blockType);
    }

    if (activeBlock && isAtBlockStartWithContentAhead(editor, activeBlock)) {
        return insertEmptyBlockBefore(editor, activeBlock, blockType);
    }

    if (activeBlock && activeBlock.blockType === 'scene') {
        return splitSceneIntoTypedBlock(editor, activeBlock, blockType);
    }

    const didSplit = editor.commands.splitBlock();

    if (!didSplit) {
        return false;
    }

    const splitBlock = getActiveScriptBlockFromState(editor.state);

    if (!splitBlock) {
        return false;
    }

    return applyBlockType(editor, splitBlock, normalizeBlockNodeType(blockType), createNodeId());
};
