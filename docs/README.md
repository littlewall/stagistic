# Documentation

Welcome to the Stagistic project documentation.

## 🚀 Quick Links

- **[🏗️ Project Structure](./PROJECT_STRUCTURE.md)** - Visual overview of the project
- **[🚀 Getting Started](../README.md)** - Setup and quick start guide
- **[🗄️ Database Migrations](./database/migrations.md)** - Complete migration guide ⭐

## 📚 Table of Contents

### 🔐 Authentication
- [Authentication Setup](./authentication/setup.md) - Better Auth configuration

### 🗄️ Database
- **[Database Migrations](./database/migrations.md)** - Complete migration guide ⭐
- [Migration Quick Reference](./database/quick-reference.md) - Common commands

### 🏢 Organizations
- [Organizations](./organizations/README.md) - Team management with Better Auth

### 🚀 Deployment
- [Docker Setup](./deployment/docker.md) - Docker configuration and commands

## Getting Started

1. **Clone the repository**
2. **Copy environment file**: `cp .env.example .env.local`
3. **Start development**: `make dev-up`
4. **Run migrations**: `make dev-migrate`

## Development Workflow

### Database Changes
```bash
# Add new entity
yarn migrate:create add_entity_name

# Add auth feature
yarn migrate:generate

# Apply all changes
yarn migrate:apply
```

### Common Commands
```bash
make dev-up              # Start development
make dev-migrate         # Run all migrations
make dev-logs            # View logs
make dev-shell           # Open container shell
```

## Project Structure

```
stagistic/
├── app/                    # Application code (Remix)
│   ├── components/        # React components
│   ├── lib/              # Core libraries
│   │   ├── auth/         # Authentication (Better Auth)
│   │   └── db/           # Database (MikroORM)
│   └── routes/           # Remix routes
├── migrations/           # Database migrations
│   ├── mikro-orm/       # Application entities
│   └── better-auth/     # Auth tables
├── docs/                # Documentation (you are here)
└── scripts/             # Helper scripts
```

## Need Help?

- Check [Database Migrations](./database/migrations.md) for migration guides
- Review individual documentation files for specific topics
- See the root [README](../README.md) for project overview
