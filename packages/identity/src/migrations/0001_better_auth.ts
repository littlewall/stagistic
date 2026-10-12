/*
 * Better Auth tables (user, session, account, verification, passkey, jwks,
 * rateLimit) for the plugins in ../auth.ts. Generated with
 * scripts/compileMigration.ts against an empty schema; regenerate a new
 * numbered migration when plugins change (the migration test checks drift).
 */
export const BETTER_AUTH_0001 = `
create table "user" (
    "id" text not null primary key,
    "name" text not null,
    "email" text not null unique,
    "emailVerified" boolean not null,
    "image" text,
    "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create table "session" (
    "id" text not null primary key,
    "expiresAt" timestamptz not null,
    "token" text not null unique,
    "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamptz not null,
    "ipAddress" text,
    "userAgent" text,
    "userId" text not null references "user" ("id") on delete cascade
);

create table "account" (
    "id" text not null primary key,
    "accountId" text not null,
    "providerId" text not null,
    "userId" text not null references "user" ("id") on delete cascade,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamptz,
    "refreshTokenExpiresAt" timestamptz,
    "scope" text,
    "password" text,
    "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamptz not null
);

create table "verification" (
    "id" text not null primary key,
    "identifier" text not null,
    "value" text not null,
    "expiresAt" timestamptz not null,
    "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create table "passkey" (
    "id" text not null primary key,
    "name" text,
    "publicKey" text not null,
    "userId" text not null references "user" ("id") on delete cascade,
    "credentialID" text not null,
    "counter" integer not null,
    "deviceType" text not null,
    "backedUp" boolean not null,
    "transports" text,
    "createdAt" timestamptz,
    "aaguid" text
);

create table "jwks" (
    "id" text not null primary key,
    "publicKey" text not null,
    "privateKey" text not null,
    "createdAt" timestamptz not null,
    "expiresAt" timestamptz,
    "alg" text,
    "crv" text
);

create table "rateLimit" (
    "id" text not null primary key,
    "key" text not null unique,
    "count" integer not null,
    "lastRequest" bigint not null
);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");

create index "passkey_userId_idx" on "passkey" ("userId");

create index "passkey_credentialID_idx" on "passkey" ("credentialID");
`;
