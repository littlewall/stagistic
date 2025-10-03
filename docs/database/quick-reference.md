# Database Migrations - Quick Reference

## Commands

### Local Development

```bash
# Create new migration + generate schema (recommended)
yarn migrate:prepare [name]  # uses timestamp if no name provided

# Or separately:
yarn migrate:create [name]    # Create MikroORM migration
yarn migrate:generate         # Generate Better Auth schema

# Apply all migrations
yarn migrate:apply
```

**Note:** `migrate:prepare` without a name uses a timestamp (e.g., `20251003123456`) and requires at least one entity to be defined in `app/lib/db/entities/`.

### Docker Development

```bash
# Create new migration
make dev-migrate-create

# Generate Better Auth schema
make dev-migrate-gen

# Apply all migrations
make dev-migrate
```

### Production

```bash
# Apply all migrations
make prod-migrate
```

## Common Tasks

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
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Run all migrations
make dev-migrate
```

## Features

- ✅ **Auto-loads .env.local** - No separate "local" commands
- ✅ **Unified interface** - One script for both systems
- ✅ **Clear output** - Color-coded, easy to read
- ✅ **Simple** - Just 3 commands

## Files

```
scripts/
└── migrate.sh          # Unified migration script

migrations/
├── mikro-orm/          # MikroORM migrations (committed)
└── better-auth/        # Better Auth schema (auto-generated)
```

## Need Help?

```bash
./scripts/migrate.sh
```

Or check full documentation:
- [Migrations Overview](../migrations/README.md)
- [Unified Migrations](./database/unified-migrations.md)
