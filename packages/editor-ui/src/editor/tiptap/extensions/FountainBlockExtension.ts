import {ELEMENT_ACTION} from '@stagistic/editor-core';
import {mergeAttributes, Node} from '@tiptap/core';
import {
    Plugin,
    PluginKey,
    type Transaction,
} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {createCharacterTagDecorationsPlugin} from '../fountainBlock/characterTagDecorations';
import {
    type BlockCasingMap,
    type BlockNextElementMap,
    type BlockShortcutMap,
    handleKeyDown,
    handlePaste,
    handleTextInput,
} from '../fountainBlock/handlers';
import {
    ensureFountainBlockId,
    FOUNTAIN_BLOCK_NODE_NAME,
    getFountainBlockClassName,
    normalizeFountainBlockType,
} from '../fountainCore';

type DocRange = {
    from: number,
    to: number,
};

const clampRange = (range: DocRange, max: number): DocRange => {
    const start = Math.max(0, Math.min(range.from, range.to));
    const end = Math.min(max, Math.max(range.from, range.to));

    return {
        from: start,
        to: end,
    };
};

const expandRange = (range: DocRange, max: number, padding = 2): DocRange => {
    const clamped = clampRange(range, max);

    return {
        from: Math.max(0, clamped.from - padding),
        to: Math.min(max, clamped.to + padding),
    };
};

const mergeRanges = (ranges: DocRange[]): DocRange[] => {
    if (ranges.length === 0) {
        return ranges;
    }

    const sorted = ranges
        .filter(range => range.to > range.from)
        .sort((a, b) => a.from - b.from);

    if (sorted.length === 0) {
        return [];
    }

    const merged: DocRange[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i += 1) {
        const current = sorted[i];
        const last = merged[merged.length - 1];

        if (current.from <= last.to + 1) {
            last.to = Math.max(last.to, current.to);
            continue;
        }

        merged.push(current);
    }

    return merged;
};

const getChangedRanges = (transactions: readonly Transaction[], docSize: number) => {
    const ranges: DocRange[] = [];

    transactions.forEach(transaction => {
        if (!transaction.docChanged) {
            return;
        }

        const maps = transaction.mapping.maps;

        for (let mapIndex = 0; mapIndex < maps.length; mapIndex += 1) {
            const map = maps[mapIndex];
            const remap = transaction.mapping.slice(mapIndex + 1);

            map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                const mappedFrom = remap.map(newStart, 1);
                const mappedTo = remap.map(newEnd, -1);
                const expanded = expandRange(
                    {
                        from: mappedFrom,
                        to: mappedTo,
                    },
                    docSize,
                );

                ranges.push(expanded);
            });
        }
    });

    return mergeRanges(ranges);
};

const ensureBlockIdsPlugin = (
    editor: Editor,
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
    blockCasing?: BlockCasingMap,
) => {
    let didInitialScan = false;

    return new Plugin({
        key: new PluginKey('fountain-block-ids'),
        appendTransaction: (transactions, _oldState, newState) => {
            if (!transactions.some(transaction => transaction.docChanged)) {
                return null;
            }

            let tr = newState.tr;
            let changed = false;

            const scanRanges = didInitialScan
                ? getChangedRanges(transactions, newState.doc.content.size)
                : [
                    {
                        from: 0,
                        to: newState.doc.content.size,
                    },
                ];

            didInitialScan = true;

            const rangesToScan = scanRanges.length > 0
                ? scanRanges
                : [
                    {
                        from: 0,
                        to: newState.doc.content.size,
                    },
                ];

            rangesToScan.forEach(range => {
                newState.doc.nodesBetween(range.from, range.to, (node, pos) => {
                    if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
                        return true;
                    }

                    const attrs = node.attrs as Record<string, unknown>;
                    const id = ensureFountainBlockId(attrs.id);

                    if (id === attrs.id) {
                        return false;
                    }

                    tr = tr.setNodeMarkup(pos, undefined, {
                        ...attrs,
                        id,
                    });
                    changed = true;

                    return false;
                });
            });

            return changed ? tr : null;
        },
        props: {
            handleKeyDown: (_view, event) => handleKeyDown(editor, event, blockShortcuts, blockNextElements),
            handleTextInput: (_view, from, to, text) => handleTextInput(editor, from, to, text, blockCasing),
            handlePaste: (_view, event) => handlePaste(editor, event),
        },
    });
};

const FountainBlockExtension = Node.create<{
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
    blockCasing?: BlockCasingMap,
}>({
    name: FOUNTAIN_BLOCK_NODE_NAME,
    group: 'block',
    content: 'inline*',
    defining: true,
    isolating: false,
    addOptions() {
        return {
            blockShortcuts: undefined,
            blockNextElements: undefined,
            blockCasing: undefined,
        };
    },
    addAttributes() {
        return {
            blockType: {
                default: ELEMENT_ACTION,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-fountain-type') ?? ELEMENT_ACTION,
            },
            id: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-block-id'),
            },
            characterRefs: {
                default: null,
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'p[data-fountain-type]',
            }, {
                tag: 'p[data-fountain-block]',
            },
        ];
    },
    renderHTML({HTMLAttributes}) {
        const attrs = HTMLAttributes as Record<string, unknown>;
        const blockType = normalizeFountainBlockType(attrs.blockType);

        const resolvedAttributes = {
            'data-fountain-block': 'true',
            'data-fountain-type': blockType,
            'data-block-id': attrs.id ?? undefined,
            class: getFountainBlockClassName(blockType),
        };

        return [
            'p',
            mergeAttributes(HTMLAttributes, resolvedAttributes),
            0,
        ];
    },
    addProseMirrorPlugins() {
        const editorInstance = this.editor;

        return [
            ensureBlockIdsPlugin(
                editorInstance,
                this.options.blockShortcuts,
                this.options.blockNextElements,
                this.options.blockCasing,
            ), createCharacterTagDecorationsPlugin(),
        ];
    },
});

export default FountainBlockExtension;
