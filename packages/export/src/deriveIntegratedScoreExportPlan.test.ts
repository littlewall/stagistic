import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {INTEGRATED_SCORE_DEFAULTS} from './config';
import {deriveIntegratedScoreExportPlan} from './deriveIntegratedScoreExportPlan';
import {block} from './testUtils';

const script = {
    doc: {
        type: 'doc' as const,
        content: [
            block('scene', 'scene', 'Scene'),
            {
                ...block('stageDirection', 'cue', ''),
                content: [
                    {type: 'musicStart',
                        attrs: {
                            musicId: 'music-1', mode: 'open', title: 'Opening',
                        }},
                ],
            },
            block('lyrics', 'music', 'Song'),
            {
                ...block('stageDirection', 'out', ''),
                content: [{type: 'musicOut'}],
            },
            block('stageDirection', 'after', 'After'),
        ],
    },
    characters: [],
    groups: [],
    initialCharacters: [],
    initialPlaces: [],
    scriptTitle: 'Test',
    titlePage: null,
};

describe('deriveIntegratedScoreExportPlan', () => {
    it('creates an open-music score unit and starts its music and following book on odd pages', () => {
        const plan = deriveIntegratedScoreExportPlan(INTEGRATED_SCORE_DEFAULTS, script);

        expect(plan.postSteps).toEqual([
            {
                kind: 'integrated-score', musicId: 'music-1', title: 'Opening', startBlockId: 'cue', afterBlockId: 'out',
            },
        ]);
        expect(plan.pagination.forcedBreaks).toContainEqual({blockId: 'music', kind: 'odd-page'});
        expect(plan.pagination.forcedBreaks).toContainEqual({blockId: 'after', kind: 'odd-page'});
    });

    it('turns on the contents score column', () => {
        const plan = deriveIntegratedScoreExportPlan(INTEGRATED_SCORE_DEFAULTS, {
            ...script,
            doc: {
                type: 'doc',
                content: [block('scene', 's1', 'The Diner')],
            },
        });
        const contents = plan.leadingPages.initialPages
            .find(page => page.kind === 'contents');

        expect(contents?.kind === 'contents' ? contents.showScoreColumn : null).toBe(true);
    });
});
