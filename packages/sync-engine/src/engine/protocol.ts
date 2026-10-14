import type {RecordChanges} from '../ydoc/recordsCodec';
import type {CloudStatus, ConflictResolution} from './cloud/types';
import type {RecordsKind} from './scriptRecords';

/*
 * Control protocol between tabs (clients) and the leader's engine, over one
 * BroadcastChannel. Document content never travels here: it uses the
 * per-document channels from `tabs/broadcastSync`.
 */

export const ENGINE_CHANNEL_NAME = 'stagistic-sync-engine';

export const bodyDocName = (scriptId: string) => `script/${scriptId}/body`;
export const metaDocName = (scriptId: string) => `script/${scriptId}/meta`;
export const commentsDocName = (scriptId: string) => `script/${scriptId}/comments`;

export type EngineRequest =
    | {
        type: 'open',
        requestId: string,
        scriptId: string,
        /** false: the tab already holds this replica (no new tab reference). */
        retain?: boolean,
    }
    /** Waits until the engine has the body `stateVector` (if given), then writes the projection. */
    | {
        type: 'flush',
        requestId: string,
        scriptId: string,
        stateVector?: Uint8Array,
    }
    /** A repository mutation changed records in the projection; mirror it into the Y.Doc. */
    | {
        type: 'apply-records',
        requestId: string,
        scriptId: string,
        kind: RecordsKind,
        changes: RecordChanges,
    }
    /** The projection was rewritten outside the engine (package restore). */
    | {
        type: 'script-replaced',
        requestId: string,
        scriptId: string,
    }
    | {
        type: 'script-deleted',
        requestId: string,
        scriptId: string,
    }
    /** The tab no longer shows the script (engine may detach and unload it). */
    | {
        type: 'release',
        requestId: string,
        scriptId: string,
    }
    | {
        type: 'cloud',
        requestId: string,
        action: CloudAction,
    }
    /** Fetch an attachment blob this device lacks; replies with a boolean. */
    | {
        type: 'attachment-download',
        requestId: string,
        storageKey: string,
    }
    | {
        type: 'cloud-apply',
        requestId: string,
        resolutions: Record<string, ConflictResolution>,
    };

/**
 * - `status`: current `CloudStatus`
 * - `signed-in` / `signed-out`: the tab changed the session (auth client)
 * - `check`: post-sign-in classification, returns `CloudCheckReport`
 * - `wake`: catch-up pass (a tab became visible again)
 */
export type CloudAction = 'status' | 'signed-in' | 'signed-out' | 'check' | 'wake';

export interface OpenResult {
    schemaVersion: number | null,
    /**
     * Identifies the engine's in-memory docs of the script; tab replicas sync on
     * `docChannelName(name, channelId)`. A new id after a reset isolates stale
     * replicas (they must never merge an old history into the new docs).
     */
    channelId: string,
}

export const docChannelName = (documentName: string, channelId: string) => `${documentName}#${channelId}`;

export type EngineMessage =
    | EngineRequest
    | {
        type: 'reply',
        requestId: string,
        ok: true,
        result?: unknown,
    }
    | {
        type: 'reply',
        requestId: string,
        ok: false,
        error: string,
    }
    /** A (new) leader started: clients re-open their scripts. */
    | {type: 'engine-started', engineId: string}
    | {type: 'cloud-status', status: CloudStatus}
    /** Local Y state of these scripts was replaced (conflict resolution): tabs reload them. */
    | {type: 'scripts-reset', scriptIds: string[]};

export interface ControlChannel {
    postMessage(message: EngineMessage): void,
    addEventListener(type: 'message', listener: (event: {data: unknown}) => void): void,
    removeEventListener(type: 'message', listener: (event: {data: unknown}) => void): void,
    close(): void,
}

export type ControlChannelFactory = () => ControlChannel;

export const createControlChannel: ControlChannelFactory = () => new BroadcastChannel(ENGINE_CHANNEL_NAME);

export const isEngineMessage = (value: unknown): value is EngineMessage => {
    return typeof value === 'object' && value !== null && typeof (value as {type?: unknown}).type === 'string';
};
