# Database Migrations

This document covers both MikroORM and Better Auth migration systems used in the Stagistic project.

## Migration Systems Overview

The project uses **two separate migration systems**:

1. **MikroORM** - Application domain entities (teams, programs, users, etc.)
2. **Better Auth** - Authentication tables (users, sessions, accounts, verification)

Both systems maintain their own migration history and table naming.

## Directory Structure

```
migrations/
├── README.md              # Migration guide
├── mikro-orm/            # MikroORM migrations (committed)
│   ├── .snapshot-stagistic.json
│   └── Migration*.ts
└── better-auth/          # Better Auth migrations (auto-applied, not committed)
    └── *.sql
```

## Unified Commands (Recommended)

Use these commands for the most common tasks:

```bash
# Create new migration + generate auth schema
yarn migrate:prepare [name]  # uses timestamp if no name provided

# Apply all migrations (MikroORM + Better Auth)
yarn migrate:apply
```

**Note:** `migrate:prepare` without a name uses a timestamp (e.g., `20251003123456`) and requires at least one entity to be defined.

## Individual System Commands

### MikroORM (Application Entities)

```bash
# Create migration
yarn migrate:create [name]

# Docker commands
make dev-migrate-create
make dev-migrate-up
make dev-migrate-down
```

### Better Auth (Authentication Tables)

```bash
# Generate schema
yarn migrate:generate

# Docker commands
make dev-auth-generate
make dev-auth-migrate
```

## Configuration Files

### MikroORM
- **Config**: `app/lib/db/mikro-orm.config.ts`
- **Entities**: `app/lib/db/entities/`
- **Migration path**: `./migrations/mikro-orm`
- **Table**: `mikro_orm_migrations`

### Better Auth
- **CLI Config**: `auth.config.ts` (standalone, no path aliases)
- **App Config**: `app/lib/auth/config.ts` (shared configuration)
- **Migration path**: `./migrations/better-auth`

## Workflow Examples

### Add New Entity

1. Create entity in `app/lib/db/entities/`
2. `yarn migrate:create add_entity_name`
3. Review migration in `migrations/mikro-orm/`
4. `yarn migrate:apply`
5. Commit migration file

### Add Auth Plugin

1. Edit `app/lib/auth/config.ts`
2. `yarn migrate:generate`
3. Review `migrations/better-auth/schema.sql`
4. `yarn migrate:apply`

### Fresh Database Setup

```bash
# Drop database
make dev-db
# In psql: DROP SCHEMA public CASCADE; CREATE SCHEMA public;

# Run all migrations
make dev-migrate
```

## Key Differences

| Feature | MikroORM | Better Auth |
|---------|----------|-------------|
| **Purpose** | Application entities | Authentication tables |
| **Files** | TypeScript (.ts) | SQL (.sql) |
| **Committed** | ✅ Yes | ❌ No (auto-applied) |
| **Rollback** | Supported | Not typically used |

## Production Deployment

Both migration systems run automatically on container startup:

```yaml
command: sh -c "yarn migrate:apply && node server.js"
```

## Troubleshooting

### MikroORM Errors
- Requires at least one entity in `app/lib/db/entities/`
- Check entity imports in `entities.ts`

### Better Auth Errors
- Ensure `auth.config.ts` and `app/lib/auth/config.ts` are in sync
- Check database connection and environment variables

### Connection Issues
- **Local**: PostgreSQL running on `localhost:5432`, `.env.local` configured
- **Docker**: Use `postgres` as host, check `docker-compose.dev.yml`

## Shared Configuration Pattern

Better Auth uses shared configuration to avoid duplication:

```typescript
// app/lib/auth/config.ts - Shared config function
export function createAuthConfig(options) {
  return {
    database: options.database,
    plugins: [magicLink({...}), emailOTP({...})],
  };
}

// Used by both app and CLI with different options
```

## See Also

- [Project Structure](../PROJECT_STRUCTURE.md)
- [Migrations Directory](../../migrations/README.md)
