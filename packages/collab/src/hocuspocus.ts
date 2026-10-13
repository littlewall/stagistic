import {Database} from '@hocuspocus/extension-database';
import {Hocuspocus} from '@hocuspocus/server';
import {syncScriptRecords} from '@stagistic/db/server';
import type {AccessTokenClaims} from '@stagistic/identity';
import {
    readRecords,
    RECORD_COLLECTIONS,
    SCRIPT_RECORD_ID,
} from '@stagistic/sync-engine';
import * as Y from 'yjs';

import {
    canWrite,
    getScriptRole,
    type ScriptRole,
} from './access';
import type {CollabDatabase} from './database';
import {parseDocumentName, parseEventsDocumentName} from './documentName';
import {
    createChangeCoalescer,
    createLocalEventBus,
    type EventBus,
    type LocalEventBus,
    scriptMemberIds,
} from './events';

export interface CollabContext {
    userId: string,
    role: ScriptRole,
}

interface CreateCollabHocuspocusArgs {
    database: CollabDatabase,
    verifyAccessToken: (token: string) => Promise<AccessTokenClaims>,
    /** Store debounce (ms); full state is written at most this often while edits continue. */
    debounceMs?: number,
    /** Change hints to members; in process by default. */
    events?: EventBus | LocalEventBus,
    /** Minimum gap between `changed` hints of one script doc. */
    hintIntervalMs?: number,
    log?: (message: string, error?: unknown) => void,
}

/*
 * Hocuspocus for script Y.Docs. Each connection is authenticated with the auth
 * service's JWT and the user's role in the script (viewers and commenters get
 * read-only docs). Abuse limits apply per WebSocket (`createUpgradeLimiter`), not
 * per doc: one socket carries all docs of a client. A stored doc bumps `scripts.updated_at`; meta and comments
 * are also projected into the `projection` schema.
 */
export const createCollabHocuspocus = ({
    database,
    verifyAccessToken,
    debounceMs = 2_000,
    events = createLocalEventBus(),
    hintIntervalMs = 5_000,
    log = (message, error) => console.error(`[collab] ${message}`, error),
}: CreateCollabHocuspocusArgs) => {
    const changes = createChangeCoalescer({
        intervalMs: hintIntervalMs,
        publish: event => {
            void scriptMemberIds(database.collab, event.scriptId)
                .then(userIds => events.publish(userIds, event))
                .catch(error => log(`change hint failed for ${event.scriptId}`, error));
        },
    });
    const project = async (scriptId: string, kind: 'meta' | 'comments', document: Y.Doc) => {
        const snapshot = readRecords(document, RECORD_COLLECTIONS[kind]);

        await database.projectionDb.transaction(tx => syncScriptRecords(tx, scriptId, kind, snapshot));

        const title = snapshot.script?.[SCRIPT_RECORD_ID]?.title;

        if (kind === 'meta' && typeof title === 'string') {
            await database.collab.query('update scripts set title = $2 where id = $1 and title <> $2', [scriptId, title]);
        }
    };

    const hocuspocus = new Hocuspocus({
        name: 'stagistic-collab',
        debounce: debounceMs,
        maxDebounce: debounceMs * 5,
        unloadImmediately: true,
        quiet: true,
        extensions: [
            new Database({
                fetch: async ({documentName}) => {
                    const {rows} = await database.collab.query<{state: Buffer}>('select state from ydoc_states where name = $1', [documentName]);

                    return rows[0] ? new Uint8Array(rows[0].state) : null;
                },
                store: async ({documentName, state}) => {
                    const parsed = parseDocumentName(documentName);

                    if (!parsed) {
                        return;
                    }

                    await database.collab.query(
                        `insert into ydoc_states (name, script_id, state, state_vector, updated_at) values ($1, $2, $3, $4, now())
                         on conflict (name) do update set state = excluded.state, state_vector = excluded.state_vector, updated_at = now()`,
                        [
                            documentName,
                            parsed.scriptId,
                            state,
                            Y.encodeStateVectorFromUpdate(state),
                        ],
                    );
                    await database.collab.query('update scripts set updated_at = now() where id = $1', [parsed.scriptId]);
                },
            }),
        ],
        onAuthenticate: async ({
            token,
            documentName,
            connectionConfig,
        }): Promise<CollabContext> => {
            const eventsOwner = parseEventsDocumentName(documentName);

            if (eventsOwner) {
                const {userId} = await verifyAccessToken(token);

                if (userId !== eventsOwner) {
                    throw new Error('forbidden');
                }

                connectionConfig.readOnly = true;

                return {userId, role: 'viewer'};
            }

            const parsed = parseDocumentName(documentName);

            if (!parsed) {
                throw new Error('unknown document');
            }

            const {userId} = await verifyAccessToken(token);
            const role = await getScriptRole(database.collab, parsed.scriptId, userId);

            if (!role) {
                throw new Error('forbidden');
            }

            connectionConfig.readOnly = !canWrite(role, parsed.kind);

            return {userId, role};
        },
        afterStoreDocument: async ({documentName, document}) => {
            const parsed = parseDocumentName(documentName);

            if (parsed) {
                changes.push({
                    type: 'changed',
                    scriptId: parsed.scriptId,
                    kind: parsed.kind,
                    stateVector: Buffer.from(Y.encodeStateVector(document)).toString('base64'),
                });
            }

            if (parsed && parsed.kind !== 'body') {
                await project(parsed.scriptId, parsed.kind, document).catch(error => log(`projection failed for ${documentName}`, error));
            }
        },
    });

    if ('bind' in events) {
        events.bind(hocuspocus);
    }

    return hocuspocus;
};
