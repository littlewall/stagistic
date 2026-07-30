import {Extension} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';

import {moveCaretBeforeTrailingMusic} from '../tiptap/extensions/music/musicCaret';

const isMusicPillTarget = (target: EventTarget | null) => {
    return target instanceof Element
        && target.closest('[data-music-pill]') !== null;
};

export const MiniMusicCaretExtension = Extension.create({
    name: 'miniMusicCaret',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                appendTransaction: (transactions, _oldState, newState) => {
                    if (!transactions.some(transaction => {
                        return transaction.selectionSet
                            || transaction.docChanged;
                    })) {
                        return null;
                    }

                    return newState.selection.empty
                        ? moveCaretBeforeTrailingMusic(
                            newState,
                            newState.selection.from,
                        )
                        : null;
                },
                props: {
                    handleDOMEvents: {
                        mousedown: (view, event) => {
                            if (
                                event.button !== 0
                                || isMusicPillTarget(event.target)
                            ) {
                                return false;
                            }

                            const target = event.target;
                            const block = target instanceof Element
                                ? target.closest<HTMLElement>('p[blocktype]')
                                : null;
                            const pill = block?.querySelector<HTMLElement>(
                                '[data-music-pill]',
                            );

                            if (!block || !pill) {
                                return false;
                            }

                            const pillRect = pill.getBoundingClientRect();
                            const isAfterPill = event.clientX > pillRect.right
                                && event.clientY >= pillRect.top
                                && event.clientY <= pillRect.bottom;

                            if (!isAfterPill) {
                                return false;
                            }

                            const position = view.posAtDOM(
                                block,
                                block.childNodes.length,
                            );
                            const transaction = moveCaretBeforeTrailingMusic(
                                view.state,
                                position,
                            );

                            if (!transaction) {
                                return false;
                            }

                            event.preventDefault();
                            view.dispatch(transaction);
                            view.focus();

                            return true;
                        },
                    },
                },
            }),
        ];
    },
});
