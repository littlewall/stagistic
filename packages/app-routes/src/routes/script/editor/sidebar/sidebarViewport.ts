export const SIDEBAR_EXCLUSIVE_QUERY = '(max-width: 1469px)';

const OVERLAY_MAX_WIDTH = 1199;
const EXCLUSIVE_MAX_WIDTH = 1469;

export const getSidebarViewportMode = (width: number) => ({
    isExclusive: width <= EXCLUSIVE_MAX_WIDTH,
    isOverlay: width <= OVERLAY_MAX_WIDTH,
});
