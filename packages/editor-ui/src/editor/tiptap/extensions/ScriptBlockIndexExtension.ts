import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_SCENE_HEADING,
    extractCharacterKeys,
    type IndexedScriptBlock,
    type IndexedScriptCharacterRef,
    normalizeCharacterKey,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script-core';
import {Extension} from '@tiptap/core';
import {type Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    type EditorState,
    Plugin,
    PluginKey,
    type Transaction,
} from '@tiptap/pm/state';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
} from '../fountainCore';

interface IndexedBlockEntry extends IndexedScriptBlock {
    from: number,
    to: number,
}

type ScriptBlockIndexChange =
    | {
        type: 'singleBlockText',
        index: number,
    }
    | {
        type: 'fullRebuild',
    };

interface ScriptBlockIndexPluginState {
    entries: IndexedBlockEntry[],
    entryIndexByBlockId: Map<string, number>,
    snapshot: ScriptBlockIndexSnapshot,
    lastChange: ScriptBlockIndexChange,
}

interface WalkerContext {
    columnGroupOrder: number | null,
    columnOrder: number | null,
}

export const scriptBlockIndexKey = new PluginKey<ScriptBlockIndexPluginState>('script-block-index');

const EMPTY_SNAPSHOT: ScriptBlockIndexSnapshot = {
    blocks: [],
};

const EMPTY_CONTEXT: WalkerContext = {
    columnGroupOrder: null,
    columnOrder: null,
};

const toSnapshotBlock = (entry: IndexedBlockEntry): IndexedScriptBlock => {
    return {
        blockId: entry.blockId,
        orderNo: entry.orderNo,
        blockType: entry.blockType,
        textContent: entry.textContent,
        actBlockId: entry.actBlockId,
        sceneBlockId: entry.sceneBlockId,
        columnGroupOrder: entry.columnGroupOrder,
        columnOrder: entry.columnOrder,
        characterRefs: entry.characterRefs,
    };
};

const toSnapshot = (entries: IndexedBlockEntry[]): ScriptBlockIndexSnapshot => {
    return {
        blocks: entries.map(toSnapshotBlock),
    };
};

const getCharacterRefs = (
    blockType: string,
    textContent: string,
    attrs: Record<string, unknown>,
): IndexedScriptCharacterRef[] | null => {
    if (blockType !== ELEMENT_CHARACTER && blockType !== ELEMENT_DUAL_DIALOGUE_CHARACTER) {
        return null;
    }

    const refsByKey = new Map<string, string>();
    const rawRefs = attrs.characterRefs;

    if (rawRefs && typeof rawRefs === 'object') {
        Object.entries(rawRefs as Record<string, unknown>).forEach(([rawKey, rawCharacterId]) => {
            const key = normalizeCharacterKey(rawKey);

            if (!key || typeof rawCharacterId !== 'string' || !rawCharacterId) {
                return;
            }

            refsByKey.set(key, rawCharacterId);
        });
    }

    const seen = new Set<string>();
    const refs: IndexedScriptCharacterRef[] = [];

    extractCharacterKeys(textContent).forEach(key => {
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        refs.push({
            key,
            characterId: refsByKey.get(key) ?? null,
        });
    });

    Array.from(refsByKey.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([key, characterId]) => {
            if (seen.has(key)) {
                return;
            }

            seen.add(key);
            refs.push({
                key,
                characterId,
            });
        });

    return refs.length > 0 ? refs : null;
};

const clampDocPos = (doc: ProseMirrorNode, pos: number) => {
    return Math.max(0, Math.min(pos, doc.content.size));
};

const findBlockContextAtPos = (
    doc: ProseMirrorNode,
    pos: number,
): {
    node: ProseMirrorNode,
    from: number,
    to: number,
} | null => {
    const resolved = doc.resolve(clampDocPos(doc, pos));

    for (let depth = resolved.depth; depth >= 0; depth -= 1) {
        const node = resolved.node(depth);

        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            continue;
        }

        const from = depth > 0 ? resolved.start(depth) : 0;

        return {
            node,
            from,
            to: from + node.nodeSize,
        };
    }

    return null;
};

const buildScriptBlockEntriesFromProseMirrorDoc = (doc: ProseMirrorNode): IndexedBlockEntry[] => {
    const entries: IndexedBlockEntry[] = [];
    let orderNo = 0;
    let currentActBlockId: string | null = null;
    let currentSceneBlockId: string | null = null;
    let columnGroupOrderCursor = 0;

    const walkChildren = (
        parentNode: ProseMirrorNode,
        parentPos: number,
        context: WalkerContext,
    ) => {
        parentNode.forEach((node, offset) => {
            const nodePos = parentPos + offset + 1;

            if (node.type.name === FOUNTAIN_COLUMN_GROUP_NODE_NAME) {
                const columnGroupOrder = columnGroupOrderCursor;

                columnGroupOrderCursor += 1;

                let columnOrder = 0;

                node.forEach((columnNode, columnOffset) => {
                    if (columnNode.type.name !== FOUNTAIN_COLUMN_NODE_NAME) {
                        return;
                    }

                    const columnPos = nodePos + columnOffset + 1;

                    walkChildren(columnNode, columnPos, {
                        columnGroupOrder,
                        columnOrder,
                    });
                    columnOrder += 1;
                });

                return;
            }

            if (node.type.name === FOUNTAIN_COLUMN_NODE_NAME) {
                walkChildren(node, nodePos, context);

                return;
            }

            if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
                walkChildren(node, nodePos, context);

                return;
            }

            const attrs = node.attrs as Record<string, unknown>;
            const blockType = typeof attrs.blockType === 'string'
                ? attrs.blockType
                : ELEMENT_ACTION;
            const rawBlockId = typeof attrs.id === 'string'
                ? attrs.id.trim()
                : '';
            const blockId = rawBlockId.length > 0
                ? rawBlockId
                : `missing-block-${orderNo + 1}`;
            const textContent = node.textContent.trim();

            if (blockType === ELEMENT_ACT) {
                currentActBlockId = blockId;
            }

            if (blockType === ELEMENT_SCENE_HEADING) {
                currentSceneBlockId = blockId;
            }

            entries.push({
                blockId,
                orderNo,
                blockType,
                textContent,
                actBlockId: currentActBlockId,
                sceneBlockId: currentSceneBlockId,
                columnGroupOrder: context.columnGroupOrder,
                columnOrder: context.columnOrder,
                characterRefs: getCharacterRefs(blockType, textContent, attrs),
                from: nodePos,
                to: nodePos + node.nodeSize,
            });

            orderNo += 1;
        });
    };

    walkChildren(doc, -1, EMPTY_CONTEXT);

    return entries;
};

const buildEntryIndexByBlockId = (entries: IndexedBlockEntry[]) => {
    const entryIndexByBlockId = new Map<string, number>();

    entries.forEach((entry, index) => {
        if (!entry.blockId) {
            return;
        }

        entryIndexByBlockId.set(entry.blockId, index);
    });

    return entryIndexByBlockId;
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

    if (record.type === FOUNTAIN_BLOCK_NODE_NAME) {
        return true;
    }

    return hasFountainBlockNode(record.content) || hasFountainBlockNode(record.slice);
};

const transactionMayAffectBlockStructure = (transaction: Transaction) => {
    return transaction.steps.some(step => {
        const serializedStep = step.toJSON() as Record<string, unknown>;
        const stepType = typeof serializedStep.stepType === 'string'
            ? serializedStep.stepType
            : null;

        if (stepType !== 'replace' && stepType !== 'replaceAround') {
            return false;
        }

        return hasFountainBlockNode(serializedStep.slice);
    });
};

const tryApplySingleBlockTextUpdate = (
    transaction: Transaction,
    entries: IndexedBlockEntry[],
    entryIndexByBlockId: Map<string, number>,
): {
    entries: IndexedBlockEntry[],
    entryIndexByBlockId: Map<string, number>,
    touchedIndex: number,
} | null => {
    if (entries.length === 0) {
        return null;
    }

    if (transactionMayAffectBlockStructure(transaction)) {
        return null;
    }

    const nextBlockContext = findBlockContextAtPos(transaction.doc, transaction.selection.from);

    if (!nextBlockContext) {
        return null;
    }

    const attrs = nextBlockContext.node.attrs as Record<string, unknown>;
    const blockType = typeof attrs.blockType === 'string'
        ? attrs.blockType
        : ELEMENT_ACTION;
    const rawBlockId = typeof attrs.id === 'string'
        ? attrs.id.trim()
        : '';
    const blockId = rawBlockId.length > 0 ? rawBlockId : '';

    if (!blockId) {
        return null;
    }

    const touchedIndex = entryIndexByBlockId.get(blockId);

    if (typeof touchedIndex !== 'number') {
        return null;
    }

    const previousEntry = entries[touchedIndex];

    if (blockId !== previousEntry.blockId || blockType !== previousEntry.blockType) {
        return null;
    }

    const nextEntry: IndexedBlockEntry = {
        ...previousEntry,
        textContent: nextBlockContext.node.textContent.trim(),
        characterRefs: getCharacterRefs(blockType, nextBlockContext.node.textContent.trim(), attrs),
        from: nextBlockContext.from,
        to: nextBlockContext.to,
    };
    const nextEntries = entries.slice();

    nextEntries[touchedIndex] = nextEntry;

    return {
        entries: nextEntries,
        entryIndexByBlockId,
        touchedIndex,
    };
};

export const buildScriptBlockIndexSnapshotFromProseMirrorDoc = (
    doc: ProseMirrorNode,
): ScriptBlockIndexSnapshot => {
    return toSnapshot(buildScriptBlockEntriesFromProseMirrorDoc(doc));
};

export const getScriptBlockIndexSnapshotFromState = (state: EditorState) => {
    return scriptBlockIndexKey.getState(state)?.snapshot ?? EMPTY_SNAPSHOT;
};

export const getScriptBlockIndexChangeFromState = (
    state: EditorState,
): ScriptBlockIndexChange | null => {
    return scriptBlockIndexKey.getState(state)?.lastChange ?? null;
};

export const ScriptBlockIndexExtension = Extension.create<undefined, {snapshot: ScriptBlockIndexSnapshot}>({
    name: 'ScriptBlockIndex',

    addStorage() {
        return {
            snapshot: EMPTY_SNAPSHOT,
        };
    },

    addProseMirrorPlugins() {
        const extension = this;

        return [
            new Plugin<ScriptBlockIndexPluginState>({
                key: scriptBlockIndexKey,
                state: {
                    init: (_config, state) => {
                        const entries = buildScriptBlockEntriesFromProseMirrorDoc(state.doc);
                        const entryIndexByBlockId = buildEntryIndexByBlockId(entries);
                        const snapshot = toSnapshot(entries);

                        extension.storage.snapshot = snapshot;

                        return {
                            entries,
                            entryIndexByBlockId,
                            snapshot,
                            lastChange: {
                                type: 'fullRebuild',
                            },
                        };
                    },
                    apply: (transaction, pluginState) => {
                        if (!transaction.docChanged) {
                            return pluginState;
                        }

                        const fastUpdate = tryApplySingleBlockTextUpdate(
                            transaction,
                            pluginState.entries,
                            pluginState.entryIndexByBlockId,
                        );
                        const entries = fastUpdate?.entries ?? buildScriptBlockEntriesFromProseMirrorDoc(transaction.doc);
                        const entryIndexByBlockId = fastUpdate?.entryIndexByBlockId
                            ?? buildEntryIndexByBlockId(entries);
                        const snapshot = fastUpdate
                            ? {
                                blocks: pluginState.snapshot.blocks.map((block, index) => {
                                    if (index !== fastUpdate.touchedIndex) {
                                        return block;
                                    }

                                    return toSnapshotBlock(entries[index]);
                                }),
                            }
                            : toSnapshot(entries);

                        extension.storage.snapshot = snapshot;

                        return {
                            entries,
                            entryIndexByBlockId,
                            snapshot,
                            lastChange: fastUpdate
                                ? {
                                    type: 'singleBlockText',
                                    index: fastUpdate.touchedIndex,
                                }
                                : {
                                    type: 'fullRebuild',
                                },
                        };
                    },
                },
            }),
        ];
    },
});
