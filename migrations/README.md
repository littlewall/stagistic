# Migrations

This directory contains all database migrations for the project, organized by migration system.

## Structure

```
migrations/
├── mikro-orm/          # MikroORM migrations for application entities
│   ├── .snapshot-stagistic.json
│   └── Migration*.ts
└── better-auth/        # Better Auth migrations for authentication tables
    └── *.sql
```

## Migration Systems

### MikroORM (`mikro-orm/`)

Handles migrations for application domain entities (teams, programs, users, etc.).

**Commands:**
```bash
# Create new migration
make dev-migrate-create

# Run migrations
make dev-migrate-up

# Rollback migration
make dev-migrate-down
```

**Configuration:** `app/lib/db/mikro-orm.config.ts`

### Better Auth (`better-auth/`)

Handles migrations for authentication tables (users, sessions, accounts, verification).

**Commands:**
```bash
# Generate schema (preview)
make dev-auth-generate

# Apply migrations
make dev-auth-migrate
```

**Configuration:** `auth.config.ts`

## Important Notes

- **MikroORM migrations** are TypeScript files that are committed to the repository
- **Better Auth migrations** are SQL files that are auto-generated and applied immediately (not committed)
- Each system maintains its own migration history in the database
- Migration table names:
  - MikroORM: `mikro_orm_migrations`
  - Better Auth: Uses internal tracking

## Adding New Migrations

### For Application Entities (MikroORM)

1. Create or modify entity in `app/lib/db/entities/`
2. Generate migration: `make dev-migrate-create`
3. Review generated migration in `migrations/mikro-orm/`
4. Run migration: `make dev-migrate-up`
5. Commit the migration file

### For Auth Schema Changes (Better Auth)

1. Modify `app/lib/auth/auth.server.ts` (add/remove plugins, etc.)
2. Sync changes to `auth.config.ts`
3. Generate schema: `make dev-auth-generate`
4. Apply migration: `make dev-auth-migrate`
5. No need to commit migration files (auto-applied)

## See Also

- [Better Auth Migrations Guide](../docs/database/better-auth-migrations.md)
- [MikroORM Documentation](https://mikro-orm.io/docs/migrations)
