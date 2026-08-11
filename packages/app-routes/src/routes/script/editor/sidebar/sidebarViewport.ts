const OVERLAY_MAX_WIDTH = 1199;
const EXCLUSIVE_MAX_WIDTH = 1469;

/*
 * Keep these in sync with the matching `@media (max-width: …)` blocks in
 * `packages/editor/src/editor/Editor.module.css`. Below the overlay width the
 * sidebars leave the grid and float above the canvas, so the layout hook has to
 * know about it — a docked sidebar shrinks the script, an overlay one hides it.
 */
export const SIDEBAR_EXCLUSIVE_QUERY = `(max-width: ${EXCLUSIVE_MAX_WIDTH}px)`;
export const SIDEBAR_OVERLAY_QUERY = `(max-width: ${OVERLAY_MAX_WIDTH}px)`;

export const getSidebarViewportMode = (width: number) => ({
    isExclusive: width <= EXCLUSIVE_MAX_WIDTH,
    isOverlay: width <= OVERLAY_MAX_WIDTH,
});
