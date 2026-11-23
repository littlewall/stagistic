import {
    Plugin,
    PluginKey,
    type Transaction,
} from '@tiptap/pm/state';
import type {EditorView} from '@tiptap/pm/view';

/*
 * Q23: a block never starts with whitespace. Typing and paste are handled where they happen
 * (handlers/textInput.ts, handlers/leadingWhitespace.ts); this plugin is the safety net for every other
 * way a block can end up starting with whitespace: Enter splitting a block before a space, Backspace or
 * Delete joining blocks, autocomplete, IME composition, programmatic edits.
 *
 * It only looks at blocks a transaction changed, so documents that still hold a legacy leading indent
 * are left alone until the block is edited. Its steps are appended transactions: prosemirror-history
 * joins them to the user's step, so one undo reverts both. It waits while an IME composition is running
 * and re-checks the caret's block when the composition ends. A replacement of the whole document counts as
 * loading stored content and is left as it is. Deleting the whitespace maps the caret
 * with it, so the caret only moves when it stood inside the stripped run.
 */

const leadingWhitespacePluginKey = new PluginKey('leadingWhitespace');
const RECHECK_META = 'recheck';
const COMPOSITION_END_DELAY_MS = 30;

/** Length of the whitespace run at the start of a block's content, counted in document positions. */
const leadingWhitespaceLength = (block: {forEach: (callback: (child: {isText: boolean, text?: string | null}) => void) => void}) => {
    let length = 0;
    let open = true;

    block.forEach(child => {
        if (!open) {
            return;
        }

        if (!child.isText) {
            open = false;

            return;
        }

        const text = child.text ?? '';
        const run = text.length - text.replace(/^\s+/u, '').length;

        length += run;
        open = run === text.length;
    });

    return length;
};

/** Ranges the transactions changed, mapped to the final document. */
const changedRanges = (transactions: readonly Transaction[]) => {
    const ranges: Array<[number, number]> = [];

    transactions.forEach((transaction, transactionIndex) => {
        transaction.mapping.maps.forEach((map, mapIndex) => {
            map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                const rest = transaction.mapping.slice(mapIndex + 1);
                let from = rest.map(newStart, -1);
                let to = rest.map(newEnd, 1);

                for (const later of transactions.slice(transactionIndex + 1)) {
                    from = later.mapping.map(from, -1);
                    to = later.mapping.map(to, 1);
                }

                ranges.push([from, to]);
            });
        });
    });

    return ranges;
};

export const createLeadingWhitespacePlugin = () => {
    let view: EditorView | null = null;

    return new Plugin({
        key: leadingWhitespacePluginKey,
        view: editorView => {
            view = editorView;

            return {
                destroy: () => {
                    view = null;
                },
            };
        },
        props: {
            handleDOMEvents: {
                compositionend: editorView => {
                    // The composed text may have landed while `composing` was still set.
                    window.setTimeout(() => {
                        if (!editorView.isDestroyed && !editorView.composing) {
                            editorView.dispatch(editorView.state.tr.setMeta(leadingWhitespacePluginKey, RECHECK_META));
                        }
                    }, COMPOSITION_END_DELAY_MS);

                    return false;
                },
            },
        },
        appendTransaction: (transactions, _oldState, newState) => {
            if (view?.composing) {
                return null;
            }

            const recheck = transactions.some(transaction => transaction.getMeta(leadingWhitespacePluginKey) === RECHECK_META);
            const ranges = changedRanges(transactions.filter(transaction => transaction.docChanged));

            if (recheck) {
                ranges.push([newState.selection.from, newState.selection.to]);
            }

            if (ranges.length === 0) {
                return null;
            }

            const {doc} = newState;
            const strips = new Map<number, number>();

            ranges.forEach(([from, to]) => {
                // A replacement of the whole document is a (re)load of stored content, not an edit.
                if (from <= 0 && to >= doc.content.size) {
                    return;
                }

                doc.nodesBetween(Math.max(0, Math.min(from, doc.content.size)), Math.max(0, Math.min(to, doc.content.size)), (node, pos) => {
                    if (!node.isTextblock) {
                        return true;
                    }

                    const length = leadingWhitespaceLength(node);

                    if (length > 0) {
                        strips.set(pos + 1, length);
                    }

                    return false;
                });
            });

            if (strips.size === 0) {
                return null;
            }

            const tr = newState.tr;

            // Back to front, so earlier positions stay valid.
            [...strips.entries()].toSorted((a, b) => b[0] - a[0]).forEach(([start, length]) => {
                tr.delete(start, start + length);
            });

            return tr;
        },
    });
};
