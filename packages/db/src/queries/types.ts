import type {PgDatabase, PgQueryResultHKT} from 'drizzle-orm/pg-core';

import type {dbSchema} from '../schema';

export type DbClient<TQueryResult extends PgQueryResultHKT = PgQueryResultHKT> = PgDatabase<
    TQueryResult,
    typeof dbSchema
>;
