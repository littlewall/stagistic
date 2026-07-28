# Quiet Act Row Design

## Goal

Restore the structure sidebar act row to a quiet hierarchy and align act names with scene numbers.

## Approved Design

- Remove the act icon and its wrapper.
- Align the act title with the scene-number axis, which starts after the scene drag-handle footprint: 14 scaled pixels.
- Restore the delete control to the original native icon-button markup.
- Keep the delete control transparent and borderless-looking at rest, reveal it on row hover, and retain keyboard focus visibility.
- Preserve the existing delete behavior and accessible label.

## Verification

- Extend the act-row browser test to verify the icon is absent.
- Verify the delete control has a transparent border and background at rest.
- Verify the act title begins 14 pixels from the row edge at size scale 1.
- Run the focused browser test, app-routes browser suite, typecheck, lint, and graph update.
