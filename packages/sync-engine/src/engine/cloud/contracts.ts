import type * as Y from 'yjs';

import type {AccessTokenSource} from './accessToken';
import type {CloudApi} from './cloudApi';
import type {CloudSocket} from './docConnection';
import type {
    CloudAccount,
    CloudCheckReport,
    CloudScript,
    CloudStatus,
    CloudSyncStore,
    ConflictResolution,
    DocKind,
} from './types';

/* Contracts between the cloud sync parts and the engine (see cloudSync.ts). */

export interface CloudEngineHost {
    getDocs(scriptId: string, options: {seed: boolean}): Promise<Record<DocKind, Y.Doc>>,
    /** Writes the projection of the script now. */
    flush(scriptId: string): Promise<void>,
    /** Drops the docs from memory when no tab shows them (local state kept). */
    unload(scriptId: string): Promise<void>,
    /** Discards the local Y state; the next `getDocs` starts empty. */
    resetScript(scriptId: string): Promise<void>,
    /** Deletes the script on this device (Y state and projection). */
    deleteLocal(scriptId: string): Promise<void>,
    isOpenInTab(scriptId: string): boolean,
    openScripts(): string[],
    publishStatus(status: CloudStatus): void,
    notifyReset(scriptIds: string[]): void,
}

export interface CloudSyncConfig {
    authUrl: string,
    syncUrl: string,
    wsUrl: string,
    store: CloudSyncStore,
    WebSocketPolyfill?: unknown,
    fetch?: typeof fetch,
    /** Minimum gap between pulls of one script on change hints. */
    pullIntervalMs?: number,
}

export interface CloudSync {
    start(): Promise<void>,
    signedIn(): Promise<void>,
    signedOut(): Promise<void>,
    status(): CloudStatus,
    check(): Promise<CloudCheckReport>,
    apply(resolutions: Record<string, ConflictResolution>): Promise<void>,
    /** One catch-up pass (going online, tab visible again); hints may have been missed. */
    wake(): void,
    /** Engine hooks. */
    tabOpened(scriptId: string): void,
    tabReleased(scriptId: string): void,
    localChange(scriptId: string): void,
    scriptDeleted(scriptId: string): Promise<void>,
    stop(): Promise<void>,
}

export interface CloudContext {
    store: CloudSyncStore,
    api: CloudApi,
    socket: CloudSocket,
    tokens: AccessTokenSource,
    host: CloudEngineHost,
    account: () => CloudAccount | null,
    syncScript: (scriptId: string, options: {seed: boolean}) => Promise<void>,
    download: (script: CloudScript) => Promise<void>,
    upload: (scriptId: string, title: string) => Promise<void>,
    goLive: () => Promise<void>,
    setStatus: (patch: Partial<CloudStatus>) => void,
}
