import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {parseMarkdown} from './markdown';

describe('parseMarkdown', () => {
    it('splits paragraphs on blank lines and joins soft line breaks with a space', () => {
        expect(parseMarkdown('First line\nsecond line\n\nNext paragraph')).toEqual([
            {kind: 'paragraph', inlines: [{kind: 'text', text: 'First line second line'}]},
            {kind: 'paragraph', inlines: [{kind: 'text', text: 'Next paragraph'}]},
        ]);
    });

    it('reads bullet lists', () => {
        expect(parseMarkdown('- one\n- two\n* three')).toEqual([
            {
                kind: 'list',
                items: [
                    [{kind: 'text', text: 'one'}],
                    [{kind: 'text', text: 'two'}],
                    [{kind: 'text', text: 'three'}],
                ],
            },
        ]);
    });

    it('reads bold, italic, code and web links', () => {
        expect(parseMarkdown('A **bold** and *soft* `code` [guide](https://docs.stagistic.com/x) end')).toEqual([
            {
                kind: 'paragraph',
                inlines: [
                    {kind: 'text', text: 'A '},
                    {kind: 'strong', text: 'bold'},
                    {kind: 'text', text: ' and '},
                    {kind: 'emphasis', text: 'soft'},
                    {kind: 'text', text: ' '},
                    {kind: 'code', text: 'code'},
                    {kind: 'text', text: ' '},
                    {
                        kind: 'link',
                        text: 'guide',
                        href: 'https://docs.stagistic.com/x',
                    },
                    {kind: 'text', text: ' end'},
                ],
            },
        ]);
    });

    it('keeps raw HTML as literal text', () => {
        expect(parseMarkdown('<script>alert(1)</script> <img src=x onerror=y>')).toEqual([
            {
                kind: 'paragraph',
                inlines: [{kind: 'text', text: '<script>alert(1)</script> <img src=x onerror=y>'}],
            },
        ]);
    });

    it.each([
        'javascript:alert',
        'JaVaScRiPt:alert',
        'data:text/html,hi',
        '//evil.example/x',
        '/relative/path',
    ])('turns a link to %s into plain text', href => {
        const [block] = parseMarkdown(`[click](${href})`);

        expect(block).toEqual({kind: 'paragraph', inlines: [{kind: 'text', text: 'click'}]});
    });

    it('treats other Markdown constructs as plain text', () => {
        expect(parseMarkdown('# Heading\n\n![alt](https://x.example/i.png)')).toEqual([
            {kind: 'paragraph', inlines: [{kind: 'text', text: '# Heading'}]},
            {kind: 'paragraph', inlines: [{kind: 'text', text: '![alt](https://x.example/i.png)'}]},
        ]);
    });

    it('returns no blocks for empty text', () => {
        expect(parseMarkdown('  \n\n ')).toEqual([]);
    });
});
