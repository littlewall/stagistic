# Database Migrations - Complete Overview

This document provides a complete overview of the migration systems setup in the Stagistic project.

## Migration Systems

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

## MikroORM Setup

### Configuration
- **Config file**: `app/lib/db/mikro-orm.config.ts`
- **Migration path**: `./migrations/mikro-orm`
- **Migration table**: `mikro_orm_migrations`

### Commands
```bash
# Create new migration
make dev-migrate-create

# Run migrations
make dev-migrate-up

# Rollback migration
make dev-migrate-down
```

### Workflow
1. Create/modify entity in `app/lib/db/entities/`
2. Generate migration: `make dev-migrate-create`
3. Review TypeScript migration file
4. Run migration: `make dev-migrate-up`
5. **Commit the migration file** to repository

## Better Auth Setup

### 1. Created `auth.config.ts`
- Standalone configuration file for Better Auth CLI
- Loads environment variables directly with `dotenv`
- No TypeScript path aliases (avoids import errors)
- Same plugin configuration as `app/lib/auth/auth.server.ts`

### 2. Updated `package.json`
Added new scripts:
- `auth:generate` - Generate Better Auth schema (with auto-confirm)
- `auth:migrate` - Apply Better Auth migrations (with auto-confirm)
- `auth:local:generate` - Local version with env loading
- `auth:local:migrate` - Local version with env loading

### 3. Created `scripts/auth-local.sh`
- Helper script for local development
- Automatically loads `.env.local` environment variables
- Works with zsh shell

### 4. Updated `Makefile`
Added commands:
- `make dev-auth-generate` - Generate schema in dev container
- `make dev-auth-migrate` - Run migrations in dev container
- `make prod-auth-generate` - Generate schema in prod container
- `make prod-auth-migrate` - Run migrations in prod container

### 5. Updated `docker-compose.yml`
- Added `yarn auth:migrate` to startup command
- Migrations run automatically on container start (after MikroORM migrations)

### Configuration
- **Config file**: `auth.config.ts` (root)
- **Migration path**: `./migrations/better-auth`
- **Output format**: SQL files
- **Application config**: `app/lib/auth/auth.server.ts`

### Commands
```bash
# Generate schema (preview)
make dev-auth-generate

# Apply migrations
make dev-auth-migrate

# Local development
yarn auth:local:generate
yarn auth:local:migrate
```

### Workflow
1. Modify `app/lib/auth/auth.server.ts` (add plugins, etc.)
2. Sync changes to `auth.config.ts`
3. Generate schema: `make dev-auth-generate`
4. Apply migration: `make dev-auth-migrate`
5. **No need to commit** migration files (auto-applied)

## Key Differences

| Feature | MikroORM | Better Auth |
|---------|----------|-------------|
| **Purpose** | Application entities | Authentication tables |
| **Migration files** | TypeScript (.ts) | SQL (.sql) |
| **Committed to Git** | ✅ Yes | ❌ No (auto-applied) |
| **Migration table** | `mikro_orm_migrations` | Internal tracking |
| **Generator** | CLI based on entities | CLI based on config |
| **Rollback** | Supported | Not typically used |

## Setup Summary

### 6. Updated `.gitignore`
- Added `migrations/better-auth/*.sql` to ignore generated migration files

### 7. Created Documentation
- `docs/database/better-auth-migrations.md` - Detailed Better Auth guide
- `docs/database/migrations-overview.md` - This file
- `migrations/README.md` - Migration directory guide
- Updated root `README.md` - Quick start

## How to use

### Development (Docker - Recommended)
```bash
make dev-auth-generate  # Preview changes
make dev-auth-migrate   # Apply changes
```

### Local Development
```bash
yarn auth:local:generate  # Preview changes
yarn auth:local:migrate   # Apply changes
```

### Production
Migrations run automatically on startup, or manually:
```bash
make prod-auth-migrate
```

## Database Tables Created

Better Auth creates these tables:
- `user` - User accounts
- `session` - User sessions
- `account` - OAuth/password accounts
- `verification` - Email verification tokens (magic link, OTP)

## Testing

All commands have been tested and work correctly:
✅ Local execution with `.env.local`
✅ Docker container execution
✅ Database table creation verified

## Important Files

### Configuration
- `auth.config.ts` - Better Auth CLI configuration (root)
- `app/lib/auth/auth.server.ts` - Application auth configuration
- `app/lib/db/mikro-orm.config.ts` - MikroORM configuration

### Scripts
- `scripts/auth-local.sh` - Better Auth local helper
- `Makefile` - All development commands

### Documentation
- `docs/database/better-auth-migrations.md` - Detailed Better Auth guide
- `docs/database/migrations-overview.md` - This file
- `migrations/README.md` - Migration directory guide

## Production Deployment

Both migration systems run automatically on container startup:

```bash
# docker-compose.yml command:
yarn mikro-orm migration:up && yarn auth:migrate && node server.js
```

## See Also

- [Better Auth Migrations Guide](./better-auth-migrations.md) - Detailed Better Auth documentation
- [Migrations README](../../migrations/README.md) - Migration directory guide
- [MikroORM Documentation](https://mikro-orm.io/docs/migrations) - Official MikroORM docs
