import type {ScriptDocument} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import type {
    EditorBlockUiEvent,
    EditorIndexSnapshot,
    EditorSaveCallbacks,
    EditorStructureRequests,
    EditorValueChangeMeta,
    PersistentCharacterRef,
} from '../contracts';
import type {EditorSnapshotStore} from '../live/store';
import type {AutosaveSchedulePayload} from './useAutosaveController';

export interface UseEditorLifecycleArgs {
    editor: {
        instance: TiptapEditor | null,
        autoFocus?: boolean,
    },
    liveStore: EditorSnapshotStore,
    document: {
        initialValue: ScriptDocument,
        initialSerialized: string,
        /** Content comes from a bound Y.Doc: never `setContent` it. */
        isCollaborative?: boolean,
        setLatestValue: (value: ScriptDocument, revision?: number) => void,
        syncInitialValue: (value: ScriptDocument, initialSerialized: string, revision?: number) => void,
        scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    },
    save: {
        onManualSave?: EditorSaveCallbacks['onManualSave'],
        handleManualSave: () => Promise<void>,
    },
    callbacks: {
        onValueChange?: (value: ScriptDocument, meta?: EditorValueChangeMeta) => void,
        onIndexChange?: (snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void,
        onActiveBlockChange?: (blockId: string | null) => void,
        onBlockUiEvent?: (event: EditorBlockUiEvent) => void,
    },
    characters?: {
        persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
        colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
        rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>},
    },
    requests?: EditorStructureRequests,
}
