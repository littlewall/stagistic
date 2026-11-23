import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {toWhatsNewReleases} from './toWhatsNewReleases';

const note = (overrides: Record<string, unknown> = {}) => ({
    type: 'feature' as const,
    title: 'Start from a template',
    highlight: true,
    breaking: false,
    description: 'Pick one.',
    ...overrides,
});

const releaseOf = (overrides: Record<string, unknown> = {}) => [
    {
        release: '0.2.0',
        date: '2026-11-06',
        notes: [note(overrides)],
    },
];

describe('toWhatsNewReleases', () => {
    it('keeps order, number, date and note text, and drops fields the dialog does not show', () => {
        const releases = [
            {
                release: '0.3.0',
                date: '2026-12-02',
                notes: [note({breaking: true})],
            },
            ...releaseOf(),
        ];

        expect(toWhatsNewReleases(releases)).toEqual([
            {
                release: '0.3.0',
                date: '2026-12-02',
                notes: [
                    {
                        type: 'feature',
                        title: 'Start from a template',
                        breaking: true,
                        highlight: true,
                        description: 'Pick one.',
                    },
                ],
            },
            {
                release: '0.2.0',
                date: '2026-11-06',
                notes: [
                    {
                        type: 'feature',
                        title: 'Start from a template',
                        breaking: false,
                        highlight: true,
                        description: 'Pick one.',
                    },
                ],
            },
        ]);
    });

    it('resolves docs and article paths against their sites and keeps https addresses', () => {
        const [first] = toWhatsNewReleases(releaseOf({docs: '/guide/templates', article: '/articles/templates'}));
        const [second] = toWhatsNewReleases(releaseOf({docs: 'https://example.com/a', article: 'https://example.com/b'}));

        expect(first.notes[0].docsUrl).toBe('https://docs.stagistic.com/guide/templates');
        expect(first.notes[0].articleUrl).toBe('https://stagistic.com/articles/templates');
        expect(second.notes[0].docsUrl).toBe('https://example.com/a');
        expect(second.notes[0].articleUrl).toBe('https://example.com/b');
    });

    it.each([
        'javascript:alert',
        'http://example.com/a',
        '//example.com/a',
        'guide/templates',
        'data:text/html,hi',
    ])('drops the unsafe or unclear link %s', value => {
        const [release] = toWhatsNewReleases(releaseOf({docs: value, article: value}));

        expect(release.notes[0].docsUrl).toBeUndefined();
        expect(release.notes[0].articleUrl).toBeUndefined();
    });

    it('keeps only images served from the app itself', () => {
        const [local] = toWhatsNewReleases(releaseOf({image: '/release-images/templates.png'}));

        expect(local.notes[0].image).toBe('/release-images/templates.png');

        for (const image of [
            'https://example.com/i.png',
            '//example.com/i.png',
            'data:image/png;base64,AA',
            'i.png',
        ]) {
            const [release] = toWhatsNewReleases(releaseOf({image}));

            expect(release.notes[0].image).toBeUndefined();
        }
    });

    it('includes patch Releases with highlights, but drops notes without highlights and empty releases', () => {
        const releases = [
            {
                release: '0.2.1',
                date: '2026-11-08',
                notes: [note({title: 'Patch highlight'}), note({title: 'Patch minor', highlight: false})],
            },
            {
                release: '0.2.0',
                date: '2026-11-06',
                notes: [note({title: 'Feature highlight'}), note({title: 'Quiet change', highlight: false})],
            },
            {
                release: '0.1.9',
                date: '2026-11-01',
                notes: [note({title: 'Only non-highlight', highlight: false})],
            },
        ];

        const result = toWhatsNewReleases(releases);

        expect(result.map(release => release.release)).toEqual(['0.2.1', '0.2.0']);
        expect(result[0].notes.map(item => item.title)).toEqual(['Patch highlight']);
        expect(result[1].notes.map(item => item.title)).toEqual(['Feature highlight']);
    });
});
