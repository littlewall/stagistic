/* Release Notes standing in for the bundled ones, which are empty until the first Release is prepared. */
export const bundledReleaseNotes = {
    currentReleaseNumber: '0.3.0',
    releases: [
        {
            release: '0.3.0',
            date: '2026-12-02',
            notes: [
                {
                    type: 'feature',
                    title: 'Boards everywhere',
                    highlight: true,
                    breaking: false,
                    description: 'Plan on a **wall**.',
                },
                {
                    type: 'fix',
                    title: 'Quiet fix',
                    highlight: false,
                    breaking: false,
                    description: 'Fixed.',
                },
            ],
        },
        {
            release: '0.2.0',
            date: '2026-11-06',
            notes: [
                {
                    type: 'improvement',
                    title: 'Exports changed',
                    highlight: true,
                    breaking: true,
                    description: 'Old exports open as copies.',
                },
            ],
        },
    ],
};

export const LAST_SEEN_RELEASE_KEY = 'stagistic.lastSeenRelease';
