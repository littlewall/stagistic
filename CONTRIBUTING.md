# Contributing to Stagistic

Thank you for your interest in contributing to Stagistic! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 24.12.0
- pnpm >= 9.0.0
- Docker and Docker Compose
- Git

### Initial Setup

1. **Fork and clone:**

```bash
git clone https://github.com/yourusername/stagistic.git
cd stagistic
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Setup environment:**

```bash
cp .env.example .env
```

4. **Start development environment:**

```bash
docker compose up -d
pnpm dev
```

## 📋 Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

Example: `feature/add-character-list`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:

```bash
git commit -m "feat: add character tracking to editor"
git commit -m "fix: resolve script export issue"
```

### Pull Request Process

1. **Create a feature branch:**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes and commit:**

```bash
git add .
git commit -m "feat: your feature description"
```

3. **Push to your fork:**

```bash
git push origin feature/your-feature-name
```

4. **Create a Pull Request:**

- Provide a clear title and description
- Reference any related issues
- Include screenshots for UI changes
- Ensure all checks pass

5. **Code Review:**

- Address feedback from reviewers
- Keep discussions professional and constructive

### Database-backed changes

Before designing persisted application state, read the
[local-first state design](docs/superpowers/specs/2026-07-15-local-first-state-sync-design.md)
and [persistence invariants](docs/persistence.md).

Every metadata design and pull request must answer: is each new value owned by
the active document, a derived projection, a persisted metadata collection, a
form draft, or ephemeral UI state? Do not copy repository rows into component
state without an explicit, documented ownership exception.

Use the design's [mutation lifecycle](docs/superpowers/specs/2026-07-15-local-first-state-sync-design.md#4-a-persisted-collection-mutation-completes-only-after-confirmation)
and [testing contract](docs/superpowers/specs/2026-07-15-local-first-state-sync-design.md#testing-strategy)
as the implementation and review checklist.

## 🧪 Testing

_(Testing guidelines will be added as the test suite is implemented)_

```bash
# Run tests (when available)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run type checking
pnpm type-check
```

## 🎨 Code Style

### TypeScript

- Use TypeScript for all new code
- Avoid `any` type - use `unknown` or proper types
- Use interfaces for object shapes
- Use type aliases for unions and complex types

### Formatting

We use Prettier for code formatting:

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check
```

### Linting

We use ESLint for code quality:

```bash
# Lint all files
pnpm lint

# Lint and fix
pnpm lint --fix
```

## 📦 Monorepo Structure

### Adding a New Package

1. Create the package directory:

```bash
mkdir packages/your-package
```

2. Create `package.json`:

```json
{
    "name": "@stagistic/your-package",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "main": "./src/index.ts"
}
```

3. Create `tsconfig.json`:

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    },
    "include": ["src/**/*"]
}
```

4. Create your source files in `src/`

### Adding a New App

Similar to packages, but apps typically have more complex configurations (Vite, Fastify, etc.).

## 🐳 Docker Development

### Using Docker for Development

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Rebuild a service
docker compose up --build api

# Stop all services
docker compose down
```

### Docker Best Practices

- Keep Dockerfiles minimal
- Use multi-stage builds
- Leverage layer caching
- Don't commit sensitive data

## 🔒 Security

### Reporting Security Issues

Please DO NOT open public issues for security vulnerabilities. Instead, email security@stagistic.dev (or create a private security advisory on GitHub).

### Security Best Practices

- Never commit secrets or API keys
- Use environment variables for configuration
- Keep dependencies updated
- Follow OWASP guidelines

## 📝 Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex logic with inline comments
- Update README.md when changing functionality

### README Updates

When adding new features or changing setup:

- Update the main README.md
- Update relevant package READMEs
- Include examples where appropriate

## 🤔 Questions?

- **General Questions**: Use [GitHub Discussions](https://github.com/yourusername/stagistic/discussions)
- **Bug Reports**: Use [GitHub Issues](https://github.com/yourusername/stagistic/issues)
- **Feature Requests**: Use [GitHub Issues](https://github.com/yourusername/stagistic/issues) with the "enhancement" label

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Prioritize project goals over personal preferences

## 🎯 Areas for Contribution

We're especially looking for contributions in:

- **Editor Features**: Script formatting, character tracking, scene management
- **Collaboration**: Real-time editing, conflict resolution
- **Music Notation**: Musical theatre script features
- **Testing**: Unit tests, integration tests, E2E tests
- **Documentation**: Tutorials, guides, API docs
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Internationalization**: Multi-language support

## 🙏 Thank You!

Your contributions make Stagistic better for everyone. Thank you for being part of this project!
