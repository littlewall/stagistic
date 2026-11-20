import {writeFile} from 'node:fs/promises';
import path from 'node:path';

import {createMigrationId} from '../src/pglite/migrationIds.ts';

const name = process.argv[2];

if (!name) {
    throw new Error('Usage: moon run db:db-new-migration -- <snake_name>');
}

const filePath = path.resolve(process.cwd(), 'drizzle', `${createMigrationId(name)}.sql`);

// `wx` refuses to overwrite a migration created in the same second.
await writeFile(filePath, '', {flag: 'wx'});

console.info(`Created ${filePath}`);
console.info('Write the SQL, then run moon run db:db-compile-migrations.');
