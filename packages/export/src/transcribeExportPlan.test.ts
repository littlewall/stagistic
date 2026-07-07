import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ExportPlan} from './plan';
import {block} from './testUtils';
import {transcribeExportPlan} from './transcribeExportPlan';
import type {
    PageItem,
    VisualLine,
} from './visualLine';

const plan = (blocks: ExportPlan['doc']['content']): ExportPlan => ({
    doc: {
        type: 'doc',
        content: blocks,
    },
    pagination: {
        forcedBreaks: [],
        blankPagesBeforeScript: {
            count: 0,
            countsInNumbering: false,
        },
    },
    postSteps: [],
});

const isVisualLine = (item: PageItem): item is VisualLine => !('type' in item);

describe('transcribeExportPlan', () => {
    it('creates text PDF lines from script document content', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Mizí i poslední'), block('stageDirection', 'sd1', 'Zvědavá jsem, co mě čeká.')]), DEFAULT_EDITOR_SETTINGS);

        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text));

        expect(text).toContain('MIZÍ I POSLEDNÍ');
        expect(text).toContain('Zvědavá jsem, co mě čeká.');
    });

    it('transcribes cue atoms as their numbered label so they occupy a line', () => {
        const transcript = transcribeExportPlan(plan([
            block('scene', 's1', 'Scene one'), {
                type: 'stageDirection',
                attrs: {id: 'sd1', blockType: 'stageDirection'},
                content: [
                    {
                        type: 'cueStart',
                        attrs: {
                            cueId: 'c1', mode: 'open', title: 'dddddddddd',
                        },
                    },
                ],
            },
        ]), DEFAULT_EDITOR_SETTINGS);

        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text));

        expect(text).toContain('1. dddddddddd');
    });

    it('keeps multi-character cue lines tight (no spaces around slashes), matching the editor', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Scene one'), block('character', 'ch1', 'TOMMY/REBECCA/MICHAEL')]), DEFAULT_EDITOR_SETTINGS);

        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text))
            .join(' ');

        expect(text).toContain('TOMMY/REBECCA/MICHAEL');
    });

    it('honors forced page breaks', () => {
        const transcript = transcribeExportPlan({
            ...plan([block('scene', 's1', 'Scene one'), block('scene', 's2', 'Scene two')]),
            pagination: {
                forcedBreaks: [{blockId: 's2', kind: 'new-page'}],
                blankPagesBeforeScript: {
                    count: 0,
                    countsInNumbering: false,
                },
            },
        }, DEFAULT_EDITOR_SETTINGS);

        expect(transcript.items.some(item => 'type' in item && item.type === '__page_break__')).toBe(true);
    });
});
