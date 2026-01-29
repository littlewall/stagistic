# Stagistic - Project Overview

## Vision

Stagistic is an open-source cloud-based collaborative editor specifically designed for theatre and musical scripts. The goal is to provide a modern, intuitive platform that understands the unique requirements of theatrical productions.

## Current Status

**Phase: Foundation Setup ✅**

The monorepo infrastructure is complete with:

- Turborepo + pnpm workspace configuration
- Three apps (web, api, worker)
- Seven shared packages
- Docker-based development environment
- Optional HTTPS local development setup

## Architecture Decisions

### Monorepo Strategy

We chose a monorepo approach for several reasons:

1. **Code Sharing**: Theatre-specific logic can be shared between frontend and backend
2. **Atomic Changes**: Related changes across multiple packages can be committed together
3. **Unified Versioning**: All packages version together for consistency
4. **Simplified Dependencies**: No need to publish internal packages

### Tech Stack Rationale

**Frontend: React + Vite**

- React provides a mature ecosystem for complex UIs
- Vite offers fast development with HMR
- Easy to add rich text editing libraries later

**Backend: Fastify**

- Significantly faster than Express
- Built-in TypeScript support
- Schema validation out of the box
- Plugin architecture for extensibility

**Database: PostgreSQL**

- Robust ACID compliance for script data
- JSON support for flexible document storage
- Mature ecosystem with excellent ORMs
- Self-hostable (no vendor lock-in)

**Cache: Valkey (Redis fork)**

- Drop-in Redis replacement
- Open source (BSD license)
- Perfect for sessions and real-time features
- Active development community

### Package Organization

```
packages/
├── db/           → Database layer (schema, migrations, queries)
├── shared/       → Common utilities and types
├── editor-core/  → Editor logic (formatting, validation)
├── sync-core/    → Real-time collaboration (CRDT/OT)
├── auth/         → Authentication and authorization
├── music/        → Music notation features
└── config/       → Shared configuration
```

Each package is designed to be:

- **Focused**: Single responsibility
- **Testable**: Can be tested in isolation
- **Reusable**: Used by multiple apps

## Development Modes

### 1. Local Development (without Docker)

Best for rapid development and debugging:

```bash
docker compose up postgres valkey -d
pnpm dev
```

Pros:

- Fast hot reload
- Easy debugging
- Native performance

### 2. Docker Development

Full containerized environment:

```bash
docker compose -f docker-compose.dev.yml up
```

Pros:

- Matches production closely
- Consistent across team
- Isolated environment

### 3. HTTPS Development

Production-like HTTPS setup:

```bash
docker compose -f docker-compose.yml -f infra/proxy/caddy/docker-compose.https.yml up
```

Pros:

- Test HTTPS-specific features
- Test CORS properly
- Debug SSL issues early

## Next Steps

### Immediate Priorities

1. **Database Schema** (packages/db)
    - Design script data model
    - Setup Drizzle ORM or Prisma
    - Create initial migrations
    - Add seed data for development

2. **Authentication** (packages/auth)
    - Integrate better-auth
    - Setup session management
    - Add OAuth providers
    - Implement RBAC

3. **Basic Editor** (packages/editor-core)
    - Research editor libraries (ProseMirror, Lexical, Slate)
    - Implement script formatting rules
    - Add character tracking
    - Scene/act structure

4. **API Endpoints** (apps/api)
    - CRUD operations for scripts
    - User management
    - File upload/export
    - WebSocket setup for sync

5. **Frontend Structure** (apps/web)
    - Setup routing (React Router or TanStack Router)
    - Add state management (Zustand or Jotai)
    - Create component library
    - Design system

### Medium-Term Goals

- **Real-time Collaboration** (packages/sync-core)
    - Research CRDT vs OT
    - Implement presence system
    - Add conflict resolution
    - Add cursor sharing

- **Music Notation** (packages/music)
    - Research music notation libraries
    - Integrate with editor
    - Add audio playback
    - MIDI support

- **Export Features** (apps/worker)
    - PDF generation
    - Script formatting (industry standards)
    - Batch operations
    - Email notifications

### Long-Term Vision

- AI-powered script analysis
- Voice recording integration
- Rehearsal scheduling
- Cast/crew management
- Mobile apps (React Native)
- Desktop apps (Electron or Tauri)
- Plugin system for extensions

## Technical Guidelines

### TypeScript

- Use strict mode
- Prefer `interface` for object shapes
- Use `type` for unions/intersections
- Avoid `any`, use `unknown` when needed

### Error Handling

- Use Result types or custom Error classes
- Log errors appropriately
- Return meaningful error messages
- Don't expose internal errors to clients

### Performance

- Use React.memo() judiciously
- Implement virtual scrolling for long lists
- Optimize database queries
- Use Redis caching for hot data
- Monitor bundle sizes

### Security

- Never store secrets in code
- Use environment variables
- Implement CSRF protection
- Add rate limiting
- Validate all inputs
- Sanitize outputs

### Testing

- Write unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Aim for >80% coverage

## Open Source Philosophy

Stagistic is committed to being:

1. **Self-Hostable**: Everything runs locally, no cloud dependencies
2. **Transparent**: All decisions documented, all code visible
3. **Collaborative**: Community input valued and encouraged
4. **Sustainable**: Built to last, not to be abandoned

## Community

As the project grows, we'll establish:

- Discord/Slack for discussions
- Monthly community calls
- RFC process for major changes
- Public roadmap
- Contributor recognition

## Business Model (Future)

While the core will always be open source:

- Managed hosting option (SaaS)
- Enterprise support
- Custom integrations
- Training and consulting

Revenue ensures long-term sustainability while keeping the code free.

---

**This is just the beginning.** The foundation is solid, and now we build something amazing for the theatre community.
