# Organizace v Stagistic

Aplikace Stagistic používá Better Auth organizace pro správu týmů a jejich členů.

## Better Auth Organization Plugin

Better Auth poskytuje kompletní řešení pro správu organizací včetně:

- **Tabulky organizací** - ukládá informace o organizacích
- **Členové** - vazba mezi uživateli a organizacemi s rolemi
- **Pozvánky** - systém pro pozvání nových členů

### Tabulky

Better Auth vytváří následující tabulky:

```sql
-- Organizace
CREATE TABLE "organization" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "logo" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL,
    "metadata" TEXT
);

-- Členové organizace
CREATE TABLE "member" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL
);

-- Pozvánky do organizací
CREATE TABLE "invitation" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "inviterId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- Aktivní organizace v session
ALTER TABLE "session" ADD COLUMN "activeOrganizationId" TEXT;
```

## Server-side API

Pro práci s organizacemi na serveru používáme vlastní helper funkce v `app/lib/auth/organization.server.ts`:

### Vytvoření organizace

```typescript
import {createOrganization} from '~lib/auth/organization.server';

const org = await createOrganization({
    name: 'Moje Organizace',
    slug: 'moje-organizace',
    userId: session.user.id,
});
```

### Seznam organizací uživatele

```typescript
import {listOrganizationsForUser} from '~lib/auth/organization.server';

const organizations = await listOrganizationsForUser(session.user.id);
```

### Další funkce

- `getOrganizationById(organizationId)` - získat organizaci podle ID
- `getOrganizationMember(organizationId, userId)` - získat členství uživatele
- `listOrganizationMembers(organizationId)` - seznam všech členů
- `updateOrganization(organizationId, data)` - aktualizovat organizaci
- `deleteOrganization(organizationId)` - smazat organizaci

## Client-side API

Na client-side je dostupný Better Auth organizační plugin:

```typescript
import {authClient} from '~lib/auth/client';

// Vytvoření organizace
await authClient.organization.create({
    name: 'Moje Organizace',
    slug: 'moje-organizace',
});

// Seznam organizací
const orgs = await authClient.organization.list();

// Nastavení aktivní organizace
await authClient.organization.setActive(organizationId);
```

## Routes

- `/app/organizations` - redirectuje na `/app/organizations/overview`
- `/app/organizations/overview` - přehled organizací a vytvoření nové
- `/app/organizations/:orgId` - detail organizace (TODO)

## Migrace ze starých "Teams"

Staré vlastní entity `Team`, `UserTeam` a `Role` byly odstraněny a nahrazeny Better Auth organizacemi.

Migration file: `Migration20251002141008_remove_old_team_entities.ts`

Tato migrace smazala:
- Tabulku `team`
- Tabulku `user_team`
- Tabulku `role`

Better Auth organizace poskytují stejnou funkcionalitu s lepší integrací.

## Dokumentace

- [Better Auth Organizations](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth API Reference](https://www.better-auth.com/docs/api-reference)
