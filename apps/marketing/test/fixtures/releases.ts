import type {Release} from '@stagistic/release-notes';

/** Two Releases covering every note kind, an image, links, breaking and unsafe input. */
export const fixtureReleases: Release[] = [
    {
        release: '99.0.0',
        date: '2026-12-02',
        notes: [
            {
                type: 'improvement',
                title: 'Safer exports',
                highlight: true,
                breaking: true,
                description: 'Exports now **skip** empty scenes.\n\n- one\n- two',
                docs: '/guide/export',
            },
            {
                type: 'feature',
                title: 'Start from a template',
                highlight: true,
                breaking: false,
                description: 'Pick a [template](https://example.com/t?a=1&b=2) and write. <script>alert(1)</script>',
                image: '/images/templates.png',
                docs: '/guide/templates',
                article: '/articles/templates',
            },
            {
                type: 'fix',
                title: 'Cue numbers & ids',
                highlight: false,
                breaking: false,
                description: 'Cue `<b>` stays literal. [bad](javascript:alert(1))',
                image: 'https://evil.example/x.png',
            },
        ],
    },
    {
        release: '98.0.0',
        date: '2026-11-06',
        notes: [
            {
                type: 'feature',
                title: 'Board view',
                highlight: true,
                breaking: false,
                description: 'See every scene at a glance.',
            },
        ],
    },
];
