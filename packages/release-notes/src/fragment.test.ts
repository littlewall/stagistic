import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {parseFragment, ReleaseNotesError} from './index';

const valid = `---
type: feature
bump: minor
highlight: true
title: Templates
image: /images/templates.png
docs: /docs/templates
article: /articles/templates
---
Start a script from a template.

Pick one on the script list.
`;

const errorOf = (source: string): ReleaseNotesError => {
    try {
        parseFragment(source, 'releases/next/x.md');
    } catch (error) {
        if (error instanceof ReleaseNotesError) {
            return error;
        }

        throw error;
    }
    throw new Error('expected parseFragment to throw');
};

describe('parseFragment', () => {
    it('reads fields and the body as description', () => {
        expect(parseFragment(valid, 'a.md')).toEqual({
            type: 'feature',
            bump: 'minor',
            highlight: true,
            breaking: false,
            title: 'Templates',
            image: '/images/templates.png',
            docs: '/docs/templates',
            article: '/articles/templates',
            description: 'Start a script from a template.\n\nPick one on the script list.',
        });
    });

    it('defaults highlight and breaking to false and omits optional links', () => {
        const note = parseFragment('---\ntype: fix\nbump: patch\ntitle: Fix export\n---\nExport keeps cue marks.\n', 'a.md');

        expect(note).toEqual({
            type: 'fix',
            bump: 'patch',
            highlight: false,
            breaking: false,
            title: 'Fix export',
            description: 'Export keeps cue marks.',
        });
    });

    it('accepts a breaking data change on a highlighted minor note', () => {
        const note = parseFragment(
            '---\ntype: improvement\nbump: minor\nhighlight: true\nbreaking: true\ntitle: New file format\n---\nOld exports cannot be reopened.\n',
            'a.md',
        );

        expect(note.breaking).toBe(true);
    });

    it('names the file and the problem when a field is invalid', () => {
        const error = errorOf('---\ntype: chore\nbump: major\ntitle: " "\n---\nBody.\n');

        expect(error.message).toContain('releases/next/x.md');
        expect(error.issues.join('\n')).toMatch(/type/);
        expect(error.issues.join('\n')).toMatch(/bump/);
        expect(error.issues.join('\n')).toMatch(/title/);
    });

    it('rejects unknown fields so typos do not pass silently', () => {
        const error = errorOf('---\ntype: fix\nbump: patch\ntitle: T\nhilight: true\n---\nBody.\n');

        expect(error.issues.join('\n')).toContain('hilight');
    });

    it('rejects an empty description', () => {
        const error = errorOf('---\ntype: fix\nbump: patch\ntitle: T\n---\n\n');

        expect(error.issues.join('\n')).toMatch(/description/);
    });

    it('rejects a missing front matter block', () => {
        expect(errorOf('Just text.\n').issues.join('\n')).toMatch(/front matter/i);
    });

    it('rejects front matter that is not valid YAML', () => {
        expect(errorOf('---\ntitle: [unclosed\n---\nBody.\n').issues.join('\n')).toMatch(/yaml/i);
    });

    it('requires a breaking note to be a highlighted minor change', () => {
        const patch = errorOf('---\ntype: fix\nbump: patch\nhighlight: true\nbreaking: true\ntitle: T\n---\nBody.\n');

        expect(patch.issues.join('\n')).toMatch(/breaking.*minor/);

        const quiet = errorOf('---\ntype: fix\nbump: minor\nbreaking: true\ntitle: T\n---\nBody.\n');

        expect(quiet.issues.join('\n')).toMatch(/breaking.*highlight/);
    });
});

describe('parseFragment surface', () => {
    it('accepts web and desktop, and none', () => {
        expect(parseFragment(valid.replace('bump: minor', 'bump: minor\nsurface: desktop'), 'x.md').surface).toBe('desktop');
        expect(parseFragment(valid.replace('bump: minor', 'bump: minor\nsurface: web'), 'x.md').surface).toBe('web');
        expect(parseFragment(valid, 'x.md').surface).toBeUndefined();
    });

    it('rejects an unknown surface', () => {
        expect(() => parseFragment(valid.replace('bump: minor', 'bump: minor\nsurface: ios'), 'x.md')).toThrow(/surface/);
    });

    it('rejects bump: major', () => {
        expect(() => parseFragment(valid.replace('bump: minor', 'bump: major'), 'x.md')).toThrow(/bump/);
    });
});
