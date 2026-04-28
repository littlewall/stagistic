import type {
    ScriptAct,
    ScriptBlock,
    ScriptBlockCharacterRef,
    ScriptCharacterRef,
    ScriptLocation,
    ScriptScene,
} from '@stagistic/db';
import type {
    IndexedScriptCharacterRef,
    ScriptBlockIndexSnapshot,
    ScriptDocument,
} from '@stagistic/script';
import type {ScriptRepository} from '@stagistic/db';
import type {Collection} from '@tanstack/react-db';
import type {Store} from '@tanstack/store';

export type ScriptStateSidebarTab = 'structure' | 'characters' | 'locations';

export interface ScriptStateUiSnapshot {
    activeBlockId: string | null,
    sidebarTab: ScriptStateSidebarTab,
    scrollPosition: number,
}

export interface ScriptStateCollections {
    blocks: Collection<ScriptBlock, string>,
    scenes: Collection<ScriptScene, string>,
    acts: Collection<ScriptAct, string>,
    locations: Collection<ScriptLocation, string>,
    characters: Collection<ScriptCharacterRef, string>,
    blockCharacterRefs: Collection<ScriptBlockCharacterRef, string>,
}

export interface ScriptStateRows {
    indexSnapshot: ScriptBlockIndexSnapshot,
    blocks: ScriptBlock[],
    scenes: ScriptScene[],
    acts: ScriptAct[],
    locations: ScriptLocation[],
    blockCharacterRefs: ScriptBlockCharacterRef[],
}

export type ScriptStateRepository = Pick<ScriptRepository, 'saveLatest' | 'setActiveBlock'>;

export type PersistLatestFn = (value: ScriptDocument) => Promise<boolean | void>;

export interface ScriptBlockChangeData {
    block: ScriptBlock,
    characterRefs: IndexedScriptCharacterRef[] | null,
}

export type ScriptBlockChange =
    | {
        type: 'insert',
        blockId: string,
        data: ScriptBlockChangeData,
    }
    | {
        type: 'update',
        blockId: string,
        data: ScriptBlockChangeData,
    }
    | {
        type: 'delete',
        blockId: string,
    };

export type BlockDiffPath = 'fast' | 'medium' | 'full';

export interface BlockDiffResult {
    path: BlockDiffPath,
    changes: ScriptBlockChange[],
    nextSnapshot: ScriptBlockIndexSnapshot,
}

export interface ScriptStateUiMutators {
    setActiveBlockId: (blockId: string | null) => void,
    setSidebarTab: (tab: ScriptStateSidebarTab) => void,
    setScrollPosition: (position: number) => void,
}

export interface ScriptStateUiStore {
    store: Store<ScriptStateUiSnapshot>,
    mutators: ScriptStateUiMutators,
}
