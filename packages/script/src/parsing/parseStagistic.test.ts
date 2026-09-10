import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    CHARACTER_TAG_MARK_NAME,
    getScriptBlockId,
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    type ScriptNode,
} from '..';
import {parseStagistic} from './parseStagistic';
import {StagisticParseError} from './types';

const getText = (node: ScriptNode): string => {
    return typeof node.text === 'string'
        ? node.text
        : (node.content ?? []).map(getText).join('');
};

describe('parseStagistic', () => {
    it('parses @@music and rejects the removed @@cue syntax', () => {
        const result = parseStagistic('!Music begins @@music 1 "Overture"');
        const musicStart = result.document.content[0].content
            ?.find(node => node.type === 'musicStart');

        expect(musicStart?.attrs?.title).toBe('Overture');
        expect(() => parseStagistic('!Music begins @@cue 1 "Overture"'))
            .toThrow(StagisticParseError);
    });

    it('attaches a standalone out to the previous content block and preserves a shared out/start boundary', () => {
        const standalone = parseStagistic(`!Cue @@music 3 "OLD"

JOHN
The music dies under the final word.
!@@out 3`);
        const shared = parseStagistic(`!Cue @@music 3 "OLD"

!The overture cuts. @@out 3 @@music 4 "NIGHT"`);

        const dialogue = standalone.document.content[2];
        const sharedBoundary = shared.document.content[1];

        expect(dialogue?.type).toBe('dialogue');
        expect(dialogue?.content?.at(-1)?.type).toBe(MUSIC_OUT_NODE_NAME);
        expect(sharedBoundary?.content?.map(node => node.type)).toEqual([
            'text',
            MUSIC_OUT_NODE_NAME,
            MUSIC_START_NODE_NAME,
        ]);
    });

    it('round-trips a bare orphan out without assigning it a number', () => {
        const result = parseStagistic('!@@out');

        expect(result.document.content[0]?.content?.[0]?.type).toBe(MUSIC_OUT_NODE_NAME);
    });

    it('parses the complete syntax and title-page frontmatter', () => {
        const result = parseStagistic(`---
title: When Night Falls
subtitle: A musical
credits:
  - credit: Music
    authors:
      - Peter Gray
  - credit: Lyrics
    authors: [Jane Smith, Alex Green]
source: Based on the novel
draftDate: 2026-07-01
contact: |-
  Jane Smith
  jane@example.com
copyright: © 2026 Jane Smith
---

# Act One

## A garden. Dusk.

!ALL LIGHTS SNAP OUT

!@MICHAEL

@McCLANE
(quietly)
I am *still* here.
\tAND I WILL STAY
~
ONE MORE LINE

Anna watches @"Mrs. Washington" enter. @@music 1 "She said \\"Yes\\""

The lights return. @@out 1

@@music 2 "Knock"

@@out 2

[[ revise **this** ]]
`);

        expect(result.title).toBe('When Night Falls');
        expect(result.titlePage).toEqual({
            subtitle: 'A musical',
            credits: [{credit: 'Music', authors: ['Peter Gray']}, {credit: 'Lyrics', authors: ['Jane Smith', 'Alex Green']}],
            source: 'Based on the novel',
            draftDateMode: 'manual',
            draftDate: '2026-07-01',
            contact: 'Jane Smith\njane@example.com',
            copyright: '© 2026 Jane Smith',
        });

        expect(result.document.content.map(node => node.type)).toEqual([
            'act',
            'scene',
            'stageDirection',
            'stageDirection',
            'character',
            'aside',
            'dialogue',
            'lyrics',
            'lyrics',
            'lyrics',
            'stageDirection',
            'stageDirection',
            'stageDirection',
            'note',
        ]);

        const blockIds = result.document.content.map(getScriptBlockId);

        expect(blockIds.every(Boolean)).toBe(true);
        expect(new Set(blockIds).size).toBe(blockIds.length);
        expect(getText(result.document.content[2])).toBe('ALL LIGHTS SNAP OUT');

        const tagOnly = result.document.content[3].content?.[0];

        expect(tagOnly?.text).toBe('MICHAEL');
        expect(tagOnly?.marks?.some(mark => mark.type === CHARACTER_TAG_MARK_NAME)).toBe(true);
        expect(getText(result.document.content[4])).toBe('McCLANE');
        expect(getText(result.document.content[8])).toBe('');

        const openMusic = result.document.content[10].content?.find(node => node.type === MUSIC_START_NODE_NAME);
        const musicOut = result.document.content[11].content?.find(node => node.type === MUSIC_OUT_NODE_NAME);
        const hitMusic = result.document.content[12].content?.find(node => node.type === MUSIC_START_NODE_NAME);

        expect(openMusic?.attrs?.title).toBe('She said "Yes"');
        expect(openMusic?.attrs?.[MUSIC_MODE_ATTR]).toBe('open');
        expect(musicOut).toBeTruthy();
        expect(hitMusic?.attrs?.[MUSIC_MODE_ATTR]).toBe('hit');
    });

    it('parses uppercase lines as character cues unless ! forces a stage direction', () => {
        const result = parseStagistic(`A normal direction

THIS IS AN INTENTIONALLY VERY LONG UPPERCASE CHARACTER CUE WITHOUT ANY HEURISTIC LIMIT
Dialogue.

!THIS IS A FORCED STAGE DIRECTION

(BLACKOUT)
`);

        expect(result.document.content.map(node => node.type)).toEqual([
            'stageDirection',
            'character',
            'dialogue',
            'stageDirection',
            'stageDirection',
        ]);
    });

    it('stores a unison cue compactly, regardless of spacing around the delimiters', () => {
        const result = parseStagistic(`TOMMY / REBECCA / MICHAEL
Hello.
`);

        expect(getText(result.document.content[0])).toBe('TOMMY/REBECCA/MICHAEL');
    });

    it('stores aside content without the presentation parentheses', () => {
        const result = parseStagistic(`PETER (from the door)
(quietly)
Hello.
`);

        expect(result.document.content.map(node => node.type)).toEqual([
            'character',
            'aside',
            'aside',
            'dialogue',
        ]);
        expect(getText(result.document.content[1])).toBe('from the door');
        expect(getText(result.document.content[2])).toBe('quietly');
    });

    it('parses inline dialogue and one-act scene headings', () => {
        const result = parseStagistic(`# The room

JANE: I told you already.

@MICHAEL ENTERS

PETER (from the door)
Hello.
`);

        expect(result.document.content.map(node => node.type)).toEqual([
            'scene',
            'character',
            'dialogue',
            'stageDirection',
            'character',
            'aside',
            'dialogue',
        ]);
        expect(getText(result.document.content[1])).toBe('JANE');
        expect(getText(result.document.content[3])).toBe('MICHAEL ENTERS');
        expect(getText(result.document.content[4])).toBe('PETER');
    });

    it('parses a forced stage direction inside a speech without ending it', () => {
        const result = parseStagistic(`MICHAEL
!A brief pause.
LYRICS ONE
LYRICS TWO
`);

        expect(result.document.content.map(node => node.type)).toEqual([
            'character',
            'stageDirection',
            'lyrics',
            'lyrics',
        ]);
        expect(getText(result.document.content[1])).toBe('A brief pause.');
        expect(getText(result.document.content[2])).toBe('LYRICS ONE');
    });

    it('rejects invalid frontmatter and mismatched music outs', () => {
        expect(() => parseStagistic(`---
draftDate: 01/07/2026
---
Text
`)).toThrow(StagisticParseError);

        expect(() => parseStagistic(`Text @@music 1 "One"

@@out 2
`)).toThrow('@@out 2 does not match');
    });
});
