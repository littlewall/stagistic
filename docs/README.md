# Documentation

Welcome to the Stagistic project documentation.

## � Quick Links

- **[🏗️ Project Structure](./PROJECT_STRUCTURE.md)** - Visual overview of the project
- **[🚀 Getting Started](../README.md)** - Setup and quick start guide

## �📚 Table of Contents

### 🔐 Authentication
- [Better Auth Setup](./authentication/setup.md) - Authentication system configuration

### 🗄️ Database & Migrations
- **[Unified Migrations](./database/unified-migrations.md)** - Single command for all migrations ⭐
- [Better Auth Migrations](./database/better-auth-migrations.md) - Guide for Better Auth migrations
- [Migrations Overview](./database/migrations-overview.md) - Complete migration systems overview

### 🚀 Deployment
- [Docker Setup](./deployment/docker.md) - Docker configuration and commands

## Quick Links

### Development Commands

**Start Development Environment:**
```bash
make dev-up
```

**Database Migrations:**
```bash
# MikroORM (application entities)
make dev-migrate-up

# Better Auth (authentication tables)
make dev-auth-migrate
```

### Project Structure

```
stagistic/
├── app/                    # Application code
│   ├── lib/
│   │   ├── auth/          # Authentication logic
│   │   └── db/            # Database configuration & entities
│   ├── routes/            # Remix routes
│   └── components/        # React components
├── migrations/            # Database migrations
│   ├── mikro-orm/        # MikroORM migrations
│   └── better-auth/      # Better Auth migrations
├── docs/                  # Documentation (you are here)
└── scripts/              # Helper scripts
```

## Getting Started

1. **Clone the repository**
2. **Copy environment file**: `cp .env.example .env.local`
3. **Start development**: `make dev-up`
4. **Run migrations**:
   ```bash
   make dev-migrate-up      # MikroORM
   make dev-auth-migrate    # Better Auth
   ```

## Need Help?

- Check the [Migrations README](../migrations/README.md) for migration guides
- Review individual documentation files for specific topics
- See the root [README](../README.md) for project overview

## Documentation Structure

```
docs/
├── README.md              # This file - documentation hub
├── authentication/        # Auth-related documentation
│   └── setup.md
├── database/             # Database and migrations
│   ├── better-auth-migrations.md
│   └── migrations-overview.md
└── deployment/           # Deployment and infrastructure
    └── docker.md
```
