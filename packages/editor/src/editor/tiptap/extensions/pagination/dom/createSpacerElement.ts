import {
    type PaginationOptions,
} from '../types';

export const createSpacerElement = (
    height: number,
    options: PaginationOptions,
    dividerOffset?: number,
    isInlineBreak = false,
): HTMLElement => {
    const spacer = document.createElement(isInlineBreak ? 'span' : 'div');

    spacer.dataset.paginationSpacer = 'true';
    if (isInlineBreak) {
        spacer.dataset.paginationInlineBreak = 'true';
    }

    spacer.contentEditable = 'false';
    spacer.style.position = 'relative';
    spacer.style.height = `${Math.max(0, height)}px`;
    spacer.style.pointerEvents = 'none';

    if (isInlineBreak) {
        spacer.style.display = 'block';
        spacer.style.width = '100%';
    }

    if (dividerOffset !== undefined) {
        const divider = document.createElement('div');

        divider.dataset.paginationDivider = 'true';

        const inset = options.dividerInsetPx ?? 0;

        divider.style.position = 'absolute';
        divider.style.left = `${-options.marginLeft + inset}px`;
        divider.style.top = `${Math.max(0, dividerOffset)}px`;
        divider.style.width = `calc(100% + ${options.marginLeft + options.marginRight - inset * 2}px)`;
        divider.style.borderTop = `${Math.max(1, options.dividerThickness)}px solid ${options.dividerColor}`;
        divider.style.pointerEvents = 'none';

        spacer.appendChild(divider);
    }

    return spacer;
};
