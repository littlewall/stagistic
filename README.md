# 🎭 Stagistic

**Cloud Editor for Theatre and Musical Scripts**

Stagistic is an open-source, cloud-based collaborative editor designed specifically for theatre and musical scripts. Built with modern web technologies and designed to scale from local development to production SaaS deployment.

---

## 📋 Overview

This repository contains the complete monorepo for Stagistic, including:

- **Frontend**: React + Vite web application
- **Backend**: Fastify API server
- **Database**: PostgreSQL with planned ORM integration
- **Cache**: Valkey (Redis fork) for session storage and real-time features
- **Worker**: Background job processing (placeholder)
- **Packages**: Shared libraries for editor, sync, auth, music notation, and more

---

## 🏗️ Architecture

### Monorepo Structure

```
stagistic/
├── apps/
│   ├── web/              # React + Vite frontend
│   ├── api/              # Fastify backend
│   └── worker/           # Background jobs (placeholder)
├── packages/
│   ├── db/               # Database schema and queries
│   ├── shared/           # Shared utilities and types
│   ├── editor-core/      # Core editor logic
│   ├── sync-core/        # Real-time collaboration
│   ├── auth/             # Authentication (prepared for better-auth)
│   ├── music/            # Music notation features
│   └── config/           # Shared configuration
├── infra/
│   ├── proxy/caddy/      # Caddy reverse proxy for HTTPS
│   └── certs/            # TLS certificates (mkcert)
└── scripts/              # Build and deployment scripts
```

### Tech Stack

**Frontend:**

- React 18
- Vite
- TypeScript

**Backend:**

- Fastify
- TypeScript
- Node.js 20+

**Database & Cache:**

- PostgreSQL 17
- Valkey 8 (Redis-compatible)

**Tooling:**

- pnpm workspaces
- Turborepo
- Docker & Docker Compose
- ESLint & Prettier

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 24.12.0
- **pnpm** >= 9.0.0
- **Docker** and **Docker Compose**

### Basic Setup (HTTP)

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/stagistic.git
cd stagistic
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Copy environment variables:**

```bash
cp .env.example .env
```

4. **Start infrastructure (Docker):**

```bash
docker compose up -d
```

This will start:

- PostgreSQL on `localhost:5432`
- Valkey on `localhost:6379`
- API on `localhost:4000`
- Web on `localhost:3000`

5. **Verify everything is running:**

Open http://localhost:3000 in your browser. You should see the Stagistic landing page with API health status.

---

## 🔒 HTTPS Development (Optional)

For a more production-like local environment with HTTPS, use the Caddy reverse proxy setup.

### Setup HTTPS with mkcert

1. **Install mkcert:**

```bash
# macOS
brew install mkcert

# Linux
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Windows
choco install mkcert
```

2. **Create local Certificate Authority:**

```bash
mkcert -install
```

3. **Generate certificates:**

```bash
cd infra/certs
mkcert stagistic.local
```

This creates:

- `stagistic.local.pem`
- `stagistic.local-key.pem`

4. **Add to `/etc/hosts`:**

```bash
sudo nano /etc/hosts
```

Add:

```
127.0.0.1 stagistic.local
```

5. **Start with HTTPS:**

```bash
docker compose -f docker-compose.yml -f infra/proxy/caddy/docker-compose.https.yml up -d
```

6. **Access the app:**

Open https://stagistic.local in your browser.

---

## 🛠️ Development

### Local Development (without Docker)

1. **Start infrastructure only:**

```bash
docker compose up postgres valkey -d
```

2. **Run apps locally:**

```bash
# Terminal 1: API
cd apps/api
pnpm dev

# Terminal 2: Web
cd apps/web
pnpm dev
```

### Development Commands

```bash
# Install all dependencies
pnpm install

# Run all apps in dev mode (with Turborepo)
pnpm dev

# Build all apps
pnpm build

# Lint all code
pnpm lint

# Format code
pnpm format

# Clean build artifacts
pnpm clean
```

### Docker Commands

```bash
# Start all services
docker compose up -d

# Start with HTTPS
docker compose -f docker-compose.yml -f infra/proxy/caddy/docker-compose.https.yml up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild and restart
docker compose up --build -d
```

---

## 📦 Packages

### `@stagistic/db`

Database schema, migrations, and queries. Prepared for Drizzle ORM or Prisma integration.

### `@stagistic/shared`

Common utilities, types, and helpers used across all apps.

### `@stagistic/editor-core`

Core editor logic for theatre script formatting and editing.

### `@stagistic/sync-core`

Real-time collaboration and synchronization logic (CRDT/OT).

### `@stagistic/auth`

Authentication and authorization. Prepared for `better-auth` integration.

### `@stagistic/music`

Music notation and audio features for musical theatre scripts.

### `@stagistic/config`

Shared configuration, environment variables, and feature flags.

---

## 🐳 Docker Infrastructure

### Services

**postgres** - PostgreSQL 17

- Port: 5432
- Database: `stagistic`
- User: `stagistic`
- Password: `stagistic`

**valkey** - Valkey 8 (Redis fork)

- Port: 6379

**api** - Fastify backend

- Port: 4000
- Endpoints: `/api/health`, `/api/ready`

**web** - React + Vite frontend

- Port: 3000 (or 80 in production Docker)

**caddy** (HTTPS mode only)

- Port: 443 (HTTPS)
- Port: 80 (HTTP redirect)

---

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
# Node Environment
NODE_ENV=development

# API
PORT=4000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://stagistic:stagistic@localhost:5432/stagistic

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=*
```

### TypeScript Configuration

The monorepo uses TypeScript project references for fast, incremental builds:

- `tsconfig.base.json` - Base configuration
- Each app/package has its own `tsconfig.json` extending the base

### Turborepo

Task pipelines are configured in `turbo.json`:

- `dev` - Development mode (persistent, no cache)
- `build` - Production build (cached)
- `lint` - Linting (cached, depends on build)

---

## 🧪 Testing

_(Coming soon)_

---

## 🚢 Deployment

_(Production deployment guides coming soon)_

---

## 🤝 Contributing

Stagistic is open source and welcomes contributions!

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests and linting: `pnpm lint`
5. Commit with conventional commits: `git commit -m 'feat: add amazing feature'`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing code structure
- Run `pnpm format` before committing
- Ensure `pnpm lint` passes

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with modern open-source technologies:

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Fastify](https://fastify.dev/)
- [PostgreSQL](https://www.postgresql.org/)
- [Valkey](https://valkey.io/)
- [Turborepo](https://turbo.build/)
- [Caddy](https://caddyserver.com/)

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/stagistic/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/stagistic/discussions)

---

**Made with ❤️ for the theatre community**
