import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {isCommentFilterActive, matchesCommentFilter} from './filterThreads';
import {DEFAULT_COMMENT_FILTER} from './types';

describe('matchesCommentFilter', () => {
    it.each([
        [
            'open',
            'open',
            true,
        ],
        [
            'open',
            'resolved',
            false,
        ],
        [
            'resolved',
            'resolved',
            true,
        ],
        [
            'resolved',
            'open',
            false,
        ],
        [
            'all',
            'open',
            true,
        ],
        [
            'all',
            'resolved',
            true,
        ],
    ] as const)('filter %s with status %s → %s', (status, threadStatus, expected) => {
        expect(matchesCommentFilter({id: 't', status: threadStatus}, {status})).toBe(expected);
    });
});

describe('isCommentFilterActive', () => {
    it('is off for the default filter (All)', () => {
        expect(DEFAULT_COMMENT_FILTER.status).toBe('all');
        expect(isCommentFilterActive(DEFAULT_COMMENT_FILTER)).toBe(false);
    });

    it.each(['open', 'resolved'] as const)('is on for status %s', status => {
        expect(isCommentFilterActive({status})).toBe(true);
    });
});
