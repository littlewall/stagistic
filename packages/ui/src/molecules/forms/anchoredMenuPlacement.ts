export type AnchoredMenuPlacement = 'above' | 'below';

interface ResolveAnchoredMenuPlacementArgs {
    anchorTop: number,
    anchorBottom: number,
    menuHeight: number,
    viewportHeight: number,
    viewportMargin: number,
}

interface ResolvedAnchoredMenuPlacement {
    placement: AnchoredMenuPlacement,
    maxHeight: number,
}

export const resolveAnchoredMenuPlacement = ({
    anchorTop,
    anchorBottom,
    menuHeight,
    viewportHeight,
    viewportMargin,
}: ResolveAnchoredMenuPlacementArgs): ResolvedAnchoredMenuPlacement => {
    const spaceAbove = Math.max(0, Math.floor(anchorTop - viewportMargin));
    const spaceBelow = Math.max(0, Math.floor(viewportHeight - anchorBottom - viewportMargin));
    const placement = menuHeight > spaceBelow && spaceAbove > spaceBelow
        ? 'above'
        : 'below';

    return {
        placement,
        maxHeight: placement === 'above' ? spaceAbove : spaceBelow,
    };
};
