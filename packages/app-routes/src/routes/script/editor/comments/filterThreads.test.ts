import {describe, expect, it} from 'vite-plus/test';

import {matchesCommentFilter} from './filterThreads';

describe('matchesCommentFilter', () => {
    it.each([
        ['open', 'open', true],
        ['open', 'resolved', false],
        ['resolved', 'resolved', true],
        ['resolved', 'open', false],
        ['all', 'open', true],
        ['all', 'resolved', true],
    ] as const)('filter %s with status %s → %s', (status, threadStatus, expected) => {
        expect(matchesCommentFilter({id: 't', status: threadStatus}, {status})).toBe(expected);
    });
});
