import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    CHARACTER_TAG_MARK_NAME,
    CUE_MODE_ATTR,
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
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

Anna watches @"Mrs. Washington" enter. @@cue 1 "She said \\"Yes\\""

The lights return. @@out 1

@@cue 2 "Knock"

@@out 2

[[ revise **this** ]]
`);

        expect(result.titlePage).toEqual({
            titleOverride: 'When Night Falls',
            subtitle: 'A musical',
            credits: [
                {credit: 'Music', authors: ['Peter Gray']},
                {credit: 'Lyrics', authors: ['Jane Smith', 'Alex Green']},
            ],
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
        expect(getText(result.document.content[2])).toBe('ALL LIGHTS SNAP OUT');

        const tagOnly = result.document.content[3].content?.[0];

        expect(tagOnly?.text).toBe('MICHAEL');
        expect(tagOnly?.marks?.some(mark => mark.type === CHARACTER_TAG_MARK_NAME)).toBe(true);
        expect(getText(result.document.content[4])).toBe('McCLANE');
        expect(getText(result.document.content[8])).toBe('');

        const openCue = result.document.content[10].content?.find(node => node.type === CUE_START_NODE_NAME);
        const cueOut = result.document.content[11].content?.find(node => node.type === CUE_OUT_NODE_NAME);
        const hitCue = result.document.content[12].content?.find(node => node.type === CUE_START_NODE_NAME);

        expect(openCue?.attrs?.title).toBe('She said "Yes"');
        expect(openCue?.attrs?.[CUE_MODE_ATTR]).toBe('open');
        expect(cueOut).toBeTruthy();
        expect(hitCue?.attrs?.[CUE_MODE_ATTR]).toBe('hit');
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

    it('parses inline dialogue and one-act scene headings', () => {
        const result = parseStagistic(`# The room

JANE: I told you already.

@MICHAEL ENTERS

PETER (from the door)
Hello.
`);

        expect(result.document.content.map(node => node.type)).toEqual([
            'scene', 'character', 'dialogue', 'stageDirection', 'character', 'aside', 'dialogue',
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

    it('rejects invalid frontmatter and mismatched cue outs', () => {
        expect(() => parseStagistic(`---
draftDate: 01/07/2026
---
Text
`)).toThrow(StagisticParseError);

        expect(() => parseStagistic(`Text @@cue 1 "One"

@@out 2
`)).toThrow('@@out 2 does not match');
    });
});
