# Better Auth Migrations Guide

## Overview

This project uses Better Auth for authentication. Better Auth has its own migration system that's separate from MikroORM migrations.

## Quick Start

**In Docker (Recommended):**
```bash
make dev-auth-generate  # Preview changes
make dev-auth-migrate   # Apply changes
```

**Locally:**
```bash
yarn auth:local:generate  # Preview changes
yarn auth:local:migrate   # Apply changes
```

## Configuration Files

- **`auth.config.ts`** - Configuration file for Better Auth CLI (standalone, no path aliases)
- **`app/lib/auth/auth.server.ts`** - Main auth configuration used by the application

The `auth.config.ts` file is specifically designed to work with Better Auth CLI both locally and in Docker containers. It loads environment variables directly using `dotenv` and doesn't rely on TypeScript path aliases.

## Running Migrations

### Development (with Docker Compose)

```bash
# Generate schema (creates SQL to see what will change)
make dev-auth-generate

# Run migrations (applies changes to database)
make dev-auth-migrate
```

### Production

```bash
# Generate schema
make prod-auth-generate

# Run migrations
make prod-auth-migrate
```

### Local (without Docker)

Make sure you have PostgreSQL running locally and `.env.local` configured:

```bash
# Generate schema
yarn auth:local:generate

# Run migrations
yarn auth:local:migrate
```

**Note:** The `auth:local:*` scripts automatically load environment variables from `.env.local` using the helper script `scripts/auth-local.sh`.

## How It Works

1. **`auth.config.ts`** exports a Better Auth instance with your configuration
2. Better Auth CLI reads this config and connects to your database
3. The CLI compares the desired schema (from your config) with the actual database schema
4. It generates SQL migrations to sync the database with your config
5. When you run migrate, it applies these changes

## Environment Variables

The following environment variables are required:

```bash
POSTGRES_HOST=localhost      # or 'postgres' in Docker
POSTGRES_PORT=5432
POSTGRES_USER=stagistic
POSTGRES_PASSWORD=stagistic_password
POSTGRES_DB=stagistic
```

## Troubleshooting

### Error: "Connection terminated unexpectedly"

This means the CLI couldn't connect to the database. Make sure:
- PostgreSQL is running
- Environment variables are correct
- You're using the correct host (`localhost` locally, `postgres` in Docker)

### Error: "_globals.default.get is not a function"

This error occurs when Better Auth CLI tries to load a config file with path aliases or complex imports. That's why we created `auth.config.ts` as a standalone file.

### Running in Docker vs Locally

- **In Docker**: Use `make dev-auth-generate` or `make dev-auth-migrate`
- **Locally**: Export env vars from `.env.local` first, then use `yarn auth:generate` or `yarn auth:migrate`

## Adding New Auth Features

When you modify `app/lib/auth/auth.server.ts` to add new plugins or change configuration:

1. **Sync changes to `auth.config.ts`** (keep plugin configurations in sync)
2. Run `make dev-auth-generate` to see what will change
3. Run `make dev-auth-migrate` to apply changes
4. Commit both config files

## Production Deployment

When deploying to production:

1. Better Auth migrations should run automatically via the Docker Compose command
2. Check `docker-compose.yml` - it includes migration commands in the startup sequence
3. You can also run migrations manually: `make prod-auth-migrate`

## Notes

- Better Auth migrations are separate from MikroORM migrations
- Both systems maintain their own migration history
- Better Auth creates its own tables (users, sessions, etc.)
- MikroORM handles your application's domain entities
- The `--yes` flag is added to skip confirmation prompts in automated environments
- Generated migration files are in `.gitignore` (they're temporary, applied immediately)
