import {MUSIC_OUT_NODE_NAME} from '@stagistic/script';
import {Plugin} from '@tiptap/pm/state';

import {buildIndexSnapshotFromPmDoc} from '../../../runtime/buildIndexSnapshotFromPmDoc';
import {buildDeleteSelectionPreservingMusicAtoms, isMusicPillTarget, resolveTrailingMusicClickPosition} from './musicAtomSelection';
import {
    isCaretBeforeTrailingMusic,
    isMusicAtom,
    moveCaretBeforeTrailingMusic,
    moveCaretBeforeTrailingMusicInPreviousBlock,
    moveCaretToNextBlockAfterTrailingMusic,
} from './musicCaret';
import {resolveScriptTargetBlock} from './musicCommands';
import {buildSetMusicOutAtBlock, findMusicAtomRange, resolveMusicOutCandidate} from './musicOutCommands';

/*
 * Music boundary: the caret never rests after a trailing music atom, arrow
 * navigation skips the pill, and deletion only happens via its menu.
 */
export const createMusicBoundaryPlugin = () =>
    new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
            if (
                !transactions.some(transaction => {
                    return transaction.selectionSet || transaction.docChanged;
                })
            ) {
                return null;
            }

            return newState.selection.empty ? moveCaretBeforeTrailingMusic(newState, newState.selection.from) : null;
        },
        props: {
            handleDOMEvents: {
                mousedown: (view, event) => {
                    if (event.button !== 0 || isMusicPillTarget(event.target)) {
                        return false;
                    }

                    const clickPosition = resolveTrailingMusicClickPosition(view.state, event);
                    const tr = clickPosition !== null ? moveCaretBeforeTrailingMusic(view.state, clickPosition) : null;

                    if (!tr) {
                        return false;
                    }

                    event.preventDefault();
                    view.dispatch(tr);
                    view.focus();

                    return true;
                },
            },
            handleKeyDown: (view, event) => {
                if (isMusicPillTarget(event.target)) {
                    return false;
                }

                const {selection} = view.state;

                if (event.key.toLocaleLowerCase() === 'o' && event.shiftKey && (event.metaKey || event.ctrlKey) && !event.altKey && !event.isComposing) {
                    const block = resolveScriptTargetBlock(view.state);

                    if (!block) {
                        return false;
                    }

                    const hasOut = findMusicAtomRange(block, MUSIC_OUT_NODE_NAME) !== null;
                    const snapshot = buildIndexSnapshotFromPmDoc(view.state.doc);

                    if (!hasOut && !resolveMusicOutCandidate(snapshot, block.id)) {
                        return false;
                    }

                    event.preventDefault();

                    const tr = hasOut ? null : buildSetMusicOutAtBlock(view.state, block.id);

                    if (tr) {
                        view.dispatch(tr);
                    }

                    return true;
                }

                if ((event.key === 'Backspace' || event.key === 'Delete') && !selection.empty) {
                    const tr = buildDeleteSelectionPreservingMusicAtoms(view.state);

                    if (!tr) {
                        return false;
                    }

                    event.preventDefault();
                    view.dispatch(tr);

                    return true;
                }

                if (!selection.empty) {
                    return false;
                }

                if (event.key === 'ArrowLeft' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                    const tr = moveCaretBeforeTrailingMusicInPreviousBlock(view.state);

                    if (tr) {
                        event.preventDefault();
                        view.dispatch(tr);

                        return true;
                    }
                }

                if (
                    event.key === 'ArrowRight' &&
                    !event.altKey &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.shiftKey &&
                    isCaretBeforeTrailingMusic(view.state)
                ) {
                    event.preventDefault();

                    const tr = moveCaretToNextBlockAfterTrailingMusic(view.state);

                    if (tr) {
                        view.dispatch(tr);
                    }

                    return true;
                }

                if (event.key === 'Backspace' && isMusicAtom(selection.$from.nodeBefore)) {
                    event.preventDefault();

                    return true;
                }

                if (event.key === 'Delete' && isMusicAtom(selection.$from.nodeAfter)) {
                    event.preventDefault();

                    return true;
                }

                return false;
            },
        },
    });
