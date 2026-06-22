import {
    describe, expect, it,
} from 'vite-plus/test';

import type {ScriptNode} from '../document';
import {buildScriptStructureOutline} from './outline';

const block = (type: string, id: string, text: string): ScriptNode => ({
    type,
    attrs: {id},
    content: text ? [{type: 'text', text}] : [],
});

describe('buildScriptStructureOutline', () => {
    it('returns no acts for undefined or empty content', () => {
        expect(buildScriptStructureOutline(undefined)).toEqual({acts: []});
        expect(buildScriptStructureOutline([])).toEqual({acts: []});
    });

    it('groups scenes under a single synthesized act when none is present', () => {
        const outline = buildScriptStructureOutline([block('scene', 's1', 'A'), block('scene', 's2', 'B')]);

        expect(outline.acts).toHaveLength(1);
        expect(outline.acts[0]).toMatchObject({
            actName: 'ACT 1',
            primary: true,
            anchorBlockId: 's1',
        });
        expect(outline.acts[0].items.map(i => i.blockId)).toEqual(['s1', 's2']);
    });

    it('uses the first act heading for the primary group', () => {
        const outline = buildScriptStructureOutline([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'A'),
            block('scene', 's2', 'B'),
        ]);

        expect(outline.acts).toHaveLength(1);
        expect(outline.acts[0]).toMatchObject({
            actId: 'a1',
            actName: 'ACT ONE',
            primary: true,
        });
        expect(outline.acts[0].items.map(i => i.blockId)).toEqual(['s1', 's2']);
    });

    it('starts a new non-primary group for each subsequent act', () => {
        const outline = buildScriptStructureOutline([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'A'),
            block('act', 'a2', 'ACT TWO'),
            block('scene', 's2', 'B'),
        ]);

        expect(outline.acts).toHaveLength(2);
        expect(outline.acts[0]).toMatchObject({actName: 'ACT ONE', primary: true});
        expect(outline.acts[1]).toMatchObject({actName: 'ACT TWO', primary: false});
        expect(outline.acts[1].items.map(i => i.blockId)).toEqual(['s2']);
    });

    it('names an untitled act heading with its default name', () => {
        const outline = buildScriptStructureOutline([block('act', 'a1', ''), block('scene', 's1', 'A')]);

        expect(outline.acts[0].actName).toBe('ACT 1');
    });

    it('labels an untitled scene', () => {
        const outline = buildScriptStructureOutline([block('scene', 's1', '')]);

        expect(outline.acts[0].items[0].title).toBe('Untitled scene');
    });

    it('skips blocks without an id', () => {
        const outline = buildScriptStructureOutline([
            block('act', 'a1', 'ACT ONE'),
            {
                type: 'scene', attrs: {}, content: [{type: 'text', text: 'No id'}],
            },
            block('scene', 's1', 'Has id'),
        ]);

        const titles = outline.acts.flatMap(a => a.items.map(i => i.title));

        expect(titles).toEqual(['Has id']);
    });

    /*
     * Documents current behavior: a scene before the first act heading stays in the
     * primary fallback group, and the act heading then opens its own group.
     */
    it('keeps a pre-act scene in the primary group and opens a new group at the act', () => {
        const outline = buildScriptStructureOutline([
            block('scene', 's0', 'Intro'),
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'A'),
        ]);

        expect(outline.acts).toHaveLength(2);
        expect(outline.acts[0]).toMatchObject({primary: true});
        expect(outline.acts[0].items.map(i => i.blockId)).toEqual(['s0']);
        expect(outline.acts[1]).toMatchObject({primary: false});
        expect(outline.acts[1].items.map(i => i.blockId)).toEqual(['s1']);
    });
});
