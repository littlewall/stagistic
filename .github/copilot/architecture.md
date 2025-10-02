# Architecture Guide

High-level architecture and design patterns for the Stagistic project.

## Overview

Stagistic follows a **full-stack monolithic architecture** using Remix, with clear separation between:
- **Frontend** - React components and UI logic
- **Backend** - Server-side logic and API routes
- **Database** - PostgreSQL with MikroORM
- **Authentication** - Better Auth

## Architecture Layers

```
┌─────────────────────────────────────────┐
│          Client (Browser)               │
│  React Components + Mantine UI          │
└────────────────┬────────────────────────┘
                 │ HTTP
┌────────────────▼────────────────────────┐
│            Remix Framework              │
│  ┌─────────────────────────────────┐   │
│  │  Routes (Loaders + Actions)     │   │
│  └──────────────┬──────────────────┘   │
│                 │                       │
│  ┌──────────────▼──────────────────┐   │
│  │    Business Logic Layer         │   │
│  │  - Auth (Better Auth)           │   │
│  │  - Email Service                │   │
│  │  - Validation (Valibot)         │   │
│  └──────────────┬──────────────────┘   │
│                 │                       │
│  ┌──────────────▼──────────────────┐   │
│  │    Data Access Layer            │   │
│  │  - MikroORM Entities            │   │
│  │  - Repositories                 │   │
│  └──────────────┬──────────────────┘   │
└─────────────────┼───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         PostgreSQL Database             │
│  - Application tables (MikroORM)        │
│  - Auth tables (Better Auth)            │
└─────────────────────────────────────────┘
```

## Directory Structure

### Application Layer (`app/`)

```
app/
├── routes/              # Remix routes (UI + API)
│   ├── _index.tsx      # Homepage
│   ├── api.*/          # API routes
│   └── app.*/          # Protected app routes
│
├── components/          # Reusable React components
│   ├── nav/            # Navigation components
│   └── auth/           # Auth-specific components
│
├── lib/                # Core business logic
│   ├── auth/           # Authentication
│   │   ├── config.ts   # Shared auth config
│   │   ├── auth.server.ts
│   │   ├── client.ts
│   │   └── utils.ts
│   │
│   ├── db/             # Database & ORM
│   │   ├── entities/   # MikroORM entities
│   │   ├── mikro-orm.config.ts
│   │   └── orm.ts
│   │
│   ├── email/          # Email service
│   │   └── email.service.ts
│   │
│   └── csrf/           # CSRF protection
│       └── csrf.server.ts
│
├── schemas/            # Validation schemas
│   └── forms/          # Form validation
│
├── config/             # Configuration
│   └── globals.ts      # Global config (convict)
│
└── utils/              # Utility functions
    └── id.ts           # ID generation
```

## Key Patterns

### 1. Remix Route Pattern

Each route can have:
- **`route.tsx`** - UI component
- **`loader.ts`** - Data loading (GET)
- **`action.ts`** - Data mutations (POST/PUT/DELETE)

```typescript
// app/routes/users.$id/route.tsx
export default function UserDetail() {
  const user = useLoaderData<typeof loader>();
  return <div>{user.name}</div>;
}

// app/routes/users.$id/loader.ts
export async function loader({params}: LoaderFunctionArgs) {
  const user = await db.user.findOne({id: params.id});
  if (!user) throw new Response('Not Found', {status: 404});
  return json({user});
}

// app/routes/users.$id/action.ts
export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  // Handle form submission
  return redirect('/users');
}
```

### 2. Entity Pattern (MikroORM)

All entities extend `Base` class:

```typescript
// app/lib/db/entities/Base.ts
export abstract class Base {
  @PrimaryKey()
  id!: string;

  @Property()
  createdAt: Date = new Date();

  @Property({onUpdate: () => new Date()})
  updatedAt: Date = new Date();
}

// app/lib/db/entities/User.ts
@Entity()
export class User extends Base {
  @Property()
  name!: string;

  @Property({unique: true})
  email!: string;
}
```

### 3. Repository Pattern (Optional)

For complex queries, create repository classes:

```typescript
// app/lib/db/repositories/UserRepository.ts
export class UserRepository {
  constructor(private em: EntityManager) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.em.findOne(User, {email});
  }

  async findActiveUsers(): Promise<User[]> {
    return this.em.find(User, {isActive: true});
  }
}
```

### 4. Service Pattern

Business logic in service classes:

```typescript
// app/lib/email/email.service.ts
export async function sendTemplateEmail(
  to: string,
  template: string,
  data: Record<string, unknown>,
): Promise<void> {
  // Email sending logic
}
```

### 5. Shared Configuration

Reusable configuration functions:

```typescript
// app/lib/auth/config.ts
export function createAuthConfig(options: AuthConfigOptions) {
  return {
    database: options.database,
    plugins: [/* ... */],
  };
}
```

## Data Flow

### Read Flow (Loader)

```
User Request
  ↓
Remix Loader
  ↓
Service/Repository (optional)
  ↓
MikroORM Entity Manager
  ↓
PostgreSQL
  ↓
Return Data
  ↓
Render Component
```

### Write Flow (Action)

```
User Form Submit
  ↓
Remix Action
  ↓
Validate (Valibot)
  ↓
Service Layer (optional)
  ↓
MikroORM Entity Manager
  ↓
PostgreSQL
  ↓
Redirect/Response
```

## Authentication Flow

### Magic Link Login

```
1. User enters email
   ↓
2. Action sends magic link email
   ↓
3. User clicks link
   ↓
4. Loader validates token
   ↓
5. Create session (Better Auth)
   ↓
6. Redirect to app
```

### Protected Routes

```typescript
// app/routes/app/route.tsx
export async function loader({request}: LoaderFunctionArgs) {
  const session = await auth.api.getSession({headers: request.headers});
  
  if (!session) {
    throw redirect('/auth/login');
  }
  
  return json({user: session.user});
}
```

## Database Architecture

### Two Migration Systems

1. **MikroORM Migrations** - Application entities
   - TypeScript files
   - Versioned in git
   - Manual creation

2. **Better Auth Migrations** - Auth tables
   - SQL files
   - Auto-generated
   - Not versioned

### Schema Organization

```
PostgreSQL Database
├── Application Tables (MikroORM)
│   ├── team
│   ├── role
│   └── user_team
│
└── Auth Tables (Better Auth)
    ├── user
    ├── session
    ├── account
    └── verification
```

### Migration Order

Migrations run in sequence:
1. MikroORM migrations
2. Better Auth migrations

Unified command: `make dev-migrate`

## Configuration Management

### Environment-based Config (Convict)

```typescript
// app/config/globals.ts
const schema = {
  env: {
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  database: {
    postgres: {
      host: {env: 'POSTGRES_HOST'},
      // ...
    },
  },
};

export default convict(schema);
```

### Usage

```typescript
import globals from '~config/globals';

const dbHost = globals.get('database.postgres.host');
```

## Error Handling Strategy

### 1. Remix Error Boundaries

```typescript
export function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error)) {
    return <div>Error {error.status}: {error.data}</div>;
  }
  
  return <div>Unexpected error</div>;
}
```

### 2. Result Types (neverthrow)

```typescript
import {ok, err, Result} from 'neverthrow';

function parseData(raw: unknown): Result<Data, Error> {
  try {
    const data = validate(raw);
    return ok(data);
  } catch (e) {
    return err(new Error('Invalid data'));
  }
}

// Usage
const result = parseData(input);
result
  .map(data => processData(data))
  .mapErr(error => logError(error));
```

### 3. Try/Catch for Async

```typescript
async function loadUser(id: string) {
  try {
    return await db.user.findOneOrFail({id});
  } catch (error) {
    console.error('Failed to load user:', error);
    throw new Response('User not found', {status: 404});
  }
}
```

## Security Considerations

### CSRF Protection

```typescript
// app/lib/csrf/csrf.server.ts
export async function validateCSRF(request: Request) {
  // CSRF validation logic
}
```

### Session Management

- **Better Auth** handles sessions
- Cookie-based sessions
- Secure, HTTP-only cookies
- Session expiration

### Input Validation

- **Always validate on server**
- Use Valibot schemas
- Validate in actions, not just client

```typescript
import * as v from 'valibot';

const schema = v.object({
  email: v.string([v.email()]),
});

const result = v.safeParse(schema, formData);
if (!result.success) {
  throw new Error('Invalid input');
}
```

## Performance Optimization

### Database Queries

```typescript
// ✅ Good - single query with relations
const user = await em.findOne(User, {id}, {
  populate: ['teams', 'teams.roles'],
});

// ❌ Avoid - N+1 queries
const user = await em.findOne(User, {id});
const teams = await em.find(Team, {users: user});
```

### Caching Strategy (Future)

- Redis for session storage
- HTTP caching headers
- CDN for static assets

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────┐
│          Traefik (Reverse Proxy)    │
│  - SSL/TLS termination              │
│  - Load balancing                   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│        Docker Container             │
│  ┌──────────────────────────────┐   │
│  │   Node.js (Remix App)        │   │
│  └──────────────────────────────┘   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│     PostgreSQL Container            │
│  - Persistent volume                │
└─────────────────────────────────────┘
```

## Future Considerations

### Planned Enhancements

1. **API Versioning** - `/api/v1/...`
2. **GraphQL Layer** - Alternative to REST
3. **Caching Layer** - Redis integration
4. **Job Queue** - Background task processing
5. **Monitoring** - Error tracking (Sentry)
6. **Testing** - Unit, integration, E2E tests

---

**Last Updated:** 2. října 2025
