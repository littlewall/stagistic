#!/bin/bash

# Docker Helper Script for Stagistic
# Usage: ./docker.sh [command]

set -e

COMPOSE_DEV="docker-compose -f docker-compose.dev.yml"
COMPOSE_PROD="docker-compose"

print_usage() {
    cat << EOF
Docker Helper Script for Stagistic

Usage: ./docker.sh [command]

Development Commands:
  dev:up              Start development environment with hot reload
  dev:down            Stop development environment
  dev:restart         Restart development environment
  dev:logs            View development logs (follow mode)
  dev:shell           Open shell in app container
  dev:db              Connect to PostgreSQL database
  dev:migrate:up      Run database migrations
  dev:migrate:create  Create a new migration
  dev:migrate:down    Rollback last migration
  dev:rebuild         Rebuild development containers (no cache)
  dev:clean           Stop and remove all containers, volumes, and images

Production Commands:
  prod:up             Start production environment
  prod:down           Stop production environment
  prod:restart        Restart production environment
  prod:logs           View production logs (follow mode)
  prod:shell          Open shell in app container
  prod:rebuild        Rebuild production containers (no cache)
  prod:clean          Stop and remove all containers, volumes, and images

Common Commands:
  ps                  Show status of all containers
  help                Show this help message

Examples:
  ./docker.sh dev:up
  ./docker.sh dev:logs
  ./docker.sh prod:rebuild

EOF
}

case "$1" in
    # Development commands
    dev:up)
        echo "🚀 Starting development environment..."
        $COMPOSE_DEV up
        ;;
    dev:down)
        echo "🛑 Stopping development environment..."
        $COMPOSE_DEV down
        ;;
    dev:restart)
        echo "🔄 Restarting development environment..."
        $COMPOSE_DEV restart
        ;;
    dev:logs)
        echo "📋 Showing development logs..."
        $COMPOSE_DEV logs -f
        ;;
    dev:shell)
        echo "🐚 Opening shell in app container..."
        $COMPOSE_DEV exec app sh
        ;;
    dev:db)
        echo "🗄️  Connecting to PostgreSQL database..."
        $COMPOSE_DEV exec postgres psql -U stagistic -d stagistic
        ;;
    dev:migrate:up)
        echo "⬆️  Running migrations..."
        $COMPOSE_DEV exec app yarn mikro-orm migration:up
        ;;
    dev:migrate:create)
        echo "📝 Creating new migration..."
        $COMPOSE_DEV exec app yarn mikro-orm migration:create
        ;;
    dev:migrate:down)
        echo "⬇️  Rolling back migration..."
        $COMPOSE_DEV exec app yarn mikro-orm migration:down
        ;;
    dev:rebuild)
        echo "🔨 Rebuilding development containers..."
        $COMPOSE_DEV down
        $COMPOSE_DEV build --no-cache
        $COMPOSE_DEV up
        ;;
    dev:clean)
        echo "🧹 Cleaning development environment..."
        $COMPOSE_DEV down -v --rmi all
        ;;

    # Production commands
    prod:up)
        echo "🚀 Starting production environment..."
        $COMPOSE_PROD up -d
        ;;
    prod:down)
        echo "🛑 Stopping production environment..."
        $COMPOSE_PROD down
        ;;
    prod:restart)
        echo "🔄 Restarting production environment..."
        $COMPOSE_PROD restart
        ;;
    prod:logs)
        echo "📋 Showing production logs..."
        $COMPOSE_PROD logs -f
        ;;
    prod:shell)
        echo "🐚 Opening shell in app container..."
        $COMPOSE_PROD exec app sh
        ;;
    prod:rebuild)
        echo "🔨 Rebuilding production containers..."
        $COMPOSE_PROD down
        $COMPOSE_PROD build --no-cache
        $COMPOSE_PROD up -d
        ;;
    prod:clean)
        echo "🧹 Cleaning production environment..."
        $COMPOSE_PROD down -v --rmi all
        ;;

    # Common commands
    ps)
        echo "📊 Container status:"
        echo ""
        echo "Development:"
        $COMPOSE_DEV ps 2>/dev/null || echo "  Not running"
        echo ""
        echo "Production:"
        $COMPOSE_PROD ps 2>/dev/null || echo "  Not running"
        ;;
    help|--help|-h|"")
        print_usage
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        print_usage
        exit 1
        ;;
esac
