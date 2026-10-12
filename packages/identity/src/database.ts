import pg from 'pg';

/** Postgres schema holding the identity tables (kept apart from script data). */
export const IDENTITY_SCHEMA = 'identity';

const SCHEMA_NAME = /^[a-z_][a-z0-9_]*$/;

/** Pool whose connections resolve unqualified tables in `schema`. */
export const createIdentityPool = ({
    connectionString,
    schema = IDENTITY_SCHEMA,
    max = 5,
}: {
    connectionString: string,
    schema?: string,
    max?: number,
}) => {
    if (!SCHEMA_NAME.test(schema)) {
        throw new Error(`[identity] invalid schema name ${schema}`);
    }

    return new pg.Pool({
        connectionString,
        max,
        options: `-c search_path=${schema}`,
    });
};
