import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {getReleaseNoteWeight} from './noteLabels';

describe('getReleaseNoteWeight', () => {
    it.each([
        [
            'feature',
            true,
            'highlight',
        ],
        [
            'fix',
            true,
            'highlight',
        ],
        [
            'fix',
            false,
            'fix',
        ],
        [
            'feature',
            false,
            'plain',
        ],
        [
            'improvement',
            false,
            'plain',
        ],
    ] as const)('a %s note with highlight %s weighs %s', (type, highlight, weight) => {
        expect(getReleaseNoteWeight({type, highlight})).toBe(weight);
    });
});
