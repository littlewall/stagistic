import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    CHARACTER_TAG_MARK_NAME,
    getScriptBlockId,
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    type ScriptNode,
    serializeStagistic,
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
            'dialogue',
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

    it('parses a hit that closes a stage direction and round-trips it', () => {
        const source = 'A thunderclap shakes the tower. @@music 1 "Thunderclap"\n\n@@out 1';
        const result = parseStagistic(source);
        const block = result.document.content[0];
        const hit = block.content?.at(-1);

        expect(result.document.content).toHaveLength(1);
        expect(getText(block).trim()).toBe('A thunderclap shakes the tower.');
        expect(hit?.type).toBe(MUSIC_START_NODE_NAME);
        expect(hit?.attrs?.[MUSIC_MODE_ATTR]).toBe('hit');
        expect(serializeStagistic(result.document, {scriptTitle: 'Test'})).toContain(source);
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

    describe('singleHashtag', () => {
        it('reads a lone `#` as an act when the key says `act`', () => {
            const result = parseStagistic('---\nsingleHashtag: act\n---\n\n# ACT ONE\n');

            expect(result.document.content.map(node => node.type)).toEqual(['act']);
        });

        it('reads `#` as a scene when the key says `scene`, even next to `##`', () => {
            const result = parseStagistic('---\nsingleHashtag: scene\n---\n\n# One\n\n## Two\n');

            expect(result.document.content.map(node => node.type)).toEqual(['scene', 'scene']);
        });

        it('keeps inferring from `##` when the key is absent', () => {
            expect(parseStagistic('# One\n').document.content[0]?.type).toBe('scene');
            expect(parseStagistic('# One\n\n## Two\n').document.content.map(node => node.type)).toEqual(['act', 'scene']);
        });

        it('rejects an unknown value like any other invalid frontmatter value', () => {
            expect(() => parseStagistic('---\nsingleHashtag: chapter\n---\n\n# One\n')).toThrow(StagisticParseError);
        });
    });

    it('rejects `@@out N` when no music is open', () => {
        expect(() => parseStagistic('!x @@out 0 a')).toThrow(StagisticParseError);
        expect(() => parseStagistic('!x @@out 0 a')).toThrow('does not match');
    });

    it('reads an escaped digit after a bare `@@out` as text', () => {
        const nodes = parseStagistic('!x @@out \\0 a').document.content[0]?.content ?? [];

        expect(nodes.map(node => node.type)).toEqual([
            'text',
            MUSIC_OUT_NODE_NAME,
            'text',
        ]);
        expect(nodes[2]?.text).toBe(' 0 a');
    });

    it('reads `@@out` glued to a letter or digit as plain text', () => {
        for (const source of ['!x @@outro a', '!x @@out2 a']) {
            const nodes = parseStagistic(source).document.content[0]?.content ?? [];

            expect(nodes.every(node => node.type === 'text')).toBe(true);
            expect(nodes.map(node => node.text).join('')).toBe(source.slice(1));
        }
    });

    it('reads an escaped letter glued to `@@out` as text after the out', () => {
        const nodes = parseStagistic('!x @@out\\ro a').document.content[0]?.content ?? [];

        expect(nodes.map(node => node.type)).toEqual([
            'text',
            MUSIC_OUT_NODE_NAME,
            'text',
        ]);
        expect(nodes[2]?.text).toBe('ro a');
    });

    it('reads an escaped leading `!` or `(` inside a speech as dialogue', () => {
        const blocks = parseStagistic('ANNA\n\\!hey\n\\(softly)').document.content;

        expect(blocks.map(block => block.type)).toEqual([
            'character',
            'dialogue',
            'dialogue',
        ]);
        expect(blocks[1]?.content?.[0]?.text).toBe('!hey');
        expect(blocks[2]?.content?.[0]?.text).toBe('(softly)');
    });

    it('reads escaped `@` and `~` as text', () => {
        const nodes = parseStagistic('mail a\\@b.cz').document.content[0]?.content ?? [];

        expect(nodes).toEqual([{type: 'text', text: 'mail a@b.cz'}]);
    });

    it('keeps an all-uppercase speech line dialogue behind a leading backslash', () => {
        const types = parseStagistic('ANNA\n\\STOP\nSTOP').document.content.map(node => node.type);

        expect(types).toEqual([
            'character',
            'dialogue',
            'lyrics',
        ]);
    });

    it('still takes the number after `@@out` while music is open', () => {
        const nodes = parseStagistic('!x @@music 1 "Song" y @@out 1 2 z').document.content[0]?.content ?? [];

        expect(nodes.at(-1)?.text).toBe(' 2 z');
    });

    it('reads a quoted character name that contains a colon', () => {
        const result = parseStagistic('"ANNA: X"\nhi');

        expect(result.document.content.map(node => node.type)).toEqual(['character', 'dialogue']);
        expect(getText(result.document.content[0])).toBe('ANNA: X');
    });
});

describe('parseStagistic music and speech syntax', () => {
    it('reads a music kind before the title', () => {
        const start = parseStagistic('!x @@music 1 instrumental "Song" y').document.content[0]?.content?.[1];

        expect(start?.attrs?.kind).toBe('instrumental');
        expect(start?.attrs?.title).toBe('Song');
    });

    it('still drops whitespace between adjacent music markers of an app-written file', () => {
        const nodes = parseStagistic('!x @@out @@music 2 "N"\n').document.content[0]?.content ?? [];

        expect(nodes.map(node => node.type)).toEqual([
            'text',
            MUSIC_OUT_NODE_NAME,
            MUSIC_START_NODE_NAME,
        ]);
    });

    it('reads a leading caret as lyrics, an escaped caret as text, and `~` as a dialogue soft break', () => {
        const blocks = parseStagistic('ANNA\n^la\n\\^la\n~\n~').document.content;

        expect(blocks.map(node => node.type)).toEqual([
            'character',
            'lyrics',
            'dialogue',
            'dialogue',
            'dialogue',
        ]);
        expect(getText(blocks[2])).toBe('^la');
    });

    it('reads `@""` as a character cue without a name', () => {
        const blocks = parseStagistic('@""\nhi').document.content;

        expect(blocks.map(node => node.type)).toEqual(['character', 'dialogue']);
        expect(getText(blocks[0])).toBe('');
    });
});

describe('parseStagistic hostile frontmatter', () => {
    it('reports an unresolved YAML alias as a parse error', () => {
        expect(() => parseStagistic('---\n**\n---')).toThrow(StagisticParseError);
    });
});
