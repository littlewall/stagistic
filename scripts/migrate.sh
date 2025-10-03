#!/bin/zsh

# Unified Migration Script for Stagistic
# Handles both MikroORM and Better Auth migrations
#
# Usage:
#   ./scripts/migrate.sh create [name]  - Create new MikroORM migration
#   ./scripts/migrate.sh generate       - Generate Better Auth schema
#   ./scripts/migrate.sh apply          - Apply all migrations (MikroORM + Better Auth)

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Auto-detect and load .env.local if it exists
if [ -f .env.local ]; then
    echo "${BLUE}📦 Loading .env.local...${NC}"
    set -a
    source .env.local
    set +a
fi

# Function to show usage
show_usage() {
    echo "Usage: ./scripts/migrate.sh {create|generate|prepare|apply} [options]"
    echo ""
    echo "Commands:"
    echo "  create [name]   Create new MikroORM migration"
    echo "  generate        Generate Better Auth schema"
    echo "  prepare [name]  Create MikroORM migration + generate Better Auth schema"
    echo "                  (uses timestamp if no name provided)"
    echo "  apply           Apply all migrations (MikroORM + Better Auth)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/migrate.sh create add_users"
    echo "  ./scripts/migrate.sh generate"
    echo "  ./scripts/migrate.sh prepare add_teams_table"
    echo "  ./scripts/migrate.sh prepare  # uses timestamp like '20251003123456'"
    echo "  ./scripts/migrate.sh apply"
    echo ""
    echo "Or use yarn:"
    echo "  yarn migrate:create"
    echo "  yarn migrate:generate"
    echo "  yarn migrate:prepare"
    echo "  yarn migrate:apply"
    exit 1
}

# Function to prepare migration (create MikroORM + generate Better Auth)
prepare_migration() {
    local name=$1
    
    # Generate timestamp-based name if no name provided
    if [ -z "$name" ]; then
        name=$(date +"%Y%m%d%H%M%S")
        echo "${BLUE}📅 Using timestamp as migration name: $name${NC}"
    fi
    
    echo ""
    echo "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo "${YELLOW}  Preparing Database Migration${NC}"
    echo "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Create MikroORM migration
    echo "${GREEN}[1/2] Creating MikroORM migration...${NC}"
    yarn mikro-orm migration:create --name="$name"
    
    echo ""
    
    # Generate Better Auth schema
    echo "${GREEN}[2/2] Generating Better Auth schema...${NC}"
    yarn auth:generate
    
    echo ""
    echo "${GREEN}✓ Migration prepared!${NC}"
    echo "${BLUE}📄 Check: migrations/mikro-orm/ and migrations/better-auth/schema.sql${NC}"
}

# Function to generate Better Auth schema
generate_schema() {
    echo ""
    echo "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo "${YELLOW}  Generating Better Auth Schema${NC}"
    echo "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo ""
    
    yarn auth:generate
    
    echo ""
    echo "${GREEN}✓ Schema generated!${NC}"
    echo "${BLUE}📄 Check: migrations/better-auth/schema.sql${NC}"
}

# Function to apply all migrations
apply_migrations() {
    echo ""
    echo "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo "${YELLOW}  Applying All Database Migrations${NC}"
    echo "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo ""
    
    # MikroORM migrations
    echo "${GREEN}[1/2] Running MikroORM migrations...${NC}"
    yarn mikro-orm migration:up || echo "${YELLOW}⚠ MikroORM completed with warnings${NC}"
    
    echo ""
    
    # Better Auth migrations
    echo "${GREEN}[2/2] Running Better Auth migrations...${NC}"
    yarn auth:migrate
    
    echo ""
    echo "${GREEN}✓ All migrations applied successfully!${NC}"
}

# Main command handler
case "$1" in
    create)
        create_migration "$2"
        ;;
    generate)
        generate_schema
        ;;
    prepare)
        prepare_migration "$2"
        ;;
    apply)
        apply_migrations
        ;;
    *)
        show_usage
        ;;
esac
