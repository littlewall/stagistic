# MikroORM Migrations

This directory contains MikroORM migration files for application domain entities.

## About

- Migration files are **TypeScript** classes
- Files are **committed** to the repository
- Each migration represents a change to the database schema
- Migrations can be rolled back

## File Naming

Migration files follow the pattern:
```
Migration[TIMESTAMP].ts
```

Example: `Migration20250521101138.ts`

## Snapshot File

The `.snapshot-stagistic.json` file contains the current state of the database schema and is used by MikroORM to generate new migrations.

## Commands

### Create New Migration
```bash
make dev-migrate-create
```

This will:
1. Compare current entities with the snapshot
2. Generate a new migration file
3. Update the snapshot file

### Run Migrations
```bash
make dev-migrate-up
```

Applies all pending migrations to the database.

### Rollback Migration
```bash
make dev-migrate-down
```

Rolls back the last applied migration.

## Workflow

1. Create or modify an entity in `app/lib/db/entities/`
2. Generate migration: `make dev-migrate-create`
3. Review the generated migration file
4. Test the migration: `make dev-migrate-up`
5. Commit both the migration file and updated snapshot

## See Also

- [Migrations Overview](../../docs/database/migrations-overview.md)
- [MikroORM Migrations Documentation](https://mikro-orm.io/docs/migrations)
