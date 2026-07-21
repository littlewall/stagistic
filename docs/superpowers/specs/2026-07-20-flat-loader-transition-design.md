# Flat Loader and Script Creation Transition Design

## Goal

Make loading states visually quiet and spatially stable, and show the loading state immediately after submitting the new-script form so the optimistic home-page update is never exposed.

## Root Cause

`ProgressPanel` is currently a bordered, raised card whose text appears above the progress bar. `LoaderOverlay` centers the complete panel, so text wrapping changes the panel height and moves the progress bar vertically.

New-script creation updates the reactive script list optimistically. Once creation resolves, `handleCreate` closes the modal before navigating to the editor. That exposes the updated home page until the editor route mounts its loader.

## Loader Design

`ProgressPanel` becomes a flat content stack:

- no background, border, radius, shadow, or card padding;
- progress bar first;
- only currently active operation messages grouped below the bar;
- parallel operations appear as separate rows;
- a completed operation is removed instead of remaining as historical copy;
- the small variant changes spacing only.

The component receives an accessible progress label separately from its active
message list. Existing title, subtitle, status, and hint layers are replaced by
this explicit operation model so sequential loading stages cannot accumulate.

`LoaderOverlay` keeps the progress row at the vertical center of the viewport. Its text remains in normal flow below that fixed anchor, so additional lines expand downward without moving the bar. The loader remains horizontally centered and retains the existing maximum width.

Inline `ProgressPanel` consumers use the same flat appearance and bar-first information order, but retain their surrounding page layout rather than viewport anchoring.

## New-Script Transition

Submitting `NewScriptModal` immediately replaces the form content with `LoaderOverlay` while the existing `onCreate` promise is pending. Because the loader remains inside the native modal top layer, it fully covers the home page during optimistic script creation.

On successful creation, the modal records `/script/:scriptId/editor` as its
transition target and requests navigation without closing. The loader remains
active after persistence finishes. `GlobalModalsProvider` closes the modal only
after React Router reports that exact pathname, revealing the editor route's
existing loader rather than the updated home list.

If creation fails, the global mutation reports the existing error toast and resolves while leaving the modal open. `NewScriptModal` then restores the form from its retained local state, including the entered name and selected structure.

The transition is immediate. No additional entrance, exit, or crossfade animation is introduced.

## Accessibility

- The transition loader uses the existing `role="status"` and polite live region.
- The progress bar keeps its accessible label.
- The form is absent while submission is pending, preventing duplicate submissions and closure during the transition.
- Existing reduced-motion behavior of the indeterminate progress bar remains unchanged.

## Tests

- Browser-test that changing multiline loader text does not change the progress bar position.
- Browser-test the flat appearance and bar-before-text DOM order.
- Browser-test that parallel active messages render together and a completed message disappears.
- Browser-test that `NewScriptModal` immediately replaces the form with a loader and restores the preserved draft when a pending create settles while the modal remains open.
- Browser-test that successful script creation starts a target-route transition without closing the modal.
- Browser-test that the transition closes only after the router reaches its target pathname.

## Non-goals

- Changing progress colors, timing, or percentage behavior.
- Adding a new router-level transition framework.
- Changing import or duplicate-script transitions.
- Changing script persistence or optimistic store behavior.
