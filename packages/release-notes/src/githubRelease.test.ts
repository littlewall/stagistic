import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {type Release, renderGithubRelease} from './index';

const note = (overrides: Partial<Release['notes'][number]>): Release['notes'][number] => ({
    type: 'feature',
    title: 'T',
    highlight: false,
    breaking: false,
    description: 'D.',
    ...overrides,
});

describe('renderGithubRelease', () => {
    it('lists breaking first, then New, Improved, Fixed, with the Mac app label', () => {
        const text = renderGithubRelease({
            release: '1.0.0',
            date: '2026-12-01',
            notes: [
                note({type: 'fix', title: 'F'}),
                note({
                    type: 'improvement',
                    title: 'I',
                    surface: 'desktop',
                }),
                note({title: 'N', surface: 'web'}),
                note({
                    title: 'B',
                    breaking: true,
                    highlight: true,
                }),
            ],
        });

        expect(text).toBe([
            '### Breaking change: B\n\nD.',
            '### New: N\n\nD.',
            '### Improved: I (Mac app)\n\nD.',
            '### Fixed: F\n\nD.',
        ].join('\n\n') + '\n');
    });
});
