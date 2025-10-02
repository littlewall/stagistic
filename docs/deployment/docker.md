# Docker Development Setup

This guide explains how to run the Stagistic application using Docker for development and production.

## Prerequisites

- Docker Desktop or Docker Engine installed
- Docker Compose V2 (included with Docker Desktop)

## Development Environment

### Quick Start

```bash
# Start development environment with hot reload
docker-compose -f docker-compose.dev.yml up

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (clears database and dependencies)
docker-compose -f docker-compose.dev.yml down -v
```

### Features

- **Hot Reload**: Code changes are automatically reflected without rebuilding
- **Volume Mounting**: Your local code is mounted into the container
- **Vite HMR**: Fast refresh enabled on port 5173
- **PostgreSQL**: Dedicated development database
- **Dev Dependencies**: All development tools available

### Running Database Migrations

```bash
# Run migrations
docker-compose -f docker-compose.dev.yml exec app yarn mikro-orm migration:up

# Create a new migration
docker-compose -f docker-compose.dev.yml exec app yarn mikro-orm migration:create

# Rollback migration
docker-compose -f docker-compose.dev.yml exec app yarn mikro-orm migration:down
```

### Accessing Services

- **Application**: 
  - Direct: http://localhost:3000
  - Via Traefik: https://stagistic.local.dvdev.cz (see [TRAEFIK.md](./TRAEFIK.md))
- **PostgreSQL**: localhost:5432 (credentials in docker-compose.dev.yml)

### Debugging

```bash
# Access app container shell
docker-compose -f docker-compose.dev.yml exec app sh

# View app logs in real-time
docker-compose -f docker-compose.dev.yml logs -f app

# View postgres logs
docker-compose -f docker-compose.dev.yml logs -f postgres

# Restart just the app service
docker-compose -f docker-compose.dev.yml restart app
```

## Production Environment

### Quick Start

```bash
# Build and start production environment
docker-compose up --build

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Features

- **Optimized Build**: Multi-stage build for smaller image size
- **Production Dependencies**: Only production dependencies installed
- **Auto Migrations**: Migrations run automatically on startup
- **Health Checks**: PostgreSQL health check ensures database is ready

### Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env` (especially secrets and API keys)

3. For production, make sure to:
   - Generate secure random strings for all secrets
   - Update database credentials
   - Configure your email service (Postmark)
   - Set correct base URLs

### Running in Production

```bash
# Build the image
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Common Tasks

### Rebuild After Dependency Changes

```bash
# Development
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Reset Database

```bash
# Development
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose down -v
docker-compose up
```

### Connect to Database Directly

```bash
# Using psql from host (requires psql installed)
psql -h localhost -p 5432 -U stagistic -d stagistic

# Or from within the postgres container
docker-compose -f docker-compose.dev.yml exec postgres psql -U stagistic -d stagistic
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5432 is already in use:

```bash
# Find process using the port (macOS/Linux)
lsof -i :3000
lsof -i :5432

# Kill the process or change the port in docker-compose.yml
# Example: Change "3000:3000" to "3001:3000"
```

### Permission Issues

If you encounter permission errors with volumes:

```bash
# Remove volumes and recreate
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up
```

### Hot Reload Not Working

If changes aren't reflected:

1. Check that volumes are properly mounted in docker-compose.dev.yml
2. Restart the container: `docker-compose -f docker-compose.dev.yml restart app`
3. Check app logs: `docker-compose -f docker-compose.dev.yml logs -f app`

### Database Connection Issues

If the app can't connect to the database:

1. Check postgres is healthy: `docker-compose -f docker-compose.dev.yml ps`
2. Verify environment variables match in docker-compose file
3. Wait for postgres to be fully ready (health check)
4. Check logs: `docker-compose -f docker-compose.dev.yml logs postgres`

## Traefik Integration

Both development and production environments are configured to work with Traefik reverse proxy out of the box. See [TRAEFIK.md](./TRAEFIK.md) for detailed configuration.

Quick setup:
```bash
# Create the webapp network for Traefik
docker network create webapp

# Start your environment
./docker.sh dev:up
```

Access via:
- **Development**: https://stagistic.local.dvdev.cz
- **Production**: https://stagistic.dvdev.cz

## File Structure

```
.
├── Dockerfile              # Production Dockerfile (multi-stage)
├── Dockerfile.dev          # Development Dockerfile (hot reload)
├── docker-compose.yml      # Production compose file
├── docker-compose.dev.yml  # Development compose file
├── .dockerignore          # Files excluded from Docker build
├── .env.example           # Production environment template
├── .env.docker.dev        # Development environment template
├── docker.sh              # Helper script for Docker commands
├── Makefile               # Alternative command interface
├── DOCKER.md              # This file - comprehensive Docker guide
├── TRAEFIK.md             # Traefik configuration guide
└── QUICKSTART.md          # Quick start guide
```

## Notes

- Development uses volume mounting for instant code updates
- Production builds a static image with all code included
- Database data persists in Docker volumes between restarts
- Use `docker-compose down -v` to completely reset including data
- The app automatically runs migrations on startup in production mode
