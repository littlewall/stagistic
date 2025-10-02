# Better Auth Migrace

Tento dokument popisuje, jak pracovat s Better Auth migracemi v projektu.

## Nastavení

### Lokální vývoj

1. Zkopírujte `.env.example` do `.env`:
   ```bash
   cp .env.example .env
   ```

2. Upravte hodnoty v `.env` podle potřeby (zejména databázové údaje, pokud používáte jiné než výchozí)

### Docker prostředí

Environment proměnné jsou definované v `docker-compose.dev.yml`, není potřeba nic dalšího nastavovat.

## Použití

### Lokální spuštění (bez Dockeru)

Před spuštěním se ujistěte, že máte:
- PostgreSQL databázi běžící na `localhost:5432`
- Nastavený `.env` soubor s korektními údaji

```bash
# Generování Better Auth migrací
yarn auth:generate

# Spuštění Better Auth migrací
yarn auth:migrate
```

### Docker prostředí

```bash
# Generování Better Auth migrací v Docker kontejneru
yarn auth:generate:docker

# Spuštění Better Auth migrací v Docker kontejneru
yarn auth:migrate:docker
```

## Poznámky

- Better Auth migrace používají samostatný config soubor `app/lib/auth/auth.config.ts`
- Tento config číst environment proměnné přímo, aby byl kompatibilní s Better Auth CLI
- Aplikace stále používá `auth.server.ts`, který pouze re-exportuje instanci z `auth.config.ts`
- Pro lokální vývoj je nutné mít `.env` soubor, protože Better Auth CLI běží mimo Docker kontext

## Řešení problémů

### "Couldn't read your auth config"

Tato chyba se objevuje když:
1. Chybí environment proměnné (pro lokální spuštění vytvořte `.env` soubor)
2. TypeScript nemůže správně zpracovat importy (použijte `NODE_OPTIONS='--import tsx'`)

### Databázové připojení selhává

- **Lokálně**: Zkontrolujte, že PostgreSQL běží a údaje v `.env` jsou správné
- **Docker**: Ujistěte se, že kontejner `postgres` běží: `docker compose -f docker-compose.dev.yml ps`
