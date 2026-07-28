# Flat Toasts Design

## Goal

Bring toast notifications into the app's restrained, flat visual language while preserving clear success, error, and informational states.

## Approved Direction

Use the approved “status dot” variant:

- Every toast uses the same neutral surface and neutral one-pixel border.
- Remove full-surface status tinting and the popover shadow.
- Show status with a six-pixel dot aligned with the title: success, danger, or neutral for informational messages.
- Keep the description aligned beneath the title.
- Reduce padding, corner radius, and spacing between stacked toasts.
- Keep the existing bottom-right placement, maximum of three visible toasts, and four-second default timeout.

## Close Control

- Use the existing `CloseIcon` inside the React Aria close button.
- Render the icon at 12 by 12 pixels within a 24 by 24 pixel borderless hit area.
- Use restrained hover and focus-visible feedback without adding a persistent border.
- Add the accessible label `Zavřít oznámení`.

## Verification

- Add a browser test that renders real success, error, and informational toasts.
- Verify the neutral flat surface is shared across variants.
- Verify each toast has a status indicator.
- Verify the close control's accessible label, hit-area dimensions, and icon dimensions.
- Run the targeted UI browser test, UI typecheck, lint, and graph update.

## Non-goals

- Do not change queue timing, stacking behavior, placement, or toast API.
- Do not introduce a new icon set or animation system.
