#!/bin/bash

# Generate SSL certificates for local HTTPS development using mkcert

set -e

echo "🔒 SSL Certificate Generator for Stagistic"
echo "=========================================="
echo ""

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert is not installed."
    echo ""
    echo "Install mkcert:"
    echo "  macOS:   brew install mkcert"
    echo "  Linux:   See https://github.com/FiloSottile/mkcert#installation"
    echo "  Windows: choco install mkcert"
    exit 1
fi

echo "✅ mkcert is installed"

# Check if CA is installed
if ! mkcert -CAROOT &> /dev/null; then
    echo "⚠️  Local CA not found. Installing..."
    mkcert -install
    echo "✅ Local CA installed"
else
    echo "✅ Local CA is already installed"
fi

# Navigate to certs directory
cd "$(dirname "$0")/../infra/certs"

echo ""
echo "📜 Generating certificates for stagistic.local..."

# Generate certificates
mkcert stagistic.local

echo ""
echo "✅ Certificates generated successfully!"
echo ""
echo "📄 Generated files:"
echo "   - stagistic.local.pem"
echo "   - stagistic.local-key.pem"
echo ""
echo "🔧 Next steps:"
echo "   1. Add to /etc/hosts:"
echo "      127.0.0.1 stagistic.local"
echo ""
echo "   2. Start with HTTPS:"
echo "      docker compose -f docker-compose.yml -f infra/proxy/caddy/docker-compose.https.yml up -d"
echo ""
echo "   3. Access: https://stagistic.local"
echo ""
