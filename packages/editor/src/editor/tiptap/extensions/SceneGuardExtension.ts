import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';

import {
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../scriptCore';

/**
 * A scene heading can never be removed by ordinary editing. The keymap barrier
 * ({@link ../scriptBlock/sceneDeletionGuard}) stops the single-caret cases;
 * this transaction guard covers range/select-all/programmatic deletions that
 * would drop a scene node.
 *
 * Any transaction that reduces the scene count is rejected as a whole (v1: the
 * offending edit is blocked, nothing is deleted) unless it is a sanctioned
 * programmatic change:
 *  - `setContent(..., {emitUpdate: false})` (document load + every structural
 *    mutation) marks its transaction `preventUpdate`; and
 *  - the explicit scene-heading delete tags its transaction
 *    `sceneDeleteAllowed`.
 */

export const SCENE_DELETE_ALLOWED_META_KEY = 'sceneDeleteAllowed';

const sceneGuardKey = new PluginKey('sceneGuard');

const countSceneNodes = (doc: ProseMirrorNode): number => {
    let count = 0;

    doc.descendants(node => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        if (normalizeBlockNodeType(node.attrs.blockType) === 'scene') {
            count += 1;
        }

        return false;
    });

    return count;
};

export const SceneGuardExtension = Extension.create({
    name: 'sceneGuard',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: sceneGuardKey,
                filterTransaction(transaction, state) {
                    if (!transaction.docChanged) {
                        return true;
                    }

                    if (transaction.getMeta(SCENE_DELETE_ALLOWED_META_KEY) === true) {
                        return true;
                    }

                    if (transaction.getMeta('preventUpdate') === true) {
                        return true;
                    }

                    return countSceneNodes(transaction.doc) >= countSceneNodes(state.doc);
                },
            }),
        ];
    },
});
