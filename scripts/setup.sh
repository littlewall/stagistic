#!/bin/bash

# Stagistic Quick Setup Script
# This script helps you get started with Stagistic development

set -e

echo "🎭 Stagistic Quick Setup"
echo "======================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 20.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version must be >= 20.0.0 (current: $(node -v))"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm@9.15.0
fi
echo "✅ pnpm $(pnpm -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop"
    exit 1
fi
echo "✅ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)"

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file"
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "🐳 Starting Docker containers..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Run 'pnpm dev' to start development servers"
echo "   2. Open http://localhost:3000 in your browser"
echo "   3. API is available at http://localhost:4000"
echo ""
echo "📚 For HTTPS setup, see: infra/certs/README.md"
echo ""
