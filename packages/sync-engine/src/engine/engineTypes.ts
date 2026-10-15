import type {ScriptDocument} from '@stagistic/script';
import type * as Y from 'yjs';

import type {CreateBroadcastSyncOptions} from '../tabs/broadcastSync';
import type {
    RecordChanges,
    RecordsSnapshot,
    RecordUpserts,
} from '../ydoc/recordsCodec';
import type {CloudSyncConfig} from './cloud/cloudSync';
import type {DocPersistence, ProjectedMark} from './persistence';
import type {ProjectionLane, ProjectionQueue} from './projectionLane';
import type {ControlChannelFactory, OpenResult} from './protocol';
import type {RecordsKind} from './scriptRecords';

export interface ProjectionStore {
    loadDocument(scriptId: string): Promise<ScriptDocument | null>,
    writeDocument(scriptId: string, document: ScriptDocument): Promise<void>,
    loadRecords(scriptId: string, kind: RecordsKind): Promise<RecordsSnapshot>,
    writeRecords(scriptId: string, kind: RecordsKind, upserts: RecordUpserts): Promise<void>,
}

export interface CreateSyncEngineArgs {
    store: ProjectionStore,
    persistence: DocPersistence,
    clientSchemaVersion: number,
    controlChannelFactory?: ControlChannelFactory,
    docChannelFactory?: CreateBroadcastSyncOptions['channelFactory'],
    projectionDelayMs?: number,
    projectionMaxDelayMs?: number,
    flushTimeoutMs?: number,
    log?: (message: string, error?: unknown) => void,
    /** Cloud sync (signed-in users); without it the engine is local only. */
    cloud?: CloudSyncConfig,
}

export const SEED_ORIGIN = 'sync-engine:seed';
export const REPLACE_ORIGIN = 'sync-engine:replace';
export const RECORDS_ORIGIN = 'sync-engine:records';
export const DEDUPE_ORIGIN = 'sync-engine:dedupe';

/** Root map of each records doc; `seeded` marks the one-time seed from the projection. */
export const SYNC_STATE_MAP = 'sync';
export const SEEDED_KEY = 'seeded';

export interface ScriptEntry {
    scriptId: string,
    body: Y.Doc,
    records: Record<RecordsKind, Y.Doc>,
    /** Last records state written to the projection. */
    projected: Record<RecordsKind, RecordsSnapshot>,
    /** Record ids that must be re-written even if unchanged (Y rejected a local value). */
    forced: Record<RecordsKind, RecordUpserts>,
    lanes: Record<'body' | RecordsKind, ProjectionLane>,
    /** Per doc: state vector the projection was last written from. */
    marks: Record<'body' | RecordsKind, ProjectedMark>,
    queue: ProjectionQueue,
    dispose: () => Promise<void>,
    /** Seeded from the projection when this entry was created. */
    seededOnOpen: boolean,
    /** Tab replicas sync on channels suffixed with it (see `OpenResult.channelId`). */
    channelId: string,
}

export interface SyncEngine {
    readonly engineId: string,
    /** Opens (and seeds once) a script; used by the control channel and tests. */
    open(scriptId: string): Promise<OpenResult>,
    flush(scriptId: string, stateVector?: Uint8Array): Promise<void>,
    applyRecords(scriptId: string, kind: RecordsKind, changes: RecordChanges): Promise<void>,
    scriptReplaced(scriptId: string): Promise<void>,
    scriptDeleted(scriptId: string): Promise<void>,
    stop(): Promise<void>,
}
