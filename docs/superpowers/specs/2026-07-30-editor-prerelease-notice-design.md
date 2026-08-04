# Editor Pre-release Notice

## Goal

Require users to acknowledge the temporary limitations of the experimental
Stagistic Editor before the web app initializes. Keep the same facts available
from the existing Alpha pre-release link in the app footer.

## Scope

This behavior applies only to `apps/web`. The desktop placeholder is unchanged.
The acknowledgement is stored per browser profile and versioned so a future
material change can require acknowledgement again.

## Notice copy

### Pre-release notice

Stagistic Editor is experimental pre-release software. It may contain errors or
behave unexpectedly. Use it at your own risk.

- Your scripts and attachments are stored only in this browser. Sync is not
  available yet.
- Nothing you create is sent from your device. Stagistic does not send
  analytics, telemetry, or other usage data.
- Some preferences, including theme and layout, are stored locally in your
  browser.
- Back up your work regularly. Clearing browser data or losing access to this
  browser may permanently remove it.

The blocking first-run modal ends with:

> By continuing, you acknowledge these temporary limitations.

Its only action is **I understand and continue**.

The footer modal shows the same facts without the acknowledgement sentence and
has a regular **Close** action.

## Architecture

`apps/web` owns the first-run gate because acknowledgement controls web-specific
boot behavior. A small storage module owns the current acknowledgement version,
the local storage key, and safe read/write functions.

The app has three startup states:

1. `needsAcknowledgement`
2. `booting`
3. `ready`

When the stored version does not match the current version, the app renders only
the blocking notice. It does not render routes, repository providers, or the
database loader and does not call the local database preparation function.
The repository module is not evaluated before acknowledgement because creating
its repository singleton starts the local database.

After acknowledgement, the app attempts to store the current version and moves
to the existing database boot flow. A failed write does not block the current
session, but the notice appears again after a reload. A failed read is treated
as missing acknowledgement.

The factual notice body is a shared `packages/ui` component. The web-only gate
adds the acknowledgement sentence and required action. `AppFooter` reuses the
same body inside its dismissible informational modal.

## Interaction and accessibility

The blocking modal uses the existing accessible modal foundation and focus trap.
It has no close action. Escape and clicking the backdrop leave it open. Users
cannot focus or interact with application content because that content is not
rendered before acknowledgement.

The footer modal remains dismissible through its Close action, Escape, and the
backdrop.

## Persistence

Use this namespaced local storage entry with a serialized version value:

```text
stagistic.web.publicPreviewAcknowledgement = "1"
```

Only an exact match with the current version counts as acknowledged. Incrementing
the current version invalidates previous acknowledgement without changing the
storage key.

## Testing

Unit tests cover storage behavior:

- missing acknowledgement;
- matching current version;
- stale or malformed versions;
- local storage read failure;
- local storage write failure.

A browser component test covers the first-run gate:

- application content is absent before acknowledgement;
- Escape and backdrop clicks do not dismiss the notice;
- the acknowledgement action persists the version;
- application content becomes available after acknowledgement.

The existing `AppLayout` browser test is extended to assert all footer notice
facts and that the modal closes through its Close action.

## Out of scope

- Sync, server persistence, analytics, or telemetry implementation.
- Backup creation or export changes.
- A settings control to revoke or reset acknowledgement.
- Changes to the desktop app.
