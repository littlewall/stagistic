import {
    buildScriptBlockIndex,
    type ScriptBlockIndexSnapshot,
    type ScriptDocument,
} from '@stagistic/script-core';
import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    PluginKey,
    type Transaction,
} from '@tiptap/pm/state';

import type {EditorBlockUiEvent} from '../../contracts';
import {
    getActiveFountainBlockFromState,
    isFountainBlockNodeName,
} from '../fountainCore';

interface BlockUiEventsPluginState {
    events: EditorBlockUiEvent[],
}

type IndexedSnapshotBlock = ScriptBlockIndexSnapshot['blocks'][number];

const EMPTY_EVENTS: EditorBlockUiEvent[] = [];

export const blockUiEventsKey = new PluginKey<BlockUiEventsPluginState>('script-block-ui-events');

const getActiveBlockIdFromState = (state: EditorState) => {
    return getActiveFountainBlockFromState(state)?.id ?? null;
};

const hasFountainBlockNode = (value: unknown): boolean => {
    if (!value) {
        return false;
    }

    if (Array.isArray(value)) {
        return value.some(item => hasFountainBlockNode(item));
    }

    if (typeof value !== 'object') {
        return false;
    }

    const record = value as Record<string, unknown>;

    if (isFountainBlockNodeName(record.type)) {
        return true;
    }

    return hasFountainBlockNode(record.content) || hasFountainBlockNode(record.slice);
};

const stepMayAffectBlockStructure = (transaction: Transaction) => {
    return transaction.steps.some(step => {
        const serialized = step.toJSON() as Record<string, unknown>;
        const stepType = typeof serialized.stepType === 'string' ? serialized.stepType : null;

        if (stepType !== 'replace' && stepType !== 'replaceAround') {
            return false;
        }

        return hasFountainBlockNode(serialized.slice);
    });
};

const shouldDiffBlocks = (
    transaction: Transaction,
    previousSnapshot: ScriptBlockIndexSnapshot,
    nextSnapshot: ScriptBlockIndexSnapshot,
) => {
    if (!transaction.docChanged) {
        return false;
    }

    if (previousSnapshot.blocks.length !== nextSnapshot.blocks.length) {
        return true;
    }

    return stepMayAffectBlockStructure(transaction);
};

const buildIndexSnapshotFromState = (state: EditorState): ScriptBlockIndexSnapshot => {
    return buildScriptBlockIndex(state.doc.toJSON() as ScriptDocument).snapshot;
};

const buildBlockDiffEvents = (
    previousBlocks: readonly IndexedSnapshotBlock[],
    nextBlocks: readonly IndexedSnapshotBlock[],
): EditorBlockUiEvent[] => {
    const events: EditorBlockUiEvent[] = [];
    const previousById = new Map(previousBlocks.map(block => [block.blockId, block] as const));
    const nextById = new Map(nextBlocks.map(block => [block.blockId, block] as const));

    nextBlocks.forEach(block => {
        const previous = previousById.get(block.blockId);

        if (!previous) {
            events.push({
                type: 'blockInserted',
                blockId: block.blockId,
                blockType: block.blockType,
                orderNo: block.orderNo,
            });

            return;
        }

        if (previous.blockType !== block.blockType) {
            events.push({
                type: 'blockTypeChange',
                blockId: block.blockId,
                blockType: block.blockType,
                previousBlockType: previous.blockType,
            });
        }

        if (previous.orderNo !== block.orderNo) {
            events.push({
                type: 'blockReordered',
                blockId: block.blockId,
                orderNo: block.orderNo,
                previousOrderNo: previous.orderNo,
            });
        }
    });

    previousBlocks.forEach(block => {
        if (nextById.has(block.blockId)) {
            return;
        }

        events.push({
            type: 'blockRemoved',
            blockId: block.blockId,
            blockType: block.blockType,
            previousOrderNo: block.orderNo,
        });
    });

    return events;
};

export const getBlockUiEventsFromState = (state: EditorState): readonly EditorBlockUiEvent[] => {
    return blockUiEventsKey.getState(state)?.events ?? EMPTY_EVENTS;
};

export const BlockUiEventsExtension = Extension.create<undefined, {events: readonly EditorBlockUiEvent[]}>({
    name: 'BlockUiEvents',

    addStorage() {
        return {
            events: EMPTY_EVENTS,
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<BlockUiEventsPluginState>({
                key: blockUiEventsKey,
                state: {
                    init: () => {
                        this.storage.events = EMPTY_EVENTS;

                        return {
                            events: EMPTY_EVENTS,
                        };
                    },
                    apply: (transaction, _pluginState, oldState, newState) => {
                        const previousActiveBlockId = getActiveBlockIdFromState(oldState);
                        const nextActiveBlockId = getActiveBlockIdFromState(newState);
                        const events: EditorBlockUiEvent[] = [];

                        if (previousActiveBlockId !== nextActiveBlockId) {
                            events.push({
                                type: 'activeBlockChange',
                                blockId: nextActiveBlockId,
                                previousBlockId: previousActiveBlockId,
                            });
                        }

                        if (transaction.docChanged) {
                            const previousSnapshot = buildIndexSnapshotFromState(oldState);
                            const nextSnapshot = buildIndexSnapshotFromState(newState);

                            if (shouldDiffBlocks(transaction, previousSnapshot, nextSnapshot)) {
                                events.push(...buildBlockDiffEvents(previousSnapshot.blocks, nextSnapshot.blocks));
                            }
                        }

                        this.storage.events = events;

                        return {events};
                    },
                },
            }),
        ];
    },
});
