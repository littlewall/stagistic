import {defineConfig} from 'drizzle-kit';

export default defineConfig({
    schema: './src/schema/index.ts',
    out: './drizzle',
    // Sequential prefixes collide across branches; see src/pglite/migrationIds.ts.
    migrations: {prefix: 'timestamp'},
    dialect: 'postgresql',
});
