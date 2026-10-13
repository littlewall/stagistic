import {PROJECTION_MIGRATIONS} from '@stagistic/db/server';
import {runSqlMigrations, type SqlMigration} from '@stagistic/identity';

import type {CollabDatabase} from './database';

const COLLAB_0001 = `
create table scripts (
    id text primary key,
    title text not null default '',
    created_by text not null,
    created_at timestamptz not null default now(),
    -- Bumped when any of the script's Y.Docs is stored (login classification).
    updated_at timestamptz not null default now(),
    -- Soft delete; purged with all data after 30 days.
    deleted_at timestamptz
);

create table script_members (
    script_id text not null references scripts (id) on delete cascade,
    user_id text not null,
    role text not null check (role in ('owner', 'editor', 'commenter', 'viewer')),
    created_at timestamptz not null default now(),
    primary key (script_id, user_id)
);

create index script_members_user_id_idx on script_members (user_id);

create table ydoc_states (
    name text primary key,
    script_id text not null references scripts (id) on delete cascade,
    state bytea not null,
    updated_at timestamptz not null default now()
);

create index ydoc_states_script_id_idx on ydoc_states (script_id);

create index scripts_deleted_at_idx on scripts (deleted_at) where deleted_at is not null;
`;

// Lets clients tell "changed in the cloud" exactly, without comparing clocks.
const COLLAB_0002 = `
alter table ydoc_states add column state_vector bytea;
`;

const COLLAB_MIGRATIONS: readonly SqlMigration[] = [{id: '0001_collab', sql: COLLAB_0001}, {id: '0002_state_vector', sql: COLLAB_0002}];

/** Creates both schemas and applies collab + projection (packages/db) migrations. */
export const runCollabMigrations = async (database: CollabDatabase) => {
    await database.collab.query(`CREATE SCHEMA IF NOT EXISTS "${database.schemas.collab}"`);
    await database.projection.query(`CREATE SCHEMA IF NOT EXISTS "${database.schemas.projection}"`);

    const collab = await runSqlMigrations(database.collab, 'collab_migrations', COLLAB_MIGRATIONS);
    const projection = await runSqlMigrations(
        database.projection,
        'projection_migrations',
        // Generated for PGlite's `public` schema; retarget the qualified names.
        PROJECTION_MIGRATIONS.map(migration => ({id: migration.id, sql: migration.sql.replaceAll('"public".', `"${database.schemas.projection}".`)})),
    );

    return [...collab, ...projection];
};
