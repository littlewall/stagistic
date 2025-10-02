# Technology Stack

Complete list of technologies used in the Stagistic project.

## Core Stack

### Frontend
- **Remix 2.16+** - Full-stack React framework
  - Server-side rendering
  - File-based routing
  - Built-in data loading
  - Form handling with actions

- **React 18** - UI library
  - Functional components
  - Hooks API
  - Concurrent features

- **TypeScript 5.8+** - Type-safe JavaScript
  - Strict mode enabled
  - Path aliases configured
  - Experimental decorators

### Backend
- **Node.js 22+** - JavaScript runtime
  - ES modules
  - Native fetch support

- **Express 4** - Web server
  - Integration with Remix
  - Custom middleware support

### Database
- **PostgreSQL 16** - Relational database
  - ACID compliance
  - JSON support
  - Full-text search

- **MikroORM 6.4+** - TypeScript ORM
  - Entity-based modeling
  - Migration system
  - Query builder
  - Unit of Work pattern

### Authentication
- **Better Auth 1.3+** - Modern auth library
  - Magic link authentication
  - Email OTP
  - Session management
  - Built-in migration system

## UI & Styling

- **Mantine 8.0** - React component library
  - Pre-built components
  - Theme system
  - Responsive design
  - Accessibility built-in

- **PostCSS** - CSS processing
  - Custom properties
  - Mantine presets
  - CSS modules support

- **Lucide React** - Icon library
  - Modern, consistent icons
  - Tree-shakeable

## Validation & Forms

- **Valibot 1.1** - Schema validation
  - Type-safe schemas
  - Lightweight
  - Composable validators

- **Conform** - Form library
  - Progressive enhancement
  - Type-safe
  - Valibot integration

## Development Tools

### Build & Bundler
- **Vite 6.3+** - Fast build tool
  - HMR (Hot Module Replacement)
  - Optimized builds
  - Plugin ecosystem

### Code Quality
- **ESLint 9.26** - Linting
  - Custom config from @dvdevcz/eslint
  - TypeScript support

- **Stylelint 16.19** - CSS linting
  - Custom config from @dvdevcz/stylelint

### Package Management
- **Yarn 4.9+** - Package manager
  - Berry (modern Yarn)
  - Workspace support
  - PnP mode (optional)

### TypeScript Tools
- **tsx** - TypeScript executor
  - Fast execution
  - No compilation needed
  - Used for migrations and scripts

- **ts-node** - TypeScript executor (legacy)
- **tsconfig-paths** - Path alias support

## Infrastructure

### Containerization
- **Docker** - Container platform
- **Docker Compose** - Multi-container orchestration
  - Development setup
  - Production setup
  - Service dependencies

### Email
- **Postmark** - Email service
  - Transactional emails
  - Template support
  - Delivery tracking

## Testing (Future)

### Planned
- Jest or Vitest for unit tests
- Playwright for E2E tests
- Testing Library for React tests

## Database Tools

### Migrations
- **MikroORM CLI** - Entity migrations
  - TypeScript migrations
  - Automatic generation
  - Rollback support

- **Better Auth CLI** - Auth migrations
  - SQL migrations
  - Schema generation
  - Automatic application

## Utilities

### JavaScript Libraries
- **nanoid** - ID generation
  - URL-safe IDs
  - Collision-resistant

- **neverthrow** - Result types
  - Functional error handling
  - Type-safe results

- **cookie-es** - Cookie parsing
  - Universal cookie handling

- **convict** - Configuration management
  - Environment validation
  - Type-safe config

### Node.js
- **dotenv** - Environment variables
  - .env file loading

- **reflect-metadata** - Metadata reflection
  - Required for MikroORM decorators

## Development Environment

### Required
- Node.js 22+ (LTS)
- Yarn 4.9+
- PostgreSQL 16
- Docker & Docker Compose (for containerized dev)

### Recommended
- VS Code
- GitHub Copilot
- ESLint extension
- Prettier extension

## Version Requirements

```json
{
  "node": ">=22.0.0",
  "yarn": ">=4.9.1",
  "postgres": ">=16.0"
}
```

## Package Manager Configuration

```bash
packageManager: yarn@4.9.1
type: module  # ES modules
```

## TypeScript Configuration Highlights

```json
{
  "target": "es6",
  "module": "ESNext",
  "moduleResolution": "Bundler",
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true,
  "paths": {
    "~util/*": ["./app/util/*"],
    "~config/*": ["./app/config/*"],
    "~lib/*": ["./app/lib/*"],
    // ... more aliases
  }
}
```

## Key Dependencies Version Matrix

| Package | Version | Purpose |
|---------|---------|---------|
| remix | 2.16+ | Framework |
| react | 18.x | UI |
| typescript | 5.8+ | Language |
| mikro-orm | 6.4+ | ORM |
| better-auth | 1.3+ | Auth |
| mantine | 8.0 | UI Components |
| valibot | 1.1 | Validation |
| postgres | 16 | Database |

## Architecture Decisions

### Why Remix?
- Full-stack framework
- Excellent data loading patterns
- Progressive enhancement
- SEO-friendly SSR

### Why MikroORM?
- TypeScript-first ORM
- Entity-based modeling
- Flexible query builder
- Good migration system

### Why Better Auth?
- Modern authentication library
- Built-in magic link support
- Session management
- Easy integration

### Why Mantine?
- Comprehensive component library
- Great TypeScript support
- Active development
- Good documentation

---

**Last Updated:** 2. října 2025
