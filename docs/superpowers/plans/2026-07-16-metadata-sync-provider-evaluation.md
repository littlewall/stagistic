# Metadata synchronization — follow-up implementation plan

**Design:** [Metadata synchronization provider evaluation](../specs/2026-07-16-metadata-sync-provider-evaluation.md)

**Status:** Proposed; do not enable production sync from this plan without a
reviewed backend design and rollout approval.

## Phase 0 — Backend and security contract

- [ ] Define authenticated actor/device identity and script authorization.
- [ ] Define an idempotent outbound batch endpoint keyed by operation ID.
- [ ] Define acknowledgements, partial rejection, retry classes, and rate limits.
- [ ] Define an ordered inbound cursor/checkpoint endpoint.
- [ ] Threat-model replay, cross-script access, revoked membership, and payload
  logging.

## Phase 1 — Durable local protocol state

- [ ] Design migrations for outbox attempts/acknowledgements, inbound inbox
  deduplication, and per-device checkpoints.
- [ ] Keep domain row + outbox insert in one PGlite transaction.
- [ ] Apply each inbound batch and its checkpoint in one PGlite transaction.
- [ ] Flush with `syncToFs()` only after each local transaction commits.
- [ ] Add crash/restart tests around send, server commit, acknowledgement, and
  inbound apply boundaries.

## Phase 2 — Domain conflict policies

- [ ] Specify create/update/delete semantics for scripts, places, cues,
  characters, settings/title page, and attachment metadata.
- [ ] Choose revisions or field-level merge rules per domain; do not apply one
  generic last-write-wins rule to every entity.
- [ ] Preserve dirty form/document state on rejection and expose retry/manual
  reconciliation.
- [ ] Keep script body collaboration outside this metadata protocol.

## Phase 3 — Transport adapter

- [ ] Implement the existing replication port against a fake deterministic
  transport first.
- [ ] Add bounded batches, backoff with jitter, connectivity awareness, and
  cancellation.
- [ ] Add the authenticated API transport behind a disabled feature flag.
- [ ] Sanitize diagnostics; never log payloads or user-authored values.

## Phase 4 — Browser and operational validation

- [ ] Test offline mutation, reload, reconnect, acknowledgement loss, duplicate
  inbound batches, two devices, delete/update races, and permission revocation.
- [ ] Confirm inbound PGlite commits reach every mounted collection consumer.
- [ ] Profile outbox growth, drain latency, checkpoint lag, IndexedDB usage, and
  `syncToFs()` cost on feature-length scripts.
- [ ] Define alerts, support tooling, backup/recovery expectations, and a kill
  switch before rollout.

## Rollout gate

Production sync may be enabled only after the backend contract, schema
migrations, conflict matrix, browser suite, privacy review, and operational
runbook are approved. Start with internal accounts and metadata-only sync;
document collaboration remains a separate project.
