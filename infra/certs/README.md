# TLS Certificates Directory

Place your mkcert-generated certificates here for HTTPS development.

## Setup Instructions

1. Install mkcert:

    ```bash
    # macOS
    brew install mkcert

    # Linux
    curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
    chmod +x mkcert-v*-linux-amd64
    sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
    ```

2. Create local CA:

    ```bash
    mkcert -install
    ```

3. Generate certificates:

    ```bash
    cd infra/certs
    mkcert stagistic.local
    ```

4. Add to /etc/hosts:

    ```
    127.0.0.1 stagistic.local
    ```

5. Start with HTTPS:
    ```bash
    docker compose -f docker-compose.yml -f infra/proxy/caddy/docker-compose.https.yml up
    ```

The certificates should be named:

- stagistic.local.pem
- stagistic.local-key.pem
