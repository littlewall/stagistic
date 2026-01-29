# Multi-stage build for production
FROM node:24.12-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (only what is needed)
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./

# Build
WORKDIR /app/apps/api
RUN pnpm build

# Production stage
FROM node:24.12-alpine

WORKDIR /app

# Copy pnpm store and app node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy built files and package manifest
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/index.js"]
