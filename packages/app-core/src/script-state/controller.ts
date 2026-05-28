import type {
    ScriptAct,
    ScriptBlock,
    ScriptLocation,
    ScriptScene,
} from '@stagistic/db';
import {
    buildScriptBlockIndex,
    type ScriptBlockIndexSnapshot,
    type ScriptDocument,
} from '@stagistic/script';

import {resolveScriptBlockDiff} from './blockDiffEngine';
import {
    createScriptStateCollections,
    replaceCollectionRows,
    syncCollectionRows,
} from './collections';
import {ScriptStatePacer} from './pacer';
import {
    buildScriptStateRowsFromDocument,
} from './snapshot';
import type {
    BlockDiffPath,
    PersistLatestFn,
    ScriptBlockChange,
    ScriptStateRepository,
    ScriptStateSidebarTab,
    ScriptStateUiSnapshot,
} from './types';
import {createScriptStateUiStore} from './uiStore';

interface BlockSyncControllerOptions {
    scriptId: string,
    repository: ScriptStateRepository,
    persistLatest?: PersistLatestFn,
    waitMs?: number,
    maxWaitMs?: number,
}

export interface ApplyScriptValueResult {
    path: BlockDiffPath,
    changeCount: number,
}

const EMPTY_INDEX: ScriptBlockIndexSnapshot = {
    blocks: [],
};

const areScenesEqual = (a: ScriptScene, b: ScriptScene): boolean => {
    return a.id === b.id
        && a.scriptId === b.scriptId
        && a.headingBlockId === b.headingBlockId
        && a.sceneNumber === b.sceneNumber
        && a.colorHex === b.colorHex
        && a.synopsis === b.synopsis
        && a.locationId === b.locationId
        && a.createdAt === b.createdAt;
};

const areActsEqual = (a: ScriptAct, b: ScriptAct): boolean => {
    return a.id === b.id
        && a.scriptId === b.scriptId
        && a.headingBlockId === b.headingBlockId
        && a.name === b.name
        && a.createdAt === b.createdAt;
};

const serializeScriptDocument = (value: ScriptDocument | null) => {
    if (!value) {
        return '';
    }

    return JSON.stringify(value);
};

export class BlockSyncController {
    readonly collections = createScriptStateCollections();

    readonly ui = createScriptStateUiStore();

    private readonly scriptId: string;

    private readonly repository: ScriptStateRepository;

    private readonly persistLatest?: PersistLatestFn;

    private readonly pacer: ScriptStatePacer;

    private currentValue: ScriptDocument | null = null;

    private currentIndex: ScriptBlockIndexSnapshot = EMPTY_INDEX;

    private previousBlocksById = new Map<string, ScriptBlock>();

    private previousScenesById = new Map<string, ScriptScene>();

    private previousActsById = new Map<string, ScriptAct>();

    private previousLocationsById = new Map<string, ScriptLocation>();

    private pendingChangesByBlockId = new Map<string, ScriptBlockChange>();

    private isDocumentDirty = false;

    private lastPersistedSerialized = '';

    private lastPersistedActiveBlockId: string | null = null;

    constructor(options: BlockSyncControllerOptions) {
        this.scriptId = options.scriptId;
        this.repository = options.repository;
        this.persistLatest = options.persistLatest;
        this.pacer = new ScriptStatePacer({
            waitMs: options.waitMs,
            maxWaitMs: options.maxWaitMs,
            onFlush: () => this.flushPending(),
        });
    }

    hydrate(value: ScriptDocument | null | undefined) {
        if (!value) {
            this.currentValue = null;
            this.currentIndex = EMPTY_INDEX;
            this.previousBlocksById.clear();
            this.previousScenesById.clear();
            this.previousActsById.clear();
            this.previousLocationsById.clear();
            this.pendingChangesByBlockId.clear();
            this.isDocumentDirty = false;
            this.lastPersistedSerialized = '';
            replaceCollectionRows(this.collections.blocks, []);
            replaceCollectionRows(this.collections.scenes, []);
            replaceCollectionRows(this.collections.acts, []);
            replaceCollectionRows(this.collections.locations, []);
            replaceCollectionRows(this.collections.blockCharacterRefs, []);

            return;
        }

        const nextRows = buildScriptStateRowsFromDocument(this.scriptId, value, {
            previousBlocksById: this.previousBlocksById,
            previousScenesById: this.previousScenesById,
            previousActsById: this.previousActsById,
            previousLocationsById: this.previousLocationsById,
        });

        this.currentValue = value;
        this.currentIndex = nextRows.indexSnapshot;
        this.previousBlocksById = new Map(nextRows.blocks.map(row => [row.id, row]));
        this.previousScenesById = new Map(nextRows.scenes.map(row => [row.id, row]));
        this.previousActsById = new Map(nextRows.acts.map(row => [row.id, row]));
        this.previousLocationsById = new Map(nextRows.locations.map(row => [row.id, row]));
        this.pendingChangesByBlockId.clear();
        this.isDocumentDirty = false;
        this.lastPersistedSerialized = serializeScriptDocument(value);

        replaceCollectionRows(this.collections.blocks, nextRows.blocks);
        replaceCollectionRows(this.collections.scenes, nextRows.scenes);
        replaceCollectionRows(this.collections.acts, nextRows.acts);
        replaceCollectionRows(this.collections.locations, nextRows.locations);
        replaceCollectionRows(this.collections.blockCharacterRefs, nextRows.blockCharacterRefs);
    }

    getCurrentValue(): ScriptDocument | null {
        return this.currentValue;
    }

    getIndexSnapshot(): ScriptBlockIndexSnapshot {
        return this.currentIndex;
    }

    getUiSnapshot(): ScriptStateUiSnapshot {
        return this.ui.store.state;
    }

    applyEditorValue(nextValue: ScriptDocument): ApplyScriptValueResult {
        if (!this.currentValue) {
            this.hydrate(nextValue);

            return {
                path: 'full',
                changeCount: this.currentIndex.blocks.length,
            };
        }

        const indexResult = buildScriptBlockIndex(nextValue);
        const diff = resolveScriptBlockDiff({
            scriptId: this.scriptId,
            previousSnapshot: this.currentIndex,
            nextSnapshot: indexResult.snapshot,
            previousBlocksById: this.previousBlocksById,
        });

        this.applyOptimisticBlockChanges(diff.changes);

        if (diff.path === 'fast') {
            diff.changes.forEach(change => {
                if (change.type === 'delete') {
                    this.previousBlocksById.delete(change.blockId);
                } else {
                    this.previousBlocksById.set(change.blockId, change.data.block);
                }
            });
        } else {
            const nextRows = buildScriptStateRowsFromDocument(this.scriptId, nextValue, {
                previousBlocksById: this.previousBlocksById,
                previousScenesById: this.previousScenesById,
                previousActsById: this.previousActsById,
                previousLocationsById: this.previousLocationsById,
                precomputedIndexSnapshot: indexResult.snapshot,
            });

            syncCollectionRows(
                this.collections.scenes,
                nextRows.scenes,
                row => row.id,
                this.previousScenesById,
                areScenesEqual,
            );
            syncCollectionRows(
                this.collections.acts,
                nextRows.acts,
                row => row.id,
                this.previousActsById,
                areActsEqual,
            );
            replaceCollectionRows(this.collections.locations, nextRows.locations);
            replaceCollectionRows(this.collections.blockCharacterRefs, nextRows.blockCharacterRefs);

            this.previousBlocksById = new Map(nextRows.blocks.map(row => [row.id, row]));
            this.previousScenesById = new Map(nextRows.scenes.map(row => [row.id, row]));
            this.previousActsById = new Map(nextRows.acts.map(row => [row.id, row]));
            this.previousLocationsById = new Map(nextRows.locations.map(row => [row.id, row]));
        }

        this.currentValue = nextValue;
        this.currentIndex = diff.nextSnapshot;
        this.isDocumentDirty = true;

        diff.changes.forEach(change => {
            this.pendingChangesByBlockId.set(change.blockId, change);
        });

        this.pacer.schedule();

        return {
            path: diff.path,
            changeCount: diff.changes.length,
        };
    }

    applyDocumentMutation(
        mutator: (value: ScriptDocument) => ScriptDocument | null,
    ): ScriptDocument | null {
        if (!this.currentValue) {
            return null;
        }

        const nextValue = mutator(this.currentValue);

        if (!nextValue) {
            return null;
        }

        this.applyEditorValue(nextValue);

        return nextValue;
    }

    setActiveBlockId(blockId: string | null) {
        this.ui.mutators.setActiveBlockId(blockId);
        this.pacer.schedule();
    }

    setSidebarTab(tab: ScriptStateSidebarTab) {
        this.ui.mutators.setSidebarTab(tab);
    }

    setScrollPosition(position: number) {
        this.ui.mutators.setScrollPosition(position);
    }

    async flushNow() {
        await this.pacer.flushNow();
    }

    dispose() {
        this.pacer.cancel();
    }

    private applyOptimisticBlockChanges(changes: ScriptBlockChange[]) {
        changes.forEach(change => {
            if (change.type === 'delete') {
                this.collections.blocks.delete(change.blockId);

                return;
            }

            const nextRow = change.data.block;

            if (this.collections.blocks.has(nextRow.id)) {
                this.collections.blocks.update(nextRow.id, draft => {
                    Object.assign(draft, nextRow);
                });

                return;
            }

            this.collections.blocks.insert(nextRow);
        });
    }

    private async flushPending() {
        const activeBlockId = this.ui.store.state.activeBlockId;
        const serializedCurrentValue = serializeScriptDocument(this.currentValue);
        const shouldPersistDocument = this.isDocumentDirty
            && Boolean(this.currentValue)
            && serializedCurrentValue !== this.lastPersistedSerialized;
        const shouldPersistActiveBlock = activeBlockId !== this.lastPersistedActiveBlockId;

        if (!shouldPersistDocument && !shouldPersistActiveBlock) {
            return;
        }

        if (shouldPersistDocument && this.currentValue) {
            try {
                if (this.persistLatest) {
                    const result = await this.persistLatest(this.currentValue);

                    if (result === false) {
                        return;
                    }
                }

                if (!this.persistLatest) {
                    await this.repository.saveLatest(this.scriptId, this.currentValue);
                }

                this.isDocumentDirty = false;
                this.pendingChangesByBlockId.clear();
                this.lastPersistedSerialized = serializedCurrentValue;
            } catch (error) {
                console.error('[script-state] Failed to flush script content', error);

                return;
            }
        }

        if (shouldPersistActiveBlock) {
            try {
                await this.repository.setActiveBlock(this.scriptId, activeBlockId);
                this.lastPersistedActiveBlockId = activeBlockId;
            } catch (error) {
                console.error('[script-state] Failed to persist active block', error);
            }
        }
    }
}
