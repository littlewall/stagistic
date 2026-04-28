import {
    type PaginationOptions,
    type SpacerOverlay,
} from '../types';

export const createSpacerElement = (
    height: number,
    options: PaginationOptions,
    dividerOffset?: number,
    overlay?: SpacerOverlay,
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
        spacer.style.display = 'inline-block';
        spacer.style.width = '100%';
    }

    if (dividerOffset !== undefined) {
        const divider = document.createElement('div');

        divider.dataset.paginationDivider = 'true';
        divider.style.position = 'absolute';
        divider.style.left = `${-options.marginLeft}px`;
        divider.style.top = `${Math.max(0, dividerOffset)}px`;
        divider.style.width = `calc(100% + ${options.marginLeft + options.marginRight}px)`;
        divider.style.borderTop = `${Math.max(1, options.dividerThickness)}px solid ${options.dividerColor}`;
        divider.style.pointerEvents = 'none';

        spacer.appendChild(divider);
    }

    const bottomSpacing = Math.max(0, dividerOffset ?? 0);
    const topSpacing = Math.max(0, height - bottomSpacing);
    const lineHeight = Math.max(1, options.lineHeightPx);
    const textGap = Math.max(2, Math.round(lineHeight * 0.25));
    const moreTop = Math.min(Math.max(0, bottomSpacing - lineHeight), textGap);
    const contdTop = Math.max(
        bottomSpacing,
        bottomSpacing + topSpacing - lineHeight - textGap,
    );

    if (overlay?.moreText) {
        const moreEl = document.createElement('div');

        moreEl.dataset.paginationOverlay = 'more';
        moreEl.textContent = overlay.moreText;
        moreEl.style.position = 'absolute';
        moreEl.style.right = '0';
        moreEl.style.top = `${moreTop}px`;
        moreEl.style.fontFamily = 'inherit';
        moreEl.style.fontSize = '0.9em';
        moreEl.style.lineHeight = `${options.lineHeightPx}px`;
        moreEl.style.letterSpacing = '0.02em';
        moreEl.style.textTransform = 'uppercase';
        moreEl.style.color = 'var(--color-ink-muted)';
        moreEl.style.opacity = '0.75';
        moreEl.style.userSelect = 'none';

        spacer.appendChild(moreEl);
    }

    if (overlay?.contdText) {
        const contdEl = document.createElement('div');

        contdEl.dataset.paginationOverlay = 'contd';
        contdEl.textContent = overlay.contdText;
        contdEl.style.position = 'absolute';
        contdEl.style.left = 'var(--editor-character-indent, 56px)';
        contdEl.style.top = `${contdTop}px`;
        contdEl.style.fontFamily = 'inherit';
        contdEl.style.fontSize = '0.9em';
        contdEl.style.lineHeight = `${options.lineHeightPx}px`;
        contdEl.style.letterSpacing = '0.02em';
        contdEl.style.textTransform = 'uppercase';
        contdEl.style.color = 'var(--color-ink-muted)';
        contdEl.style.opacity = '0.75';
        contdEl.style.userSelect = 'none';

        spacer.appendChild(contdEl);
    }

    return spacer;
};
