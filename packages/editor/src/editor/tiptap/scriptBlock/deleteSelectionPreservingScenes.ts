import {createNodeId} from '@stagistic/script';
import {
    Fragment,
    type Node as ProseMirrorNode,
} from '@tiptap/pm/model';
import {
    type EditorState,
    TextSelection,
} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {IMMEDIATE_SAVE_META_KEY} from '../../saveMeta';
import {SCENE_DELETE_ALLOWED_META_KEY} from '../extensions/SceneGuardExtension';
import {
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../scriptCore';

const isSceneNode = (node: ProseMirrorNode): boolean => {
    return isScriptBlockNodeName(node.type.name)
        && normalizeBlockNodeType(node.attrs.blockType) === 'scene';
};

/**
 * True when a non-empty selection covers (fully or partially) at least one
 * scene block. A plain range delete would drop those scene nodes, which the
 * scene guard rejects wholesale; this predicate routes such deletions to
 * {@link deleteSelectionPreservingScenes} instead.
 */
export const selectionSpansScene = (state: EditorState): boolean => {
    const {
        from, to, empty,
    } = state.selection;

    if (empty) {
        return false;
    }

    let found = false;

    state.doc.nodesBetween(from, to, node => {
        if (found) {
            return false;
        }

        if (isSceneNode(node)) {
            found = true;

            return false;
        }

        return true;
    });

    return found;
};

/**
 * Delete a multi-block selection that spans one or more scene headings while
 * keeping every scene node alive. A scene fully inside the selection is
 * re-inserted as an empty divider (same type + id), so the blocks on either
 * side never merge across it; a scene only partially inside the selection
 * survives through its unselected content. Everything else in the range is
 * deleted as a normal range delete would.
 */
export const deleteSelectionPreservingScenes = (editor: Editor): boolean => {
    const {state} = editor;
    const {
        from, to, empty,
    } = state.selection;

    if (empty || !selectionSpansScene(state)) {
        return false;
    }

    const dividers: ProseMirrorNode[] = [];

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (!isSceneNode(node)) {
            return true;
        }

        if (pos >= from && pos + node.nodeSize <= to) {
            dividers.push(node.type.create(
                {
                    ...node.attrs,
                    id: typeof node.attrs.id === 'string' ? node.attrs.id : createNodeId(),
                },
                Fragment.empty,
            ));
        }

        return false;
    });

    let tr = state.tr.replaceWith(from, to, Fragment.fromArray(dividers));
    const caret = tr.mapping.map(from);

    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(caret)));
    tr.setMeta(SCENE_DELETE_ALLOWED_META_KEY, true);
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    editor.view.focus();

    return true;
};
