# Stagistic

A modern web application built with Remix, Better Auth, and MikroORM for sports program management.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (if running locally)

### Development

```bash
# Start development environment
make dev-up

# Run database migrations
make dev-migrate         # All migrations (MikroORM + Better Auth)

# View logs
make dev-logs

# Open shell in container
make dev-shell
```

### Local Development (without Docker)

```bash
# Install dependencies
yarn install

# Copy environment file
cp .env.example .env.local

# Start PostgreSQL locally and update .env.local

# Run migrations
yarn auth:local:migrate
yarn mikro-orm migration:up

# Start development server
yarn dev
```

## 📁 Project Structure

```
stagistic/
├── app/                    # Application code (Remix)
│   ├── components/        # React components
│   ├── lib/              # Core libraries (auth, db, email)
│   ├── routes/           # Remix routes
│   └── schemas/          # Validation schemas
├── migrations/           # Database migrations
│   ├── mikro-orm/       # Application entity migrations
│   └── better-auth/     # Authentication migrations
├── docs/                # Documentation
├── scripts/             # Helper scripts
└── docker-compose.yml   # Docker configuration
```

## 🗄️ Database Migrations

This project uses two migration systems that can be run together:

### Unified Migrations (Recommended)
```bash
make dev-migrate          # Run ALL migrations at once
```

### Individual Systems
```bash
# MikroORM - Application Entities
make dev-migrate-create   # Create new migration
make dev-migrate-up       # Apply migrations
make dev-migrate-down     # Rollback migration

# Better Auth - Authentication
make dev-auth-generate    # Generate schema (preview)
make dev-auth-migrate     # Apply migrations
```

See [Unified Migrations Guide](./docs/database/unified-migrations.md) for detailed information.

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

- **[📖 Documentation Hub](./docs/README.md)** - Complete documentation index
- **[�️ Unified Migrations](./docs/database/unified-migrations.md)** - Single command for all migrations ⭐
- **[� Better Auth Setup](./docs/authentication/setup.md)** - Authentication configuration
- **[🐳 Docker Setup](./docs/deployment/docker.md)** - Docker configuration

### Quick Links
- [Migration Systems Overview](./migrations/README.md)
- [Better Auth Migrations](./docs/database/better-auth-migrations.md)
- [Complete Migrations Guide](./docs/database/migrations-overview.md)

## 🛠️ Development Commands

Use `make help` to see all available commands, or refer to the [Makefile](./Makefile).

### Common Commands

```bash
make dev-up              # Start development environment
make dev-down            # Stop development environment
make dev-logs            # View logs
make dev-shell           # Open shell in app container
make dev-db              # Connect to database
make dev-rebuild         # Rebuild containers
make ps                  # Show container status
```

## 🏗️ Tech Stack

- **Framework**: [Remix](https://remix.run/) - Full-stack web framework
- **Authentication**: [Better Auth](https://better-auth.com/) - Modern auth library
- **ORM**: [MikroORM](https://mikro-orm.io/) - TypeScript ORM
- **Database**: PostgreSQL
- **UI**: [Mantine](https://mantine.dev/) - React component library
- **Validation**: [Valibot](https://valibot.dev/) - Schema validation
- **Email**: [Postmark](https://postmarkapp.com/) - Email service

## 🔧 Configuration

Environment variables are configured in:
- `.env.local` - Local development
- `docker-compose.yml` - Docker environment
- `docker-compose.dev.yml` - Development Docker environment

See `.env.example` for all available options.

## 📝 License

Private project - All rights reserved.

## 🤝 Contributing

This is a private project. Please contact the maintainers for contribution guidelines.
