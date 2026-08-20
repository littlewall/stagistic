import {resolveScriptBlockNodeType} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {EditorState} from '@tiptap/pm/state';

import {
    getActiveScriptBlockFromState,
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../scriptCore';

/**
 * A scene heading is a deletion barrier: ordinary editing must never remove
 * the node. These predicates power the keymap override that stops Backspace
 * at a scene's start and Delete at the end of the block preceding a scene.
 *
 * They constrain deletion keys only — arrow-key navigation keeps ProseMirror's
 * default behavior across scene boundaries.
 */

const isSceneNode = (node: ProseMirrorNode | null | undefined): boolean => {
    if (!node || !isScriptBlockNodeName(node.type.name)) {
        return false;
    }

    const resolved = resolveScriptBlockNodeType(node.type.name);
    const blockType = resolved
        ? normalizeBlockNodeType(resolved)
        : normalizeBlockNodeType(node.attrs.blockType);

    return blockType === 'scene';
};

/**
 * True when a collapsed caret sits at the very start of a `scene` block, where
 * a Backspace would merge/remove the scene. Backspace mid-text is unaffected.
 */
export const shouldBlockBackspace = (state: EditorState): boolean => {
    const {selection} = state;

    if (!selection.empty) {
        return false;
    }

    const block = getActiveScriptBlockFromState(state);

    if (!block || block.blockType !== 'scene') {
        return false;
    }

    return selection.$from.pos === block.from;
};

/**
 * True when a collapsed caret sits at the end of a block whose next sibling is
 * a `scene` block, where a forward Delete would pull the scene in.
 */
export const shouldBlockForwardDelete = (state: EditorState): boolean => {
    const {selection} = state;

    if (!selection.empty) {
        return false;
    }

    const block = getActiveScriptBlockFromState(state);

    if (!block || selection.$from.pos !== block.to) {
        return false;
    }

    const nextNode = state.doc.resolve(block.pos + block.node.nodeSize).nodeAfter;

    return isSceneNode(nextNode);
};
