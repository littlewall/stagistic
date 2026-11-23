import {
    arbitraryHostileText,
    arbitraryScriptDocument,
    arbitraryScriptTitle,
    arbitraryTitlePage,
    normalizeScriptDocument,
    oracleParameters,
} from '@stagistic/test-oracles';
import * as fc from 'fast-check';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {parseStagistic} from '../parsing/parseStagistic';
import type {TitlePageSettings} from '../titlePage';
import {serializeStagistic} from './serializeStagistic';

/*
 * Oracle for the `.stagistic` text format (docs/adr/0001-property-oracles-fixed-seed.md).
 * Rules, stated independently of the implementation:
 * 1. export then import returns the same script (ids and derived attrs aside), the title
 *    and the title-page fields the file carries;
 * 2. text written by the app is a fixpoint of import then export;
 * 3. import never fails with anything but a controlled parse error.
 * No known loss is excepted here: every loss found while building this oracle was fixed and
 * is kept as a named regression test below.
 */

const EXPORT_DATE = new Date(2026, 0, 15);

const arbitraryExport = fc.record({
    document: arbitraryScriptDocument,
    title: arbitraryScriptTitle,
    titlePage: arbitraryTitlePage,
});

const trimmed = (value: string | undefined) => value?.trim() || undefined;

/* What the file carries of a title page: trimmed values, complete credits, the draft date (auto = export date). */
const expectedTitlePage = (titlePage: TitlePageSettings) => {
    const credits = (titlePage.credits ?? [])
        .map(({credit, authors}) => ({credit: credit.trim(), authors: authors.map(author => author.trim()).filter(Boolean)}))
        .filter(({credit, authors}) => credit && authors.length > 0);
    const manualDate = trimmed(titlePage.draftDate);

    return {
        subtitle: trimmed(titlePage.subtitle),
        credits: credits.length > 0 ? credits : undefined,
        source: trimmed(titlePage.source),
        draftDate: titlePage.draftDateMode === 'manual'
            ? manualDate && (/^\d{4}-\d{2}-\d{2}$/u).test(manualDate) ? manualDate : undefined
            : '2026-01-15',
        contact: trimmed(titlePage.contact),
        copyright: trimmed(titlePage.copyright),
    };
};

const projectTitlePage = ({
    subtitle,
    credits,
    source,
    draftDate,
    contact,
    copyright,
}: TitlePageSettings) => ({
    subtitle,
    credits,
    source,
    draftDate,
    contact,
    copyright,
});

describe('.stagistic round-trip oracle', () => {
    it('export then import returns the same document and title', () => {
        fc.assert(
            fc.property(arbitraryExport, ({
                document,
                title,
                titlePage,
            }) => {
                const text = serializeStagistic(document, {
                    scriptTitle: title,
                    titlePage,
                    exportDate: EXPORT_DATE,
                });
                const result = parseStagistic(text);

                expect(normalizeScriptDocument(result.document)).toEqual(normalizeScriptDocument(document));
                expect(result.title).toBe(title);
                expect(projectTitlePage(result.titlePage)).toEqual(expectedTitlePage(titlePage));
            }),
            oracleParameters(),
        );
    });

    it('text written by the app is a fixpoint of import then export', () => {
        fc.assert(
            fc.property(arbitraryExport, ({
                document,
                title,
                titlePage,
            }) => {
                const text = serializeStagistic(document, {
                    scriptTitle: title,
                    titlePage,
                    exportDate: EXPORT_DATE,
                });

                const result = parseStagistic(text);
                const again = serializeStagistic(result.document, {
                    scriptTitle: result.title ?? '',
                    titlePage: result.titlePage,
                    exportDate: EXPORT_DATE,
                });

                expect(again).toBe(text);
            }),
            oracleParameters(),
        );
    });
});

/*
 * Shapes the generator omits because the editor cannot produce them (not losses to fix):
 * - a `hardBreak` inside a block: only the mini editor (title page fields) has hard breaks; the main
 *   script editor does not register the node (packages/editor useEditorExtensions);
 * - a music start outside a stage direction: changing a stage direction to another block type turns its
 *   music nodes into text (editor normalizeFormerStageDirectionContent).
 */
const textNode = (value: string, marks?: Array<{type: string, attrs?: Record<string, unknown>}>) => ({
    type: 'text',
    text: value,
    ...marks ? {marks} : {},
});
const block = (type: string, ...content: Array<ReturnType<typeof textNode> | {type: string, attrs?: Record<string, unknown>}>) => ({
    type,
    attrs: {id: `${type}-${Math.random()}`},
    content,
});
const SCENE = block('scene', textNode('Scene'));
const CUE = block('character', textNode('ANNA'));
const tag = (name: string) => ({type: 'characterTag', attrs: {characterKey: name.toUpperCase(), characterId: null}});
const musicStart = (mode: 'open' | 'hit', kind: string | null = null) => ({
    type: 'musicStart',
    attrs: {
        musicId: 'music-1',
        mode,
        title: 'Song',
        kind,
    },
});

describe('.stagistic round-trip fixed losses', () => {
    it('keeps an act that has no scene', () => {
        const document = {type: 'doc' as const, content: [block('act', textNode('ACT ONE'))]};
        const result = parseStagistic(serializeStagistic(document, {scriptTitle: 'x', exportDate: EXPORT_DATE}));

        expect(normalizeScriptDocument(result.document)).toEqual(normalizeScriptDocument(document));
    });

    it('keeps text that starts with a number after a music out', () => {
        const document = {
            type: 'doc' as const,
            content: [SCENE, block('stageDirection', textNode('x '), {type: 'musicOut'}, textNode(' 0 a'))],
        };
        const result = parseStagistic(serializeStagistic(document, {scriptTitle: 'x', exportDate: EXPORT_DATE}));

        expect(normalizeScriptDocument(result.document)).toEqual(normalizeScriptDocument(document));
    });

    it('keeps a character name that contains a colon', () => {
        const document = {
            type: 'doc' as const,
            content: [
                SCENE,
                block('character', textNode('ANNA: X')),
                block('dialogue', textNode('hi')),
            ],
        };
        const result = parseStagistic(serializeStagistic(document, {scriptTitle: 'x', exportDate: EXPORT_DATE}));

        expect(normalizeScriptDocument(result.document)).toEqual(normalizeScriptDocument(document));
    });
});

const FIXED_ESCAPING = [
    ['literal underscores in text', block('stageDirection', textNode('snake_case_name'))],
    ['literal asterisks in text', block('stageDirection', textNode('2 * 3 * 4'))],
    ['an `@` inside text', block('stageDirection', textNode('mail a@b.cz'))],
    ['literal backslashes in text', block('stageDirection', textNode('C:\\*dir\\_x\\@'))],
    ['an `@@` inside text', block('stageDirection', textNode('@@music'))],
    ['an uppercase stage direction with a colon', block('stageDirection', textNode('A: a'))],
    ['bold on a character tag', block('stageDirection', textNode('Anna', [{type: 'bold'}, tag('Anna')]))],
    [
        'emphasis on a character tag',
        block('stageDirection', textNode('Anna', [
            {type: 'italic'},
            {type: 'underline'},
            tag('Anna'),
        ])),
    ],
    ['a stage direction starting with `#`', block('stageDirection', textNode('# one'))],
    ['a stage direction starting with `[[`', block('stageDirection', textNode('[[x]]'))],
    ['a stage direction starting with `~`', block('stageDirection', textNode('~'))],
    ['a stage direction in parentheses', block('stageDirection', textNode('(x)'))],
    ['special characters in a scene', block('scene', textNode('A_b*c@d\\e'))],
    ['special characters in a note', block('note', textNode('A_b*c@d\\e'))],
] as const;

describe('.stagistic round-trip fixed escaping and block types', () => {
    it.each(FIXED_ESCAPING)('keeps %s', (_name, node) => {
        const document = {type: 'doc' as const, content: [SCENE, node]};
        const result = parseStagistic(serializeStagistic(document, {scriptTitle: 'x', exportDate: EXPORT_DATE}));

        expect(normalizeScriptDocument(result.document)).toEqual(normalizeScriptDocument(document));
    });

    it.each([
        ['dialogue', block('dialogue', textNode('snake_case *x* a@b \\'))],
        ['aside', block('aside', textNode('so_ft *x* a@b \\'))],
        ['lyrics', block('lyrics', textNode('LA_LA *X* A@B \\'))],
        ['dialogue that is only `~`', block('dialogue', textNode('~'))],
        ['all-uppercase dialogue', block('dialogue', textNode('STOP'))],
        ['dialogue starting with `!`', block('dialogue', textNode('!hey'))],
        ['all-uppercase dialogue starting with `!`', block('dialogue', textNode('!STOP'))],
        ['dialogue that reads like an aside', block('dialogue', textNode('(softly)'))],
        ['all-uppercase dialogue starting with a backslash', block('dialogue', textNode('\\STOP'))],
        ['all-uppercase italic dialogue', block('dialogue', textNode('STOP', [{type: 'italic'}]))],
    ])('keeps %s in speech', (_name, node) => {
        const document = {
            type: 'doc' as const,
            content: [
                SCENE,
                CUE,
                node,
            ],
        };
        const result = parseStagistic(serializeStagistic(document, {scriptTitle: 'x', exportDate: EXPORT_DATE}));

        expect(normalizeScriptDocument(result.document)).toEqual(normalizeScriptDocument(document));
    });

    it('writes a digit after a bare `@@out` escaped and reads it back as text', () => {
        const document = {
            type: 'doc' as const,
            content: [SCENE, block('stageDirection', textNode('x '), {type: 'musicOut'}, textNode(' 7 a'))],
        };
        const text = serializeStagistic(document, {scriptTitle: 'x', exportDate: EXPORT_DATE});

        expect(text).toContain('@@out \\7 a');
        expect(normalizeScriptDocument(parseStagistic(text).document)).toEqual(normalizeScriptDocument(document));
    });

    it('writes a letter glued to `@@out` escaped and reads it back as text', () => {
        const document = {
            type: 'doc' as const,
            content: [SCENE, block('stageDirection', textNode('x '), {type: 'musicOut'}, textNode('ro a'))],
        };
        const text = serializeStagistic(document, {scriptTitle: 'x', exportDate: EXPORT_DATE});

        expect(text).toContain('@@out\\ro a');
        expect(normalizeScriptDocument(parseStagistic(text).document)).toEqual(normalizeScriptDocument(document));
    });
});

const roundTrips = (content: Array<ReturnType<typeof block>>) => {
    const document = {type: 'doc' as const, content};
    const result = parseStagistic(serializeStagistic(document, {scriptTitle: 'x', exportDate: EXPORT_DATE}));

    expect(normalizeScriptDocument(result.document)).toEqual(normalizeScriptDocument(document));
};
const musicOut = {type: 'musicOut'};

describe('.stagistic round-trip fixed speech and music shapes', () => {
    it.each([
        ['lowercase lyrics', [block('lyrics', textNode('la la'))]],
        ['lowercase italic lyrics with an indent', [block('lyrics', textNode('\t'), textNode('la', [{type: 'italic'}]))]],
        ['empty lyrics', [block('lyrics')]],
        ['lyrics that start with a caret', [block('lyrics', textNode('^LA'))]],
        ['uppercase lyrics that start with a backslash', [block('lyrics', textNode('\\LA'))]],
        ['dialogue with a caret after a tab indent', [block('dialogue', textNode('\t^ hi'))]],
        ['dialogue that starts with a caret', [block('dialogue', textNode('^ hi'))]],
        ['two consecutive soft breaks', [block('dialogue'), block('dialogue')]],
        ['a soft break after lyrics', [block('lyrics', textNode('LA')), block('dialogue')]],
        ['an empty lyrics after dialogue', [block('dialogue', textNode('hi')), block('lyrics')]],
        ['parentheses inside aside text', [block('aside', textNode('(softly)')), block('dialogue', textNode('hi'))]],
        ['unbalanced parentheses inside aside text', [block('aside', textNode('a) (b'))]],
    ])('keeps %s', (_name, lines) => roundTrips([
        SCENE,
        CUE,
        ...lines,
    ]));

    it('keeps an empty stage direction and a whitespace-only one', () => {
        roundTrips([
            SCENE,
            block('stageDirection'),
            block('stageDirection', textNode(' ')),
            block('stageDirection', textNode('x')),
        ]);
    });

    it('keeps an empty character cue', () => {
        roundTrips([
            SCENE,
            block('character'),
            block('dialogue', textNode('hi')),
        ]);
        roundTrips([SCENE, block('character')]);
    });

    it.each([
        ['open', 'song'],
        ['open', 'instrumental'],
        ['hit', 'song'],
    ] as const)('keeps the %s music kind %s', (mode, kind) => {
        roundTrips([SCENE, block('stageDirection', textNode('go '), musicStart(mode, kind))]);
    });

    it('keeps a block that holds only a music out', () => {
        roundTrips([
            SCENE,
            block('stageDirection', musicStart('open')),
            block('stageDirection', textNode('x')),
            block('stageDirection', musicOut),
        ]);
    });

    it('keeps a block that holds only a music out inside a speech', () => {
        roundTrips([
            SCENE,
            CUE,
            block('stageDirection', musicStart('open'), textNode(' x')),
            block('stageDirection', musicOut),
            block('dialogue', textNode('hi')),
        ]);
    });

    it('keeps a character tag right before a music marker', () => {
        roundTrips([SCENE, block('stageDirection', textNode('Anna', [tag('Anna')]), musicStart('open'))]);
    });

    it('keeps a music out between text inside a speech', () => {
        roundTrips([
            SCENE,
            CUE,
            block('stageDirection', musicStart('open'), textNode(' x '), musicOut, textNode(' y')),
            block('dialogue', textNode('hi')),
        ]);
    });

    it('keeps hit music inside a speech', () => {
        roundTrips([
            SCENE,
            CUE,
            block('stageDirection', textNode('bang '), musicStart('hit')),
            block('dialogue', textNode('hi')),
        ]);
    });

    it('keeps a music out next to a hit start, and whitespace between atoms', () => {
        roundTrips([SCENE, block('stageDirection', musicStart('open'), textNode(' '), musicOut, textNode(' '), musicStart('hit'))]);
        roundTrips([SCENE, block('stageDirection', musicStart('open'), musicOut, musicStart('hit'))]);
    });

    it.each([
        ['text right before a music start', [textNode('Bang'), musicStart('open')]],
        ['two spaces before a music start', [textNode('Bang  '), musicStart('open')]],
        [
            'text right after a music out',
            [
                musicStart('open'),
                textNode(' x '),
                musicOut,
                textNode('abc'),
            ],
        ],
        [
            'a digit right after a numbered music out',
            [
                musicStart('open'),
                textNode(' x '),
                musicOut,
                textNode('5abc'),
            ],
        ],
        [
            'a spaced digit after a numbered music out',
            [
                musicStart('open'),
                textNode(' x '),
                musicOut,
                textNode(' 5 abc'),
            ],
        ],
        ['text that ends with a backslash and an at sign before music', [textNode('a\\@'), musicStart('open')]],
    ])('keeps %s', (_name, nodes) => {
        roundTrips([SCENE, block('stageDirection', ...nodes)]);
    });
});

describe('.stagistic round-trip fixed title page losses', () => {
    /* A manual title page without a date is written without one; re-export then adds the export date (fixpoint broken). */
    it('keeps a manual title page without a date manual and unchanged on re-export', () => {
        const document = {type: 'doc' as const, content: [SCENE]};
        const first = serializeStagistic(document, {
            scriptTitle: 'x',
            titlePage: {draftDateMode: 'manual'},
            exportDate: EXPORT_DATE,
        });
        const parsed = parseStagistic(first);
        const again = serializeStagistic(parsed.document, {
            scriptTitle: 'x',
            titlePage: parsed.titlePage,
            exportDate: EXPORT_DATE,
        });

        expect(again).toBe(first);
        expect(parsed.titlePage.draftDateMode).toBe('manual');
        expect(parsed.titlePage.draftDate).toBeUndefined();
    });
});

describe('parseStagistic hostile input', () => {
    it('never fails with anything but a controlled parse error', () => {
        fc.assert(
            fc.property(
                arbitraryHostileText,
                text => {
                    try {
                        const result = parseStagistic(text);

                        expect(result.document.type).toBe('doc');
                    } catch (error) {
                        expect((error as Error)?.name).toBe('StagisticParseError');
                    }
                },
            ),
            oracleParameters(),
        );
    });

    it('accepts a leading byte order mark and CRLF line endings', () => {
        const text = '\uFEFF---\r\ntitle: "x"\r\n---\r\n\r\n# Scene\r\n';

        expect(parseStagistic(text).title).toBe('x');
    });
});
