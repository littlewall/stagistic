import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {isScriptBlockNodeName} from '../scriptCore';

/*
 * Marks the block a sidebar just navigated to, so the jump has a visible
 * target once the scroll settles. A node decoration rather than a class on the
 * node view's DOM: the block elements live inside contenteditable, where a
 * hand-written attribute is both a mutation ProseMirror has to read back and
 * something a redraw would silently drop.
 *
 * The tint is pure feedback, so the plugin owns its own lifetime: it is set by
 * a command, and cleared by a timer the plugin view keeps — nothing downstream
 * has to remember to turn it off.
 */

type BlockFocusFlashPhase = 'a' | 'b';

interface BlockFocusFlashState {
    blockId: string,
    phase: BlockFocusFlashPhase,
    decorations: DecorationSet,
}

interface BlockFocusFlashMeta {
    blockId: string,
}

/** Hold + fade of the flash keyframes in `blocks/base/Block.module.css`. */
export const BLOCK_FOCUS_FLASH_DURATION_MS = 3000;

export const BLOCK_FOCUS_FLASH_ATTRIBUTE = 'data-focus-flash';

const blockFocusFlashKey = new PluginKey<BlockFocusFlashState | null>('block-focus-flash');

interface ScriptBlockRange {
    from: number,
    to: number,
}

const findScriptBlockRange = (
    doc: ProseMirrorNode,
    blockId: string,
): ScriptBlockRange | null => {
    let range: ScriptBlockRange | null = null;

    doc.descendants((node, pos) => {
        if (range) {
            return false;
        }

        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        if (node.attrs?.id !== blockId) {
            return false;
        }

        range = {from: pos, to: pos + node.nodeSize};

        return false;
    });

    return range;
};

const buildFlashState = (
    doc: ProseMirrorNode,
    blockId: string,
    phase: BlockFocusFlashPhase,
): BlockFocusFlashState | null => {
    const range = findScriptBlockRange(doc, blockId);

    if (!range) {
        return null;
    }

    return {
        blockId,
        phase,
        decorations: DecorationSet.create(doc, [Decoration.node(range.from, range.to, {[BLOCK_FOCUS_FLASH_ATTRIBUTE]: phase})]),
    };
};

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        blockFocusFlash: {
            flashBlockFocus: (blockId: string) => ReturnType,
        },
    }
}

export const BlockFocusFlashExtension = Extension.create({
    name: 'blockFocusFlash',

    addCommands() {
        return {
            flashBlockFocus: blockId => ({tr, dispatch}) => {
                if (!findScriptBlockRange(tr.doc, blockId)) {
                    return false;
                }

                if (dispatch) {
                    tr
                        .setMeta(blockFocusFlashKey, {blockId} satisfies BlockFocusFlashMeta)
                        .setMeta('addToHistory', false);
                }

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<BlockFocusFlashState | null>({
                key: blockFocusFlashKey,
                state: {
                    init: () => null,
                    apply: (tr, value) => {
                        const meta = tr.getMeta(blockFocusFlashKey) as
                            BlockFocusFlashMeta | null | undefined;

                        if (meta === null) {
                            return null;
                        }

                        if (meta) {
                            /*
                             * Alternating phases swap the animation-name, which
                             * is what makes a second click on the same sidebar
                             * row replay the flash instead of leaving the
                             * running one to finish.
                             */
                            return buildFlashState(
                                tr.doc,
                                meta.blockId,
                                value?.phase === 'a' ? 'b' : 'a',
                            );
                        }

                        if (!value) {
                            return null;
                        }

                        if (!tr.docChanged) {
                            return value;
                        }

                        return {
                            ...value,
                            decorations: value.decorations.map(tr.mapping, tr.doc),
                        };
                    },
                },
                props: {
                    decorations: state => blockFocusFlashKey.getState(state)?.decorations,
                },
                view: () => {
                    let timer: number | null = null;

                    const clearTimer = () => {
                        if (timer !== null) {
                            window.clearTimeout(timer);
                            timer = null;
                        }
                    };

                    return {
                        update: (currentView, previousState) => {
                            const next = blockFocusFlashKey.getState(currentView.state);

                            if (next === blockFocusFlashKey.getState(previousState)) {
                                return;
                            }

                            clearTimer();

                            if (!next) {
                                return;
                            }

                            timer = window.setTimeout(() => {
                                timer = null;
                                currentView.dispatch(
                                    currentView.state.tr
                                        .setMeta(blockFocusFlashKey, null)
                                        .setMeta('addToHistory', false),
                                );
                            }, BLOCK_FOCUS_FLASH_DURATION_MS);
                        },
                        destroy: clearTimer,
                    };
                },
            }),
        ];
    },
});
