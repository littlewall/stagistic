import postgres from 'postgres';
import * as Y from 'yjs';

export const createDb = (url: string, poolSize: number) => {
    const sql = postgres(url, {
        max: poolSize,
        idle_timeout: 30,
        onnotice: () => {},
    });

    return {
        sql,
        async migrate() {
            await sql`
                create table if not exists ydoc_states (
                    name text primary key,
                    state bytea not null,
                    updated_at timestamptz not null default now()
                )`;
            await sql`
                create table if not exists ydoc_updates (
                    id bigserial primary key,
                    name text not null,
                    update bytea not null,
                    created_at timestamptz not null default now()
                )`;
            await sql`create index if not exists ydoc_updates_name_idx on ydoc_updates (name, id)`;
        },
        async loadState(name: string) {
            const [row] = await sql<{state: Uint8Array}[]>`select state from ydoc_states where name = ${name}`;

            return row ? new Uint8Array(row.state) : null;
        },
        async storeState(name: string, state: Uint8Array) {
            await sql`
                insert into ydoc_states (name, state, updated_at) values (${name}, ${state}, now())
                on conflict (name) do update set state = excluded.state, updated_at = now()`;
        },
        async appendUpdate(name: string, update: Uint8Array) {
            await sql`insert into ydoc_updates (name, update) values (${name}, ${update})`;
        },
        async loadMerged(name: string) {
            const [base] = await sql<{state: Uint8Array}[]>`select state from ydoc_states where name = ${name}`;
            const rows = await sql<{update: Uint8Array}[]>`select update from ydoc_updates where name = ${name} order by id`;
            const updates = [...base ? [new Uint8Array(base.state)] : [], ...rows.map(row => new Uint8Array(row.update))];

            return updates.length > 0 ? Y.mergeUpdates(updates) : null;
        },
        /** Folds the update log into the snapshot row. */
        async compact(name: string, state: Uint8Array) {
            await sql.begin(async tx => {
                const [last] = await tx<{id: string}[]>`select max(id)::text as id from ydoc_updates where name = ${name}`;

                await tx`
                    insert into ydoc_states (name, state, updated_at) values (${name}, ${state}, now())
                    on conflict (name) do update set state = excluded.state, updated_at = now()`;

                if (last?.id) {
                    await tx`delete from ydoc_updates where name = ${name} and id <= ${last.id}`;
                }
            });
        },
        async stats() {
            const [row] = await sql<{
                active: number,
                max: number,
                states: number,
                statesBytes: number,
                updates: number,
            }[]>`
                select
                    (select count(*)::int from pg_stat_activity where datname = current_database()) as active,
                    current_setting('max_connections')::int as max,
                    (select count(*)::int from ydoc_states) as states,
                    (select coalesce(sum(octet_length(state)), 0)::int from ydoc_states) as "statesBytes",
                    (select count(*)::int from ydoc_updates) as updates`;

            return row;
        },
        async truncate() {
            await sql`truncate ydoc_states, ydoc_updates`;
        },
    };
};
