import {dbSchema} from '@stagistic/db/server';
import {drizzle} from 'drizzle-orm/node-postgres';
import pg from 'pg';

/*
 * Two Postgres schemas: `collab` (script registry, members, Y.Doc states, the
 * source of truth) and `projection` (packages/db tables, a read-only cache of
 * script records for queries and other apps; rebuildable from `ydoc_states`).
 */
export const COLLAB_SCHEMA = 'collab';
export const PROJECTION_SCHEMA = 'projection';

const SCHEMA_NAME = /^[a-z_][a-z0-9_]*$/;

const createSchemaPool = (connectionString: string, schema: string, max: number) => {
    if (!SCHEMA_NAME.test(schema)) {
        throw new Error(`[collab] invalid schema name ${schema}`);
    }

    return new pg.Pool({
        connectionString,
        max,
        options: `-c search_path=${schema}`,
    });
};

export interface CollabDatabase {
    collab: pg.Pool,
    projection: pg.Pool,
    projectionDb: ReturnType<typeof drizzle<typeof dbSchema>>,
    schemas: {collab: string, projection: string},
    end(): Promise<void>,
}

export const createCollabDatabase = ({
    connectionString,
    collabSchema = COLLAB_SCHEMA,
    projectionSchema = PROJECTION_SCHEMA,
    max = 5,
}: {
    connectionString: string,
    collabSchema?: string,
    projectionSchema?: string,
    max?: number,
}): CollabDatabase => {
    const collab = createSchemaPool(connectionString, collabSchema, max);
    const projection = createSchemaPool(connectionString, projectionSchema, max);

    return {
        collab,
        projection,
        projectionDb: drizzle({client: projection, schema: dbSchema}),
        schemas: {collab: collabSchema, projection: projectionSchema},
        end: async () => {
            await Promise.all([collab.end(), projection.end()]);
        },
    };
};
