/*
 * Migration ids are `<prefix>_<snake_name>`. Ids sort lexicographically, which
 * is also the apply order. Sequential `NNNN_` prefixes collided whenever two
 * branches added a migration, so they are frozen at 0026; every new migration
 * uses a UTC `YYYYMMDDHHMMSS_` prefix (drizzle-kit `prefix: 'timestamp'`).
 * Timestamp ids always sort after the legacy ones.
 */
export const LAST_SEQUENTIAL_MIGRATION = 26;

const SEQUENTIAL_ID = /^(?<prefix>\d{4})_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const TIMESTAMP_ID = /^(?<prefix>\d{14})_[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const MIGRATION_NAME = /^[a-z0-9]+(?:_[a-z0-9]+)*$/u;

export const NEW_MIGRATION_HINT = 'Create new migrations with `moon run db:db-new-migration -- <snake_name>`.';

/** Formats `date` as the UTC `YYYYMMDDHHMMSS` prefix drizzle-kit uses. */
export const formatMigrationTimestamp = (date: Date) => date.toISOString().replaceAll(/\D/gu, '').slice(0, 14);

const isValidTimestamp = (prefix: string) => {
    const iso = `${prefix.slice(0, 4)}-${prefix.slice(4, 6)}-${prefix.slice(6, 8)}`
        + `T${prefix.slice(8, 10)}:${prefix.slice(10, 12)}:${prefix.slice(12, 14)}Z`;
    const date = new Date(iso);

    return !Number.isNaN(date.getTime()) && formatMigrationTimestamp(date) === prefix;
};

const getMigrationPrefix = (id: string) => {
    const timestampPrefix = TIMESTAMP_ID.exec(id)?.groups?.prefix;

    if (timestampPrefix) {
        if (!isValidTimestamp(timestampPrefix)) {
            throw new Error(`Migration ${id} has an invalid UTC timestamp prefix. ${NEW_MIGRATION_HINT}`);
        }

        return timestampPrefix;
    }

    const sequentialPrefix = SEQUENTIAL_ID.exec(id)?.groups?.prefix;

    if (!sequentialPrefix) {
        throw new Error(
            `Migration ${id} must be named <YYYYMMDDHHMMSS>_<snake_name>.sql. ${NEW_MIGRATION_HINT}`,
        );
    }

    if (Number(sequentialPrefix) > LAST_SEQUENTIAL_MIGRATION) {
        throw new Error(
            `Migration ${id} uses a sequential prefix; those are frozen at `
            + `${String(LAST_SEQUENTIAL_MIGRATION).padStart(4, '0')}. Use a UTC timestamp prefix. ${NEW_MIGRATION_HINT}`,
        );
    }

    return sequentialPrefix;
};

/** Throws when an id breaks the naming rules or two ids share a prefix. */
export const assertMigrationIds = (ids: readonly string[]) => {
    const idsByPrefix = new Map<string, string>();

    for (const id of ids) {
        const prefix = getMigrationPrefix(id);
        const existingId = idsByPrefix.get(prefix);

        if (existingId) {
            throw new Error(
                `Migrations ${existingId} and ${id} share the prefix ${prefix}. Rename the newer one. ${NEW_MIGRATION_HINT}`,
            );
        }

        idsByPrefix.set(prefix, id);
    }
};

export const createMigrationId = (name: string, date = new Date()) => {
    if (!MIGRATION_NAME.test(name)) {
        throw new Error(`Migration name "${name}" must be snake_case (a-z, 0-9, _).`);
    }

    return `${formatMigrationTimestamp(date)}_${name}`;
};
