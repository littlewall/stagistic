import type {Hocuspocus} from '@hocuspocus/server';
import type {AccessTokenClaims} from '@stagistic/identity';
import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {createMiddleware} from 'hono/factory';

import {getScriptRole, type ScriptRole} from './access';
import type {CollabDatabase} from './database';
import {SCRIPT_ID} from './documentName';
import {type EventBus, scriptMemberIds} from './events';

export interface ScriptListItem {
    id: string,
    title: string,
    role: ScriptRole,
    createdAt: string,
    updatedAt: string,
    deletedAt: string | null,
    /** Base64 state vectors of the stored docs (`body`, `meta`, `comments`). */
    stateVectors: Record<string, string>,
}

interface ScriptRow {
    id: string,
    title: string,
    role: ScriptRole,
    created_at: Date,
    updated_at: Date,
    deleted_at: Date | null,
    state_vectors: Record<string, string> | null,
}

const toItem = (row: ScriptRow): ScriptListItem => ({
    id: row.id,
    title: row.title,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
    stateVectors: row.state_vectors ?? {},
});

const SELECT_FOR_USER = `select s.id, s.title, m.role, s.created_at, s.updated_at, s.deleted_at,
        (select json_object_agg(split_part(y.name, '/', 3), encode(y.state_vector, 'base64'))
            from ydoc_states y where y.script_id = s.id and y.state_vector is not null) as state_vectors
    from scripts s join script_members m on m.script_id = s.id where m.user_id = $1`;

const DOC_KINDS = [
    'body',
    'meta',
    'comments',
] as const;

/**
 * Scripts REST API of the collab service (`sync.api.*`). Every response
 * carries `Date`: clients correct their clock skew with it when deciding
 * "newer" after login.
 */
export const createCollabApp = ({
    database,
    verifyAccessToken,
    appOrigins,
    hocuspocus,
    events,
}: {
    database: CollabDatabase,
    verifyAccessToken: (token: string) => Promise<AccessTokenClaims>,
    appOrigins: string[],
    hocuspocus?: Hocuspocus,
    /** Change hints (`added`/`deleted`) to the script's members. */
    events?: EventBus,
}) => {
    const notifyMembers = (scriptId: string, type: 'added' | 'deleted') => {
        void scriptMemberIds(database.collab, scriptId)
            .then(userIds => events?.publish(userIds, {type, scriptId}))
            .catch(() => {});
    };
    const app = new Hono<{Variables: {user: AccessTokenClaims}}>();

    app.use('*', async (context, next) => {
        await next();
        context.header('date', new Date().toUTCString());
    });
    app.use('*', cors({
        origin: origin => (appOrigins.includes(origin) ? origin : null),
        allowHeaders: ['authorization', 'content-type'],
        allowMethods: [
            'GET',
            'POST',
            'DELETE',
            'OPTIONS',
        ],
        exposeHeaders: ['date'],
        maxAge: 600,
    }));
    app.get('/health', context => context.json({ok: true}));

    const requireUser = createMiddleware<{Variables: {user: AccessTokenClaims}}>(async (context, next) => {
        const token = (/^Bearer (.+)$/).exec(context.req.header('authorization') ?? '')?.[1];

        try {
            context.set('user', await verifyAccessToken(token ?? ''));
        } catch {
            return context.json({error: 'unauthorized'}, 401);
        }

        await next();
    });

    app.use('/scripts', requireUser);
    app.use('/scripts/*', requireUser);

    // All scripts of the user, deleted ones included (login classification).
    app.get('/scripts', async context => {
        const {rows} = await database.collab.query<ScriptRow>(`${SELECT_FOR_USER} order by s.updated_at desc`, [context.get('user').userId]);

        return context.json({scripts: rows.map(toItem)});
    });

    // Registers a local script, or restores one the user owns.
    app.post('/scripts', async context => {
        const {userId} = context.get('user');
        const body: {id?: unknown, title?: unknown} = await context.req.json<{id?: unknown, title?: unknown}>().catch(() => ({}));
        const id = typeof body.id === 'string' ? body.id : '';
        const title = typeof body.title === 'string' ? body.title.slice(0, 500) : '';

        if (!SCRIPT_ID.test(id)) {
            return context.json({error: 'invalid_id'}, 400);
        }

        const client = await database.collab.connect();
        let status: 200 | 201 = 200;

        try {
            await client.query('begin');

            const existing = await client.query<{deleted_at: Date | null}>('select deleted_at from scripts where id = $1 for update', [id]);

            if (existing.rows.length === 0) {
                await client.query('insert into scripts (id, title, created_by) values ($1, $2, $3)', [
                    id,
                    title,
                    userId,
                ]);
                await client.query('insert into script_members (script_id, user_id, role) values ($1, $2, \'owner\')', [id, userId]);
                status = 201;
            } else {
                const member = await client.query<{role: ScriptRole}>('select role from script_members where script_id = $1 and user_id = $2', [id, userId]);
                const role = member.rows[0]?.role;

                if (!role) {
                    await client.query('rollback');

                    return context.json({error: 'forbidden'}, 403);
                }

                if (existing.rows[0].deleted_at && role === 'owner') {
                    await client.query('update scripts set deleted_at = null, updated_at = now() where id = $1', [id]);
                }
            }

            await client.query('commit');
        } catch (error) {
            await client.query('rollback');
            throw error;
        } finally {
            client.release();
        }

        // Parent row of the projected records (packages/db schema, epoch ms).
        await database.projection.query(
            'insert into scripts (id, title, created_at, updated_at) values ($1, $2, $3, $3) on conflict (id) do nothing',
            [
                id,
                title,
                Date.now(),
            ],
        );

        const {rows} = await database.collab.query<ScriptRow>(`${SELECT_FOR_USER} and s.id = $2`, [userId, id]);

        notifyMembers(id, 'added');

        return context.json(toItem(rows[0]), status);
    });

    // Soft delete (owner only); data is purged after 30 days.
    app.delete('/scripts/:id', async context => {
        const id = context.req.param('id');
        const role = await getScriptRole(database.collab, id, context.get('user').userId);

        if (role !== 'owner') {
            return context.json({error: 'forbidden'}, 403);
        }

        await database.collab.query('update scripts set deleted_at = now() where id = $1', [id]);
        notifyMembers(id, 'deleted');
        DOC_KINDS.forEach(kind => hocuspocus?.closeConnections(`script/${id}/${kind}`));

        return context.body(null, 204);
    });

    return app;
};
