
import {fromBase64} from '../../ydoc/base64';
import {stateVectorCovers} from '../stateVectorCovers';
import type {CloudContext} from './contracts';
import type {CloudSyncStore, DocKind} from './types';

/*
 * Change hints from the collab service (`user/{id}/events`). A hint names what
 * changed, never the change: the engine pulls through Hocuspocus only when its
 * last sync does not already cover the hinted state vector.
 * - `changed`: pull that script (at most once per `pullIntervalMs`; scripts
 *   open in a tab are live anyway)
 * - `added` / `deleted`: one library pass (download, deletion rules)
 */

type CloudEvent =
    | {
        type: 'changed',
        scriptId: string,
        kind: DocKind,
        stateVector: string,
    }
    | {type: 'added', scriptId: string}
    | {type: 'deleted', scriptId: string};

const parse = (payload: string): CloudEvent | null => {
    try {
        const event = JSON.parse(payload) as Partial<CloudEvent>;

        return typeof event.scriptId === 'string' && (event.type === 'changed' || event.type === 'added' || event.type === 'deleted')
            ? event as CloudEvent
            : null;
    } catch {
        return null;
    }
};

export const eventsDocumentName = (accountId: string) => `user/${accountId}/events`;

export const createCloudEvents = ({
    store,
    isAttached,
    syncScript,
    libraryPass,
    onError,
    pullIntervalMs = 5_000,
}: {
    store: CloudSyncStore,
    isAttached: (scriptId: string) => boolean,
    syncScript: CloudContext['syncScript'],
    /** Debounced full library pass. */
    libraryPass: () => void,
    onError: (error: unknown) => void,
    pullIntervalMs?: number,
}) => {
    const lastPull = new Map<string, number>();
    const scheduled = new Map<string, ReturnType<typeof setTimeout>>();

    const pull = (scriptId: string) => {
        if (scheduled.has(scriptId)) {
            return;
        }

        const wait = Math.max(0, (lastPull.get(scriptId) ?? 0) + pullIntervalMs - Date.now());

        scheduled.set(scriptId, setTimeout(() => {
            scheduled.delete(scriptId);
            lastPull.set(scriptId, Date.now());
            void syncScript(scriptId, {seed: true}).catch(onError);
        }, wait));
    };

    const changed = async (event: CloudEvent & {type: 'changed'}) => {
        if (isAttached(event.scriptId)) {
            return;
        }

        const state = (await store.listSyncStates()).find(item => item.scriptId === event.scriptId);

        if (!state) {
            // Not known here yet (e.g. shared with this account): the library pass downloads it.
            libraryPass();

            return;
        }

        const synced = state.stateVectors[event.kind];

        if (!synced || !stateVectorCovers(fromBase64(synced), fromBase64(event.stateVector))) {
            pull(event.scriptId);
        }
    };

    return {
        handle: (payload: string) => {
            const event = parse(payload);

            if (!event) {
                return;
            }

            if (event.type === 'changed') {
                void changed(event).catch(onError);
            } else {
                libraryPass();
            }
        },
        stop: () => {
            scheduled.forEach(timer => clearTimeout(timer));
            scheduled.clear();
        },
    };
};
