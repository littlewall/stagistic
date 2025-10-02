# Project Structure Overview

## Visual Directory Structure

```
stagistic/
│
├── 📄 README.md                    # Project overview & quick start
├── 🔐 auth.config.ts               # Better Auth CLI configuration
├── 📦 package.json                 # Dependencies & scripts
├── 🛠️  Makefile                     # Development commands
├── 🐳 docker-compose.yml           # Production Docker config
├── 🐳 docker-compose.dev.yml       # Development Docker config
│
├── 📚 docs/                        # All project documentation
│   ├── 📖 README.md               # Documentation hub
│   ├── 🔐 authentication/         # Authentication docs
│   │   └── setup.md              # Better Auth configuration
│   ├── 🗄️  database/               # Database & migration docs
│   │   ├── better-auth-migrations.md
│   │   └── migrations-overview.md
│   └── 🐳 deployment/             # Deployment docs
│       └── docker.md             # Docker guide
│
├── 🗄️  migrations/                 # Database migrations
│   ├── 📖 README.md               # Migration systems guide
│   ├── 📊 mikro-orm/              # MikroORM migrations (committed)
│   │   ├── README.md             # MikroORM guide
│   │   ├── .snapshot-stagistic.json
│   │   └── Migration*.ts         # TypeScript migrations
│   └── 🔐 better-auth/            # Better Auth migrations (auto-applied)
│       ├── README.md             # Better Auth guide
│       └── *.sql                 # Generated SQL (not committed)
│
├── 🎨 app/                         # Application code (Remix)
│   ├── components/               # React components
│   ├── lib/                      # Core libraries
│   │   ├── auth/                # Authentication
│   │   ├── db/                  # Database (MikroORM)
│   │   ├── email/               # Email service
│   │   └── toast/               # Toast notifications
│   ├── routes/                   # Remix routes
│   ├── schemas/                  # Validation schemas
│   └── utils/                    # Utility functions
│
├── 🔧 scripts/                     # Helper scripts
│   └── auth-local.sh            # Local Better Auth helper
│
└── 🏗️  build/                      # Build output (generated)
```

## Key Directories Explained

### 📚 `docs/` - Documentation
**Purpose:** All project documentation organized by topic

**Structure:**
- `authentication/` - Auth system setup and configuration
- `database/` - Database, ORM, and migrations
- `deployment/` - Docker, CI/CD, and deployment

**When to use:**
- Setting up the project
- Understanding authentication
- Learning about migrations
- Deploying to production

---

### 🗄️ `migrations/` - Database Migrations
**Purpose:** Database schema changes for different systems

**Structure:**
- `mikro-orm/` - Application entities (teams, programs, etc.)
  - TypeScript files
  - Committed to repository
  - Can be rolled back
  
- `better-auth/` - Authentication tables (users, sessions, etc.)
  - SQL files
  - Auto-applied, not committed
  - Generated on-demand

**When to use:**
- Creating new database tables
- Modifying entity schemas
- Setting up authentication
- Database schema changes

---

### 🎨 `app/` - Application Code
**Purpose:** Main Remix application

**Key subdirectories:**
- `lib/` - Core business logic and integrations
- `routes/` - Remix route handlers
- `components/` - Reusable React components
- `schemas/` - Validation and type schemas

**When to use:**
- Implementing features
- Creating new pages
- Adding business logic

---

### 🔧 `scripts/` - Helper Scripts
**Purpose:** Development and automation scripts

**Current scripts:**
- `auth-local.sh` - Load env vars and run Better Auth CLI locally

**When to use:**
- Local development without Docker
- Custom automation tasks

---

## Migration Systems Comparison

| Aspect | MikroORM | Better Auth |
|--------|----------|-------------|
| **Location** | `migrations/mikro-orm/` | `migrations/better-auth/` |
| **File Type** | TypeScript (.ts) | SQL (.sql) |
| **Purpose** | Application entities | Auth tables |
| **Committed** | ✅ Yes | ❌ No |
| **Rollback** | ✅ Supported | ❌ Not typical |
| **Generator** | Entity diffs | Config-based |

## Documentation Flow

```
Start → README.md (root)
          ↓
        docs/README.md (hub)
          ↓
        ├── authentication/setup.md
        ├── database/migrations-overview.md
        └── deployment/docker.md
```

## Common Workflows

### 🆕 New Developer Setup
```
1. Read README.md (root)
2. Check docs/README.md
3. Follow getting started guide
4. Run migrations
```

### 🗄️ Database Change
```
1. Modify entity in app/lib/db/entities/
2. make dev-migrate-create
3. Review migration in migrations/mikro-orm/
4. make dev-migrate-up
5. Commit migration file
```

### 🔐 Auth Schema Change
```
1. Modify app/lib/auth/auth.server.ts
2. Sync auth.config.ts
3. make dev-auth-generate
4. make dev-auth-migrate
5. Commit config files (not migration SQL)
```

---

**Last Updated:** 2. října 2025  
**Structure Version:** 2.0
