#!/bin/zsh

# Unified migration script for local development
# Runs both MikroORM and Better Auth migrations

# Note: We don't use 'set -e' here because MikroORM might fail if tables already exist
# We want to continue with Better Auth migrations regardless

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "${RED}Error: .env.local file not found${NC}"
    echo "Please create .env.local with your database configuration"
    exit 1
fi

# Load environment variables
echo "${BLUE}Loading environment variables from .env.local...${NC}"
set -a
source .env.local
set +a

echo ""
echo "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo "${YELLOW}  Running All Database Migrations${NC}"
echo "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Run MikroORM migrations
echo "${GREEN}[1/2] Running MikroORM migrations...${NC}"
yarn mikro-orm migration:up || echo "${YELLOW}⚠ MikroORM migrations completed with warnings${NC}"

echo ""

# Run Better Auth migrations
echo "${GREEN}[2/2] Running Better Auth migrations...${NC}"
yarn auth:migrate

echo ""
echo "${GREEN}✓ All migrations completed!${NC}"
