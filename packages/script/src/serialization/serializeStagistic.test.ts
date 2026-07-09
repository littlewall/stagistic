import {
    describe, expect, it,
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

    it('serializes blocks, marks, tags, cues, and speech spacing canonically', () => {
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
                            type: 'cueStart',
                            attrs: {
                                cueId: 'cue-1', mode: 'open', title: 'She said "Yes"',
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
                {type: 'stageDirection', content: [{type: 'cueOut'}]},
                {
                    type: 'stageDirection',
                    content: [{type: 'cueStart', attrs: {mode: 'hit', title: 'Knock \\ twice'}}],
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

Anna watches as @"Mrs. Washington" enters. @@cue 1 "She said \"Yes\""

"Mrs. Washington"
(quietly)
**Stop!**
\tAND I WILL STAY
~

@@out 1

@@cue 2 "Knock \\ twice"

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
LYRICS ONE
LYRICS TWO`);

        const reparsed = parseStagistic(result);

        expect(reparsed.document.content.map(node => node.type)).toEqual([
            'character',
            'stageDirection',
            'lyrics',
            'lyrics',
        ]);
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
});
