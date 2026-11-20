import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ReleaseNoteFragment} from './index';
import {
    composeRelease,
    listReleases,
    parseRelease,
    ReleaseNotesError,
    serializeRelease,
} from './index';

const fragment = (overrides: Partial<ReleaseNoteFragment> = {}): ReleaseNoteFragment => ({
    type: 'fix',
    bump: 'patch',
    highlight: false,
    breaking: false,
    title: 'A fix',
    description: 'Something works again.',
    ...overrides,
});

describe('composeRelease', () => {
    it('puts breaking notes first, then features, improvements and fixes', () => {
        const release = composeRelease({
            release: '0.2.0',
            date: '2026-11-06',
            fragments: [
                fragment({title: 'fix'}),
                fragment({type: 'improvement', title: 'improvement'}),
                fragment({type: 'feature', title: 'feature'}),
                fragment({
                    type: 'improvement',
                    bump: 'minor',
                    highlight: true,
                    breaking: true,
                    title: 'breaking',
                }),
            ],
        });

        expect(release.notes.map(note => note.title)).toEqual([
            'breaking',
            'feature',
            'improvement',
            'fix',
        ]);
    });

    it('drops the bump, which only matters while preparing', () => {
        const release = composeRelease({
            release: '0.2.0',
            date: '2026-11-06',
            fragments: [fragment()],
        });

        expect(release.notes[0]).not.toHaveProperty('bump');
    });
});

describe('serializeRelease and parseRelease', () => {
    it('round-trips a Release including multi-line descriptions and links', () => {
        const release = composeRelease({
            release: '0.2.0',
            date: '2026-11-06',
            fragments: [
                fragment({
                    type: 'feature',
                    highlight: true,
                    title: 'Templates: start faster',
                    description: 'One.\n\nTwo: with colon.',
                    docs: '/docs/t',
                    image: '/i.png',
                    article: '/a/t',
                }),
                fragment({title: 'Fix'}),
            ],
        });

        expect(parseRelease(serializeRelease(release), 'releases/0.2.0.md')).toEqual(release);
    });

    it('rejects a Release without notes', () => {
        expect(() => parseRelease('---\nrelease: 0.2.0\ndate: 2026-11-06\nnotes: []\n---\n', 'releases/0.2.0.md')).toThrow(/notes/);
    });

    it('rejects an impossible date', () => {
        const source = serializeRelease(composeRelease({
            release: '0.2.0',
            date: '2026-11-06',
            fragments: [fragment()],
        })).replace('2026-11-06', '2026-02-30');

        expect(() => parseRelease(source, 'releases/0.2.0.md')).toThrow(/date/);
    });

    it('names the file when a note inside a Release is invalid', () => {
        const source = '---\nrelease: 0.2.0\ndate: 2026-11-06\nnotes:\n  - type: fix\n    title: x\n---\n';

        expect(() => parseRelease(source, 'releases/0.2.0.md')).toThrow(/releases\/0\.2\.0\.md/);
    });
});

describe('listReleases', () => {
    const source = (release: string) => serializeRelease(composeRelease({
        release,
        date: '2026-11-06',
        fragments: [fragment()],
    }));

    it('returns Releases newest first, whatever the input order', () => {
        const list = listReleases({
            '../../../releases/0.9.0.md': source('0.9.0'),
            '../../../releases/0.10.0.md': source('0.10.0'),
            '../../../releases/0.2.0.md': source('0.2.0'),
        });

        expect(list.map(release => release.release)).toEqual([
            '0.10.0',
            '0.9.0',
            '0.2.0',
        ]);
    });

    it('returns an empty list when there are no Releases yet', () => {
        expect(listReleases({})).toEqual([]);
    });

    it('rejects a file whose name differs from its Release number', () => {
        expect(() => listReleases({'../../../releases/0.3.0.md': source('0.2.0')})).toThrow(ReleaseNotesError);
        expect(() => listReleases({'../../../releases/0.3.0.md': source('0.2.0')})).toThrow(/0\.3\.0\.md/);
    });
});
