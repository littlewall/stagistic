# Authentication Setup

## Overview

The project uses Better Auth for authentication with magic link and email OTP plugins.

## Configuration

### Shared Configuration
- **File**: `app/lib/auth/config.ts`
- **Purpose**: Shared configuration function used by both app and CLI

### Application Config
- **File**: `app/lib/auth/auth.server.ts`
- **Purpose**: Server-side auth instance with real email sending

### CLI Config
- **File**: `auth.config.ts` (root)
- **Purpose**: CLI configuration for migrations (uses console.log for emails)

## Environment Variables

Required for authentication:
```bash
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
POSTGRES_HOST=localhost
POSTGRES_USER=stagistic
POSTGRES_PASSWORD=password
POSTGRES_DB=stagistic
```

## Commands

### Generate Schema
```bash
yarn migrate:generate
```

### Apply Migrations
```bash
yarn migrate:apply
```

### Docker Commands
```bash
make dev-auth-generate
make dev-auth-migrate
```

## Plugins

- **Magic Link**: Passwordless authentication via email
- **Email OTP**: One-time passwords for verification
- **Organization**: Team management (see organizations docs)

## Email Integration

Uses Postmark for production emails. Configure in `app/lib/auth/auth.server.ts`.

## See Also

- [Database Migrations](../database/migrations.md)
- [Organizations](../organizations/README.md)
