import type {Hocuspocus} from '@hocuspocus/server';
import type pg from 'pg';

import type {DocumentKind} from './documentName';
import {eventsDocumentName} from './documentName';

/*
 * Change hints for clients: only *what* changed, never the change itself. A
 * client compares the hint with its last sync and pulls through Hocuspocus if
 * needed. Lost hints are fine: clients catch up on start, sign-in, reconnect,
 * going online and when a tab becomes visible.
 *
 * Delivery goes through an `EventBus`: in process now (one collab instance),
 * Redis pub/sub once collab scales out. Not Postgres NOTIFY (one global queue
 * locked at commit, 8 kB, lossy) and not the WAL (replication slots) — hints
 * originate in the app, not in table changes.
 */

export type CloudEvent =
    | {
        type: 'changed',
        scriptId: string,
        kind: DocumentKind,
        stateVector: string,
    }
    | {type: 'added', scriptId: string}
    | {type: 'deleted', scriptId: string};

export interface EventBus {
    publish(userIds: readonly string[], event: CloudEvent): void,
}

export interface LocalEventBus extends EventBus {
    /** Delivers to the users' `user/{id}/events` connections on this instance. */
    bind(hocuspocus: Hocuspocus): void,
}

export const createLocalEventBus = (): LocalEventBus => {
    let instance: Hocuspocus | null = null;

    return {
        bind: hocuspocus => {
            instance = hocuspocus;
        },
        publish: (userIds, event) => {
            const payload = JSON.stringify(event);

            for (const userId of new Set(userIds)) {
                instance?.documents.get(eventsDocumentName(userId))?.broadcastStateless(payload);
            }
        },
    };
};

/**
 * At most one `changed` hint per script doc per `intervalMs`: the first goes
 * out at once, later ones collapse into one trailing hint with the latest
 * state vector (someone typing continuously stores every few seconds).
 */
export const createChangeCoalescer = ({publish, intervalMs = 5_000}: {publish: (event: CloudEvent & {type: 'changed'}) => void, intervalMs?: number}) => {
    const windows = new Map<string, {pending: (CloudEvent & {type: 'changed'}) | null, timer: ReturnType<typeof setTimeout>}>();

    const open = (key: string) => {
        const window = {
            pending: null as (CloudEvent & {type: 'changed'}) | null,
            timer: setTimeout(() => {
                const pending = windows.get(key)?.pending;

                windows.delete(key);

                if (pending) {
                    publish(pending);
                    open(key);
                }
            }, intervalMs),
        };

        // Hints are best effort: never keep the process alive for one.
        (window.timer as {unref?: () => void}).unref?.();

        windows.set(key, window);
    };

    return {
        push: (event: CloudEvent & {type: 'changed'}) => {
            const key = `${event.scriptId}/${event.kind}`;
            const window = windows.get(key);

            if (window) {
                window.pending = event;

                return;
            }

            publish(event);
            open(key);
        },
        stop: () => {
            windows.forEach(window => clearTimeout(window.timer));
            windows.clear();
        },
    };
};

export const scriptMemberIds = async (pool: pg.Pool, scriptId: string) => {
    const {rows} = await pool.query<{user_id: string}>('select user_id from script_members where script_id = $1', [scriptId]);

    return rows.map(row => row.user_id);
};
