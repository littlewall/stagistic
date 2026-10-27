# Scripts Directory

This directory contains utility scripts for development, deployment, and maintenance.

## Planned Scripts

- `setup.sh` - Initial project setup
- `db-migrate.sh` - Database migration helper
- `docker-cleanup.sh` - Clean up Docker resources
- `generate-ssl.sh` - Generate SSL certificates for local development
- `deploy.sh` - Production deployment script

## Agent verification

Use `moon run root:verify -- [--fresh] <project>:<check> [-- <arguments>]`.
See [AGENTS.md](../AGENTS.md#agent-verification-workflow) for check selection and the merge gate.

`verify.mjs` is the CLI, `verification.mjs` runs/captures checks and shares successful results with the Claude Stop hook, and `verificationInputs.mjs` fingerprints inputs. Records and full logs live in `.git/agent-verification/` (the checkout's actual Git directory for worktrees); they are never staged. Full regression and marketing tests always run afresh. Failed runs retain their exit status and diagnostics and never satisfy another invocation.

The related-test command intentionally executes Vite+ directly in both entry points, matching `root:test-related` in `moon.yml`, so the Stop hook keeps its existing startup cost. Other checks delegate to their canonical moon tasks. Keep the related-test arguments synchronized with moon.yml. Only identical task/argument selections share results; a broad suite does not automatically satisfy a narrower related check.

Common test environment variables (`CI`, `NODE_ENV`, `NODE_OPTIONS`, `TZ`, `LANG`, `LC_*`, `VITE_*`, `VITEST*`, `PLAYWRIGHT*`, `BROWSER*`, `DATABASE_URL`, `PGLITE*`, `STAGISTIC_*`) are hashed, not written into records. For custom environment inputs, external services, ignored fixtures or manually changed installed tools, use `--fresh`. If another agent changes inputs while a check runs, that run is reported but cannot be reused. A concurrent identical invocation waits up to 60 seconds, then fails without launching a duplicate; retry after the owner finishes. Interrupted owners are detected by PID and their locks are recovered.
