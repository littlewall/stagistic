# GitHub Copilot Instructions for Stagistic

This file contains custom instructions for GitHub Copilot to better understand this project.

## Project Overview

**Name:** Stagistic  
**Type:** Sports program management web application  
**Stack:** Remix (React), TypeScript, PostgreSQL  

## Key Technologies

- **Framework:** Remix (Full-stack React framework)
- **Runtime:** Node.js 22+
- **Language:** TypeScript 5.8+
- **Database:** PostgreSQL 16
- **ORM:** MikroORM 6.4
- **Authentication:** Better Auth 1.3+
- **UI Library:** Mantine 8.0
- **Validation:** Valibot 1.1
- **Email:** Postmark
- **Container:** Docker & Docker Compose

See [Tech Stack Details](./.github/copilot/tech-stack.md) for comprehensive list.

## Code Style & Conventions

### TypeScript
- Use strict mode
- Prefer `interface` over `type` for object shapes
- Use path aliases (`~lib/*`, `~components/*`, etc.)
- Enable experimental decorators (for MikroORM)

### React/Remix
- Functional components only
- Use hooks (no class components)
- Server actions in `action.ts` files
- Loaders in `loader.ts` files
- Route modules in `route.tsx` files

### File Naming
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Routes: `kebab-case/route.tsx`
- Styles: `ComponentName.module.css`

See [Code Style Guide](./.github/copilot/code-style.md) for details.

## Project Structure

```
app/
  ├── components/       # React components
  ├── lib/             # Core libraries
  │   ├── auth/       # Authentication (Better Auth)
  │   ├── db/         # Database (MikroORM)
  │   └── email/      # Email service
  ├── routes/         # Remix routes
  └── schemas/        # Validation schemas

migrations/
  ├── mikro-orm/      # Application entity migrations
  └── better-auth/    # Auth table migrations

docs/                 # Documentation
.github/copilot/     # Copilot instructions (this folder)
```

## Architecture Patterns

### Database
- MikroORM entities in `app/lib/db/entities/`
- Better Auth manages auth tables separately
- Two migration systems (see unified migrations guide)

### Authentication
- Better Auth with magic link & email OTP
- Shared configuration in `app/lib/auth/config.ts`
- Session-based authentication

### Validation
- Valibot schemas in `app/schemas/`
- Use with Conform for forms
- Server-side validation always

See [Architecture Guide](./.github/copilot/architecture.md) for details.

## Common Tasks

### Creating New Route
```typescript
// app/routes/new-route/route.tsx
export default function NewRoute() {
  return <div>Content</div>;
}
```

### Creating New Entity
```typescript
// app/lib/db/entities/Entity.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { Base } from './Base';

@Entity()
export class MyEntity extends Base {
  @Property()
  name!: string;
}
```

### Running Migrations
```bash
make dev-migrate  # All migrations at once
```

## Custom Instructions

When generating code:
1. ✅ Use TypeScript with strict types
2. ✅ Follow project structure conventions
3. ✅ Use existing utilities and patterns
4. ✅ Add proper error handling
5. ✅ Include JSDoc comments for public APIs
6. ✅ Follow Remix patterns (loaders, actions, etc.)
7. ✅ Use path aliases from tsconfig
8. ✅ Prefer functional programming patterns

When suggesting changes:
1. ✅ Consider both MikroORM and Better Auth migrations
2. ✅ Update relevant documentation
3. ✅ Maintain consistency with existing code
4. ✅ Use unified migration commands

## Important Files

- `app/lib/auth/config.ts` - Shared auth configuration
- `app/lib/db/mikro-orm.config.ts` - ORM configuration
- `auth.config.ts` - Better Auth CLI config
- `Makefile` - Development commands
- `package.json` - Dependencies and scripts

## Documentation References

- [Project README](../README.md)
- [Documentation Hub](../docs/README.md)
- [Unified Migrations](../docs/database/unified-migrations.md)
- [Project Structure](../docs/PROJECT_STRUCTURE.md)

## Session Outputs

Summary files and session contexts are stored in:
- `.copilot-sessions/summaries/` - Not versioned
- `.copilot-sessions/contexts/` - Not versioned

These directories are in `.gitignore` and used for temporary Copilot outputs.

---

**Last Updated:** 2. října 2025  
**Maintained By:** Development Team
