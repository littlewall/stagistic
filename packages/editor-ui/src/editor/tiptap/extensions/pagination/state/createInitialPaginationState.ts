import {
    type PaginationOptions,
    type PaginationState,
} from '../types';

export const createInitialPaginationState = (options: PaginationOptions): PaginationState => {
    return {
        pageCount: 1,
        pages: [],
        pageHeight: options.pageHeight,
        contentHeight: Math.max(
            0,
            options.pageHeight - options.marginTop - options.marginBottom,
        ),
        lineHeightPx: options.lineHeightPx,
        marginTop: options.marginTop,
        marginBottom: options.marginBottom,
        marginLeft: options.marginLeft,
        marginRight: options.marginRight,
    };
};
