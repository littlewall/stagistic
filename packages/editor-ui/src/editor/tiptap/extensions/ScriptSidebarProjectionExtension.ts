import {
    ELEMENT_ACT,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_SCENE_HEADING,
    type IndexedScriptBlock,
    normalizeActName,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script-core';
import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';

import type {
    EditorLiveCharacterSnapshot,
    EditorLiveStructureRow,
    EditorLiveStructureSnapshot,
} from '../../contracts';
import {
    incrementSidebarProjectionDeltaCount,
    incrementSidebarProjectionFullRebuildCount,
} from '../../perf/editorPerfMetrics';
import {
    buildScriptBlockIndexSnapshotFromProseMirrorDoc,
    getScriptBlockIndexChangeFromState,
    getScriptBlockIndexSnapshotFromState,
} from './ScriptBlockIndexExtension';

export type ScriptSidebarProjectionChangeReason = 'singleBlockText' | 'structural' | 'fallback';

export interface ScriptSidebarProjectionChange {
    structureChanged: boolean,
    charactersChanged: boolean,
    reason: ScriptSidebarProjectionChangeReason,
}

export interface ScriptSidebarProjectionPluginState {
    structure: EditorLiveStructureSnapshot,
    characters: EditorLiveCharacterSnapshot,
    lastChange: ScriptSidebarProjectionChange,
}

const EMPTY_STRUCTURE: EditorLiveStructureSnapshot = {
    rows: [],
    rowIndexByBlockId: new Map<string, number>(),
    sceneByBlockId: new Map<string, string>(),
};

const EMPTY_CHARACTERS: EditorLiveCharacterSnapshot = {
    countsByKey: new Map<string, number>(),
    countsByCharacterId: new Map<string, number>(),
    keyByCharacterId: new Map<string, string>(),
};

const EMPTY_CHANGE: ScriptSidebarProjectionChange = {
    structureChanged: false,
    charactersChanged: false,
    reason: 'fallback',
};

const INITIAL_CHANGE: ScriptSidebarProjectionChange = {
    structureChanged: true,
    charactersChanged: true,
    reason: 'structural',
};

const EMPTY_STATE: ScriptSidebarProjectionPluginState = {
    structure: EMPTY_STRUCTURE,
    characters: EMPTY_CHARACTERS,
    lastChange: EMPTY_CHANGE,
};

const isCharacterBlockType = (blockType: string) => {
    return blockType === ELEMENT_CHARACTER || blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER;
};

const normalizeText = (value: string) => value.trim();

const buildStructureSnapshot = (indexSnapshot: ScriptBlockIndexSnapshot): EditorLiveStructureSnapshot => {
    if (!Array.isArray(indexSnapshot.blocks) || indexSnapshot.blocks.length === 0) {
        return EMPTY_STRUCTURE;
    }

    const rows: EditorLiveStructureRow[] = [];
    const rowIndexByBlockId = new Map<string, number>();
    const sceneByBlockId = new Map<string, string>();

    indexSnapshot.blocks.forEach(block => {
        if (!block.blockId) {
            return;
        }

        if (block.blockType === ELEMENT_ACT) {
            const row: EditorLiveStructureRow = {
                kind: 'act',
                blockId: block.blockId,
                name: normalizeActName(block.textContent),
                index: rows.length,
            };

            rows.push(row);
            rowIndexByBlockId.set(block.blockId, row.index);

            return;
        }

        if (block.blockType === ELEMENT_SCENE_HEADING) {
            const row: EditorLiveStructureRow = {
                kind: 'scene',
                blockId: block.blockId,
                title: normalizeText(block.textContent) || 'Untitled scene',
                index: rows.length,
            };

            rows.push(row);
            rowIndexByBlockId.set(block.blockId, row.index);
            sceneByBlockId.set(block.blockId, block.blockId);

            return;
        }

        if (block.sceneBlockId) {
            sceneByBlockId.set(block.blockId, block.sceneBlockId);
        }
    });

    if (rows.length === 0 && sceneByBlockId.size === 0) {
        return EMPTY_STRUCTURE;
    }

    return {
        rows,
        rowIndexByBlockId,
        sceneByBlockId,
    };
};

const incrementCount = (counts: Map<string, number>, key: string) => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
};

const decrementCount = (counts: Map<string, number>, key: string) => {
    const nextValue = (counts.get(key) ?? 0) - 1;

    if (nextValue <= 0) {
        counts.delete(key);

        return;
    }

    counts.set(key, nextValue);
};

const applyBlockCharacterRefs = (
    countsByKey: Map<string, number>,
    countsByCharacterId: Map<string, number>,
    keyByCharacterId: Map<string, string> | null,
    block: IndexedScriptBlock,
    mode: 'add' | 'remove',
) => {
    if (!isCharacterBlockType(block.blockType) || !Array.isArray(block.characterRefs)) {
        return;
    }

    block.characterRefs.forEach(characterRef => {
        const key = typeof characterRef.key === 'string' ? characterRef.key.trim() : '';

        if (!key) {
            return;
        }

        if (mode === 'add') {
            incrementCount(countsByKey, key);
        }

        if (mode === 'remove') {
            decrementCount(countsByKey, key);
        }

        if (!characterRef.characterId) {
            return;
        }

        if (mode === 'add') {
            incrementCount(countsByCharacterId, characterRef.characterId);

            if (keyByCharacterId) {
                keyByCharacterId.set(characterRef.characterId, key);
            }
        }

        if (mode === 'remove') {
            decrementCount(countsByCharacterId, characterRef.characterId);

            if (keyByCharacterId && !countsByCharacterId.has(characterRef.characterId)) {
                keyByCharacterId.delete(characterRef.characterId);
            }
        }
    });
};

const buildCharacterSnapshot = (indexSnapshot: ScriptBlockIndexSnapshot): EditorLiveCharacterSnapshot => {
    if (!Array.isArray(indexSnapshot.blocks) || indexSnapshot.blocks.length === 0) {
        return EMPTY_CHARACTERS;
    }

    const countsByKey = new Map<string, number>();
    const countsByCharacterId = new Map<string, number>();
    const keyByCharacterId = new Map<string, string>();

    indexSnapshot.blocks.forEach(block => {
        applyBlockCharacterRefs(countsByKey, countsByCharacterId, keyByCharacterId, block, 'add');
    });

    if (countsByKey.size === 0 && countsByCharacterId.size === 0) {
        return EMPTY_CHARACTERS;
    }

    return {
        countsByKey,
        countsByCharacterId,
        keyByCharacterId,
    };
};

const buildProjectionState = (indexSnapshot: ScriptBlockIndexSnapshot): ScriptSidebarProjectionPluginState => {
    return {
        structure: buildStructureSnapshot(indexSnapshot),
        characters: buildCharacterSnapshot(indexSnapshot),
        lastChange: INITIAL_CHANGE,
    };
};

export const buildScriptSidebarProjectionFromIndexSnapshot = (
    indexSnapshot: ScriptBlockIndexSnapshot,
) => {
    return buildProjectionState(indexSnapshot);
};

const areStringNumberMapsEqual = (left: ReadonlyMap<string, number>, right: ReadonlyMap<string, number>) => {
    if (left.size !== right.size) {
        return false;
    }

    for (const [key, value] of left.entries()) {
        if ((right.get(key) ?? null) !== value) {
            return false;
        }
    }

    return true;
};

const areStringMapsEqual = (left: ReadonlyMap<string, string>, right: ReadonlyMap<string, string>) => {
    if (left.size !== right.size) {
        return false;
    }

    for (const [key, value] of left.entries()) {
        if ((right.get(key) ?? null) !== value) {
            return false;
        }
    }

    return true;
};

const areStructureRowsEqual = (
    left: readonly EditorLiveStructureRow[],
    right: readonly EditorLiveStructureRow[],
) => {
    if (left.length !== right.length) {
        return false;
    }

    for (let index = 0; index < left.length; index += 1) {
        const leftRow = left[index];
        const rightRow = right[index];

        if (!leftRow || !rightRow) {
            return false;
        }

        if (
            leftRow.kind !== rightRow.kind
            || leftRow.blockId !== rightRow.blockId
            || leftRow.index !== rightRow.index
        ) {
            return false;
        }

        if (leftRow.kind === 'act' && rightRow.kind === 'act') {
            if (leftRow.name !== rightRow.name) {
                return false;
            }

            continue;
        }

        if (leftRow.kind === 'scene' && rightRow.kind === 'scene') {
            if (leftRow.title !== rightRow.title) {
                return false;
            }

            continue;
        }

        return false;
    }

    return true;
};

const areStructureSnapshotsEqual = (
    left: EditorLiveStructureSnapshot,
    right: EditorLiveStructureSnapshot,
) => {
    if (!areStructureRowsEqual(left.rows, right.rows)) {
        return false;
    }

    if (!areStringNumberMapsEqual(left.rowIndexByBlockId, right.rowIndexByBlockId)) {
        return false;
    }

    if (left.sceneByBlockId.size !== right.sceneByBlockId.size) {
        return false;
    }

    for (const [key, value] of left.sceneByBlockId.entries()) {
        if ((right.sceneByBlockId.get(key) ?? null) !== value) {
            return false;
        }
    }

    return true;
};

const areCharacterSnapshotsEqual = (
    left: EditorLiveCharacterSnapshot,
    right: EditorLiveCharacterSnapshot,
) => {
    return areStringNumberMapsEqual(left.countsByKey, right.countsByKey)
        && areStringNumberMapsEqual(left.countsByCharacterId, right.countsByCharacterId)
        && areStringMapsEqual(left.keyByCharacterId, right.keyByCharacterId);
};

const createChange = (
    structureChanged: boolean,
    charactersChanged: boolean,
    reason: ScriptSidebarProjectionChangeReason,
): ScriptSidebarProjectionChange => {
    return {
        structureChanged,
        charactersChanged,
        reason,
    };
};

const createRebuiltPluginState = (
    previousState: ScriptSidebarProjectionPluginState,
    nextIndex: ScriptBlockIndexSnapshot,
    reason: 'structural' | 'fallback',
) => {
    const rebuiltState = buildProjectionState(nextIndex);
    const structureChanged = !areStructureSnapshotsEqual(previousState.structure, rebuiltState.structure);
    const charactersChanged = !areCharacterSnapshotsEqual(previousState.characters, rebuiltState.characters);

    return {
        structure: rebuiltState.structure,
        characters: rebuiltState.characters,
        lastChange: createChange(structureChanged, charactersChanged, reason),
    };
};

const applyStructureDelta = (
    previousStructure: EditorLiveStructureSnapshot,
    previousBlock: IndexedScriptBlock,
    nextBlock: IndexedScriptBlock,
) => {
    if (
        previousBlock.blockId !== nextBlock.blockId
        || previousBlock.blockType !== nextBlock.blockType
        || previousBlock.orderNo !== nextBlock.orderNo
    ) {
        return previousStructure;
    }

    if (previousBlock.blockType !== ELEMENT_ACT && previousBlock.blockType !== ELEMENT_SCENE_HEADING) {
        return previousStructure;
    }

    const rowIndex = previousStructure.rowIndexByBlockId.get(previousBlock.blockId);

    if (typeof rowIndex !== 'number') {
        return previousStructure;
    }

    const previousRow = previousStructure.rows[rowIndex];

    if (!previousRow) {
        return previousStructure;
    }

    if (previousRow.kind === 'act') {
        const nextName = normalizeActName(nextBlock.textContent);

        if (previousRow.name === nextName) {
            return previousStructure;
        }

        const nextRows = previousStructure.rows.slice();

        nextRows[rowIndex] = {
            ...previousRow,
            name: nextName,
        };

        return {
            ...previousStructure,
            rows: nextRows,
        };
    }

    const nextTitle = normalizeText(nextBlock.textContent) || 'Untitled scene';

    if (previousRow.title === nextTitle) {
        return previousStructure;
    }

    const nextRows = previousStructure.rows.slice();

    nextRows[rowIndex] = {
        ...previousRow,
        title: nextTitle,
    };

    return {
        ...previousStructure,
        rows: nextRows,
    };
};

const applyCharacterDelta = (
    previousCharacters: EditorLiveCharacterSnapshot,
    previousBlock: IndexedScriptBlock,
    nextBlock: IndexedScriptBlock,
) => {
    const isPreviousCharacterBlock = isCharacterBlockType(previousBlock.blockType);
    const isNextCharacterBlock = isCharacterBlockType(nextBlock.blockType);

    if (!isPreviousCharacterBlock && !isNextCharacterBlock) {
        return previousCharacters;
    }

    const countsByKey = new Map(previousCharacters.countsByKey);
    const countsByCharacterId = new Map(previousCharacters.countsByCharacterId);
    const keyByCharacterId = new Map(previousCharacters.keyByCharacterId);

    applyBlockCharacterRefs(countsByKey, countsByCharacterId, keyByCharacterId, previousBlock, 'remove');
    applyBlockCharacterRefs(countsByKey, countsByCharacterId, keyByCharacterId, nextBlock, 'add');

    const didCountsChange =
        countsByKey.size !== previousCharacters.countsByKey.size
        || countsByCharacterId.size !== previousCharacters.countsByCharacterId.size
        || Array.from(countsByKey.entries()).some(([key, value]) => previousCharacters.countsByKey.get(key) !== value)
        || Array.from(countsByCharacterId.entries())
            .some(([key, value]) => previousCharacters.countsByCharacterId.get(key) !== value);

    if (!didCountsChange) {
        return previousCharacters;
    }

    return {
        countsByKey,
        countsByCharacterId,
        keyByCharacterId,
    };
};

const tryApplySingleBlockDelta = (
    pluginState: ScriptSidebarProjectionPluginState,
    previousIndex: ScriptBlockIndexSnapshot,
    nextIndex: ScriptBlockIndexSnapshot,
    index: number,
) => {
    const previousBlock = previousIndex.blocks[index];
    const nextBlock = nextIndex.blocks[index];

    if (!previousBlock || !nextBlock) {
        return null;
    }

    const nextStructure = applyStructureDelta(pluginState.structure, previousBlock, nextBlock);
    const nextCharacters = applyCharacterDelta(pluginState.characters, previousBlock, nextBlock);

    if (nextStructure === pluginState.structure && nextCharacters === pluginState.characters) {
        return pluginState;
    }

    return {
        structure: nextStructure,
        characters: nextCharacters,
    };
};

export const scriptSidebarProjectionKey = new PluginKey<ScriptSidebarProjectionPluginState>('script-sidebar-projection');

export const getScriptSidebarProjectionFromState = (state: EditorState): ScriptSidebarProjectionPluginState => {
    return scriptSidebarProjectionKey.getState(state) ?? EMPTY_STATE;
};

export const getScriptSidebarProjectionChangeFromState = (state: EditorState): ScriptSidebarProjectionChange => {
    return scriptSidebarProjectionKey.getState(state)?.lastChange ?? EMPTY_CHANGE;
};

export const ScriptSidebarProjectionExtension = Extension.create<undefined, ScriptSidebarProjectionPluginState>({
    name: 'ScriptSidebarProjection',

    addStorage() {
        return {
            structure: EMPTY_STRUCTURE,
            characters: EMPTY_CHARACTERS,
            lastChange: INITIAL_CHANGE,
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<ScriptSidebarProjectionPluginState>({
                key: scriptSidebarProjectionKey,
                state: {
                    init: (_config, state) => {
                        const indexSnapshot = buildScriptBlockIndexSnapshotFromProseMirrorDoc(state.doc);
                        const initialState = buildProjectionState(indexSnapshot);

                        this.storage.structure = initialState.structure;
                        this.storage.characters = initialState.characters;
                        this.storage.lastChange = initialState.lastChange;

                        return initialState;
                    },
                    apply: (transaction, pluginState, oldState, newState) => {
                        if (!transaction.docChanged) {
                            return pluginState;
                        }

                        const previousIndex = getScriptBlockIndexSnapshotFromState(oldState);
                        const nextIndex = getScriptBlockIndexSnapshotFromState(newState);
                        const indexChange = getScriptBlockIndexChangeFromState(newState);

                        if (
                            indexChange?.type === 'singleBlockText'
                            && previousIndex.blocks.length === nextIndex.blocks.length
                        ) {
                            const deltaState = tryApplySingleBlockDelta(
                                pluginState,
                                previousIndex,
                                nextIndex,
                                indexChange.index,
                            );

                            if (deltaState) {
                                const nextState: ScriptSidebarProjectionPluginState = {
                                    structure: deltaState.structure,
                                    characters: deltaState.characters,
                                    lastChange: createChange(
                                        deltaState.structure !== pluginState.structure,
                                        deltaState.characters !== pluginState.characters,
                                        'singleBlockText',
                                    ),
                                };

                                this.storage.structure = nextState.structure;
                                this.storage.characters = nextState.characters;
                                this.storage.lastChange = nextState.lastChange;
                                incrementSidebarProjectionDeltaCount();

                                return nextState;
                            }
                        }

                        const rebuildReason: 'structural' | 'fallback' = indexChange?.type === 'singleBlockText'
                            ? 'fallback'
                            : indexChange
                                ? 'structural'
                                : 'fallback';
                        const rebuiltState = createRebuiltPluginState(
                            pluginState,
                            nextIndex,
                            rebuildReason,
                        );

                        this.storage.structure = rebuiltState.structure;
                        this.storage.characters = rebuiltState.characters;
                        this.storage.lastChange = rebuiltState.lastChange;
                        incrementSidebarProjectionFullRebuildCount();

                        return rebuiltState;
                    },
                },
            }),
        ];
    },
});
