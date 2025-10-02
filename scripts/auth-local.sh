#!/bin/zsh

# Better Auth CLI helper script for local development
# This script loads environment variables from .env.local and runs Better Auth commands

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

# Run the command
case "$1" in
    "generate")
        echo "${GREEN}Generating Better Auth schema...${NC}"
        yarn auth:generate
        ;;
    "migrate")
        echo "${GREEN}Running Better Auth migrations...${NC}"
        yarn auth:migrate
        ;;
    *)
        echo "Usage: $0 {generate|migrate}"
        echo ""
        echo "Commands:"
        echo "  generate  - Generate Better Auth schema (preview changes)"
        echo "  migrate   - Run Better Auth migrations (apply changes)"
        exit 1
        ;;
esac
