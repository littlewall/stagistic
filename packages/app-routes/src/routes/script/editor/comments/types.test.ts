import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    DEFAULT_COMMENT_FILTER,
    parseCommentFilter,
    parseCommentsViewMode,
} from './types';

describe('parseCommentsViewMode', () => {
    it.each(['beside', 'list'] as const)('accepts %s', mode => {
        expect(parseCommentsViewMode(mode)).toBe(mode);
    });

    it.each([
        'grid',
        null,
        3,
    ])('rejects %s', value => {
        expect(parseCommentsViewMode(value)).toBeUndefined();
    });
});

describe('parseCommentFilter', () => {
    it('keeps a valid stored status', () => {
        expect(parseCommentFilter({status: 'resolved'})).toEqual({status: 'resolved'});
    });

    it('defaults an invalid or missing field instead of dropping the filter', () => {
        expect(parseCommentFilter({status: 'archived'})).toEqual(DEFAULT_COMMENT_FILTER);
        expect(parseCommentFilter({})).toEqual(DEFAULT_COMMENT_FILTER);
    });

    it('rejects non-objects', () => {
        expect(parseCommentFilter('open')).toBeUndefined();
        expect(parseCommentFilter(null)).toBeUndefined();
    });
});
