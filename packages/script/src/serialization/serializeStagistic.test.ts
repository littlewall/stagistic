import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {CHARACTER_TAG_MARK_NAME, type ScriptDocument} from '..';
import {parseStagistic} from '../parsing/parseStagistic';
import {serializeStagistic} from './serializeStagistic';

const text = (value: string) => ({type: 'text', text: value});

describe('serializeStagistic', () => {
    it('serializes title-page settings into the canonical frontmatter schema', () => {
        const document: ScriptDocument = {type: 'doc', content: []};
        const result = serializeStagistic(document, {
            scriptTitle: 'Stored title',
            exportDate: new Date(2026, 6, 1),
            titlePage: {
                subtitle: 'A musical',
                credits: [{credit: 'Music', authors: ['Peter Gray']}, {credit: 'Lyrics', authors: ['Jane Smith', 'Alex Green']}],
                source: 'Based on the novel',
                draftDateMode: 'auto',
                contact: 'Jane Smith\njane@example.com',
                copyright: '© 2026 Jane Smith',
            },
        });

        expect(result).toBe(`---
title: "Stored title"
subtitle: "A musical"
credits:
  - credit: "Music"
    authors:
      - "Peter Gray"
  - credit: "Lyrics"
    authors:
      - "Jane Smith"
      - "Alex Green"
source: "Based on the novel"
draftDate: 2026-07-01
contact: "Jane Smith\\njane@example.com"
copyright: "© 2026 Jane Smith"
---
`);
    });

    it('serializes blocks, marks, tags, music, and speech spacing canonically', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                {type: 'act', content: [text('Act One')]},
                {type: 'scene', content: [text('A garden. Dusk.')]},
                {
                    type: 'stageDirection',
                    content: [
                        text('Anna watches as '),
                        {
                            ...text('Mrs. '),
                            marks: [{type: CHARACTER_TAG_MARK_NAME}],
                        },
                        {
                            ...text('Washington'),
                            marks: [{type: CHARACTER_TAG_MARK_NAME}],
                        },
                        text(' enters.'),
                        {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'music-1',
                                mode: 'open',
                                title: 'She said "Yes"',
                            },
                        },
                    ],
                },
                {type: 'character', content: [text('Mrs. Washington')]},
                {type: 'aside', content: [text('quietly')]},
                {
                    type: 'dialogue',
                    content: [{...text('Stop!'), marks: [{type: 'bold'}]}],
                },
                {type: 'lyrics', content: [text('\tAnd I will stay')]},
                {type: 'lyrics', content: []},
                {type: 'stageDirection', content: [{type: 'musicOut'}]},
                {
                    type: 'stageDirection',
                    content: [{type: 'musicStart', attrs: {mode: 'hit', title: 'Knock \\ twice'}}],
                },
                {type: 'note', content: [text('Rework this transition')]},
            ],
        };

        const result = serializeStagistic(document, {
            scriptTitle: 'When Night Falls',
            exportDate: new Date(2026, 6, 1),
        });

        const expectedBody = String.raw`# Act One

## A garden. Dusk.

Anna watches as @"Mrs. Washington" enters.@@music 1 "She said \"Yes\""

"Mrs. Washington"
(quietly)
**Stop!**
\t^And I will stay
^

!
!@@out 1

@@music 2 "Knock \\ twice"

@@out 2

[[ Rework this transition ]]
`.replace('\\t', '\t');

        expect(result).toContain(expectedBody);
    });

    it('keeps a stage direction inside a speech from breaking the speech apart', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                {type: 'character', content: [text('MICHAEL')]},
                {type: 'stageDirection', content: [text('A brief pause.')]},
                {type: 'lyrics', content: [text('lyrics one')]},
                {type: 'lyrics', content: [text('lyrics two')]},
            ],
        };

        const result = serializeStagistic(document, {scriptTitle: 'Test'});

        expect(result).toContain(`MICHAEL
!A brief pause.
^lyrics one
^lyrics two`);

        const reparsed = parseStagistic(result);

        expect(reparsed.document.content.map(node => node.type)).toEqual([
            'character',
            'stageDirection',
            'lyrics',
            'lyrics',
        ]);
    });

    it('serializes non-stage and orphan outs as structural !@@out lines', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    content: [
                        {
                            type: 'musicStart',
                            attrs: {mode: 'open', title: 'Night'},
                        },
                    ],
                },
                {type: 'character', content: [text('JOHN')]},
                {
                    type: 'dialogue',
                    content: [text('The music dies.'), {type: 'musicOut'}],
                },
                {type: 'stageDirection', content: [{type: 'musicOut'}]},
            ],
        };

        const result = serializeStagistic(document, {scriptTitle: 'Test'});

        expect(result).toContain('The music dies.\n!@@out 1');
        expect(result).toContain('!@@out');
    });

    it('serializes scenes with a single hash when the document has no acts', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [{type: 'scene', content: [text('Only scene')]}],
        };

        expect(
            serializeStagistic(document, {
                scriptTitle: 'One act',
                titlePage: {draftDateMode: 'manual', draftDate: '2025-03-02'},
            }),
        ).toContain('\n\n# Only scene\n');
    });

    it('forces ambiguous stage directions with !', () => {
        const stageDirection = (value: string, tagged = false) => ({
            type: 'stageDirection',
            content: [
                {
                    type: 'text',
                    text: value,
                    marks: tagged ? [{type: CHARACTER_TAG_MARK_NAME}] : undefined,
                },
            ],
        });
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                stageDirection('ALL LIGHTS OUT'),
                stageDirection('MICHAEL', true),
                stageDirection('!BANG'),
                stageDirection('Michael enters'),
            ],
        };

        const result = serializeStagistic(document, {
            scriptTitle: 'Forced directions',
            titlePage: {draftDateMode: 'manual', draftDate: '2026-07-01'},
        });

        expect(result).toContain(`!ALL LIGHTS OUT

!@MICHAEL

!!BANG

Michael enters`);
    });

    it('forces mixed-case character names without changing their case', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [{type: 'character', content: [text('McCLANE')]}, {type: 'dialogue', content: [text('Yippie ki-yay.')]}],
        };

        const result = serializeStagistic(document, {
            scriptTitle: 'Case',
            titlePage: {draftDateMode: 'manual', draftDate: '2026-07-01'},
        });

        expect(result).toContain('@McCLANE\nYippie ki-yay.');
    });

    describe('singleHashtag', () => {
        const options = {scriptTitle: 'Hashtag', titlePage: {draftDateMode: 'manual' as const, draftDate: '2026-07-01'}};
        const act = {type: 'act', content: [text('ACT ONE')]};
        const scene = {type: 'scene', content: [text('A garden.')]};

        it('writes `singleHashtag: act` only when the document has an act and no scene', () => {
            expect(serializeStagistic({type: 'doc', content: [act]}, options)).toBe(`---
title: "Hashtag"
draftDate: 2026-07-01
singleHashtag: act
---

# ACT ONE
`);
        });

        it('leaves the frontmatter unchanged for documents with scenes, or without acts', () => {
            const withScene = serializeStagistic({type: 'doc', content: [act, scene]}, options);
            const sceneOnly = serializeStagistic({type: 'doc', content: [scene]}, options);
            const empty = serializeStagistic({type: 'doc', content: []}, options);

            [
                withScene,
                sceneOnly,
                empty,
            ].forEach(result => expect(result).not.toContain('singleHashtag'));
            expect(withScene).toContain('# ACT ONE\n\n## A garden.');
        });
    });

    it('quotes a character name that contains a colon', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [{type: 'character', content: [text('ANNA:X')]}, {type: 'dialogue', content: [text('hi')]}],
        };

        expect(serializeStagistic(document, {scriptTitle: 'Colon'})).toContain('"ANNA:X"\nhi');
    });
});
