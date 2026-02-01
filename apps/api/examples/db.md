# API Drizzle wiring example (placeholder)

This is a **sketch** for how the API can reuse the shared `packages/db` schema + queries with Postgres.

```ts
import {dbQueries, dbSchema} from '@stagistic/db';
import {drizzle} from 'drizzle-orm/node-postgres';
import {Pool} from 'pg';

export const createDb = () => {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    return drizzle(pool, {schema: dbSchema});
};

export const listScriptsExample = async () => {
    const db = createDb();

    return dbQueries.listScripts(db);
};
```
