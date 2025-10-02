.PHONY: help dev-up dev-down dev-logs dev-shell dev-db dev-migrate-up dev-migrate-create dev-rebuild dev-clean
.PHONY: prod-up prod-down prod-logs prod-shell prod-rebuild prod-clean ps

COMPOSE_DEV := docker-compose -f docker-compose.dev.yml
COMPOSE_PROD := docker-compose

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Development targets:'
	@echo '  dev-up              Start development environment with hot reload'
	@echo '  dev-down            Stop development environment'
	@echo '  dev-restart         Restart development environment'
	@echo '  dev-logs            View development logs (follow mode)'
	@echo '  dev-shell           Open shell in app container'
	@echo '  dev-db              Connect to PostgreSQL database'
	@echo '  dev-migrate-up      Run database migrations (MikroORM)'
	@echo '  dev-migrate-create  Create a new migration (MikroORM)'
	@echo '  dev-migrate-down    Rollback last migration (MikroORM)'
	@echo '  dev-auth-generate   Generate Better Auth schema'
	@echo '  dev-auth-migrate    Run Better Auth migrations'
	@echo '  dev-migrate         Run ALL migrations (MikroORM + Better Auth)'
	@echo '  dev-rebuild         Rebuild development containers (no cache)'
	@echo '  dev-clean           Stop and remove all dev containers, volumes'
	@echo ''
	@echo 'Production targets:'
	@echo '  prod-up             Start production environment'
	@echo '  prod-down           Stop production environment'
	@echo '  prod-restart        Restart production environment'
	@echo '  prod-logs           View production logs (follow mode)'
	@echo '  prod-shell          Open shell in app container'
	@echo '  prod-auth-generate  Generate Better Auth schema'
	@echo '  prod-auth-migrate   Run Better Auth migrations'
	@echo '  prod-migrate        Run ALL migrations (MikroORM + Better Auth)'
	@echo '  prod-rebuild        Rebuild production containers (no cache)'
	@echo '  prod-clean          Stop and remove all prod containers, volumes'
	@echo ''
	@echo 'Common targets:'
	@echo '  ps                  Show status of all containers'
	@echo '  help                Show this help message'

# Development targets
dev-up: ## Start development environment
	@echo "🚀 Starting development environment..."
	$(COMPOSE_DEV) up

dev-down: ## Stop development environment
	@echo "🛑 Stopping development environment..."
	$(COMPOSE_DEV) down

dev-restart: ## Restart development environment
	@echo "🔄 Restarting development environment..."
	$(COMPOSE_DEV) restart

dev-logs: ## View development logs
	@echo "📋 Showing development logs..."
	$(COMPOSE_DEV) logs -f

dev-shell: ## Open shell in development app container
	@echo "🐚 Opening shell in app container..."
	$(COMPOSE_DEV) exec app sh

dev-db: ## Connect to development PostgreSQL database
	@echo "🗄️  Connecting to PostgreSQL database..."
	$(COMPOSE_DEV) exec postgres psql -U stagistic -d stagistic

dev-migrate-up: ## Run database migrations in development
	@echo "⬆️  Running migrations..."
	$(COMPOSE_DEV) exec app yarn mikro-orm migration:up

dev-migrate-create: ## Create a new migration in development
	@echo "📝 Creating new migration..."
	$(COMPOSE_DEV) exec app yarn mikro-orm migration:create

dev-migrate-down: ## Rollback last migration in development
	@echo "⬇️  Rolling back migration..."
	$(COMPOSE_DEV) exec app yarn mikro-orm migration:down

dev-auth-generate: ## Generate Better Auth schema in development
	@echo "🔐 Generating Better Auth schema..."
	$(COMPOSE_DEV) exec app yarn auth:generate

dev-auth-migrate: ## Run Better Auth migrations in development
	@echo "🔐 Running Better Auth migrations..."
	$(COMPOSE_DEV) exec app yarn auth:migrate

dev-migrate: ## Run ALL migrations (MikroORM + Better Auth) in development
	@echo "🗄️  Running all migrations..."
	$(COMPOSE_DEV) exec app yarn migrate:apply

dev-rebuild: ## Rebuild development containers from scratch
	@echo "🔨 Rebuilding development containers..."
	$(COMPOSE_DEV) down
	$(COMPOSE_DEV) build --no-cache
	$(COMPOSE_DEV) up

dev-clean: ## Clean development environment completely
	@echo "🧹 Cleaning development environment..."
	$(COMPOSE_DEV) down -v --rmi all

# Production targets
prod-up: ## Start production environment
	@echo "🚀 Starting production environment..."
	$(COMPOSE_PROD) up -d

prod-down: ## Stop production environment
	@echo "🛑 Stopping production environment..."
	$(COMPOSE_PROD) down

prod-restart: ## Restart production environment
	@echo "🔄 Restarting production environment..."
	$(COMPOSE_PROD) restart

prod-logs: ## View production logs
	@echo "📋 Showing production logs..."
	$(COMPOSE_PROD) logs -f

prod-shell: ## Open shell in production app container
	@echo "🐚 Opening shell in app container..."
	$(COMPOSE_PROD) exec app sh

prod-auth-generate: ## Generate Better Auth schema in production
	@echo "🔐 Generating Better Auth schema..."
	$(COMPOSE_PROD) exec app yarn auth:generate

prod-auth-migrate: ## Run Better Auth migrations in production
	@echo "🔐 Running Better Auth migrations..."
	$(COMPOSE_PROD) exec app yarn auth:migrate

prod-migrate: ## Run ALL migrations (MikroORM + Better Auth) in production
	@echo "🗄️  Running all migrations..."
	$(COMPOSE_PROD) exec app yarn migrate:apply

prod-rebuild: ## Rebuild production containers from scratch
	@echo "🔨 Rebuilding production containers..."
	$(COMPOSE_PROD) down
	$(COMPOSE_PROD) build --no-cache
	$(COMPOSE_PROD) up -d

prod-clean: ## Clean production environment completely
	@echo "🧹 Cleaning production environment..."
	$(COMPOSE_PROD) down -v --rmi all

# Common targets
ps: ## Show container status
	@echo "📊 Container status:"
	@echo ""
	@echo "Development:"
	@$(COMPOSE_DEV) ps 2>/dev/null || echo "  Not running"
	@echo ""
	@echo "Production:"
	@$(COMPOSE_PROD) ps 2>/dev/null || echo "  Not running"
